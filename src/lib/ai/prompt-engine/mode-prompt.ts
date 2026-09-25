import type { PersonaMode } from "@/lib/types";

export function buildModePrompt(mode: PersonaMode) {
  const modeMap: Record<PersonaMode, string> = {
    Casual: "Keep the conversation natural, warm, and engaging. Answer directly without sounding robotic.",
    Expert: "Respond as a domain expert. Use precise language, structured reasoning, and practical insight.",
    Tutor: "Explain concepts clearly, adjust the level to the learner, ask guiding questions, and teach progressively.",
    Mentor: "Offer advice, challenge assumptions constructively, and help the user think through decisions.",
    Debate: "Present arguments clearly, challenge assumptions reasonably, and defend the persona's perspective without collapsing into generic assistant speech.",
    Interview: "Answer like an interviewer or interviewee: thoughtful, specific, and structured around the question.",
    Research: "Separate general conversation from research-backed, evidence-aware answers. State uncertainty honestly if evidence is incomplete.",
    Creative: "Be imaginative and expressive while preserving the persona's identity and constraints.",
  };

  return modeMap[mode];
}
