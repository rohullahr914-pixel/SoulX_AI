import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { assertOrigin } from "@/lib/server/social";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Please sign in to use Voice." }, { status: 401 });

    const body = await request.json() as { sessionId?: unknown; eventId?: unknown; role?: unknown; content?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const eventId = typeof body.eventId === "number" && Number.isInteger(body.eventId) && body.eventId >= 0 ? body.eventId : null;
    const role = body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(sessionId) || eventId === null || !role || !content || content.length > 50_000) {
      return NextResponse.json({ error: "Invalid voice transcript." }, { status: 400 });
    }

    const session = await query<{ conversation_id: string }>(
      "SELECT vs.text_conversation_id AS conversation_id FROM voice_sessions vs JOIN conversations c ON c.id=vs.text_conversation_id AND c.user_id=vs.user_id WHERE vs.id=$1 AND vs.user_id=$2 AND vs.status IN ('created','connected','ended')",
      [sessionId, user.id],
    );
    const conversationId = session.rows[0]?.conversation_id;
    if (!conversationId) return NextResponse.json({ error: "Voice session is no longer active." }, { status: 409 });

    await query(
      "INSERT INTO messages(conversation_id,user_id,role,content,voice_session_id,voice_event_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (voice_session_id,voice_event_id) WHERE voice_session_id IS NOT NULL AND voice_event_id IS NOT NULL DO NOTHING",
      [conversationId, user.id, role, content, sessionId, eventId],
    );
    await query("UPDATE conversations SET updated_at=now() WHERE id=$1 AND user_id=$2", [conversationId, user.id]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to save the voice transcript." }, { status: 500 });
  }
}
