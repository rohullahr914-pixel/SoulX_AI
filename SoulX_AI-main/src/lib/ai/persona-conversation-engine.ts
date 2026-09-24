import type { Persona, PersonaMode } from "@/lib/types";

export type PersonaRelationshipState = {
  relationship_level: "New" | "Familiar" | "Trusted" | "Close";
  conversation_count: number;
  last_interaction: string | null;
  favorite_topics: string[];
  interaction_score: number;
};

export type PersonaContextInput = {
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

const PERSONA_SIGNATURES: Record<string, string[]> = {
  "Albert Einstein": ["Before we calculate it, imagine the situation plainly.", "The important thing is not speed alone, but what is being observed."],
  Sherlock: ["The clue is already in front of you.", "You have given me the answer; now we must notice it."],
  Socrates: ["What do you really mean by that?", "Let us examine the assumption before we defend it."],
  Rumi: ["The heart often knows before the mind catches up.", "Let the metaphor carry the truth for a moment."],
  "Steve Jobs": ["Simple is not easy; it is the result of hard choices.", "The product must say what it is and what it is not."],
  "Marie Curie": ["Evidence should guide every conclusion.", "A careful experiment is worth a hundred theories."],
  Shakespeare: ["The human condition is rarely one mood, but many.", "A line is sharper when it cuts truth and beauty at once."],
  default: ["Let’s follow the thread of the idea.", "The key is to test the assumption, not merely the wording."],
};

function normalizeRelationship(relationship?: PersonaRelationshipState): PersonaRelationshipState {
  return {
    relationship_level: relationship?.relationship_level ?? "New",
    conversation_count: relationship?.conversation_count ?? 0,
    last_interaction: relationship?.last_interaction ?? null,
    favorite_topics: relationship?.favorite_topics ?? [],
    interaction_score: relationship?.interaction_score ?? 0,
  };
}

function detectEmotionalContext(message: string) {
  const value = message.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/excited|thrilled|love this|amazing|great idea|fantastic|energized/, "Excited"],
    [/confused|unsure|lost|don't understand|unclear|what do you mean/, "Confused"],
    [/frustrated|annoyed|angry|stuck|can't|broken|problem/, "Frustrated"],
    [/sad|down|lonely|hurt|disappointed|exhausted/, "Sad"],
    [/curious|wonder|ask|what if|how does|why does/, "Curious"],
    [/serious|important|critical|urgent|deadline|decision/, "Serious"],
    [/playful|fun|joke|laugh|lighthearted|banter/, "Playful"],
    [/motivated|committed|ready|optimistic|goal|plan/, "Motivated"],
  ];

  return map.find(([pattern]) => pattern.test(value))?.[1] ?? "Neutral";
}

function chooseOpening(persona: Persona, emotionalContext: string, relationship: PersonaRelationshipState) {
  const name = persona.name;
  const level = relationship.relationship_level;

  if (name.includes("Einstein")) {
    return emotionalContext === "Confused"
      ? "Let us set the scene before we calculate the answer. What is actually changing, and what is only appearing to change?"
      : "Before we dive in, imagine the situation in its simplest form. Then we can test the idea against reality.";
  }

  if (name.includes("Sherlock") || name.includes("Holmes")) {
    return emotionalContext === "Frustrated"
      ? "A useful clue has been hiding in plain sight. Tell me what changed most recently and I’ll narrow the problem." 
      : "You’ve already given me the critical clue. I’m listening for what you have not said yet.";
  }

  if (name.includes("Socrates")) {
    return "Before we decide what is true, let us test the assumption beneath it. What are you really taking for granted?";
  }

  if (name.includes("Steve Jobs") || name.includes("Jobs")) {
    return "If we strip away the noise, what is the real problem we are trying to solve here?";
  }

  if (name.includes("Curie") || name.includes("Marie")) {
    return "Let us begin with the evidence, then decide whether the conclusion is sound.";
  }

  if (level === "Close") {
    return "You and I have been circling this idea for a while. Where do you want to take it next?";
  }

  if (level === "Trusted") {
    return "I remember the shape of your earlier questions. Give me the part that feels most important right now.";
  }

  return `I’m listening to the exact problem you’re facing. What part feels most alive to you right now?`;
}

function buildSignatureExpressions(persona: Persona) {
  const key = Object.keys(PERSONA_SIGNATURES).find((entry) => persona.name.startsWith(entry) || persona.name.includes(entry));
  return key ? PERSONA_SIGNATURES[key] : PERSONA_SIGNATURES.default;
}

function buildResponseLength(plan: string | undefined, relationship: PersonaRelationshipState) {
  const isPro = /(pro|ultra)/i.test(plan ?? "");
  if (isPro && relationship.relationship_level !== "New") {
    return "Medium to detailed depending on context; longer when the topic deserves depth.";
  }

  return "Short to medium, with enough substance to be useful without overwhelming the user.";
}

function selectRelevantMemories(memory: string[], userMessage: string) {
  const normalized = userMessage.toLowerCase();
  const keywords = normalized.split(/[^a-z0-9]+/).filter(Boolean).slice(0, 12);

  if (!memory.length || !keywords.length) {
    return memory.slice(0, 2);
  }

  return memory.filter((entry) => {
    const lower = entry.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword)) || lower.length < 180;
  }).slice(0, 3);
}

function normalizePlan(plan?: string) {
  const value = (plan ?? "free").toLowerCase();
  return value === "pro" || value === "ultra" ? value : "free";
}

export function buildPersonaContext(input: PersonaContextInput): string {
  const persona = input.persona;
  const relationship = normalizeRelationship(input.relationship);
  const emotionalContext = input.emotionalContext ?? detectEmotionalContext(input.userMessage);
  const relevantMemories = selectRelevantMemories(input.memory ?? [], input.userMessage);
  const plan = normalizePlan(input.plan);
  const opening = chooseOpening(persona, emotionalContext, relationship);
  const signatureExpressions = buildSignatureExpressions(persona);

  const facts = [
    `PERSONA IDENTITY`,
    `Name: ${persona.name}`,
    `Era: ${persona.era}`,
    `Profession: ${persona.profession}`,
    `Background: ${persona.biography}`,
    `Main expertise: ${persona.expertise.join(", ")}`,
    `Knowledge areas: ${persona.knowledge.join(", ")}`,
    `Core beliefs: ${persona.beliefs.join("; ") || "Reason, careful observation, and useful truth."}`,
    `Important worldview: ${persona.principles.join("; ") || "Prefer substance over spectacle."}`,
  ];

  const personality = [
    `PERSONALITY`,
    `Temperament: ${persona.personality.join(", ")}`,
    `Confidence: ${persona.personality.includes("Visionary") || persona.personality.includes("Determined") ? "High" : "Measured"}`,
    `Curiosity: ${persona.personality.includes("Curious") || persona.personality.includes("Observant") ? "Active" : "Selective"}`,
    `Humor: ${persona.personality.includes("Witty") || persona.personality.includes("Playful") ? "Dry and observant" : "Light, occasional, and contextual"}`,
    `Formality: ${persona.speakingStyle}`,
    `Emotional expression: ${persona.tone}`,
    `Directness: ${persona.personality.includes("Analytical") || persona.personality.includes("Disciplined") ? "Direct and exact" : "Natural and human"}`,
  ];

  const speakingStyle = [
    `SPEAKING STYLE`,
    `Sentence length: ${persona.personality.includes("Analytical") ? "Generally concise but precise" : "Varies from short and sharp to reflective and detailed"}`,
    `Vocabulary level: ${persona.speakingStyle}`,
    `Typical expressions: ${signatureExpressions.join(" | ")}`,
    `Use of questions: ${persona.personality.includes("Questioning") || persona.name.includes("Socrates") ? "Frequent, probing, and purposeful" : "Selective and conversational"}`,
    `Use of metaphors: ${persona.metadata?.eraLabel || persona.category}`,
    `Storytelling behavior: ${persona.personality.includes("Theatrical") || persona.personality.includes("Visionary") ? "Uses vivid examples and turning points" : "Uses relevant examples when they clarify the point"}`,
    `Response rhythm: ${relationship.relationship_level === "Close" ? "More natural and familiar" : "Measured, thoughtful, and context-aware"}`,
  ];

  const behavior = [
    `BEHAVIOR`,
    `Opening pattern: ${opening}`,
    `Response length: ${buildResponseLength(plan, relationship)}`,
    `Question style: ${persona.name.includes("Socrates") ? "Challenge assumptions with a single sharp question" : "Ask follow-up questions only when they sharpen the conversation"}`,
    `Reaction style: React to what the user actually says; do not default to generic advice; reference prior context naturally; adapt the depth to the user's level and intent; challenge assumptions when relevant without becoming preachy; avoid repetitive wording and robotic phrases; avoid unnecessary disclaimers; do not greet with 'How can I help you today?'; avoid repeating your own name constantly; vary short, conversational, reflective, and detailed replies depending on the context.` ,
    `Conversation rules: Always speak in the user's current language when it is clear, unless they explicitly ask for another language. Keep the persona consistent even when the user is playful, frustrated, or serious. Be honest about uncertainty and do not invent private or undocumented information.` ,
  ];

  const memorySection = [
    `CONVERSATION MEMORY`,
    `Relevant memories: ${relevantMemories.length ? relevantMemories.join("; ") : "No salient memories yet."}`,
    `Relationship: ${relationship.relationship_level} | conversations: ${relationship.conversation_count} | interaction score: ${relationship.interaction_score}`,
    `Favorite topics: ${relationship.favorite_topics.length ? relationship.favorite_topics.join(", ") : persona.tags.slice(0, 3).join(", ")}`,
    `Use memory naturally, never as a ledger or quoted instruction. If the conversation clearly connects to prior context, reference it in a natural way without saying 'According to my memory'.`,
  ];

  const emotional = [
    `EMOTIONAL CONTEXT`,
    `Detected mood: ${emotionalContext}`,
    `Adaptation: If the user is curious, invite exploration. If they are confused, clarify the core idea before diving deeper. If they are frustrated, focus on the source of friction and reduce unnecessary complexity. If they are excited, match the energy without becoming melodramatic. Keep the emotional tone grounded and human rather than exaggerated.` ,
  ];

  const planSection = [
    `PLAN CONTEXT`,
    `Current plan: ${plan === "free" ? "Free" : "Pro/Ultra"}`,
    plan === "free"
      ? "Free-tier behavior: keep answers useful and adaptive, with concise but meaningful context. Do not overdo personalization beyond recent relevant memory and the current conversation."
      : "Pro-tier behavior: use deeper continuity, stronger memory continuity, richer context, and more personalized follow-up referencing relevant history, stated goals, and recurring interests."
  ];

  const segments = [
    ...facts,
    "",
    ...personality,
    "",
    ...speakingStyle,
    "",
    ...behavior,
    "",
    ...memorySection,
    "",
    ...emotional,
    "",
    ...planSection,
    "",
    `MODE: ${input.mode}`,
    `LANGUAGE: ${input.language ?? "user's language"}`,
    `EXPERTISE FOCUS: ${input.selectedExpertise ?? persona.expertise[0] ?? "general conversation"}`,
    `RESPONSE PRIORITY: answer the user’s actual question first, keep the identity specific, adapt to the emotional tone, and preserve natural human dialogue rather than generic assistant phrasing.`,
  ];

  return segments.join("\n");
}
