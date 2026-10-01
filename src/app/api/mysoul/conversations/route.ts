import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getOwnerSoul, requireMysoulDb } from "@/lib/server/mysoul";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const soul = await getOwnerSoul(user.id);
    if (!soul) return NextResponse.json({ error: "Create your MySoul first." }, { status: 404 });
    const offset = Number(new URL(request.url).searchParams.get("offset") ?? "0");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) return NextResponse.json({ error: "Choose a valid saved chat page." }, { status: 400 });
    const db = requireMysoulDb();
    const { data, count, error } = await db.from("mysoul_conversations")
      .select("id,created_at,updated_at", { count: "exact" })
      .eq("mysoul_id", soul.id).eq("visitor_consented_to_history", true)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 20);
    if (error) throw error;
    const rows = data ?? [];
    const hasMore = offset + Math.min(rows.length, 20) < (count ?? 0);
    return NextResponse.json({ ok: true, conversations: hasMore ? rows.slice(0, 20) : rows, offset, hasMore, total: count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to view saved MySoul chats." }, { status: 401 });
    if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
    console.error("MySoul saved chat list failed");
    return NextResponse.json({ error: "Could not load saved MySoul chats." }, { status: 500 });
  }
}
