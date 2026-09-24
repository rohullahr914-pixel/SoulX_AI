import nextEnv from '@next/env';
import { load } from './ai-module-loader.mjs';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { callDeepSeek } = load('src/lib/ai/deepseek.ts');
(async () => {
  const result = await callDeepSeek([
    { role: 'system', content: 'This is a connection test. Reply with only SOULX_OK.' },
    { role: 'user', content: 'Confirm the connection.' },
  ], { maxTokens: 24, temperature: 0, timeoutMs: 25000 });
  // Only fixed diagnostics and usage; never keys, raw errors or conversation content.
  console.log(JSON.stringify({ ok: result.ok, provider: result.provider, model: result.model, status: result.statusCode, reason: result.reason, responseParsed: Boolean(result.content), markerMatched: result.content === 'SOULX_OK', usage: result.usage }));
  if (!result.ok || result.content !== 'SOULX_OK') process.exitCode = 1;
})().catch(() => { console.error('DeepSeek smoke test failed.'); process.exitCode = 1; });
