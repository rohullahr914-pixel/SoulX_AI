import { NextResponse } from "next/server";
import { parseCustomPersona } from "@/lib/custom-personas";
import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { getPlanContext } from "@/lib/server/plan";

export async function GET() {
  try {
    const user = await requireUser();
    const result = await query<{ definition: unknown }>("SELECT definition FROM personas WHERE creator_id = $1 AND visibility = 'Private' ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ personas: result.rows.map((row) => row.definition) });
  } catch (error) { if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ personas: [] }); return NextResponse.json({ error: "Could not load Personas." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(); const body = await request.json() as { persona?: unknown }; const persona = parseCustomPersona(body.persona);
    if (!persona || !persona.id.startsWith("custom-")) return NextResponse.json({ error: "Invalid Persona." }, { status: 400 });
    const [plan, existing] = await Promise.all([
      getPlanContext(user.id),
      query<{ count: string }>("SELECT count(*)::int count FROM personas WHERE creator_id=$1 AND visibility='Private'", [user.id]),
    ]);
    const alreadyExists = await query("SELECT 1 FROM personas WHERE slug=$1 AND creator_id=$2", [persona.id, user.id]);
    if (!alreadyExists.rows.length && Number(existing.rows[0]?.count ?? 0) >= plan.personaLimit) return NextResponse.json({ error: `Your ${plan.plan} plan allows ${plan.personaLimit} custom Personas.` }, { status: 403 });
    await query(`INSERT INTO personas(slug,creator_id,name,description,definition,visibility) VALUES($1,$2,$3,$4,$5,'Private')
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name,description=excluded.description,definition=excluded.definition,updated_at=now() WHERE personas.creator_id=$2`, [persona.id, user.id, persona.name, persona.description, JSON.stringify(persona)]);
    return NextResponse.json({ ok: true });
  } catch (error) { if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ error: "Could not save Persona." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try { const user = await requireUser(); const slug = new URL(request.url).searchParams.get("slug") ?? ""; await query("DELETE FROM personas WHERE slug=$1 AND creator_id=$2", [slug, user.id]); return NextResponse.json({ ok: true }); }
  catch (error) { if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ error: "Could not delete Persona." }, { status: 500 }); }
}
