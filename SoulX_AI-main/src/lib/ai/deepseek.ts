import "server-only";
import { chatCompletion, type AIMessage, type GenerationOptions } from "./provider";

export function getDeepSeekConfig() {
  return {
    provider: "deepseek" as const,
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? "",
    baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
    // Preserve ordinary chat sampling and avoid spending the output budget on reasoning.
    thinking: "disabled" as const,
  };
}

export async function callDeepSeek(messages: AIMessage[], options?: GenerationOptions) {
  return chatCompletion(getDeepSeekConfig(), messages, options);
}
