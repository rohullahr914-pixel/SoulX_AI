import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './ai-module-loader.mjs';
const { callDeepSeek } = load('src/lib/ai/deepseek.ts');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnv }; });
const messages = [{ role: 'system', content: 'Persona and context' }, { role: 'user', content: 'Earlier question' }, { role: 'assistant', content: 'Earlier answer' }, { role: 'user', content: 'Current question' }];
function configure() { process.env.DEEPSEEK_API_KEY = 'test-only'; delete process.env.DEEPSEEK_BASE_URL; delete process.env.DEEPSEEK_MODEL; }
test('DeepSeek preserves all messages and settings and parses content, actual model and usage', async () => {
  configure(); let calls = 0;
  global.fetch = async (url, init) => {
    calls++; assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer test-only');
    const body = JSON.parse(init.body);
    assert.deepEqual(body.messages, messages); assert.equal(body.model, 'deepseek-flash');
    assert.equal(body.temperature, 0.3); assert.equal(body.max_tokens, 90);
    assert.deepEqual(body.thinking, { type: 'disabled' }); assert.equal(body.stream, false);
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    return Response.json({ model: 'deepseek-flash-version', choices: [{ message: { content: ' Answer ' } }], usage: { prompt_tokens: 30, completion_tokens: 7 } });
  };
  const result = await callDeepSeek(messages, { temperature: 0.3, maxTokens: 90 });
  assert.equal(result.ok, true); assert.equal(result.content, 'Answer'); assert.equal(result.model, 'deepseek-flash-version');
  assert.deepEqual(result.usage, { inputTokens: 30, outputTokens: 7, totalTokens: 37 }); assert.equal(calls, 1);
});
for (const [status, code, reason, retryable] of [[429,'','rate_limit',true],[503,'','server_error',true],[401,'','authentication',true],[402,'','quota_exhausted',true],[400,'insufficient_quota','quota_exhausted',true],[400,'model_not_found','model_unavailable',true],[422,'','invalid_request',false]]) {
  test(`DeepSeek classifies ${status} ${code} without leaking error details`, async () => {
    configure(); let calls = 0;
    global.fetch = async () => { calls++; return Response.json({ error: { code, message: 'PRIVATE CONTENT test-only' } }, { status }); };
    const result = await callDeepSeek(messages);
    assert.equal(result.reason, reason); assert.equal(result.retryable, retryable); assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes('PRIVATE CONTENT')); assert.ok(!JSON.stringify(result).includes('test-only'));
  });
}
test('DeepSeek aborts a timed-out request, including waiting for the response body', async () => {
  configure(); let aborted = false;
  global.fetch = async (_url, init) => ({ ok: true, status: 200, json: () => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  }) });
  const result = await callDeepSeek(messages, { timeoutMs: 10 });
  assert.equal(aborted, true); assert.equal(result.reason, 'timeout'); assert.equal(result.retryable, true);
});
test('DeepSeek handles network failures without exposing the underlying error', async () => {
  configure(); global.fetch = async () => { throw new Error('PRIVATE CONTENT'); };
  const result = await callDeepSeek(messages); assert.equal(result.reason, 'network_error'); assert.equal(result.retryable, true);
});
test('DeepSeek missing key and unsafe base URL never send a request', async () => {
  configure(); global.fetch = async () => { assert.fail('must not send'); };
  process.env.DEEPSEEK_API_KEY = ''; assert.equal((await callDeepSeek(messages)).reason, 'configuration');
  process.env.DEEPSEEK_API_KEY = 'test-only'; process.env.DEEPSEEK_BASE_URL = 'http://api.deepseek.com';
  assert.equal((await callDeepSeek(messages)).reason, 'configuration');
});
test('DeepSeek does not retry malformed, empty, or filtered successful HTTP responses', async () => {
  configure();
  for (const value of [null, { choices: [{ message: { content: 123 } }] }, { choices: [{ finish_reason: 'content_filter', message: { content: '' } }] }]) {
    global.fetch = async () => Response.json(value);
    const result = await callDeepSeek(messages); assert.equal(result.ok, false); assert.equal(result.retryable, false);
  }
  global.fetch = async () => new Response('not JSON');
  assert.equal((await callDeepSeek(messages)).reason, 'invalid_response');
});
