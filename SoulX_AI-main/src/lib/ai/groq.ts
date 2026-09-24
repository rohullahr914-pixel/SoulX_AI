import "server-only";
import { chatCompletion, type AIMessage, type GenerationOptions, type ProviderResponse } from "./provider";

export type GroqChatResponse = ProviderResponse;

export function getGroqConfig() {
  return {
    apiKey: process.env.GROQ_API_KEY?.trim() ?? "",
    model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",
    baseUrl: process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1",
  };
}

export function hasGroqApiKey() {
  return Boolean(getGroqConfig().apiKey);
}

export async function callGroq(messages: AIMessage[], options?: GenerationOptions & { model?: string }): Promise<GroqChatResponse> {
  const config = getGroqConfig();
  return chatCompletion({ ...config, provider: "groq", model: options?.model?.trim() || config.model }, messages, options);
}
