import { NextResponse } from "next/server";
import { generatePersonaResponse } from "@/lib/ai/persona-engine";
import { parseCustomPersona } from "@/lib/custom-personas";
import type { PersonaMode } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { trackConversation, recordChat } from "@/lib/server/social";
import { query } from "@/lib/server/db";
import { getBooleanSetting } from "@/lib/server/plan";
import { AI_RESERVATION_PROVIDER, recordAIUsage } from "@/lib/server/ai-usage";

const personaModes: PersonaMode[] = ["Casual", "Expert", "Tutor", "Mentor", "Debate", "Interview", "Research", "Creative"];
export const maxDuration = 90;

function parseMode(value: string | undefined): PersonaMode {
  return personaModes.includes(value as PersonaMode) ? (value as PersonaMode) : "Casual";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      personaSlug?: string;
      personaId?: string;
      userMessage?: string;
      mode?: string;
      language?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      memory?: string[];
      researchMode?: boolean;
      customPersona?: unknown;
      selectedExpertise?: string;
      conversationId?: string;
      relationship?: { relationship_level?: string; conversation_count?: number; last_interaction?: string | null; favorite_topics?: string[]; interaction_score?: number };
      plan?: string;
      emotionalContext?: string;
    };

    if (!body.userMessage || !body.userMessage.trim()) {
      return NextResponse.json({ error: "A valid message is required." }, { status: 400 });
    }

    const customPersona = body.customPersona ? parseCustomPersona(body.customPersona) ?? undefined : undefined;
    if (body.customPersona && !customPersona) {
      return NextResponse.json({ error: "The custom persona is incomplete or invalid." }, { status: 400 });
    }

    const viewer = await getAuthenticatedUser();
    if (await getBooleanSetting("maintenance_mode") && viewer?.role !== "admin") return NextResponse.json({ error: "SoulX is in maintenance mode. Please try again soon." }, { status: 503 });
    let selectedModel = process.env.GROQ_MODEL ?? "";
    let reservationDate: string | undefined;
    if (viewer) {
      const usage = await query<{ allowed: boolean; reason: string; daily_limit: number; monthly_limit: number; usage_date: string }>("SELECT *,current_date::text AS usage_date FROM reserve_message($1,$2)", [viewer.id, AI_RESERVATION_PROVIDER]);
      const state = usage.rows[0];
      reservationDate = state?.usage_date;
      if (state && !state.allowed) return NextResponse.json({ error: state.reason === "daily_limit" ? `Daily limit reached (${state.daily_limit} messages).` : "Monthly message limit reached." }, { status: 429 });
      if ((state as { plan_name?: string } | undefined)?.plan_name === "pro") selectedModel = process.env.GROQ_PRO_MODEL ?? selectedModel;
      if ((state as { plan_name?: string } | undefined)?.plan_name === "ultra") selectedModel = process.env.GROQ_ULTRA_MODEL ?? process.env.GROQ_PRO_MODEL ?? selectedModel;
    }

    const response = await generatePersonaResponse({
      personaSlug: body.personaSlug,
      personaId: body.personaId,
      userMessage: body.userMessage,
      mode: parseMode(body.mode),
      language: body.language,
      history: body.history,
      memory: body.memory,
      researchMode: body.researchMode,
      customPersona,
      selectedExpertise: body.selectedExpertise,
      model: selectedModel,
      relationship: body.relationship ? {
        relationship_level: (body.relationship.relationship_level as "New" | "Familiar" | "Trusted" | "Close") ?? "New",
        conversation_count: body.relationship.conversation_count ?? 0,
        last_interaction: body.relationship.last_interaction ?? null,
        favorite_topics: body.relationship.favorite_topics ?? [],
        interaction_score: body.relationship.interaction_score ?? 0,
      } : undefined,
      plan: body.plan,
      emotionalContext: body.emotionalContext,
    });

    if (!response.ok) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }
    const assistantContent = response.content ?? "";
    if (viewer && reservationDate && response.provider) {
      const tokens = Math.ceil((body.userMessage.length + assistantContent.length) / 4);
      await recordAIUsage(viewer.id, reservationDate, { provider: response.provider, usage: response.usage }, tokens)
        .catch(() => console.warn("[ai-usage]", JSON.stringify({ status: "write_failed", provider: response.provider })));
    }

    if (viewer && body.personaSlug) {
      await trackConversation(viewer.id, body.personaSlug, body.personaId ?? crypto.randomUUID()).catch(() => undefined);
      if (body.conversationId && /^[0-9a-f-]{36}$/i.test(body.conversationId)) {
        await recordChat(
          viewer.id,
          body.personaSlug,
          body.conversationId,
          body.userMessage,
          assistantContent,
          response.provider ?? "deepseek",
          response.model ?? selectedModel,
        ).catch(() => undefined);
      }
    }

    return NextResponse.json({
      ok: true,
      persona: response.persona,
      content: response.content,
    });
  } catch {
    return NextResponse.json({ error: "Unable to process the chat request." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "SoulX chat API is ready for server-side AI requests.",
  });
}
