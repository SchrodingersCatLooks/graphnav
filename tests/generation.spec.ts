import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractFromDocument, type DocsApiDocument } from '../lib/google/docs-content';
import {
  GENERATION_LIMITS,
  generationInputSchema,
  hashGenerationInput,
  validateDraft,
  type GenerationInput,
} from '../lib/generation/types';

// Labeled synthetic Docs API response; see its _fixture field.
const fixturePath = fileURLToPath(new URL('./fixtures/docs-tabs-response.json', import.meta.url));
const loadFixture = async (): Promise<DocsApiDocument> =>
  JSON.parse(await readFile(fixturePath, 'utf8')) as DocsApiDocument;

const ACCOUNT = 'account-key-1';
const DOC = 'doc-1';

test('only the selected tab is read, and its heading structure is preserved', async () => {
  const extraction = extractFromDocument(await loadFixture(), DOC, ['t.0'], ACCOUNT);

  expect(extraction.tabs).toHaveLength(1);
  expect(extraction.tabs[0]!.tabId).toBe('t.0');

  const passages = extraction.tabs[0]!.passages;
  expect(passages.map((p) => p.heading)).toEqual(['Background', 'Research questions']);

  // Every passage carries the identity needed to detect a later source change.
  for (const passage of passages) {
    expect(passage.version).toBe('ALm37BX-fixture-revision-001');
    expect(passage.sourceId).toBe(`google-docs:${ACCOUNT}:${DOC}`);
    expect(passage.locator).toEqual({ kind: 'docs', documentId: DOC, tabId: 't.0' });
    expect(passage.charCount).toBe(passage.text.length);
  }
});

test('table cells are read, because a table can hold the actual findings', async () => {
  const extraction = extractFromDocument(await loadFixture(), DOC, ['t.0'], ACCOUNT);
  const text = extraction.tabs[0]!.passages.map((p) => p.text).join('\n');

  expect(text).toContain('Junction J3');
  expect(text).toContain('19 backtracks recorded');
});

test('a nested tab is not pulled in unless it was selected', async () => {
  const fixture = await loadFixture();

  // t.nested is a child of t.0 but was not chosen.
  const parentOnly = extractFromDocument(fixture, DOC, ['t.0'], ACCOUNT);
  expect(parentOnly.tabs.map((t) => t.tabId)).toEqual(['t.0']);
  expect(JSON.stringify(parentOnly)).not.toContain('A junction offers two or more onward paths');

  // Selecting it explicitly does read it, even though it is nested.
  const nested = extractFromDocument(fixture, DOC, ['t.nested'], ACCOUNT);
  expect(nested.tabs.map((t) => t.tabId)).toEqual(['t.nested']);
  expect(nested.tabs[0]!.passages[0]!.text).toContain('A junction offers two or more onward paths');
});

test('only https links from selected text are collected', async () => {
  const both = extractFromDocument(await loadFixture(), DOC, ['t.0', 't.methods'], ACCOUNT);

  expect(both.links).toContain('https://example.org/prior-study');
  // An http link is not a destination we will offer.
  expect(both.links.some((l) => l.startsWith('http://'))).toBe(false);
});

test('a large selection is cut at the cap and says so', async () => {
  const long = 'x'.repeat(GENERATION_LIMITS.maxCharacters + 5_000);
  const fixture: DocsApiDocument = {
    title: 'Long',
    revisionId: 'rev-long',
    tabs: [{
      tabProperties: { tabId: 't.long', title: 'Long' },
      documentTab: { body: { content: [
        { paragraph: { paragraphStyle: { namedStyleType: 'HEADING_1' }, elements: [{ textRun: { content: 'Head\n' } }] } },
        { paragraph: { paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }, elements: [{ textRun: { content: long } }] } },
      ] } },
    }],
  };

  const extraction = extractFromDocument(fixture, DOC, ['t.long'], ACCOUNT);
  expect(extraction.truncated).toBe(true);
  expect(extraction.totalCharacters).toBeLessThanOrEqual(GENERATION_LIMITS.maxCharacters);
});

async function buildInput(): Promise<{ input: GenerationInput; hash: string }> {
  const extraction = extractFromDocument(await loadFixture(), DOC, ['t.0'], ACCOUNT);
  const input: GenerationInput = {
    purpose: 'concept-connections',
    documentId: DOC,
    passages: extraction.tabs.flatMap((t) => t.passages),
    totalCharacters: extraction.totalCharacters,
    truncated: extraction.truncated,
    existingNodeIds: ['node-existing-1'],
  };
  expect(generationInputSchema.safeParse(input).success).toBe(true);
  return { input, hash: await hashGenerationInput(input) };
}

const draft = (hash: string, over: Record<string, unknown> = {}) => ({
  draftVersion: 1,
  inputHash: hash,
  nodes: [{
    tempId: 'n1', label: 'Decision points explain failures', kind: 'idea',
    rationale: 'Stated in Background.', evidencePassageIds: ['t.0:0'],
  }],
  relationships: [{
    tempId: 'r1',
    from: { kind: 'draft', tempId: 'n1' },
    to: { kind: 'existing', nodeId: 'node-existing-1' },
    label: 'supports', kind: 'reference',
    rationale: 'Same junction data.', evidencePassageIds: ['t.0:0'],
  }],
  ...over,
});

test('a well-formed draft grounded in the submitted passages is accepted', async () => {
  const { input, hash } = await buildInput();
  const result = validateDraft(draft(hash), input, hash);
  expect(result.ok).toBe(true);
});

test('a draft answering different content is refused', async () => {
  const { input, hash } = await buildInput();
  const result = validateDraft(draft('b'.repeat(64)), input, hash);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain('does not match the submitted content');
});

test('a draft citing content that was never sent is refused', async () => {
  const { input, hash } = await buildInput();
  const bad = draft(hash, {
    nodes: [{
      tempId: 'n1', label: 'Invented', kind: 'idea',
      rationale: 'Not from the selection.', evidencePassageIds: ['t.methods:0'],
    }],
    relationships: [],
  });
  const result = validateDraft(bad, input, hash);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain('was not submitted');
});

test('a connection to a node we do not hold is refused', async () => {
  const { input, hash } = await buildInput();
  const bad = draft(hash, {
    relationships: [{
      tempId: 'r1',
      from: { kind: 'draft', tempId: 'n1' },
      to: { kind: 'existing', nodeId: 'node-that-does-not-exist' },
      label: 'supports', kind: 'reference',
      rationale: 'Invented target.', evidencePassageIds: ['t.0:0'],
    }],
  });
  const result = validateDraft(bad, input, hash);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain('does not exist');
});

test('a draft cannot propose source structure or a self-connection', async () => {
  const { input, hash } = await buildInput();

  // 'source' is not an allowed proposed kind: only adapters create source nodes.
  const asSource = draft(hash, {
    nodes: [{ tempId: 'n1', label: 'Fake folder', kind: 'source', rationale: '', evidencePassageIds: ['t.0:0'] }],
    relationships: [],
  });
  expect(validateDraft(asSource, input, hash).ok).toBe(false);

  // 'contains' is structural and must never come from a model.
  const asContains = draft(hash, {
    relationships: [{
      tempId: 'r1', from: { kind: 'draft', tempId: 'n1' }, to: { kind: 'existing', nodeId: 'node-existing-1' },
      label: 'contains', kind: 'contains', rationale: '', evidencePassageIds: ['t.0:0'],
    }],
  });
  expect(validateDraft(asContains, input, hash).ok).toBe(false);

  const selfLink = draft(hash, {
    relationships: [{
      tempId: 'r1', from: { kind: 'draft', tempId: 'n1' }, to: { kind: 'draft', tempId: 'n1' },
      label: 'relates to', kind: 'personal', rationale: '', evidencePassageIds: ['t.0:0'],
    }],
  });
  const result = validateDraft(selfLink, input, hash);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain('joins a node to itself');
});

test('the input hash changes when the source text changes, marking evidence stale', async () => {
  const { input, hash } = await buildInput();
  const edited: GenerationInput = {
    ...input,
    passages: input.passages.map((p, i) => (i === 0 ? { ...p, text: `${p.text} An added sentence.` } : p)),
  };
  expect(await hashGenerationInput(edited)).not.toBe(hash);
});
