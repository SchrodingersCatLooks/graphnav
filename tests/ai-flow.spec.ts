import { test, expect, chromium } from '@playwright/test';
import { createServer, type ServerResponse } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hashGenerationInput, type GenerationInput } from '../lib/generation/types';

const origin = 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';
const code = 'synthetic-session-pairing-only-123456789';

test('installed extension pairs with loopback, generates grounded proposals, navigates evidence and cancels without mutating the map', async ({}, testInfo) => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-ai-flow-'));
  const received: { input: GenerationInput; origin?: string }[] = [];
  let mode: 'draft' | 'hold' | 'refusal' | 'invalid' = 'draft', held: ServerResponse | undefined;
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
    const input = JSON.parse(body) as GenerationInput; received.push({ input, origin: request.headers.origin });
    if (mode === 'hold') { held = response; return; }
    if (mode === 'refusal') { response.end(JSON.stringify({ kind: 'refusal', reason: 'Synthetic refusal for UI verification.' })); return; }
    if (mode === 'invalid') { response.end(JSON.stringify({ kind: 'json', text: '{}' })); return; }
    const evidencePassageIds = [input.passages[0]!.passageId];
    response.end(JSON.stringify({ kind: 'json', text: JSON.stringify({
      draftVersion: 1, inputHash: await hashGenerationInput(input),
      nodes: [{ tempId: 'n1', label: 'Decision points', kind: 'idea', rationale: 'The selected method studies junctions.', evidencePassageIds }, { tempId: 'n2', label: 'Navigation errors', kind: 'idea', rationale: 'Participants choose a route.', evidencePassageIds }],
      relationships: [{ tempId: 'r1', from: { kind: 'draft', tempId: 'n1' }, to: { kind: 'draft', tempId: 'n2' }, label: 'helps explain', kind: 'personal', rationale: 'Synthetic proposal for UI verification, not a model result.', evidencePassageIds }],
    }) }));
  });
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(8787, '127.0.0.1', yes); });
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const settings = await context.newPage(); await settings.goto(`${origin}/options.html`);
    await expect(settings.getByRole('status')).toHaveText('Not connected');
    await settings.getByLabel('Relay pairing code').fill(code);
    await settings.getByRole('button', { name: 'Pair AI connection', exact: true }).click();
    await expect(settings.getByRole('status')).toHaveText('Ready to generate');
    await expect(settings.getByLabel('Relay pairing code')).toHaveValue('');
    await settings.screenshot({ path: testInfo.outputPath('ai-connection.png') });
    await settings.setViewportSize({ width: 390, height: 844 });
    expect(await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const page = await context.newPage(); await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(`${origin}/reader.html`);
    await page.getByLabel('Choose PDF file').setInputFiles(resolve('tests/fixtures/demo-paper.pdf'));
    await page.getByRole('button', { name: 'Build baseline (5)', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(5);
    await page.getByRole('button', { name: 'Select content for AI', exact: true }).click();
    const panel = page.getByRole('region', { name: 'AI assistance' });
    await expect(panel).toContainText('AI is ready');
    await panel.getByRole('checkbox', { name: 'Analyze Page 2', exact: true }).check();
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    expect(received).toHaveLength(0);
    const generate = panel.getByRole('button', { name: 'Generate with AI', exact: true });
    await generate.click();
    const draft = panel.getByRole('region', { name: 'AI draft', exact: true });
    await expect(draft).toContainText('Decision points');
    await expect(draft).toContainText('2 ideas · 1 connection');
    expect(received).toHaveLength(1);
    expect(received[0]!.origin).toBe(origin);
    expect(received[0]!.input.passages.every((passage) => passage.locator.kind === 'pdf' && passage.locator.pageIndex === 1)).toBe(true);
    expect(JSON.stringify(received[0]!.input)).not.toContain('Signage budget');
    await draft.locator('summary').first().click();
    await expect(draft.locator('blockquote').first()).toContainText('Twenty-four participants');
    await draft.getByRole('button', { name: 'Open evidence source', exact: true }).first().click();
    await expect(page.locator('.pdf-paper[data-page="2"]')).toBeVisible();
    await draft.locator('h3').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('ai-proposals.png') });
    await expect(page.locator('.react-flow__node')).toHaveCount(5);
    mode = 'hold'; await generate.click();
    await expect.poll(() => !!held).toBe(true);
    await expect(panel.getByRole('button', { name: 'Cancel generation', exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Cancel generation', exact: true }).click();
    await expect(panel).toContainText('Generation cancelled');
    held!.end(JSON.stringify({ kind: 'json', text: '{}' }));
    mode = 'refusal'; await generate.click();
    await expect(panel).toContainText('The model declined this selection');
    mode = 'invalid'; await generate.click();
    await expect(panel).toContainText('The reply could not be used');
    await expect(page.locator('.react-flow__node')).toHaveCount(5);
    await settings.getByRole('button', { name: 'Forget this connection', exact: true }).click();
    await expect(settings.getByRole('status')).toHaveText('Not connected');
    await panel.getByRole('button', { name: 'Check AI connection', exact: true }).click();
    await expect(generate).toBeDisabled();
    await panel.getByRole('button', { name: 'Close AI tools', exact: true }).click();
    await page.getByLabel('Node name', { exact: true }).fill('Manual work remains available');
    await page.getByRole('button', { name: 'Add node', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await testInfo.attach('loopback-protocol.json', { body: JSON.stringify({ requests: received.length, origins: received.map((entry) => entry.origin ?? null), provider: 'synthetic only' }), contentType: 'application/json' });
  } finally {
    await context.close(); await rm(profile, { recursive: true, force: true });
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
