import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { assertOrigin } from "@/lib/server/social";
import { loadVoiceConfig } from "@/lib/server/voice";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await getAuthenticatedUser();
    const activePro = user && (user.plan === "pro" || user.plan === "ultra") && user.planStatus === "active" && (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now());
    if (!activePro) return NextResponse.json({ error: "Voice is available with an active Pro plan." }, { status: 403 });
    const body = await request.json() as { personaSlug?: unknown; text?: unknown };
    const slug = typeof body.personaSlug === "string" ? body.personaSlug.trim().toLowerCase() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!/^[a-z0-9-]{1,160}$/.test(slug) || !text || text.length > 5_000) return NextResponse.json({ error: "Invalid voice request." }, { status: 400 });
    if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: "Voice is not configured." }, { status: 503 });
    const config = await loadVoiceConfig(slug, user.id, "");
    if (!config?.voiceId) return NextResponse.json({ error: "Voice is unavailable for this persona." }, { status: 404 });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: config.voiceSettings.stability, similarity_boost: config.voiceSettings.similarityBoost, speed: config.voiceSettings.speed } }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      // ElevenLabs does not include the API key in response bodies. Logging the
      // bounded upstream detail preserves the real diagnostic without exposing
      // credentials or the user's chat text.
      const detail = (await response.text()).slice(0, 500);
      console.error("[voice] ElevenLabs TTS failed", { status: response.status, statusText: response.statusText, detail });
      return NextResponse.json({ error: "Voice could not be generated." }, { status: 502 });
    }
    return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Voice could not be generated." }, { status: 500 }); }
}
