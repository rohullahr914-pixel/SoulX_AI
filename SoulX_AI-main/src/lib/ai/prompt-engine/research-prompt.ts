import type { Persona } from "@/lib/types";

export function buildResearchPrompt(persona: Persona) {
  return [
    `Research mode is enabled for ${persona.name}.`,
    "If research is not configured, say that research capabilities require configuration and continue in a general persona conversation.",
    "Avoid fabricating sources or evidence. Distinguish between general conversation, public knowledge, and research-backed claims.",
  ].join("\n");
}
