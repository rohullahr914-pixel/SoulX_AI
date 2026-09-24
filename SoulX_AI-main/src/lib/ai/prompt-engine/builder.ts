import { buildMemoryPrompt } from "@/lib/ai/prompt-engine/memory-prompt";
import { buildModePrompt } from "@/lib/ai/prompt-engine/mode-prompt";
import { buildPersonaPrompt } from "@/lib/ai/prompt-engine/persona-prompt";
import { buildResearchPrompt } from "@/lib/ai/prompt-engine/research-prompt";
import { buildSafetyPrompt } from "@/lib/ai/prompt-engine/safety-prompt";
import type { PersonaRelationshipState } from "@/lib/ai/persona-conversation-engine";
import type { Persona, PersonaMode } from "@/lib/types";

export type PromptContext = {
  persona: Persona;
  userMessage: string;
  mode: PersonaMode;
  language?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  memory?: string[];
  researchMode?: boolean;
  multiPersona?: boolean;
  participantNames?: string[];
  selectedExpertise?: string;
  relationship?: PersonaRelationshipState;
  plan?: string;
  emotionalContext?: string;
};

export function buildPersonaSystemPrompt(context: PromptContext) {
  const personaPrompt = buildPersonaPrompt(context.persona, {
    userMessage: context.userMessage,
    mode: context.mode,
    language: context.language,
    history: context.history,
    memory: context.memory,
    researchMode: context.researchMode,
    multiPersona: context.multiPersona,
    participantNames: context.participantNames,
    selectedExpertise: context.selectedExpertise,
    relationship: context.relationship,
    plan: context.plan,
    emotionalContext: context.emotionalContext,
  });
  const modePrompt = buildModePrompt(context.mode);
  const safetyPrompt = buildSafetyPrompt();
  const memoryPrompt = buildMemoryPrompt(context.memory ?? []);
  const researchPrompt = context.researchMode ? buildResearchPrompt(context.persona) : "";
  const languagePrompt = context.language ? `Reply in ${context.language} unless the user clearly asks for another language.` : "";

  const segments = [
    personaPrompt,
    modePrompt,
    safetyPrompt,
    memoryPrompt,
    researchPrompt,
    languagePrompt,
    context.selectedExpertise ? `For NEXUS, focus exclusively on the selected expertise: ${context.selectedExpertise}. Keep examples, recommendations, and depth centered on this expertise unless the user explicitly changes it.` : "",
    context.multiPersona && context.participantNames?.length
      ? `You are speaking in a multi-persona discussion with ${context.participantNames.join(", ")}. Maintain your distinct identity, perspective, and tone.`
      : "",
    "Response priority: answer the user's actual message first, preserve the persona's identity and style, remain grounded in public facts, and keep the exchange natural rather than meta.",
  ].filter(Boolean);

  return segments.join("\n\n");
}

export function buildPromptMessages(context: PromptContext) {
  const systemPrompt = buildPersonaSystemPrompt(context);
  const history = (context.history ?? []).slice(-6).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  return [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...history,
    {
      role: "user" as const,
      content: context.userMessage,
    },
  ];
}
