import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { transaction } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { slug } = await request.json() as { slug?: string };
    if (!slug || !/^[a-z0-9-]{1,160}$/.test(slug)) return NextResponse.json({ error: "Invalid persona." }, { status: 400 });
    const active = await transaction(async (client) => {
      const removed = await client.query("DELETE FROM favorite_personas WHERE user_id = $1 AND persona_slug = $2 RETURNING persona_slug", [user.id, slug]);
      if (removed.rowCount) return false;
      await client.query("INSERT INTO favorite_personas (user_id, persona_slug) VALUES ($1, $2) ON CONFLICT DO NOTHING", [user.id, slug]);
      return true;
    });
    return NextResponse.json({ active });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Favorite toggle failed", error);
    return NextResponse.json({ error: "Could not update favorite." }, { status: 500 });
  }
}
