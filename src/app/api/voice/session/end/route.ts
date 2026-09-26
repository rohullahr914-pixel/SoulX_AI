import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { assertOrigin } from "@/lib/server/social";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId, action } = await request.json() as { sessionId?: string; action?: "connected" | "ended" };
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "Invalid Voice session." }, { status: 400 });
    if (action === "connected") {
      await query("UPDATE voice_sessions SET status='connected',updated_at=now() WHERE id=$1 AND user_id=$2 AND status='created'", [sessionId, user.id]);
    } else {
      await query("UPDATE voice_sessions SET status='ended',ended_at=now(),duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM now()-started_at)::integer),updated_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('created','connected')", [sessionId, user.id]);
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to end Voice session." }, { status: 500 }); }
}
