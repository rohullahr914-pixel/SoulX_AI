import type { Persona } from "@/lib/types";

export const personaAccentColors = ["cyan", "violet", "emerald", "amber"] as const;

export type PersonaAccentColor = (typeof personaAccentColors)[number];

export type CustomPersona = {
  id: string;
  name: string;
  profession: string;
  category: string;
  description: string;
  personality: string;
  expertise: string;
  tone: string;
  greeting: string;
  instructions: string;
  suggestedPrompts: string[];
  color: PersonaAccentColor;
  createdAt: string;
  updatedAt: string;
};

const CUSTOM_PERSONAS_EVENT = "personax-custom-personas-change";
let personaStore: CustomPersona[] = [];
let personaSnapshot = "[]";

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function parseCustomPersona(value: unknown): CustomPersona | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const id = cleanText(input.id, 100);
  const name = cleanText(input.name, 48);
  const profession = cleanText(input.profession, 72);
  const description = cleanText(input.description, 320);

  if (!id || !name || !profession || !description) return null;

  const suggestedPrompts = Array.isArray(input.suggestedPrompts)
    ? input.suggestedPrompts
        .map((prompt) => cleanText(prompt, 140))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const color = personaAccentColors.includes(input.color as PersonaAccentColor)
    ? (input.color as PersonaAccentColor)
    : "cyan";
  const createdAt = cleanText(input.createdAt, 40) || new Date().toISOString();

  return {
    id,
    name,
    profession,
    category: cleanText(input.category, 40) || "Custom",
    description,
    personality: cleanText(input.personality, 180) || "Thoughtful, helpful, and curious",
    expertise: cleanText(input.expertise, 180) || profession,
    tone: cleanText(input.tone, 120) || "Warm, clear, and practical",
    greeting:
      cleanText(input.greeting, 220) ||
      `Hi, I'm ${name}. What would you like to explore together?`,
    instructions: cleanText(input.instructions, 700),
    suggestedPrompts:
      suggestedPrompts.length > 0
        ? suggestedPrompts
        : [
            `Help me think through a challenge using your ${profession.toLowerCase()} perspective.`,
            "What is the first question I should be asking?",
          ],
    color,
    createdAt,
    updatedAt: cleanText(input.updatedAt, 40) || createdAt,
  };
}

export function getCustomPersonas(): CustomPersona[] {
  return personaStore;
}

export function parseCustomPersonasSnapshot(snapshot: string): CustomPersona[] {
  if (!snapshot || snapshot === "__loading__") return [];

  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed)
      ? parsed.map(parseCustomPersona).filter((persona): persona is CustomPersona => Boolean(persona))
      : [];
  } catch {
    return [];
  }
}

export function getCustomPersonasSnapshot() {
  return personaSnapshot;
}

export async function refreshCustomPersonas() {
  if (typeof window === "undefined") return;
  const response = await fetch("/api/personas", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return;
  const data = await response.json() as { personas?: unknown[] };
  personaStore = (data.personas ?? []).map(parseCustomPersona).filter((item): item is CustomPersona => Boolean(item));
  personaSnapshot = JSON.stringify(personaStore);
  notifyCustomPersonasChanged();
}

export function subscribeToCustomPersonas(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(CUSTOM_PERSONAS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener(CUSTOM_PERSONAS_EVENT, onStoreChange);
  };
}

function notifyCustomPersonasChanged() {
  window.dispatchEvent(new Event(CUSTOM_PERSONAS_EVENT));
}

export function getCustomPersonaById(id: string) {
  return getCustomPersonas().find((persona) => persona.id === id);
}

export function saveCustomPersona(persona: CustomPersona) {
  const normalized = parseCustomPersona(persona);
  if (!normalized) return;
  const remaining = personaStore.filter((item) => item.id !== normalized.id);
  personaStore = [normalized, ...remaining]; personaSnapshot = JSON.stringify(personaStore);
  notifyCustomPersonasChanged();
  void fetch("/api/personas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ persona: normalized }) });
}

export function deleteCustomPersona(id: string) {
  const remaining = personaStore.filter((persona) => persona.id !== id);
  personaStore = remaining; personaSnapshot = JSON.stringify(personaStore);
  notifyCustomPersonasChanged();
  void fetch(`/api/personas?slug=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
}

export function customPersonaToPersona(customPersona: CustomPersona): Persona {
  const expertise = splitList(customPersona.expertise);
  const personality = splitList(customPersona.personality);
  const creatorRules = customPersona.instructions
    .split("\n")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: customPersona.id,
    name: customPersona.name,
    slug: customPersona.id,
    username: customPersona.id,
    displayName: customPersona.name,
    avatar: "",
    coverImage: "",
    shortDescription: customPersona.description,
    description: customPersona.description,
    biography: customPersona.description,
    profession: customPersona.profession,
    expertise: expertise.length ? expertise : [customPersona.profession],
    era: "Present day",
    country: "User-created",
    region: "Digital",
    languages: ["Match the user's language"],
    personality: personality.length ? personality : ["Thoughtful", "Helpful"],
    speakingStyle: customPersona.tone,
    tone: customPersona.tone,
    knowledge: expertise.length ? expertise : [customPersona.profession],
    beliefs: [],
    principles: ["Be useful, honest, and consistent with the creator's intent."],
    rules: creatorRules.length
      ? creatorRules
      : ["Stay consistent with the defined role, personality, and tone."],
    restrictions: ["Do not pretend to be a real person or claim private real-world experiences."],
    category: customPersona.category,
    categoryId: customPersona.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom",
    tags: [...expertise.slice(0, 3), ...personality.slice(0, 2)],
    visibility: "Private",
    isFeatured: false,
    isVerified: false,
    creatorId: "local-user",
    metadata: { custom: true, accent: customPersona.color },
    suggestedPrompts: customPersona.suggestedPrompts,
    disclaimer: "User-created AI persona",
    color: customPersona.color,
    createdAt: customPersona.createdAt,
    updatedAt: customPersona.updatedAt,
  };
}
