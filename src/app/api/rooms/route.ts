import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireUser } from "@/lib/server/auth";
import { createRoom, listVisibleRooms } from "@/lib/server/rooms";
import { assertOrigin } from "@/lib/server/social";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getAuthenticatedUser();
    const rooms = await listVisibleRooms(viewer?.id);
    return NextResponse.json({
      featured: rooms.filter((room) => room.isOfficial),
      mine: viewer ? rooms.filter((room) => room.creatorId === viewer.id) : [],
      community: rooms.filter((room) => !room.isOfficial && room.visibility === "Public" && room.creatorId !== viewer?.id),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Rooms are unavailable right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const room = await createRoom(user.id, await request.json());
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the Room.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" || message === "SUSPENDED" ? 401 : 400 });
  }
}
