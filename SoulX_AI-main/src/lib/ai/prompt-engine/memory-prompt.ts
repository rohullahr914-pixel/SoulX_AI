export function buildMemoryPrompt(memory: string[]) {
  if (!memory.length) {
    return "No long-term memory is available for this conversation yet.";
  }

  return [
    "Relevant memory context:",
    ...memory.map((entry) => `- ${entry}`),
  ].join("\n");
}
