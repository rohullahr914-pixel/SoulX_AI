import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './ai-module-loader.mjs';

const { sanitizeAgentId } = load('src/lib/server/voice.ts');

test('sanitizeAgentId accepts valid ElevenLabs agent IDs with branch query params', () => {
  assert.equal(sanitizeAgentId('agent_8401m3f5qja3fd49ec3x53r00n2w?branchId=agtbrch_1001m3f5qmdsepwrrdmky0va98h0'), 'agent_8401m3f5qja3fd49ec3x53r00n2w');
  assert.equal(sanitizeAgentId('https://api.elevenlabs.io/agent_8401m3f5qja3fd49ec3x53r00n2w?branchId=agtbrch_1001m3f5qmdsepwrrdmky0va98h0'), 'agent_8401m3f5qja3fd49ec3x53r00n2w');
  assert.equal(sanitizeAgentId('agent_abc123'), 'agent_abc123');
});

test('sanitizeAgentId falls back when value is invalid', () => {
  assert.equal(sanitizeAgentId('not-an-agent-id', 'agent_default'), 'agent_default');
  assert.equal(sanitizeAgentId('', 'agent_default'), 'agent_default');
});
