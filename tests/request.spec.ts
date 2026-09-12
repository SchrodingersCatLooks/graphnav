import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractFromDocument, type DocsApiDocument } from '../lib/google/docs-content';
import { hashGenerationInput, type GenerationInput } from '../lib/generation/types';
import { buildInstructions, requestDraft, type DraftProvider, type ProviderReply } from '../lib/generation/request';

const fixturePath = fileURLToPath(new URL('./fixtures/docs-tabs-response.json', import.meta.url));

async function buildInput(): Promise<{ input: GenerationInput; hash: string }> {
  const document = JSON.parse(await readFile(fixturePath, 'utf8')) as DocsApiDocument;
  const extraction = extractFromDocument(document, 'doc-1', ['t.0'], 'account-key-1');
  const input: GenerationInput = {
    purpose: 'concept-connections',
    documentId: 'doc-1',
    passages: extraction.tabs.flatMap((t) => t.passages),
    totalCharacters: extraction.totalCharacters,
    truncated: extraction.truncated,
    existingNodeIds: ['node-existing-1'],
  };
  return { input, hash: await hashGenerationInput(input) };
}

/** Stands in for the relay, so the whole path runs with no key and no network. */
const providerReturning = (reply: ProviderReply | (() => Promise<ProviderReply>)): DraftProvider => ({
  propose: typeof reply === 'function' ? reply : async () => reply,
});

const goodDraft = (hash: string) => JSON.stringify({
  draftVersion: 1,
  inputHash: hash,
  nodes: [{
    tempId: 'n1', label: 'Decision points explain failures', kind: 'idea',
    rationale: 'Background states failures cluster at junctions.', evidencePassageIds: ['t.0:0'],
  }],
  relationships: [{
    tempId: 'r1',
    from: { kind: 'draft', tempId: 'n1' },
    to: { kind: 'existing', nodeId: 'node-existing-1' },
    label: 'supports', kind: 'reference',
    rationale: 'Same junction evidence.', evidencePassageIds: ['t.0:0'],
  }],
});

test('a grounded draft comes back as a proposal, not as applied records', async () => {
  const { input, hash } = await buildInput();
  const outcome = await requestDraft(input, providerReturning({ kind: 'json', text: goodDraft(hash) }));

  expect(outcome.status).toBe('draft');
  if (outcome.status === 'draft') {
    expect(outcome.inputHash).toBe(hash);
    expect(outcome.draft.nodes[0]!.label).toBe('Decision points explain failures');
  }
});

test('a refusal is its own state, not an error', async () => {
  const { input } = await buildInput();
  const outcome = await requestDraft(input, providerReturning({ kind: 'refusal', reason: 'Declined.' }));

  expect(outcome.status).toBe('refused');
  if (outcome.status === 'refused') expect(outcome.reason).toBe('Declined.');
});

test('an empty answer is a real result, distinct from a failure', async () => {
  const { input, hash } = await buildInput();
  const empty = JSON.stringify({ draftVersion: 1, inputHash: hash, nodes: [], relationships: [] });
  const outcome = await requestDraft(input, providerReturning({ kind: 'json', text: empty }));

  expect(outcome.status).toBe('empty');
});

test('unusable content is refused rather than repaired', async () => {
  const { input, hash } = await buildInput();

  const notJson = await requestDraft(input, providerReturning({ kind: 'json', text: 'Sure! Here is a graph:' }));
  expect(notJson.status).toBe('invalid');

  // Well-formed JSON that cites content never sent.
  const ungrounded = JSON.stringify({
    draftVersion: 1, inputHash: hash,
    nodes: [{ tempId: 'n1', label: 'Invented', kind: 'idea', rationale: '', evidencePassageIds: ['t.never:9'] }],
    relationships: [],
  });
  const outcome = await requestDraft(input, providerReturning({ kind: 'json', text: ungrounded }));
  expect(outcome.status).toBe('invalid');
  if (outcome.status === 'invalid') expect(outcome.error).toContain('was not submitted');
});

test('a draft answering different content cannot slip through', async () => {
  const { input } = await buildInput();
  const outcome = await requestDraft(input, providerReturning({ kind: 'json', text: goodDraft('c'.repeat(64)) }));

  expect(outcome.status).toBe('invalid');
  if (outcome.status === 'invalid') expect(outcome.error).toContain('does not match the submitted content');
});

test('a slow provider times out instead of hanging the panel', async () => {
  const { input } = await buildInput();
  const outcome = await requestDraft(input, providerReturning(
    (): Promise<ProviderReply> => new Promise((_resolve, reject) => setTimeout(() => reject(new Error('aborted')), 100)),
  ), 20);

  expect(outcome.status).toBe('timeout');
});

test('a relay that cannot be reached is reported, leaving manual maps usable', async () => {
  const { input } = await buildInput();
  const outcome = await requestDraft(input, providerReturning(
    (): Promise<ProviderReply> => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:8787')),
  ));

  expect(outcome.status).toBe('unavailable');
  if (outcome.status === 'unavailable') expect(outcome.error).toContain('ECONNREFUSED');
});

test('a second request while one is in flight is rejected, not queued', async () => {
  const { input, hash } = await buildInput();
  let release: (reply: ProviderReply) => void = () => {};
  let markStarted: () => void = () => {};
  // requestDraft hashes the input before calling the provider, so wait until the
  // provider is genuinely in flight rather than assuming a tick is enough.
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const slow = providerReturning(() => {
    markStarted();
    return new Promise<ProviderReply>((resolve) => { release = resolve; });
  });

  const first = requestDraft(input, slow);
  await started;
  const second = await requestDraft(input, providerReturning({ kind: 'json', text: goodDraft(hash) }));
  expect(second.status).toBe('busy');

  release({ kind: 'json', text: goodDraft(hash) });
  expect((await first).status).toBe('draft');

  // Once it settles, a new request is accepted again.
  const third = await requestDraft(input, providerReturning({ kind: 'json', text: goodDraft(hash) }));
  expect(third.status).toBe('draft');
});

test('the instructions forbid the things validation enforces', async () => {
  const { input } = await buildInput();
  const instructions = buildInstructions(input);

  expect(instructions).toContain('never modify');
  expect(instructions).toContain('Never propose "contains"');
  expect(instructions).toContain('Do not invent URLs');
  expect(instructions).toContain('return empty lists rather than guessing');
});
