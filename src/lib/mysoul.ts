export const MYSOUL_CATEGORIES = [
  "Identity", "Personality", "Interests", "Preferences", "Dislikes", "Goals", "Values", "Memories",
  "Relationships", "Opinions", "Communication Style", "Projects", "Education", "Career", "Favorites", "Custom Knowledge",
] as const;

export const MYSOUL_SECTIONS = [
  { id: "identity", label: "Identity", table: "mysouls" },
  { id: "personality", label: "Personality", table: "mysoul_traits" },
  { id: "interests", label: "Interests", table: "mysoul_interests" },
  { id: "communication", label: "Communication", table: "mysoul_training_samples" },
  { id: "memories", label: "Memories", table: "mysoul_memories" },
  { id: "values", label: "Values", table: "mysoul_values" },
  { id: "goals", label: "Goals", table: "mysoul_goals" },
  { id: "people", label: "People", table: "mysoul_people" },
  { id: "knowledge", label: "Knowledge", table: "mysoul_knowledge" },
  { id: "privacy", label: "Privacy & settings", table: "mysouls" },
] as const;

export type MySoulVisibility = "private" | "friends" | "public";
export type MySoulRecord = Record<string, unknown> & { id: string; visibility?: MySoulVisibility; created_at?: string };

export const TRAIT_CHOICES = ["Calm", "Funny", "Serious", "Ambitious", "Creative", "Curious", "Introverted", "Extroverted", "Optimistic", "Direct", "Friendly", "Competitive", "Thoughtful", "Independent", "Emotional", "Logical"];
export const INTEREST_CATEGORIES = ["Technology", "AI", "Programming", "Startups", "Business", "Science", "Music", "Movies", "Games", "Sports", "Books", "Travel", "Food", "Art", "History", "Fashion", "Cars", "Photography", "Education", "Custom"];
export const GOAL_CATEGORIES = ["Career", "Education", "Business", "Financial", "Personal", "Health", "Travel", "Relationship", "Learning"];
export const VALUE_CHOICES = ["Family", "Friendship", "Freedom", "Success", "Money", "Learning", "Loyalty", "Creativity", "Adventure", "Privacy", "Honesty", "Ambition", "Helping Others", "Innovation"];

export function calculateMySoulScore(input: {
  soul: Record<string, unknown>;
  traits: number;
  answers: number;
  interests: number;
  communication: boolean;
  memories: number;
  values: number;
  goals: number;
}) {
  const { soul } = input;
  const identity = [soul.display_name, soul.short_bio || soul.about, soul.occupation, soul.languages].filter((value) =>
    Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0,
  ).length;
  const parts = [
    Math.min(100, identity * 25),
    Math.min(100, input.traits * 12 + input.answers * 15),
    Math.min(100, input.interests * 10),
    input.communication ? 100 : 0,
    Math.min(100, input.memories * 20),
    Math.min(100, input.values * 20),
    Math.min(100, input.goals * 20),
  ];
  return Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length);
}

export function isPersonalQuestion(message: string) {
  return /\b(you|your|yourself|favorite|favourite|remember|memory|memories|goal|goals|dream|opinion|believe|value|values|family|friend|relationship|work|job|career|study|studied|education|interested|like|love|hate|dislike|prefer|personality|experience|grew up|childhood|from)\b/i.test(message);
}

export type MySoulTopicCategory = "interests" | "preferences" | "goals" | "memories" | "work_education" | "personality" | "general";
export type RetrievedMySoulFact = { source: string; priority: number; category: string; text: string };

export function categorizeMySoulTopic(message: string): MySoulTopicCategory {
  const text = message.toLowerCase();
  if (/\b(goal|goals|dream|future|aim|plan|planning)\b/.test(text)) return "goals";
  if (/\b(memory|memories|remember|experience|experienced|childhood|grew up)\b/.test(text)) return "memories";
  if (/\b(work|job|career|occupation|study|education|school|language|speak|country|city)\b/.test(text)) return "work_education";
  if (/\b(prefer|favorite|favourite|dislike|hate|best|worst)\b/.test(text)) return "preferences";
  if (/\b(interest|interested|like|love|enjoy|hobby|hobbies|technology|sport|music|movie|book|travel|food)\b/.test(text)) return "interests";
  if (/\b(personality|calm|funny|serious|ambitious|creative|curious|stress|angry|happy|feel|react|value|believe|belief)\b/.test(text)) return "personality";
  return "general";
}

const STOP_WORDS = new Set("the a an and or but to of for from with about your you yours i me my is are do does did what which who how when where why tell think say like interested in on at have has had it this that their they we us can could would should my".split(" "));
function tokens(value: string) {
  return new Set((value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).filter((word) => !STOP_WORDS.has(word)).map((word) => word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") && word.length > 4 ? word.slice(0, -1) : word));
}

export function retrieveMysoulFacts(message: string, facts: RetrievedMySoulFact[]) {
  const queryTokens = tokens(message);
  const genericPersonalTerms = new Set("goal goals dream future aim plan planning memory memories remember experience experienced first time childhood grew up like love hate dislike favorite favourite enjoy interested hobby hobbies personality calm funny serious ambitious creative curious stress angry happy feel react value values important believe belief principle work job career occupation study education school language speak country city live from friend friends family sibling parent people relationship thing things".split(" ").map((word) => word.endsWith("ies") ? `${word.slice(0, -3)}y` : word));
  const specificTokens = new Set([...queryTokens].filter((word) => !genericPersonalTerms.has(word)));
  const lower = message.toLowerCase();
  const intents = [
    { category: "identity", pattern: /\b(who are you|your name|name|about yourself|about you)\b/ },
    { category: "goal", pattern: /\b(goal|goals|dream|future|aim|plan|planning)\b/ },
    { category: "memory", pattern: /\b(memory|memories|remember|experience|experienced|first time|childhood|grew up)\b/ },
    { category: "interest", pattern: /\b(like|love|hate|dislike|favorite|favourite|enjoy|interested|hobby|hobbies|technology|tech|sport|music)\b/ },
    { category: "preference", pattern: /\b(prefer|favorite|favourite|dislike|hate|style|food|answer)\b/ },
    { category: "personality", pattern: /\b(personality|calm|funny|serious|ambitious|creative|curious|stress|angry|happy|feel|react)\b/ },
    { category: "value", pattern: /\b(value|values|important|believe|belief|principle)\b/ },
    { category: "profile_work", pattern: /\b(work|job|career|occupation|project|projects)\b/ },
    { category: "profile_education", pattern: /\b(study|education|school|degree|university)\b/ },
    { category: "profile_language", pattern: /\b(language|speak|languages)\b/ },
    { category: "profile_location", pattern: /\b(country|city|live|from|where are you from|where do you live)\b/ },
    { category: "relationships", pattern: /\b(friend|friends|family|sibling|parent|people|relationship)\b/ },
  ].filter((item) => item.pattern.test(lower)).map((item) => item.category);
  return facts.map((fact) => {
    const factTokens = tokens(`${fact.category} ${fact.text}`);
    const factLabel = `${fact.category} ${fact.text}`.toLowerCase();
    let score = 0;
    let lexicalMatches = 0;
    for (const word of queryTokens) if (factTokens.has(word)) { score += 2; lexicalMatches += 1; }
    const matchingIntent = intents.some((intent) => {
      if (intent === "profile_work") return /occupation|work|career|project|business/.test(factLabel);
      if (intent === "profile_education") return /education|school|degree|university|study/.test(factLabel);
      if (intent === "profile_language") return /language/.test(factLabel);
      if (intent === "profile_location") return /country|city|location|from|live/.test(factLabel);
      if (intent === "identity") return fact.category === "name" || /display_name|nickname|headline|about/.test(fact.category);
      return fact.source === intent || fact.category.toLowerCase().includes(intent);
    });
    if (matchingIntent && (!specificTokens.size || lexicalMatches > 0)) score += 3;
    if (fact.source === "knowledge") score += 1;
    return { ...fact, score: score + fact.priority * 0.01 };
  }).filter((fact) => fact.score >= (intents.length ? 3 : 2) && (!specificTokens.size || fact.score > fact.priority * 0.01)).sort((a, b) => b.score - a.score || b.priority - a.priority).slice(0, 10);
}

export function shouldReturnUnknown(message: string, retrievedCount: number) {
  return isPersonalQuestion(message) && retrievedCount === 0;
}
