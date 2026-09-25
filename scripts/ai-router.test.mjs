import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './ai-module-loader.mjs';
const { callAI } = load('src/lib/ai/router.ts');
const originalFetch = global.fetch;
const originalInfo = console.info;
const originalEnv = { ...process.env };
let logs;
beforeEach(() => {
  for (const key of Object.keys(process.env)) if (/^(DEEPSEEK_|GROQ_|OPENAI_)/.test(key)) delete process.env[key];
  process.env.DEEPSEEK_API_KEY = 'deepseek-test-secret';
  process.env.GROQ_API_KEY = 'groq-test-secret';
  process.env.OPENAI_API_KEY = 'openai-test-secret';
  logs = []; console.info = (...args) => logs.push(args.join(' '));
});
afterEach(() => { global.fetch = originalFetch; console.info = originalInfo; process.env = { ...originalEnv }; });
const messages = [{ role: 'system', content: 'PRIVATE PERSONA CONTEXT' }, { role: 'user', content: 'PRIVATE USER QUESTION' }];
function mockProviders(steps) {
  const calls = []; let active = 0;
  global.fetch = async (url, init) => {
    assert.equal(active, 0, 'providers must never run concurrently'); active++;
    try {
      const provider = new URL(url).hostname.includes('deepseek') ? 'deepseek' : new URL(url).hostname.includes('groq') ? 'groq' : 'openai';
      const body = JSON.parse(init.body); calls.push({ provider, body });
      const step = steps[calls.length - 1]; assert.ok(step, 'unexpected extra provider call'); assert.equal(provider, step.provider);
      if (step.network) throw new TypeError('PRIVATE network error');
      if (step.timeout) return await new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      if (step.status) return Response.json({ error: { code: step.code, message: 'PRIVATE error' } }, { status: step.status });
      if (step.payload !== undefined) return Response.json(step.payload);
      return Response.json(provider === 'openai'
        ? { model: 'openai-actual', output: [{ content: [{ type: 'output_text', text: 'PRIVATE ANSWER' }] }], usage: { input_tokens: 51, output_tokens: 9 } }
        : { model: `${provider}-actual`, choices: [{ message: { content: 'PRIVATE ANSWER' } }], usage: { prompt_tokens: 42, completion_tokens: 8 } });
    } finally { active--; }
  };
  return calls;
}
test('TEST 1/6: DeepSeek success stops routing after exactly one billable HTTP request', async () => {
  const calls = mockProviders([{ provider: 'deepseek' }]);
  const result = await callAI(messages, { model: 'groq-plan-model' });
  assert.equal(result.ok, true); assert.equal(result.provider, 'deepseek'); assert.equal(result.model, 'deepseek-actual');
  assert.deepEqual(calls.map(c => c.provider), ['deepseek']); assert.equal(calls[0].body.model, 'deepseek-flash');
  assert.deepEqual(calls[0].body.messages, messages); assert.equal(result.usage.totalTokens, 50);
  assert.equal(result.attempts.length, 1); assert.equal(result.fallbackReason, undefined);
});
for (const [name, failure, reason] of [
  ['TEST 2: 429', { status: 429 }, 'rate_limit'],
  ['TEST 3: timeout', { timeout: true }, 'timeout'],
  ['TEST 3: network', { network: true }, 'network_error'],
  ['TEST 4: balance', { status: 402 }, 'quota_exhausted'],
  ['TEST 4: quota', { status: 400, code: 'insufficient_quota' }, 'quota_exhausted'],
  ['5xx', { status: 503 }, 'server_error'],
  ['unavailable model', { status: 400, code: 'model_not_found' }, 'model_unavailable'],
  ['invalid key', { status: 401 }, 'authentication'],
]) {
  test(`${name}: exactly one Groq fallback, no OpenAI call`, async () => {
    const calls = mockProviders([{ provider: 'deepseek', ...failure }, { provider: 'groq' }]);
    const result = await callAI(messages, { model: 'groq-plan-model', timeoutMs: 15 });
    assert.equal(result.ok, true); assert.equal(result.provider, 'groq');
    assert.deepEqual(calls.map(c => c.provider), ['deepseek', 'groq']);
    assert.deepEqual(calls[1].body.messages, messages); assert.equal(calls[1].body.model, 'groq-plan-model');
    assert.equal(result.fallbackReason, `deepseek:${reason}`);
  });
}
test('TEST 5: DeepSeek + Groq failures lead to one final OpenAI attempt', async () => {
  process.env.OPENAI_POWERFUL_MODEL = 'existing-powerful-model';
  const calls = mockProviders([{ provider: 'deepseek', status: 503 }, { provider: 'groq', status: 429 }, { provider: 'openai' }]);
  const result = await callAI(messages, { task: 'research' });
  assert.equal(result.provider, 'openai'); assert.equal(result.model, 'openai-actual'); assert.equal(result.usage.totalTokens, 60);
  assert.deepEqual(calls.map(c => c.provider), ['deepseek', 'groq', 'openai']);
  assert.deepEqual(calls[2].body.input, messages); assert.equal(calls[2].body.store, false);
  assert.equal(calls[2].body.model, 'existing-powerful-model'); assert.equal(result.attempts.length, 3);
});
test('missing DeepSeek/Groq configuration skips HTTP calls; existing OpenAI remains optional', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  let calls = mockProviders([{ provider: 'groq' }]);
  assert.equal((await callAI(messages)).provider, 'groq'); assert.equal(calls.length, 1);
  delete process.env.GROQ_API_KEY;
  calls = mockProviders([{ provider: 'openai' }]);
  assert.equal((await callAI(messages)).provider, 'openai'); assert.equal(calls.length, 1);
  delete process.env.OPENAI_API_KEY;
  calls = mockProviders([]);
  assert.equal((await callAI(messages)).ok, false); assert.equal(calls.length, 0);
});
test('all providers fail once; no retry loop or raw errors in response/logs', async () => {
  const calls = mockProviders([{ provider: 'deepseek', status: 503 }, { provider: 'groq', status: 503 }, { provider: 'openai', status: 503 }]);
  const result = await callAI(messages); assert.equal(result.ok, false); assert.equal(calls.length, 3);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.ok(!logs.join('').includes('PRIVATE')); assert.ok(!logs.join('').includes('test-secret'));
});
test('invalid input, malformed success, and content filtering do not trigger paid fallback', async () => {
  for (const step of [{ status: 400 }, { payload: { choices: [] } }, { payload: { choices: [{ finish_reason: 'content_filter', message: { content: '' } }] } }]) {
    const calls = mockProviders([{ provider: 'deepseek', ...step }]);
    const result = await callAI(messages); assert.equal(result.ok, false); assert.equal(calls.length, 1);
  }
});
test('Groq quota/configuration failures permit final fallback, invalid requests stop', async () => {
  for (const status of [401, 402, 404, 429, 503]) {
    const calls = mockProviders([{ provider: 'deepseek', status: 503 }, { provider: 'groq', status }, { provider: 'openai' }]);
    assert.equal((await callAI(messages)).provider, 'openai'); assert.equal(calls.length, 3);
  }
  const calls = mockProviders([{ provider: 'deepseek', status: 503 }, { provider: 'groq', status: 422 }]);
  assert.equal((await callAI(messages)).ok, false); assert.equal(calls.length, 2);
});
test('successful request logs actual provider/model, usage and status without conversation or secrets', async () => {
  mockProviders([{ provider: 'deepseek', status: 429 }, { provider: 'groq' }]);
  await callAI(messages);
  const entries = logs.map(line => JSON.parse(line.slice('[ai-router] '.length)));
  assert.equal(entries[1].provider, 'groq'); assert.equal(entries[1].model, 'groq-actual');
  assert.equal(entries[1].status, 'success'); assert.equal(entries[1].usage.inputTokens, 42);
  assert.equal(entries[1].fallbackReason, 'deepseek:rate_limit'); assert.equal(entries[0].requestId, entries[1].requestId);
  assert.ok(!logs.join('').includes('PRIVATE')); assert.ok(!logs.join('').includes('test-secret'));
});
test('Einstein and Sherlock retain existing system prompts, memory and history through DeepSeek', async () => {
  const { generatePersonaResponse } = load('src/lib/ai/persona-engine.ts');
  const { buildPromptMessages } = load('src/lib/ai/prompt-engine/builder.ts');
  const { getPersonaBySlug } = load('src/lib/personas.ts');
  for (const slug of ['albert-einstein', 'sherlock-holmes']) {
    const persona = getPersonaBySlug(slug); assert.ok(persona);
    const context = { personaSlug: slug, userMessage: 'What follows from our earlier idea?', mode: 'Expert', language: 'English', history: [{ role: 'user', content: 'Our earlier idea' }, { role: 'assistant', content: 'Our previous response' }], memory: ['We discussed observation.'], selectedExpertise: persona.expertise[0] };
    const calls = mockProviders([{ provider: 'deepseek' }]);
    const result = await generatePersonaResponse(context);
    assert.equal(result.ok, true); assert.deepEqual(calls[0].body.messages, buildPromptMessages({ ...context, persona }));
    assert.ok(calls[0].body.messages[0].content.includes(persona.name)); assert.equal(result.usage.totalTokens, 50);
  }
});
test('Research works when only DeepSeek is configured', async () => {
  delete process.env.GROQ_API_KEY; delete process.env.OPENAI_API_KEY;
  const { getResearchStatus, runResearchQuery } = load('src/lib/research.ts');
  assert.equal(getResearchStatus().enabled, true);
  const calls = mockProviders([{ provider: 'deepseek' }]);
  assert.equal((await runResearchQuery('Explain gravity')).ok, true); assert.equal(calls.length, 1);
});
