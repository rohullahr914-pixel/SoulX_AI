import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getOwnerSoul, RECORD_TABLES } from "@/lib/server/mysoul";
import { supabaseAdmin } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readAll(table: string, mysoulId: string, columns = "*") {
  if (!supabaseAdmin) throw new Error("MYSOUL_NOT_CONFIGURED");
  const result: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabaseAdmin.from(table).select(columns).eq("mysoul_id", mysoulId).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (table === "mysoul_conversations") query = query.eq("visitor_consented_to_history", true);
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    result.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return result;
}

async function readAllMessages(conversationIds: string[]) {
  if (!supabaseAdmin) throw new Error("MYSOUL_NOT_CONFIGURED");
  const messages: Record<string, unknown>[] = [];
  for (let start = 0; start < conversationIds.length; start += 100) {
    const conversationBatch = conversationIds.slice(start, start + 100);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.from("mysoul_messages").select("*").in("conversation_id", conversationBatch)
        .order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 999);
      if (error) throw error;
      messages.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return messages;
}

export async function GET() {
  try {
    const user = await requireUser();
    const soul = await getOwnerSoul(user.id);
    if (!soul) return NextResponse.json({ error: "Create your MySoul before exporting it." }, { status: 404 });
    if (!supabaseAdmin) throw new Error("MYSOUL_NOT_CONFIGURED");
    const recordTables = Object.fromEntries(await Promise.all(Object.entries(RECORD_TABLES).map(async ([key, table]) => [key, await readAll(table, soul.id)] as const)));
    const [communication, teachingHistory, analytics, topicAnalytics, conversations] = await Promise.all([
      supabaseAdmin.from("mysoul_communication_profile").select("*").eq("mysoul_id", soul.id).maybeSingle(),
      readAll("mysoul_teaching_history", soul.id),
      readAll("mysoul_analytics_events", soul.id),
      supabaseAdmin.from("mysoul_topic_analytics").select("topic_category,question_count,updated_at").eq("mysoul_id", soul.id).order("question_count", { ascending: false }),
      readAll("mysoul_conversations", soul.id, "id,visitor_consented_to_history,created_at,updated_at"),
    ]);
    const conversationRows = conversations as Array<Record<string, unknown>>;
    const conversationIds = conversationRows.map((conversation) => String(conversation.id));
    if (communication.error || topicAnalytics.error) throw communication.error ?? topicAnalytics.error;
    const messages = await readAllMessages(conversationIds);
    const exportData = {
      format: "soulx-mysoul-export-v1",
      exported_at: new Date().toISOString(),
      mysoul: soul,
      ...recordTables,
      communication_profile: communication.data,
      teaching_history: teachingHistory,
      analytics_events: analytics,
      topic_analytics: topicAnalytics.data ?? [],
      conversations: conversationRows,
      messages,
    };
    const filename = `mysoul-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to export MySoul." }, { status: 401 });
    if (message === "MYSOUL_NOT_CONFIGURED") return NextResponse.json({ error: "MySoul storage is not configured yet." }, { status: 503 });
    console.error("MySoul export failed");
    return NextResponse.json({ error: "Could not export MySoul." }, { status: 500 });
  }
}
