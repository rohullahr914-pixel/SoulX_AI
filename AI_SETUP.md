# SoulX AI providers

The server router makes sequential attempts in this order: **DeepSeek → Groq → existing OpenAI integration**. A successful response returns immediately. No SDK, automatic retry, parallel provider requests, or redirect following is used. Missing provider keys skip that provider's HTTP request.

## Configuration

Set these in the server environment (or the existing local `.env`):

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
```

See `.env.example` for existing Groq and optional OpenAI settings. Never use `NEXT_PUBLIC_` for these keys. Do not replace an existing `.env` with the example: the app also requires its existing database/auth configuration. Provider modules and the router import `server-only`, so Next rejects client imports.

`deepseek-flash` is a supported chat model in the [official Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/), checked on 2026-09-24. Requests use `/chat/completions`, non-streaming output, `thinking: { type: "disabled" }`, temperature 0.7 and a 1,200-token output limit, matching the existing conversational settings. The exact existing system/persona prompt, memory, context, history and user message are forwarded. No prompt files were changed.

The existing `model` argument remains a **Groq-only** plan override; it cannot accidentally select a Groq model on DeepSeek. OpenAI's existing task-based model selection is preserved. OpenAI needs its own key to be usable.

## Failure policy and time limits

Rate limits, authentication/configuration failures, insufficient balance/quota, unavailable models, 5xx, timeouts and network failures allow the next provider, at most once. Other 400/422 request errors, content filtering and unusable HTTP-success responses stop instead of sending the same request to another paid provider. Raw provider errors are never returned or logged.

Timeouts cover headers and response-body reading: 25 seconds each for DeepSeek/Groq, 30 seconds for OpenAI. AI route handlers declare `maxDuration = 90`; ensure the deployment plan and any upstream proxy permit this duration. The abort signal cancels the local fetch before fallback.

**Billing boundary:** after an observed successful response there is exactly one successful provider attempt and no fallback. A timeout or broken network connection cannot prove that the remote provider stopped generation or did not bill it. Aborting locally is not a billing cancellation guarantee. The requested automatic fallback therefore cannot guarantee zero charges from a timed-out provider.

## Usage and compatibility

Persona Chat, Multi-Persona, Research and challenge evaluation all use the router. Structured `[ai-router]` events include a request ID, actual provider/model, status, HTTP status, input/output/total tokens when supplied, and classified fallback reason. They do not include prompts, answers, raw errors, keys or user identity.

Chat and Multi-Persona reserve **one** message before calling the router, preserving existing plan limits. Reservations use `ai-pending`; a successful answer atomically transfers one message to the actual answering provider and records its reported total tokens. The database reservation date is retained across midnight. Failed requests retain their reservation, as before. Database-write failures produce a metadata-only warning without triggering another AI call.

The existing `usage` schema stores aggregate tokens rather than separate input/output counts or models; the latter are available in router events, and Persona Chat continues to save the actual provider/model through `recordChat`. Research/evaluation continue to use their existing quota behavior and produce the same router telemetry. No database migration is required; the usage update works through the existing `personax_query` RPC.

If a provider omits usage, chat retains the existing character-based token estimate. `estimated_cost` retains the pre-existing generic `tokens × 0.000001` heuristic; it is **not** a provider-specific invoice calculation. Do not use it for billing reconciliation.

## Verification

```sh
npm run test:ai
npm run test:deepseek:live
npx tsc --noEmit
npm run build
```

`test:ai` mocks HTTP and never contacts a paid provider. It covers success short-circuiting, 429, network/timeout, balance/quota, final OpenAI fallback, missing configuration, malformed responses, private-log redaction, actual model/usage, Groq plan overrides, preserved Einstein/Sherlock prompts and DeepSeek-only Research.

`test:deepseek:live` explicitly makes one small real DeepSeek request using Next's environment-loading precedence; it prints only diagnostics and usage. The initial standalone test passed before router integration: HTTP 200, `deepseek-flash`, parsed expected marker, 23 input / 4 output tokens. Live OpenAI was not tested because no key was configured; its fallback was tested with mocked HTTP.
