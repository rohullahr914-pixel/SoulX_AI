import { callAI } from "@/lib/ai/router";
import { buildPromptMessages } from "@/lib/ai/prompt-engine/builder";
import type { PersonaRelationshipState } from "@/lib/ai/persona-conversation-engine";
import { customPersonaToPersona, type CustomPersona } from "@/lib/custom-personas";
import { getPersonaBySlug } from "@/lib/personas";
import type { PersonaMode } from "@/lib/types";

export type PersonaEngineRequest = {
  personaId?: string;
  personaSlug?: string;
  userMessage: string;
  mode?: PersonaMode;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  language?: string;
  memory?: string[];
  researchMode?: boolean;
  customPersona?: CustomPersona;
  selectedExpertise?: string;
  model?: string;
  relationship?: PersonaRelationshipState;
  plan?: string;
  emotionalContext?: string;
};

export async function generatePersonaResponse(request: PersonaEngineRequest) {
  const persona = request.customPersona
    ? customPersonaToPersona(request.customPersona)
    : request.personaId
      ? getPersonaBySlug(request.personaId)
      : request.personaSlug
        ? getPersonaBySlug(request.personaSlug)
        : undefined;

  if (!persona) {
    return { ok: false, error: "Invalid persona. Please select a valid persona to continue." };
  }

  const messages = buildPromptMessages({
    persona,
    userMessage: request.userMessage,
    mode: request.mode ?? "Casual",
    language: request.language,
    history: request.history,
    memory: request.memory,
    researchMode: request.researchMode,
    selectedExpertise: request.selectedExpertise,
    relationship: request.relationship,
    plan: request.plan,
    emotionalContext: request.emotionalContext,
  });

  const result = await callAI(messages, { model: request.model, task: request.researchMode ? "research" : "chat" });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "The AI response could not be generated.",
    };
  }

  return {
    ok: true,
    persona,
    content: result.content ?? "",
    provider: result.provider,
    model: result.model,
    usage: result.usage,
  };
}
