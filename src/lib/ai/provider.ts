import "server-only";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIProvider = "deepseek" | "groq" | "openai";
export type AIUsage = { inputTokens: number; outputTokens: number; totalTokens: number };
export type FailureReason = "configuration" | "authentication" | "rate_limit" | "quota_exhausted" | "model_unavailable" | "server_error" | "timeout" | "network_error" | "invalid_request" | "invalid_response" | "empty_response" | "content_filter";
export type ProviderResponse = {
  ok: boolean;
  content?: string;
  error?: string;
  provider: AIProvider;
  model: string;
  statusCode?: number;
  retryable?: boolean;
  reason?: FailureReason;
  usage?: AIUsage;
};
export type GenerationOptions = { temperature?: number; maxTokens?: number; timeoutMs?: number };

export const AI_UNAVAILABLE = "AI generation is temporarily unavailable. Please try again later.";

export function failure(provider: AIProvider, model: string, reason: FailureReason, retryable: boolean, statusCode?: number): ProviderResponse {
  return { ok: false, provider, model, error: AI_UNAVAILABLE, reason, retryable, statusCode };
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function parseUsage(value: unknown, responsesAPI = false): AIUsage | undefined {
  const usage = record(value);
  const input = usage[responsesAPI ? "input_tokens" : "prompt_tokens"];
  const output = usage[responsesAPI ? "output_tokens" : "completion_tokens"];
  if (typeof input !== "number" || typeof output !== "number" || !Number.isSafeInteger(input) || !Number.isSafeInteger(output) || input < 0 || output < 0) return undefined;
  return { inputTokens: input, outputTokens: output, totalTokens: input + output };
}

// Never return or log raw provider errors: they can contain private input.
export function httpFailure(provider: AIProvider, model: string, status: number, data: unknown): ProviderResponse {
  const error = record(record(data).error);
  const code = `${typeof error.code === "string" ? error.code : ""} ${typeof error.type === "string" ? error.type : ""} ${typeof error.message === "string" ? error.message : ""}`.toLowerCase();
  if (status === 402 || /insufficient[_ ](?:balance|quota)|quota[_ ](?:exceeded|exhausted)|balance.*(?:insufficient|exhausted)/.test(code)) return failure(provider, model, "quota_exhausted", true, status);
  if (status === 401 || status === 403) return failure(provider, model, "authentication", true, status);
  if (status === 429) return failure(provider, model, "rate_limit", true, status);
  if (status === 408 || status === 504) return failure(provider, model, "timeout", true, status);
  if (status >= 500) return failure(provider, model, "server_error", true, status);
  if (status === 404 || /model[_ ](?:not[_ ]found|unavailable|decommissioned)|model.*(?:does not exist|not available|not supported)/.test(code)) return failure(provider, model, "model_unavailable", true, status);
  return failure(provider, model, "invalid_request", false, status);
}

export function completionUrl(baseUrl: string): string | undefined {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return undefined;
    return `${url.href.replace(/\/+$/, "")}/chat/completions`;
  } catch { return undefined; }
}

/** Exactly one non-streaming HTTP attempt; no SDK retries or redirect following. */
export async function chatCompletion(config: { provider: AIProvider; apiKey: string; model: string; baseUrl: string; thinking?: "disabled" }, messages: AIMessage[], options: GenerationOptions = {}): Promise<ProviderResponse> {
  const { provider, model } = config;
  const url = completionUrl(config.baseUrl);
  if (!config.apiKey.trim() || !model.trim() || !url) return failure(provider, model, "configuration", true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: options.temperature ?? 0.7, max_tokens: options.maxTokens ?? 1200, stream: false, ...(config.thinking ? { thinking: { type: config.thinking } } : {}) }),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    let data: unknown;
    try { data = await response.json(); } catch {
      if (controller.signal.aborted) return failure(provider, model, "timeout", true);
      return response.ok ? failure(provider, model, "invalid_response", false, response.status) : httpFailure(provider, model, response.status, null);
    }
    if (!response.ok) return httpFailure(provider, model, response.status, data);
    const body = record(data);
    const choice = record(Array.isArray(body.choices) ? body.choices[0] : undefined);
    const usage = parseUsage(body.usage);
    const actualModel = typeof body.model === "string" && body.model.trim() ? body.model.trim() : model;
    const content = record(choice.message).content;
    if (choice.finish_reason === "content_filter") return { ...failure(provider, actualModel, "content_filter", false, response.status), usage };
    if (typeof content !== "string" || !content.trim()) return { ...failure(provider, actualModel, "empty_response", false, response.status), usage };
    return { ok: true, provider, model: actualModel, content: content.trim(), usage, statusCode: response.status };
  } catch {
    return failure(provider, model, controller.signal.aborted ? "timeout" : "network_error", true);
  } finally { clearTimeout(timeout); }
}
