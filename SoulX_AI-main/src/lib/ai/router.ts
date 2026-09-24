import "server-only";
import { callGroq } from "@/lib/ai/groq";
import { callDeepSeek } from "@/lib/ai/deepseek";
import { failure, httpFailure, parseUsage, record, type AIMessage, type GenerationOptions, type ProviderResponse } from "./provider";

export type { AIMessage, AIProvider } from "./provider";

export type AIAttempt = Pick<ProviderResponse, "provider" | "model" | "statusCode" | "reason" | "usage"> & { status: "success" | "failure" };
export type AIRouterResponse = ProviderResponse & { attempts: AIAttempt[]; fallbackReason?: string };

// `model` remains the existing plan-specific Groq override, never a DeepSeek model.
type RouterOptions = GenerationOptions & { model?: string; task?: "chat" | "research" | "evaluation" };

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function chooseOpenAIModel(messages: AIMessage[], task?: RouterOptions["task"]) {
  const userText = messages.filter((message) => message.role === "user").map((message) => message.content).join("\n");
  const complex = task === "research" || task === "evaluation" || userText.length > 1400 || messages.length > 12 ||
    /\b(code|debug|implement|typescript|javascript|python|algorithm|architecture|reasoning|analy[sz]e|prove|refactor)\b/i.test(userText);

  return complex
    ? process.env.OPENAI_POWERFUL_MODEL?.trim() || "gpt-5.6-sol"
    : process.env.OPENAI_FAST_MODEL?.trim() || "gpt-5.6-luna";
}

function openAIOutput(data: unknown): string | undefined {
  const response = record(data);
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  if (!Array.isArray(response.output)) return undefined;
  return response.output.flatMap((item) => {
    const content = record(item).content;
    return Array.isArray(content) ? content : [];
  }).map(record).filter((part) => part.type === "output_text" && typeof part.text === "string").map((part) => part.text).join("\n").trim() || undefined;
}

async function callOpenAI(messages: AIMessage[], options?: RouterOptions): Promise<ProviderResponse> {
  const model = chooseOpenAIModel(messages, options?.task);
  if (!hasOpenAIKey()) return failure("openai", model, "configuration", true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: messages, store: false }),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    let data: unknown;
    try { data = await response.json(); } catch {
      if (controller.signal.aborted) return failure("openai", model, "timeout", true);
      return response.ok ? failure("openai", model, "invalid_response", false, response.status) : httpFailure("openai", model, response.status, null);
    }
    if (!response.ok) return httpFailure("openai", model, response.status, data);
    const body = record(data);
    const actualModel = typeof body.model === "string" && body.model.trim() ? body.model.trim() : model;
    const usage = parseUsage(body.usage, true);
    const content = openAIOutput(data);
    if (!content) {
      return { ...failure("openai", actualModel, "empty_response", false, response.status), usage };
    }
    return { ok: true, content, provider: "openai", model: actualModel, usage, statusCode: response.status };
  } catch {
    return failure("openai", model, controller.signal.aborted ? "timeout" : "network_error", true);
  } finally {
    clearTimeout(timeout);
  }
}

/** Sequential attempts only. A successful response immediately ends routing. */
export async function callAI(messages: AIMessage[], options?: RouterOptions): Promise<AIRouterResponse> {
  const requestId = crypto.randomUUID();
  const attempts: AIAttempt[] = [];
  function track(result: ProviderResponse): AIRouterResponse {
    const fallbackReason = attempts.map((attempt) => `${attempt.provider}:${attempt.reason}`).join(",") || undefined;
    const attempt: AIAttempt = { provider: result.provider, model: result.model, status: result.ok ? "success" : "failure", statusCode: result.statusCode, reason: result.reason, usage: result.usage };
    attempts.push(attempt);
    console.info("[ai-router]", JSON.stringify({ requestId, ...attempt, fallbackReason }));
    return { ...result, attempts: [...attempts], fallbackReason };
  }
  const deepseek = track(await callDeepSeek(messages, options));
  if (deepseek.ok || !deepseek.retryable) return deepseek;
  const groq = track(await callGroq(messages, options));
  if (groq.ok || !groq.retryable) return groq;
  return track(await callOpenAI(messages, options));
}
