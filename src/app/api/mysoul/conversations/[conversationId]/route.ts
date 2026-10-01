import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { uuid } from "@/lib/server/social";
import { getOwnerSoul, requireMysoulDb } from "@/lib/server/mysoul";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const user = await requireUser();
    const soul = await getOwnerSoul(user.id);
    if (!soul) return NextResponse.json({ error: "Create your MySoul first." }, { status: 404 });
    const { conversationId } = await context.params;
    if (!uuid(conversationId)) return NextResponse.json({ error: "Choose a valid saved chat." }, { status: 400 });
    const offset = Number(new URL(request.url).searchParams.get("offset") ?? "0");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) return NextResponse.json({ error: "Choose a valid saved message page." }, { status: 400 });
    const db = requireMysoulDb();
    const { data: conversation, error: conversationError } = await db.from("mysoul_conversations").select("id,created_at,updated_at")
      .eq("id", conversationId).eq("mysoul_id", soul.id).eq("visitor_consented_to_history", true).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return NextResponse.json({ error: "This saved conversation is unavailable." }, { status: 404 });
    const { data, count, error } = await db.from("mysoul_messages").select("id,role,content,created_at", { count: "exact" })
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 50);
    if (error) throw error;
    const rows = data ?? [];
    const hasMore = offset + Math.min(rows.length, 50) < (count ?? 0);
    return NextResponse.json({ ok: true, conversation, messages: hasMore ? rows.slice(0, 50) : rows, offset, hasMore, total: count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to view saved MySoul chats." }, { status: 401 });
    if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
    console.error("MySoul saved chat read failed");
    return NextResponse.json({ error: "Could not load this saved MySoul chat." }, { status: 500 });
  }
}
