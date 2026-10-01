import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { assertOrigin } from "@/lib/server/social";
import { createOwnerSoul, getOwnerSoul, loadOwnerDashboard, updateSoul } from "@/lib/server/mysoul";
import { supabaseAdmin } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const message = (error as Error)?.message ?? "";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to manage MySoul." }, { status: 401 });
  if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
  if (message === "MYSOUL_MISSING") return NextResponse.json({ error: "Create your MySoul first." }, { status: 404 });
  if (["INVALID_FIELD", "INVALID_VISIBILITY", "INVALID_SETTING", "NO_CHANGES", "DISPLAY_NAME_REQUIRED"].includes(message)) return NextResponse.json({ error: message }, { status: 400 });
  console.error("MySoul request failed");
  return NextResponse.json({ error: "Could not complete the MySoul request." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ ok: true, dashboard: await loadOwnerDashboard(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const soul = await createOwnerSoul(user);
    return NextResponse.json({ ok: true, soul }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    return NextResponse.json({ ok: true, soul: await updateSoul(user.id, body) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const body = await request.json() as { confirmation?: unknown };
    const soul = await getOwnerSoul(user.id);
    if (!soul) return NextResponse.json({ ok: true });
    if (body.confirmation !== soul.display_name) return NextResponse.json({ error: "Type your MySoul name to confirm deletion." }, { status: 400 });
    if (!supabaseAdmin) throw new Error("MYSOUL_NOT_CONFIGURED");
    const { error } = await supabaseAdmin.from("mysouls").delete().eq("id", soul.id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
