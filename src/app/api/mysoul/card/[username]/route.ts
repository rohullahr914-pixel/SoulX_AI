import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { getMySoulMetadata } from "@/lib/server/mysoul";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    const viewer = await getAuthenticatedUser();
    const profile = await getMySoulMetadata(username, viewer);
    return NextResponse.json({ ok: true, profile }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("MySoul profile card read failed");
    return NextResponse.json({ error: "Could not load the MySoul profile card." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
