import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireUser } from "@/lib/server/auth";
import { findVisibleRoom, loadRoomMessages, sendRoomMessage } from "@/lib/server/rooms";
import { assertOrigin } from "@/lib/server/social";

export const maxDuration = 90;
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ messages: [], hasMore: false });
    const { slug } = await params;
    const room = await findVisibleRoom(slug, user.id);
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    return NextResponse.json(await loadRoomMessages(user.id, room, before), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load the conversation." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const { slug } = await params;
    const room = await findVisibleRoom(slug, user.id);
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    const body = await request.json() as { message?: unknown };
    const messages = await sendRoomMessage(user.id, room, typeof body.message === "string" ? body.message : "");
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the Room message.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" || message === "SUSPENDED" ? 401 : 400 });
  }
}
