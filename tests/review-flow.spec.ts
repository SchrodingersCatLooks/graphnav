import { blankMap, tools } from './ui-helpers';
import { test, expect, chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hashGenerationInput, type GenerationInput } from '../lib/generation/types';

/**
 * G3-A through the installed extension.
 *
 * The relay is a synthetic local server: these are proposals shaped for UI
 * verification, not model output. What is being checked is the review itself —
 * that accepting, editing and dismissing reach the map, and that generating
 * the same suggestions again reports the earlier decision instead of asking
 * twice or duplicating what was already added.
 */

const origin = 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';
const code = 'synthetic-session-pairing-only-123456789';

test('reviewing a draft adds, renames and dismisses suggestions, and remembers those decisions when regenerated', async ({}, testInfo) => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-review-'));

  const server = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    if (request.headers.authorization !== `Bearer ${code}`) { response.writeHead(401).end('{}'); return; }
    if (request.url === '/health') { response.end(JSON.stringify({ protocol: 1, ready: true, model: 'synthetic-test-provider' })); return; }
    if (request.url !== '/draft') { response.writeHead(404).end('{}'); return; }
    let body = ''; for await (const chunk of request) body += chunk;
    const input = JSON.parse(body) as GenerationInput;
    const evidencePassageIds = [input.passages[0]!.passageId];
    // Deliberately stable across calls: regenerating must offer the same
    // suggestions so prior decisions can be recognised.
    response.end(JSON.stringify({ kind: 'json', text: JSON.stringify({
      draftVersion: 1, inputHash: await hashGenerationInput(input),
      nodes: [
        { tempId: 'n1', label: 'Decision points', kind: 'idea', rationale: 'The selected method studies junctions.', evidencePassageIds },
        { tempId: 'n2', label: 'Navigation errors', kind: 'idea', rationale: 'Participants choose a route.', evidencePassageIds },
      ],
      relationships: [
        { tempId: 'r1', from: { kind: 'draft', tempId: 'n1' }, to: { kind: 'draft', tempId: 'n2' }, label: 'helps explain', kind: 'personal', rationale: 'Synthetic proposal for UI verification, not a model result.', evidencePassageIds },
      ],
    }) }));
  });
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(8787, '127.0.0.1', yes); });

  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });

  try {
    const settings = await context.newPage();
    await settings.goto(`${origin}/options.html`);
    await settings.getByLabel('Relay pairing code').fill(code);
    await settings.getByRole('button', { name: 'Pair AI connection', exact: true }).click();
    await expect(settings.getByRole('status')).toHaveText('Ready to generate');

    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/reader.html`);
    await page.getByLabel('Choose PDF file').setInputFiles(resolve('tests/fixtures/demo-paper.pdf'));
    await blankMap(page, 'Review test map');

    await tools(page, 'AI');
    const panel = page.getByRole('region', { name: 'AI assistance' });
    await expect(panel).toContainText('AI is ready');
    await panel.getByRole('checkbox', { name: 'Analyze Page 2', exact: true }).check();
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    await panel.getByRole('button', { name: 'Generate with AI', exact: true }).click();

    const draft = panel.getByRole('region', { name: 'AI draft', exact: true });
    await expect(draft).toContainText('Decision points');

    // Nothing reaches the map from merely viewing a draft.
    await expect(page.locator('.react-flow__node')).toHaveCount(0);

    const cards = draft.locator('.draft-card');

    // Bulk controls: one click marks every open suggestion, and clearing resets.
    await draft.getByRole('button', { name: /^Add all \d+$/ }).click();
    await expect(draft).toContainText('3 to add · 0 to dismiss');
    // Accepting everything also satisfies the connection's endpoints.
    await expect(draft.getByRole('button', { name: /^Save \d+ decision/ })).toBeEnabled();
    await draft.getByRole('button', { name: 'Clear choices', exact: true }).click();
    await expect(draft).not.toContainText('to add ·');

    // Accept the first idea, renaming it on the way in.
    await cards.nth(0).getByRole('button', { name: 'Add to map', exact: true }).click();
    await cards.nth(0).getByRole('textbox').fill('Junction decision points');
    // Dismiss the second.
    await cards.nth(1).getByRole('button', { name: 'Dismiss', exact: true }).click();

    // The connection needs both ends, and one was dismissed.
    await cards.nth(2).getByRole('button', { name: 'Add to map', exact: true }).click();
    await expect(draft).toContainText('Also add the suggested ideas a connection joins');
    await expect(draft.getByRole('button', { name: /^Save \d+ decision/ })).toBeDisabled();

    // Dismissing the connection instead resolves it.
    await cards.nth(2).getByRole('button', { name: 'Dismiss', exact: true }).click();
    const save = draft.getByRole('button', { name: /^Save \d+ decision/ });
    await expect(save).toBeEnabled();
    await save.click();

    await expect(draft).toContainText('Added 1 idea');
    await expect(draft).toContainText('Dismissed 2');
    await page.screenshot({ path: testInfo.outputPath('review-applied.png') });

    // The accepted idea is on the map, under the name the user chose.
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    await expect(page.locator('.react-flow__node')).toContainText('Junction decision points');

    // Generating again offers the same suggestions; the review must remember.
    await panel.getByRole('checkbox', { name: 'Analyze Page 2', exact: true }).check();
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    await panel.getByRole('button', { name: 'Generate with AI', exact: true }).click();
    await expect(draft).toContainText('Decision points');

    // Both previously decided items say so instead of asking again.
    await expect(draft).toContainText('You already added this to the map');
    await expect(draft).toContainText('You already dismissed this');
    // And the map did not gain a duplicate.
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
  } finally {
    await context.close();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(profile, { recursive: true, force: true });
  }
});
