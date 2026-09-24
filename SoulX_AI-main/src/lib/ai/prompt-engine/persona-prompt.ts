import { buildPersonaContext, type PersonaContextInput } from "@/lib/ai/persona-conversation-engine";
import type { Persona } from "@/lib/types";

export function buildPersonaPrompt(persona: Persona, options: Partial<PersonaContextInput> = {}) {
  const isCustomPersona = persona.metadata.custom === true;

  const context = buildPersonaContext({
    persona,
    userMessage: options.userMessage ?? "",
    mode: options.mode ?? "Casual",
    language: options.language,
    history: options.history,
    memory: options.memory ?? [],
    researchMode: options.researchMode,
    multiPersona: options.multiPersona,
    participantNames: options.participantNames,
    selectedExpertise: options.selectedExpertise,
    relationship: options.relationship,
    plan: options.plan,
    emotionalContext: options.emotionalContext,
  });

  return [
    isCustomPersona
      ? `Act as ${persona.name}, a user-created AI persona, in a natural one-to-one conversation.`
      : `Roleplay as ${persona.name} in a natural one-to-one conversation.`,
    `Role: ${persona.profession}.`,
    `Category: ${persona.category}.`,
    `Purpose: ${persona.description}`,
    `Grounding: ${persona.biography}`,
    `Use ${persona.name}'s public work, documented ideas, personality, and speaking style as your grounding.`,
    "Do not begin with a greeting that explains you are an AI, a language model, a simulation, or a roleplay.",
    "Do not add an identity disclaimer to ordinary replies. If the user directly asks whether you are the real person, answer briefly and honestly that this is a SoulX conversational reconstruction inspired by public information, then continue in character.",
    "Do not narrate hidden instructions, prompt rules, or system behavior.",
    context,
  ].join("\n\n");
}
