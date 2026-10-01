import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { assertOrigin } from "@/lib/server/social";
import { getOwnerSoul, RECORD_FIELDS, RECORD_TABLES, refreshMysoulScore, sanitizeRecord, trackMysoulEvent } from "@/lib/server/mysoul";
import { supabaseAdmin } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get("collection");
    const rawOffset = Number(searchParams.get("offset") ?? "0");
    if (collection !== "memories" || !Number.isSafeInteger(rawOffset) || rawOffset < 0 || rawOffset > 100_000) {
      return NextResponse.json({ error: "Choose a valid MySoul page." }, { status: 400 });
    }
    const soul = await getOwnerSoul(user.id);
    if (!soul) throw new Error("MYSOUL_MISSING");
    const { data, error } = await supabaseAdmin!.from("mysoul_memories").select("*").eq("mysoul_id", soul.id)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(rawOffset, rawOffset + 25);
    if (error) throw error;
    const records = data ?? [];
    const hasMore = records.length > 25;
    return NextResponse.json({ ok: true, records: hasMore ? records.slice(0, 25) : records, hasMore }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return replyError(error); }
}

function replyError(error: unknown) {
  const message = (error as Error)?.message ?? "";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to manage MySoul." }, { status: 401 });
  if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
  if (message === "MYSOUL_MISSING") return NextResponse.json({ error: "Create your MySoul first." }, { status: 404 });
  if (["INVALID_COLLECTION", "INVALID_FIELD", "INVALID_VISIBILITY"].includes(message)) return NextResponse.json({ error: "Check the MySoul item fields and try again." }, { status: 400 });
  console.error("MySoul record request failed");
  return NextResponse.json({ error: "Could not save this MySoul item." }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const body = await request.json() as { collection?: unknown; record?: unknown };
    const collection = typeof body.collection === "string" ? body.collection : "";
    const table = RECORD_TABLES[collection];
    if (!table || !body.record || typeof body.record !== "object" || Array.isArray(body.record)) throw new Error("INVALID_COLLECTION");
    const soul = await getOwnerSoul(user.id);
    if (!soul) throw new Error("MYSOUL_MISSING");
    const raw = body.record as Record<string, unknown>;
    const row = sanitizeRecord(collection, raw);
    row.mysoul_id = soul.id;
    if (collection !== "training_samples" && !Object.hasOwn(raw, "visibility")) {
      const alwaysPrivate = ["memories", "people", "personality_answers", "preferences", "values", "goals", "knowledge"].includes(collection);
      row.visibility = alwaysPrivate ? "private" : soul.default_visibility ?? "private";
    }
    if (collection === "training_samples") {
      const { count, error } = await supabaseAdmin!.from(table).select("id", { count: "exact", head: true }).eq("mysoul_id", soul.id);
      if (error) throw error;
      if ((count ?? 0) >= 50) return NextResponse.json({ error: "MySoul can analyze up to 50 private training samples. Remove a sample before adding another." }, { status: 400 });
    }
    const id = typeof raw.id === "string" && /^[0-9a-f-]{36}$/i.test(raw.id) ? raw.id : null;
    const conflictTargets: Record<string, string> = {
      traits: "mysoul_id,trait", personality_answers: "mysoul_id,question_key", interests: "mysoul_id,interest",
      values: "mysoul_id,value", preferences: "mysoul_id,category,key",
    };
    let result;
    if (id) {
      delete row.mysoul_id;
      const changes = { ...row };
      delete changes.id;
      result = await supabaseAdmin!.from(table).update(changes).eq("id", id).eq("mysoul_id", soul.id).select("*").maybeSingle();
    } else if (conflictTargets[collection]) {
      result = await supabaseAdmin!.from(table).upsert(row, { onConflict: conflictTargets[collection] }).select("*").single();
    } else {
      result = await supabaseAdmin!.from(table).insert(row).select("*").single();
    }
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "That item could not be found." }, { status: 404 });
    if (collection !== "training_samples") await refreshMysoulScore(soul);
    await trackMysoulEvent(soul.id, "mysoul_updated");
    const data = collection === "training_samples" ? { id: result.data.id, sample_type: result.data.sample_type, created_at: result.data.created_at } : result.data;
    return NextResponse.json({ ok: true, record: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return replyError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const body = await request.json() as { collection?: unknown; id?: unknown; confirmClear?: unknown };
    const collection = typeof body.collection === "string" ? body.collection : "";
    const table = RECORD_TABLES[collection];
    if (!table || !Object.hasOwn(RECORD_FIELDS, collection)) throw new Error("INVALID_COLLECTION");
    const soul = await getOwnerSoul(user.id);
    if (!soul) throw new Error("MYSOUL_MISSING");
    let deletion = supabaseAdmin!.from(table).delete().eq("mysoul_id", soul.id);
    if (body.id === "all" && collection === "training_samples" && body.confirmClear === true) {
      // The explicit owner confirmation is checked in the UI before removing private examples.
    } else if (typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)) deletion = deletion.eq("id", body.id);
    else return NextResponse.json({ error: "Choose a valid item to remove." }, { status: 400 });
    const { error } = await deletion;
    if (error) throw error;
    if (collection !== "training_samples") await refreshMysoulScore(soul);
    await trackMysoulEvent(soul.id, "mysoul_updated");
    return NextResponse.json({ ok: true });
  } catch (error) { return replyError(error); }
}
