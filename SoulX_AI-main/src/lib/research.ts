export type ResearchStatus = {
  enabled: boolean;
  message: string;
};

export type ResearchResult = {
  ok: boolean;
  query: string;
  answer?: string;
  sources?: Array<{ title: string; url: string; note: string }>;
  message?: string;
};

import { callAI } from "@/lib/ai/router";

export function getResearchStatus(): ResearchStatus {
  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());

  return {
    enabled: hasKey,
    message: hasKey
      ? "Research mode is configured and ready for evidence-aware responses."
      : "Research functionality requires an AI provider configuration.",
  };
}

export async function runResearchQuery(query: string): Promise<ResearchResult> {
  const status = getResearchStatus();

  if (!status.enabled) {
    return {
      ok: false,
      query,
      message: "Research mode requires an AI provider configuration.",
    };
  }

  const response = await callAI([
    {
      role: "system",
      content: "You are a careful research assistant. Answer clearly using established knowledge, distinguish facts from interpretation, state uncertainty when relevant, and do not invent citations or source links. Keep the answer concise but useful.",
    },
    { role: "user", content: `Research question: ${query}` },
  ], { task: "research" });

  if (!response.ok) {
    return { ok: false, query, message: response.error ?? "Research could not be completed." };
  }

  return { ok: true, query, answer: response.content, sources: [] };
}
