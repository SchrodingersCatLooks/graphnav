import { tools } from './ui-helpers';
import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('Docs preview honors nested-tab selection and ignores a cancelled read arriving after a newer preview', async ({}, testInfo) => {
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-preview-'));
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1400, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const fixture = JSON.parse(await readFile('tests/fixtures/docs-tabs-response.json', 'utf8'));
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    await worker.evaluate((fixture) => {
      const env = globalThis as any;
      env.chrome.identity.getAuthToken = async () => ({ token: 'synthetic-only' });
      env.fetch = async (input: string) => {
        const url = new URL(input);
        const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
        if (url.pathname.endsWith('/about')) return json({ user: { permissionId: 'fixture-account' } });
        if (url.hostname === 'docs.googleapis.com') {
          if (env.holdRead) {
            env.holdRead = false;
            return new Promise((resolve) => { env.releasePreview = () => { resolve(json(fixture)); env.released = true; }; });
          }
          return json(fixture);
        }
        throw new Error('Unexpected network request');
      };
    }, fixture);
    await context.route('https://docs.google.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Synthetic Docs host</h1><textarea aria-label="Host editor">Keep writing</textarea>' }));
    const page = await context.newPage();
    await page.goto('https://docs.google.com/document/d/doc-1/edit?tab=t.0');
    await page.getByRole('button', { name: 'Graph', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(4);
    const baselineIds = await page.locator('.react-flow__node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-id')));
    await tools(page, 'AI');
    await page.getByRole('button', { name: 'Select content for AI', exact: true }).click();
    const panel = page.getByRole('region', { name: 'AI assistance' });
    const firstTab = panel.getByRole('checkbox').first();
    await firstTab.check();
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    const preview = panel.locator('.generation-preview');
    await expect(preview).toContainText('Junction J3');
    await expect(preview).not.toContainText('A junction offers two or more onward paths');
    const firstHash = await preview.getAttribute('data-input-hash');
    await expect(panel.getByRole('button', { name: 'Generate with AI' })).toBeDisabled();
    const previewBox = (await preview.boundingBox())!;
    expect(previewBox.y).toBeGreaterThan(0);
    expect(previewBox.y).toBeLessThan(400);
    await page.screenshot({ path: testInfo.outputPath('docs-text-preview.png') });
    await worker.evaluate(() => { (globalThis as any).holdRead = true; });
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    await expect.poll(() => worker.evaluate(() => !!(globalThis as any).releasePreview)).toBe(true);
    await panel.getByRole('button', { name: 'Cancel preview' }).click();
    await firstTab.uncheck();
    const nestedTitle = fixture.tabs[0].childTabs[0].tabProperties.title;
    await panel.getByRole('checkbox', { name: `Analyze ${nestedTitle}`, exact: true }).check();
    await panel.getByRole('button', { name: 'Preview selected text', exact: true }).click();
    await expect(preview).toContainText('A junction offers two or more onward paths');
    const nextHash = await preview.getAttribute('data-input-hash');
    expect(nextHash).not.toBe(firstHash);
    await worker.evaluate(() => (globalThis as any).releasePreview());
    // A subsequent user action crosses the released response's event boundary.
    await page.getByLabel('Host editor').fill('Editing the original remains available');
    await expect(preview).toHaveAttribute('data-input-hash', nextHash!);
    await expect(preview).not.toContainText('Junction J3');
    expect(await page.locator('.react-flow__node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-id')))).toEqual(baselineIds);
  } finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
});
