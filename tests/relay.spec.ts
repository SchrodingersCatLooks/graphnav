import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { createRelayServer, EXTENSION_ORIGIN, MAX_BODY_BYTES, type RelayConfig } from '../relay/src/app';
import { callProvider, type ProviderCall } from '../relay/src/providers';
import { extractFromDocument } from '../lib/google/docs-content';
import { draftJsonSchema } from '../lib/generation/relay-provider';
import { graphDraftSchema, generationInputSchema, hashGenerationInput } from '../lib/generation/types';

const config: RelayConfig = { token: 'synthetic-session-code-for-testing-only', apiKey: 'synthetic-provider-key', model: 'gpt-5-mini', provider: 'openai' };
async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test port');
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
const headers = { Origin: EXTENSION_ORIGIN, Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
async function input() {
  const fixture = JSON.parse(await readFile('tests/fixtures/docs-tabs-response.json', 'utf8'));
  const extracted = extractFromDocument(fixture, 'doc-1', ['t.0'], 'account-1');
  return { purpose: 'concept-connections', documentId: 'doc-1', passages: extracted.tabs.flatMap((tab) => tab.passages), totalCharacters: extracted.totalCharacters, truncated: extracted.truncated, existingNodeIds: [] };
}
function empty(call: ProviderCall) { return { kind: 'json' as const, text: JSON.stringify({ draftVersion: 1, inputHash: JSON.parse(call.input).inputHash, nodes: [], relationships: [] }) }; }

test('real relay health requires pairing, rejects other origins and exposes configuration without secrets', async () => {
  const server = createRelayServer(config); const url = await listen(server);
  try {
    expect((await fetch(`${url}/health`)).status).toBe(401);
    expect((await fetch(`${url}/health`, { headers: { ...headers, Origin: 'https://unrelated.test' } })).status).toBe(403);
    const health = await (await fetch(`${url}/health`, { headers })).json();
    expect(health).toEqual({ protocol: 1, ready: true, model: 'gpt-5-mini' });
    expect(JSON.stringify(health)).not.toContain(config.apiKey);
    // An extension GET without Origin is accepted only with the secret pairing.
    expect((await fetch(`${url}/health`, { headers: { Authorization: headers.Authorization } })).status).toBe(200);
    expect((await fetch(`${url}/draft`, { method: 'POST', headers: { Authorization: headers.Authorization } })).status).toBe(403);
    expect((await fetch(`${url}/no-such-route`, { headers })).status).toBe(404);
  } finally { await close(server); }
});

test('invalid and oversized selections never call the provider; valid input uses the shared schema and hash', async () => {
  let calls = 0, captured: ProviderCall | undefined;
  const server = createRelayServer(config, async (_name, call) => { calls++; captured = call; return empty(call); }); const url = await listen(server);
  try {
    const valid = await input();
    expect((await fetch(`${url}/draft`, { method: 'POST', headers, body: JSON.stringify({ ...valid, totalCharacters: 0 }) })).status).toBe(400);
    expect((await fetch(`${url}/draft`, { method: 'POST', headers, body: 'x'.repeat(MAX_BODY_BYTES + 1) })).status).toBe(413);
    expect(calls).toBe(0);
    const response = await fetch(`${url}/draft`, { method: 'POST', headers, body: JSON.stringify(valid) });
    expect(response.status).toBe(200); expect(calls).toBe(1);
    const reply = await response.json();
    expect(graphDraftSchema.safeParse(JSON.parse(reply.text)).success).toBe(true);
    expect(JSON.parse(reply.text).inputHash).toBe(await hashGenerationInput(generationInputSchema.parse(valid)));
    expect(captured!.schema).toEqual(draftJsonSchema());
    expect(captured!.instructions).toContain('untrusted source material');
    expect(JSON.parse(captured!.input).passages.map((passage: { text: string }) => passage.text)).toEqual(valid.passages.map((passage) => passage.text));
    expect(captured!.input).not.toContain('account-1');
  } finally { await close(server); }
});

test('a bad model hash never passes server validation and a launch request cap bounds provider attempts', async () => {
  let calls = 0;
  const server = createRelayServer({ ...config, maxRequests: 1 }, async () => { calls++; return { kind: 'json', text: JSON.stringify({ draftVersion: 1, inputHash: 'f'.repeat(64), nodes: [], relationships: [] }) }; }); const url = await listen(server);
  try {
    const body = JSON.stringify(await input());
    expect((await fetch(`${url}/draft`, { method: 'POST', headers, body })).status).toBe(502);
    expect((await fetch(`${url}/draft`, { method: 'POST', headers, body })).status).toBe(429);
    expect(calls).toBe(1);
  } finally { await close(server); }
});

test('caller disconnect aborts the provider and frees the relay for a later request', async () => {
  let captured: AbortSignal | undefined;
  const server = createRelayServer(config, async (_name, call) => {
    captured = call.signal;
    await new Promise<void>((_resolve, reject) => call.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
    return empty(call);
  }); const url = await listen(server);
  try {
    const body = JSON.stringify(await input()), controller = new AbortController();
    const request = fetch(`${url}/draft`, { method: 'POST', headers, body, signal: controller.signal }).catch(() => null);
    await expect.poll(() => !!captured).toBe(true);
    expect((await fetch(`${url}/draft`, { method: 'POST', headers, body })).status).toBe(409);
    controller.abort(); await request;
    await expect.poll(() => captured!.aborted).toBe(true);
  } finally { await close(server); }
});

test('timeouts settle even when a provider ignores abort and missing configuration never calls it', async () => {
  let calls = 0;
  const provider = async () => { calls++; return new Promise<never>(() => {}); };
  const missing = createRelayServer({ ...config, apiKey: '' }, provider), slow = createRelayServer({ ...config, timeoutMs: 25 }, provider);
  const missingUrl = await listen(missing), slowUrl = await listen(slow);
  try {
    const body = JSON.stringify(await input());
    expect((await fetch(`${missingUrl}/draft`, { method: 'POST', headers, body })).status).toBe(503); expect(calls).toBe(0);
    expect((await fetch(`${slowUrl}/draft`, { method: 'POST', headers, body })).status).toBe(504); expect(calls).toBe(1);
  } finally { await close(missing); await close(slow); }
});

test('OpenAI adapter bounds output, disables response storage and refuses incomplete replies', async () => {
  const original = globalThis.fetch; let sent: any;
  try {
    globalThis.fetch = async (_url, options) => { sent = JSON.parse(options!.body as string); return new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{' }, { type: 'output_text', text: '}' }] }] })); };
    const call: ProviderCall = { apiKey: 'synthetic-only', model: 'gpt-5-mini', input: '{}', instructions: 'test', schema: draftJsonSchema(), schemaName: 'graph_draft', signal: new AbortController().signal };
    expect(await callProvider('openai', call)).toEqual({ kind: 'json', text: '{}' });
    expect(sent).toMatchObject({ store: false, max_output_tokens: 8000, reasoning: { effort: 'minimal' }, text: { format: { strict: true } } });
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'incomplete', output: [{ content: [{ type: 'output_text', text: '{}' }] }] }));
    await expect(callProvider('openai', call)).rejects.toThrow('incomplete');
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'Declined' }] }] }));
    expect(await callProvider('openai', call)).toEqual({ kind: 'refusal', reason: 'Declined' });
  } finally { globalThis.fetch = original; }
});
