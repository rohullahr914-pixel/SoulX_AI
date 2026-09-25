import { NextResponse } from "next/server";
import { buildMultiPersonaPrompt } from "@/lib/ai/prompt-engine/multipersona-prompt";
import { callAI } from "@/lib/ai/router";
import type { PersonaMode } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { getBooleanSetting } from "@/lib/server/plan";
import { AI_RESERVATION_PROVIDER, recordAIUsage } from "@/lib/server/ai-usage";

const personaModes: PersonaMode[] = ["Casual", "Expert", "Tutor", "Mentor", "Debate", "Interview", "Research", "Creative"];
export const maxDuration = 90;

function parseMode(value: string | undefined): PersonaMode {
  return personaModes.includes(value as PersonaMode) ? (value as PersonaMode) : "Debate";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topic?: string;
      message?: string;
      mode?: string;
      participants?: Array<{
        name: string;
        role: string;
        expertise: string[];
        style: string;
      }>;
      conversationGoal?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const topic = (body.message ?? body.topic ?? "").trim();
    if (!topic) {
      return NextResponse.json({ error: "A valid topic or message is required." }, { status: 400 });
    }
    const viewer = await getAuthenticatedUser();
    if (await getBooleanSetting("maintenance_mode") && viewer?.role !== "admin") return NextResponse.json({ error: "SoulX is in maintenance mode. Please try again soon." }, { status: 503 });
    let reservationDate: string | undefined;
    if (viewer) {
      const usage = await query<{ allowed: boolean; reason: string; daily_limit: number; usage_date: string }>("SELECT *,current_date::text AS usage_date FROM reserve_message($1,$2)", [viewer.id, AI_RESERVATION_PROVIDER]);
      reservationDate = usage.rows[0]?.usage_date;
      if (usage.rows[0] && !usage.rows[0].allowed) return NextResponse.json({ error: usage.rows[0].reason === "daily_limit" ? `Daily limit reached (${usage.rows[0].daily_limit} messages).` : "Monthly message limit reached." }, { status: 429 });
    }

    const participants = body.participants?.length ? body.participants : [
      {
        name: "Albert Einstein",
        role: "Theoretical Physicist",
        expertise: ["Physics", "Relativity", "Scientific imagination"],
        style: "Clear, thoughtful, and analogy-driven",
      },
      {
        name: "Leonardo da Vinci",
        role: "Artist and Inventor",
        expertise: ["Art", "Observation", "Invention"],
        style: "Observant, poetic, and exploratory",
      },
    ];

    const prompt = buildMultiPersonaPrompt({
      participants,
      topic,
      mode: parseMode(body.mode),
      conversationGoal: body.conversationGoal ?? "Explore the issue from multiple expert viewpoints.",
    });

    const result = await callAI([
      { role: "system", content: prompt },
      ...(body.history ?? []).slice(-8),
      { role: "user", content: topic },
    ], { task: "chat" });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Multi-persona response failed." }, { status: 400 });
    }

    if (viewer && reservationDate) {
      const estimatedTokens = Math.ceil((prompt.length + topic.length + (result.content?.length ?? 0)) / 4);
      await recordAIUsage(viewer.id, reservationDate, result, estimatedTokens)
        .catch(() => console.warn("[ai-usage]", JSON.stringify({ status: "write_failed", provider: result.provider })));
    }
    return NextResponse.json({ ok: true, content: result.content });
  } catch {
    return NextResponse.json({ error: "Unable to generate the multi-persona discussion." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Multi-persona chat API is ready.",
  });
}
