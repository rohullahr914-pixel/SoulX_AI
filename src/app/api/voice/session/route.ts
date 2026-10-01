import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { assertOrigin } from "@/lib/server/social";
import { loadVoiceConfig } from "@/lib/server/voice";

export const dynamic = "force-dynamic";
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ allowed: false }, { status: 401 });
  const activePaidPlan = (user.plan === "pro" || user.plan === "ultra") && user.planStatus === "active" && (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now());
  if (!activePaidPlan) return NextResponse.json({ allowed: false }, { headers: { "Cache-Control": "no-store" } });
  const slug = new URL(request.url).searchParams.get("personaSlug")?.trim().toLowerCase() ?? "";
  let configured = false;
  if (process.env.ELEVENLABS_API_KEY) {
    if (/^[a-z0-9-]{1,160}$/.test(slug)) configured = Boolean(await loadVoiceConfig(slug, user.id, "").catch(() => null));
    else configured = Boolean(process.env.ELEVENLABS_AGENT_ID);
  }
  return NextResponse.json({ allowed: configured, unavailable: !configured }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let reservedSessionId: string | undefined;
  try {
    assertOrigin(request);
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Please sign in to use Voice." }, { status: 401 });
    const activePaidPlan = (user.plan === "pro" || user.plan === "ultra") && user.planStatus === "active" && (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now());
    if (!activePaidPlan) return NextResponse.json({ error: "Voice is available with an active Pro plan." }, { status: 403 });
    const body = await request.json() as { personaSlug?: unknown; conversationId?: unknown };
    const slug = typeof body.personaSlug === "string" ? body.personaSlug.trim().toLowerCase() : "";
    if (!/^[a-z0-9-]{1,160}$/.test(slug)) return NextResponse.json({ error: "That persona is unavailable for Voice." }, { status: 404 });
    if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: "Voice is not configured yet. Please try again later." }, { status: 503 });

    let context = "";
    let textConversationId: string | null = null;
    if (uuid(body.conversationId)) {
      // A new chat page creates its ID in the browser. Ensure the row exists
      // before reserve_voice_session inserts its foreign key reference.
      await query("INSERT INTO conversations(id,user_id,persona_id,title) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING", [body.conversationId, user.id, slug, `Voice conversation with ${slug}`.slice(0, 240)]);
      const ownedConversation = await query<{ id: string }>("SELECT id FROM conversations WHERE id=$1 AND user_id=$2", [body.conversationId, user.id]);
      if (!ownedConversation.rows[0]) return NextResponse.json({ error: "That conversation is unavailable." }, { status: 404 });
      textConversationId = body.conversationId;
      const messages = await query<{ role: string; content: string }>("SELECT m.role,m.content FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2 ORDER BY m.created_at DESC LIMIT 8", [body.conversationId, user.id]);
      context = messages.rows.reverse().map((message) => `${message.role === "assistant" ? "Persona" : "User"}: ${message.content.slice(0, 700)}`).join("\n").slice(0, 5_000);
    }
    const config = await loadVoiceConfig(slug, user.id, context);
    if (!config) return NextResponse.json({ error: "Voice is unavailable for this persona." }, { status: 404 });
    const reservation = await query<{ allowed: boolean; reason: string; session_id: string; reserved_minutes: number }>("SELECT * FROM reserve_voice_session($1,$2,$3)", [user.id, config.personaId, textConversationId]);
    const state = reservation.rows[0];
    if (!state?.allowed) {
      const status = state?.reason === "pro_required" ? 403 : state?.reason === "monthly_limit" || state?.reason === "rate_limited" ? 429 : 409;
      return NextResponse.json({ error: state?.reason === "pro_required" ? "Voice is available with an active Pro plan." : state?.reason === "monthly_limit" ? "Your monthly Voice allowance has been reached." : state?.reason === "rate_limited" ? "Too many Voice sessions were started recently. Please try again later." : "A Voice session is already active." }, { status });
    }
    reservedSessionId = state.session_id;
    const signed = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(config.agentId)}`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    const signedBody = await signed.json().catch(() => null) as { signed_url?: unknown; detail?: unknown } | null;
    if (!signed.ok || typeof signedBody?.signed_url !== "string" || !signedBody.signed_url) {
      await query("UPDATE voice_sessions SET status='failed',ended_at=now(),duration_seconds=0,updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('created','connected')", [reservedSessionId, user.id]);
      reservedSessionId = undefined;
      console.error("[voice] ElevenLabs signed URL failed", { status: signed.status, statusText: signed.statusText, agentId: config.agentId, detail: signedBody?.detail ?? signedBody });
      return NextResponse.json({ error: "Voice could not be started right now." }, { status: 502 });
    }
    console.info("[voice] ElevenLabs conversation authorized", { sessionId: state.session_id, persona: slug, agentId: config.agentId });
    return NextResponse.json({ sessionId: state.session_id, reservedMinutes: state.reserved_minutes, signedUrl: signedBody.signed_url, overrides: { agent: { prompt: { prompt: config.prompt }, language: config.language }, tts: { voiceId: config.voiceId, stability: config.voiceSettings.stability, similarityBoost: config.voiceSettings.similarityBoost, speed: config.voiceSettings.speed } } });
  } catch (error) {
    if (reservedSessionId) {
      await query("UPDATE voice_sessions SET status='failed',ended_at=now(),duration_seconds=0,updated_at=now() WHERE id=$1 AND status IN ('created','connected')", [reservedSessionId]).catch(() => undefined);
    }
    console.error("[voice] session creation failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Voice could not be started right now." }, { status: 500 });
  }
}
