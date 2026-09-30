import "server-only";
import { callAI } from "@/lib/ai/router";
import { buildPromptMessages } from "@/lib/ai/prompt-engine/builder";
import type { PersonaRelationshipState } from "@/lib/ai/persona-conversation-engine";
import { customPersonaToPersona, type CustomPersona } from "@/lib/custom-personas";
import { getPersonaBySlug } from "@/lib/personas";
import { futurePersonaSlugs } from "@/lib/future-personas";
import { query } from "@/lib/server/db";
import type { Persona, PersonaMode } from "@/lib/types";

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

function isPersonaDefinition(value: unknown): value is Partial<Persona> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function getManagedFuturePersona(slug: string): Promise<Persona | undefined> {
  const base = getPersonaBySlug(slug);
  if (!base || !futurePersonaSlugs.includes(slug as (typeof futurePersonaSlugs)[number])) return base;

  try {
    const result = await query<{ name: string; description: string; avatar: string | null; definition: unknown; visibility: string; is_suspended: boolean }>(
      "SELECT name,description,avatar,definition,visibility,is_suspended FROM personas WHERE slug=$1",
      [slug],
    );
    const row = result.rows[0];
    if (!row) return base;
    if (row.visibility !== "Public" || row.is_suspended) return undefined;
    const definition = isPersonaDefinition(row.definition) ? row.definition : {};
    return {
      ...base,
      ...definition,
      id: base.id,
      slug: base.slug,
      name: row.name || base.name,
      displayName: typeof definition.displayName === "string" ? definition.displayName : row.name || base.displayName,
      description: row.description || base.description,
      shortDescription: typeof definition.shortDescription === "string" ? definition.shortDescription : row.description || base.shortDescription,
      avatar: row.avatar || (typeof definition.avatar === "string" ? definition.avatar : base.avatar),
      coverImage: typeof definition.coverImage === "string" ? definition.coverImage : row.avatar || base.coverImage,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    };
  } catch {
    // The static catalog remains usable until a Supabase environment is configured.
    return base;
  }
}

export async function generatePersonaResponse(request: PersonaEngineRequest) {
  const staticPersona = request.customPersona
    ? customPersonaToPersona(request.customPersona)
    : request.personaId
      ? getPersonaBySlug(request.personaId)
      : request.personaSlug
        ? getPersonaBySlug(request.personaSlug)
        : undefined;
  const persona = request.customPersona || !staticPersona
    ? staticPersona
    : await getManagedFuturePersona(staticPersona.slug);

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
