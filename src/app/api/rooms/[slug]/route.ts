import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireUser } from "@/lib/server/auth";
import { findVisibleRoom, removeRoom, updateRoom } from "@/lib/server/rooms";
import { assertOrigin } from "@/lib/server/social";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const user = await getAuthenticatedUser();
    const room = await findVisibleRoom(slug, user?.id);
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    return NextResponse.json({ room, canEdit: Boolean(user && room.creatorId === user.id && !room.isOfficial) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const { slug } = await params;
    const room = await updateRoom(user.id, slug, await request.json());
    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update the Room." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    assertOrigin(_);
    const user = await requireUser();
    const { slug } = await params;
    await removeRoom(user.id, slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete the Room." }, { status: 400 });
  }
}
