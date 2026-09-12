import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { RelayClient, RELAY_BYTES, RELAY_BASE } from '../lib/generation/relay';
import { requestDraft, type ProviderReply } from '../lib/generation/request';
import { GenerationUiService } from '../lib/generation/ui-service';
import { extractFromDocument } from '../lib/google/docs-content';
import { hashGenerationInput, type GenerationInput } from '../lib/generation/types';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository } from '../lib/storage/repository';

const code = 'synthetic-pairing-code-for-tests-only-123456';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
async function setup() {
  const fixture = JSON.parse(await readFile('tests/fixtures/docs-tabs-response.json', 'utf8'));
  const extracted = extractFromDocument(fixture, 'doc-1', ['t.0'], 'account-1');
  const input: GenerationInput = { purpose: 'concept-connections', documentId: 'doc-1', passages: extracted.tabs.flatMap((tab) => tab.passages), totalCharacters: extracted.totalCharacters, truncated: extracted.truncated, existingNodeIds: [] };
  return { fixture, extracted, input };
}
const emptyReply = async (input: GenerationInput): Promise<ProviderReply> => ({ kind: 'json', text: JSON.stringify({ draftVersion: 1, inputHash: await hashGenerationInput(input), nodes: [], relationships: [] }) });

test('pairing authenticates health, exposes no code in status, and sends the bounded selected input only', async () => {
  let stored: string | undefined;
  const calls: { url: string; options?: RequestInit }[] = [];
  const { input } = await setup();
  const client = new RelayClient(async () => stored, async (value) => { stored = value; }, async (url, options) => {
    calls.push({ url: String(url), options });
    return json(String(url).endsWith('/health') ? { protocol: 1, ready: true, model: 'fixture-provider' } : await emptyReply(input));
  });
  expect(await client.status()).toEqual({ configured: false, ready: false });
  expect(calls).toHaveLength(0);
  expect(await client.pair(code)).toEqual({ configured: true, ready: true, model: 'fixture-provider' });
  expect(stored).toBe(code);
  expect(JSON.stringify(await client.status())).not.toContain(code);
  expect((await requestDraft(input, client.provider(input))).status).toBe('empty');
  const sent = calls.at(-1)!;
  expect(sent.url).toBe(`${RELAY_BASE}/draft`);
  expect(sent.options?.redirect).toBe('error');
  expect(sent.options?.headers).toMatchObject({ Authorization: `Bearer ${code}` });
  expect(JSON.parse(sent.options!.body as string)).toEqual(input);
  await client.forget(); expect(stored).toBeUndefined();
});

test('a provider key or refused pairing never replaces the current session code', async () => {
  let stored: string | undefined = code, calls = 0;
  const client = new RelayClient(async () => stored, async (value) => { stored = value; }, async () => { calls++; return json({ secret: 'should not be surfaced' }, 403); });
  await expect(client.pair(`sk-${'a'.repeat(50)}`)).rejects.toThrow('pairing code');
  expect(calls).toBe(0);
  await expect(client.pair('different-test-code-'.repeat(3))).rejects.toThrow('refused');
  expect(stored).toBe(code);
  expect(await client.status()).toMatchObject({ configured: true, ready: false });
});

test('the relay response cap applies to streamed bytes even without Content-Length', async () => {
  const { input } = await setup(); let cancelled = false;
  const client = new RelayClient(async () => code, async () => {}, async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(RELAY_BYTES)); controller.enqueue(new Uint8Array([1])); },
    cancel() { cancelled = true; },
  })));
  const outcome = await requestDraft(input, client.provider(input));
  expect(outcome).toMatchObject({ status: 'unavailable', error: expect.stringContaining('size limit') });
  expect(cancelled).toBe(true);
});

test('missing pairing never sends content and malformed transport is a visible failure', async () => {
  const { input } = await setup(); let calls = 0;
  const client = new RelayClient(async () => undefined, async () => {}, async () => { calls++; return json({}); });
  expect((await requestDraft(input, client.provider(input))).status).toBe('unavailable');
  expect(calls).toBe(0);
  const malformed = new RelayClient(async () => code, async () => {}, async () => new Response('not JSON'));
  expect(await requestDraft(input, malformed.provider(input))).toMatchObject({ status: 'unavailable', error: 'The relay returned an invalid response.' });
});

test('changed Docs text, account, or map revision fails before a paid request', async () => {
  const { input, extracted } = await setup();
  const db = new GraphDatabase(`generation-${crypto.randomUUID()}`), repository = new GraphRepository(db);
  let calls = 0;
  const relay = new RelayClient(async () => code, async () => {}, async () => { calls++; return json(await emptyReply(input)); });
  const request = { requestId: crypto.randomUUID(), input };
  try {
    const wrongAccount = new GenerationUiService(repository, relay, async () => 'other-account', async () => extracted);
    expect(await wrongAccount.generate(request, 'tab-1', false)).toMatchObject({ status: 'unavailable', error: expect.stringContaining('account changed') });
    const changed = structuredClone(extracted); changed.tabs[0]!.passages[0]!.text += ' changed'; changed.tabs[0]!.passages[0]!.charCount += 8; changed.totalCharacters += 8;
    const wrongText = new GenerationUiService(repository, relay, async () => 'account-1', async () => changed);
    expect(await wrongText.generate(request, 'tab-1', false)).toMatchObject({ status: 'unavailable', error: expect.stringContaining('document changed') });
    const graph = await repository.createGraph('Kept map');
    const service = new GenerationUiService(repository, relay, async () => 'account-1', async () => extracted);
    expect(await service.generate({ ...request, graphId: graph.id, revision: graph.contentRevision + 1 }, 'tab-1', false)).toMatchObject({ status: 'unavailable', error: expect.stringContaining('map changed') });
    expect(calls).toBe(0);
    expect((await service.generate(request, 'tab-1', false)).status).toBe('empty');
    expect(calls).toBe(1);
    expect(await db.nodes.count()).toBe(0);
  } finally { await db.delete(); }
});

test('owner-scoped cancellation settles while Google is held and its late read never calls the provider', async () => {
  const { input, extracted } = await setup();
  const db = new GraphDatabase(`generation-${crypto.randomUUID()}`), repository = new GraphRepository(db);
  let calls = 0, release!: () => void, started!: () => void;
  const reading = new Promise<void>((resolve) => { started = resolve; });
  const relay = new RelayClient(async () => code, async () => {}, async () => { calls++; return json(await emptyReply(input)); });
  const service = new GenerationUiService(repository, relay, async () => 'account-1', async () => { started(); await new Promise<void>((resolve) => { release = resolve; }); return extracted; });
  const request = { requestId: crypto.randomUUID(), input };
  try {
    const pending = service.generate(request, 'tab-1', false); await reading;
    expect(await service.generate({ ...request, requestId: crypto.randomUUID() }, 'tab-2', false)).toEqual({ status: 'busy' });
    expect(() => service.cancel(request.requestId, 'tab-2')).toThrow('another tab');
    service.cancel(request.requestId, 'tab-1');
    expect(await pending).toEqual({ status: 'cancelled' });
    release(); await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toBe(0); expect(await db.nodes.count()).toBe(0);
  } finally { await db.delete(); }
});

test('account changes while a provider replies discard the result', async () => {
  const { input, extracted } = await setup();
  const db = new GraphDatabase(`generation-${crypto.randomUUID()}`), repository = new GraphRepository(db);
  let account = 'account-1';
  const relay = new RelayClient(async () => code, async () => {}, async () => { account = 'account-2'; return json(await emptyReply(input)); });
  const service = new GenerationUiService(repository, relay, async () => account, async () => extracted);
  try {
    expect(await service.generate({ requestId: crypto.randomUUID(), input }, 'tab-1', false)).toMatchObject({ status: 'unavailable', error: expect.stringContaining('account changed') });
    expect(await db.nodes.count()).toBe(0);
  } finally { await db.delete(); }
});
