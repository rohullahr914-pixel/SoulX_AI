import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { transaction } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as { id?: string; personaName?: string; personaSlug?: string; content?: string };
    if (!body.id || !body.personaName || !body.content || body.id.length > 255 || body.content.length > 50_000) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    const message = { id: body.id, personaName: body.personaName, personaSlug: body.personaSlug, content: body.content };
    const active = await transaction(async (client) => {
      const removed = await client.query("DELETE FROM liked_messages WHERE user_id = $1 AND id = $2 RETURNING id", [user.id, message.id]);
      if (removed.rowCount) return false;
      await client.query("INSERT INTO liked_messages (id, user_id, persona_name, persona_slug, content) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", [message.id, user.id, message.personaName.slice(0, 160), message.personaSlug?.slice(0, 160) ?? null, message.content]);
      return true;
    });
    return NextResponse.json({ active });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Liked message toggle failed", error);
    return NextResponse.json({ error: "Could not update message." }, { status: 500 });
  }
}
