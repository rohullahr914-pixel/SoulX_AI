import "server-only";

import { getPersonaBySlug } from "@/lib/personas";
import { supabaseAdmin } from "@/lib/server/db";
import { ensureSystemPersona } from "@/lib/server/social";

export type VoiceConfig = {
  personaId: string;
  agentId: string;
  prompt: string;
  voiceId?: string;
  language?: "en" | "fa";
  voiceSettings: { stability?: number; similarityBoost?: number; speed?: number };
};

const value = (input: unknown, limit = 4_000) => typeof input === "string" ? input.trim().slice(0, limit) : "";
const values = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string").join(", ") : value(input);
// A Conversational AI agent owns the voice pipeline. Voice IDs remain useful
// as an override for the agent's output voice, but are never used as an agent.
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";
const DEFAULT_AGENT_ID = process.env.ELEVENLABS_AGENT_ID || "";
const agentId = (input: unknown) => {
  const candidate = value(input, 160);
  return /^agent_[A-Za-z0-9]+$/.test(candidate) ? candidate : DEFAULT_AGENT_ID;
};
const voiceId = (input: unknown) => {
  const candidate = value(input, 160);
  return /^[A-Za-z0-9]{10,128}$/.test(candidate) && !candidate.startsWith("agent_") ? candidate : DEFAULT_VOICE_ID;
};

function promptFor(persona: { name: string; description: string; personality: string; speakingStyle: string; rules: string; language: "en" | "fa" }, recentContext: string, preferredLanguage?: "en" | "fa") {
  return `You are currently speaking as ${persona.name}.

Identity:
${persona.description}

Personality:
${persona.personality || "Stay faithful to the SoulX persona."}

Speaking style:
${persona.speakingStyle || "Natural, warm, concise, and conversational."}

Persona instructions:
${persona.rules || "Preserve the persona's established SoulX safety and factual boundaries."}

Stay consistent with this persona throughout the conversation. Never claim to be a different SoulX persona. Respond naturally for spoken conversation. Prefer concise conversational responses rather than long essays. Match the language the user speaks; support English and Persian/Dari.${preferredLanguage === "fa" ? " The user prefers Persian/Dari; use Persian/Dari unless they speak another language or ask otherwise." : ""}
${recentContext ? `\nRelevant recent SoulX conversation context (use only as background):\n${recentContext}` : ""}`;
}

export async function loadVoiceConfig(slug: string, userId: string, recentContext: string): Promise<VoiceConfig | null> {
  const systemPersona = getPersonaBySlug(slug);
  if (!supabaseAdmin || !/^[a-z0-9-]{1,160}$/.test(slug)) return null;
  let { data, error } = await supabaseAdmin.from("personas").select("slug,creator_id,name,description,definition,voice_id,voice_agent_id,voice_enabled,voice_settings,visibility,is_suspended").eq("slug", slug).maybeSingle();
  if (!error && !data && systemPersona) {
    await ensureSystemPersona(slug);
    ({ data, error } = await supabaseAdmin.from("personas").select("slug,creator_id,name,description,definition,voice_id,voice_agent_id,voice_enabled,voice_settings,visibility,is_suspended").eq("slug", slug).maybeSingle());
  }
  if (error) return null;
  const ownedPrivatePersona = Boolean(data && data.creator_id === userId);
  if (data?.voice_enabled === false || data?.is_suspended || (data && data.visibility !== "Public" && !ownedPrivatePersona)) return null;
  if (!systemPersona && !data) return null;
  const definition = data?.definition && typeof data.definition === "object" ? data.definition as Record<string, unknown> : {};
  const settings = data?.voice_settings && typeof data.voice_settings === "object" ? data.voice_settings as Record<string, unknown> : {};
  const configuredAgentId = agentId(data?.voice_agent_id);
  if (!configuredAgentId) return null;
  const preference = await supabaseAdmin.from("persona_preferences").select("preferred_language").eq("user_id", userId).eq("persona_id", slug).maybeSingle();
  const preferredLanguage = preference.data?.preferred_language === "fa" || preference.data?.preferred_language === "en" ? preference.data.preferred_language : undefined;
  if (systemPersona) {
    return {
      personaId: systemPersona.slug,
      agentId: configuredAgentId,
      prompt: promptFor({ name: systemPersona.name, description: systemPersona.description, personality: systemPersona.personality.join(", "), speakingStyle: systemPersona.speakingStyle, rules: [...systemPersona.rules, ...systemPersona.restrictions].join(" "), language: systemPersona.languages.some((language) => /persian|dari|farsi/i.test(language)) ? "fa" : "en" }, recentContext, preferredLanguage),
      voiceId: voiceId(data?.voice_id),
      // Preserve automatic language matching; forcing "en" breaks Persian/Dari callers.
      language: preferredLanguage,
      voiceSettings: {
        stability: typeof settings.stability === "number" && settings.stability >= 0 && settings.stability <= 1 ? settings.stability : undefined,
        similarityBoost: typeof settings.similarity_boost === "number" && settings.similarity_boost >= 0 && settings.similarity_boost <= 1 ? settings.similarity_boost : undefined,
        speed: typeof settings.speed === "number" && settings.speed >= 0.7 && settings.speed <= 1.2 ? settings.speed : undefined,
      },
    };
  }
  if (!data) return null;
  const customInstructions = value(definition.instructions) || value(definition.systemPrompt) || values(definition.rules);
  const profession = value(definition.profession, 200);
  return {
    personaId: data.slug,
    agentId: configuredAgentId,
    prompt: promptFor({ name: value(data.name, 160), description: [profession, value(data.description)].filter(Boolean).join(". "), personality: values(definition.personality), speakingStyle: value(definition.speakingStyle) || value(definition.tone), rules: customInstructions, language: /persian|dari|farsi/i.test(values(definition.languages)) ? "fa" : "en" }, recentContext, preferredLanguage),
    voiceId: voiceId(data.voice_id),
    language: preferredLanguage,
    voiceSettings: {
      stability: typeof settings.stability === "number" && settings.stability >= 0 && settings.stability <= 1 ? settings.stability : undefined,
      similarityBoost: typeof settings.similarity_boost === "number" && settings.similarity_boost >= 0 && settings.similarity_boost <= 1 ? settings.similarity_boost : undefined,
      speed: typeof settings.speed === "number" && settings.speed >= 0.7 && settings.speed <= 1.2 ? settings.speed : undefined,
    },
  };
}
