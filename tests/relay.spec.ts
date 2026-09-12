import { test, expect } from '@playwright/test';
import { graphDraftSchema } from '../lib/generation/types';
import {
  RelayRejectedError,
  RelayUnreachableError,
  createRelayProvider,
  draftJsonSchema,
  relayReachable,
} from '../lib/generation/relay-provider';

const settings = { url: 'http://127.0.0.1:8787', token: 'test-token' };

/** Replaces fetch for one call, returning what the relay would have said. */
function withFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => { globalThis.fetch = original; });
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const request = () => ({
  instructions: 'i', input: '{}', timeoutMs: 1000, signal: new AbortController().signal,
});

test('the schema sent to the model is generated from the contract we validate against', () => {
  const schema = draftJsonSchema();

  // Not a hand-written duplicate: it describes the same draft shape.
  expect(schema).toHaveProperty('properties');
  const properties = (schema as { properties: Record<string, unknown> }).properties;
  expect(Object.keys(properties).sort()).toEqual(['draftVersion', 'inputHash', 'nodes', 'relationships']);

  // The Zod object is the single source of truth for both.
  expect(graphDraftSchema.safeParse({
    draftVersion: 1, inputHash: 'a'.repeat(64), nodes: [], relationships: [],
  }).success).toBe(true);
});

test('the model key never leaves the relay, only the shared token is sent', async () => {
  let sentHeaders: Record<string, string> = {};
  let sentBody = '';

  await withFetch(async (_url, init) => {
    sentHeaders = (init?.headers ?? {}) as Record<string, string>;
    sentBody = String(init?.body ?? '');
    return jsonResponse(200, { kind: 'json', text: '{}' });
  }, () => createRelayProvider(settings).propose(request()));

  expect(sentHeaders.authorization).toBe('Bearer test-token');
  // Nothing resembling a provider key is present anywhere in the request.
  expect(sentBody).not.toContain('sk-');
  expect(JSON.stringify(sentHeaders)).not.toContain('sk-');
  // The schema travels with the request, so the relay stays contract-agnostic.
  expect(JSON.parse(sentBody).schemaName).toBe('graph_draft');
  expect(JSON.parse(sentBody).schema).toHaveProperty('properties');
});

test('a stopped relay reads as AI being off, not as a broken extension', async () => {
  const outcome = withFetch(
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => createRelayProvider(settings).propose(request()),
  );

  await expect(outcome).rejects.toThrow(RelayUnreachableError);
  await expect(outcome).rejects.toThrow(/Manual maps still work/);
});

test('relay rejections explain which side to fix', async () => {
  const cases: Array<[number, RegExp]> = [
    [401, /RELAY_TOKEN matches on both sides/],
    [403, /ALLOWED_ORIGIN matches the extension ID/],
    [413, /too large/i],
    [503, /no model key configured/],
    [504, /did not respond in time/],
  ];

  for (const [status, expected] of cases) {
    const outcome = withFetch(
      () => Promise.resolve(jsonResponse(status, { error: 'x' })),
      () => createRelayProvider(settings).propose(request()),
    );
    await expect(outcome).rejects.toThrow(RelayRejectedError);
    await expect(outcome).rejects.toThrow(expected);
  }
});

test('a refusal is passed through rather than turned into an error', async () => {
  const reply = await withFetch(
    () => Promise.resolve(jsonResponse(200, { kind: 'refusal', reason: 'Declined.' })),
    () => createRelayProvider(settings).propose(request()),
  );

  expect(reply).toEqual({ kind: 'refusal', reason: 'Declined.' });
});

test('an unrecognised relay response is refused, not passed to validation', async () => {
  const outcome = withFetch(
    () => Promise.resolve(jsonResponse(200, { unexpected: true })),
    () => createRelayProvider(settings).propose(request()),
  );

  await expect(outcome).rejects.toThrow(/unexpected response/);
});

test('reachability reports false instead of throwing when nothing is listening', async () => {
  const down = await withFetch(
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => relayReachable(settings),
  );
  expect(down).toBe(false);

  const up = await withFetch(
    () => Promise.resolve(jsonResponse(200, { ok: true })),
    () => relayReachable(settings),
  );
  expect(up).toBe(true);
});
