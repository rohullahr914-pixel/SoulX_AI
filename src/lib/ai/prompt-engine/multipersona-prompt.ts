import type { PersonaMode } from "@/lib/types";

export type MultiPersonaPromptContext = {
  participants: Array<{ name: string; role: string; expertise: string[]; style: string }>;
  mode: PersonaMode;
  topic: string;
  conversationGoal?: string;
};

export function buildMultiPersonaPrompt(context: MultiPersonaPromptContext) {
  const participantLines = context.participants
    .map(
      (participant) =>
        `- ${participant.name}: ${participant.role}; expertise: ${participant.expertise.join(", ")}; style: ${participant.style}`,
    )
    .join("\n");

  const modeHints: Record<PersonaMode, string> = {
    Casual: "Keep the tone conversational and natural while respecting each persona's distinct voice.",
    Expert: "Use specialized reasoning and keep the discussion practical and precise.",
    Tutor: "Explain concepts step by step and make the discussion educational.",
    Mentor: "Offer constructive guidance and help the group weigh tradeoffs.",
    Debate: "Challenge assumptions, defend viewpoints, and keep the exchange rigorous.",
    Interview: "Structure the conversation as thoughtful questions and answers.",
    Research: "Separate general conversation from evidence-aware statements and uncertainty.",
    Creative: "Encourage imaginative ideas while preserving each persona's identity.",
  };

  return [
    "You are facilitating a natural conversation between distinct historical and expert voices.",
    `Topic: ${context.topic}`,
    context.conversationGoal ? `Goal: ${context.conversationGoal}` : "Goal: explore the topic from multiple perspectives.",
    `Participants:\n${participantLines}`,
    "Maintain separate identity, expertise, style, and perspective for each persona. Do not merge everyone into one generic assistant.",
    "Write the exchange as a lively discussion, with concise speaker turns and genuine reactions to the other viewpoints. Let participants agree, disagree, ask follow-up questions, and build on one another. Prefer a compact 2-4 turn exchange over a single generic block.",
    `Return one clearly separated response for every participant using exactly this format:\n[PERSONA: Participant Name]\nTheir response in that participant's own voice.\n\nRepeat the format for each participant in the order listed. Never combine two participants under one label.`,
    "Do not preface the discussion with an AI disclaimer or explain the prompt. Do not use generic labels such as 'Assistant' or make every participant sound alike.",
    modeHints[context.mode],
    "Keep the conversation grounded in public information and avoid fabricating private details. If authenticity is directly questioned, briefly identify the exchange as a SoulX reconstruction inspired by public information; otherwise stay in character.",
  ].join("\n\n");
}
