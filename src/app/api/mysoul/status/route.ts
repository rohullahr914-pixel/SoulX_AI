import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { requireMysoulDb } from "@/lib/server/mysoul";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await requireMysoulDb().from("mysouls").select("id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, exists: Boolean(data) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to check MySoul." }, { status: 401 });
    if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
    console.error("MySoul status read failed");
    return NextResponse.json({ error: "Could not check MySoul." }, { status: 500 });
  }
}
