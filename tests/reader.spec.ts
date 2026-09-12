import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const origin = 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';
const fixture = resolve('tests/fixtures/demo-paper.pdf');
const test = base.extend<{ installed: { context: BrowserContext; restart: () => Promise<BrowserContext> } }>({
  installed: async ({}, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'graphnav-reader-'));
    const extension = resolve('.output/chrome-mv3');
    const launch = () => chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    let context = await launch();
    try { await use({ context, restart: async () => { await context.close(); context = await launch(); return context; } }); }
    finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
  },
});
async function ready(page: Page, pageNumber = 1) {
  await expect(page.locator(`.pdf-paper[data-page="${pageNumber}"]`)).toBeVisible();
  await expect(page.locator('.graphnav-editor').getByRole('status')).toHaveText('Saved locally');
  await expect(page.getByRole('alert')).toHaveCount(0);
}
async function baseline(page: Page) {
  await page.getByRole('button', { name: 'Build baseline (5)', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await ready(page);
}

test('local PDF outline, exact section navigation, editable map and bytes survive a full browser restart', async ({ installed }, testInfo) => {
  const page = await installed.context.newPage();
  const errors: string[] = [], remoteRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  await page.goto(`${origin}/popup.html`);
  const opened = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open a PDF', exact: true }).click();
  const reader = await opened;
  reader.on('pageerror', (error) => errors.push(error.message));
  reader.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  await reader.getByLabel('Choose PDF file').setInputFiles(fixture);
  await ready(reader);
  await expect(reader.locator('.textLayer')).toContainText('Overview');
  await baseline(reader);
  const sidebar = (await reader.getByRole('complementary', { name: 'Map editor' }).boundingBox())!;
  const graphPanel = (await reader.getByRole('region', { name: 'Paper graph', exact: true }).boundingBox())!;
  expect(sidebar.width).toBeGreaterThan(graphPanel.width * .9);
  await reader.getByRole('button', { name: 'Methods', exact: true }).click();
  await reader.getByRole('link', { name: 'Go to page 2', exact: true }).click();
  await ready(reader, 2);
  await expect(reader.locator('.textLayer')).toContainText('Methods');
  await expect(reader.locator('.pdf-anchor')).toBeVisible();
  await reader.getByLabel('Notes', { exact: true }).fill('Compare the method with my project.');
  await reader.getByRole('button', { name: 'Save changes', exact: true }).click();
  await ready(reader, 2);
  await reader.getByRole('button', { name: 'Scope and Definitions', exact: true }).click();
  await reader.getByRole('link', { name: 'Go to page 1', exact: true }).click();
  await ready(reader);
  const nestedY = new URL(reader.url()).searchParams.get('y');
  expect(Number(nestedY)).toBeGreaterThan(0);
  await reader.getByRole('button', { name: 'Overview', exact: true }).click();
  await reader.getByRole('link', { name: 'Go to page 1', exact: true }).click();
  await ready(reader);
  expect(new URL(reader.url()).searchParams.get('y')).not.toBe(nestedY);
  await reader.getByRole('button', { name: 'Findings', exact: true }).click();
  await reader.getByRole('link', { name: 'Go to page 3', exact: true }).click();
  await ready(reader, 3);
  await reader.getByRole('button', { name: 'Hide tools', exact: true }).click();
  await reader.screenshot({ path: testInfo.outputPath('pdf-reader-desktop.png') });
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
  const savedUrl = reader.url();
  const restarted = await installed.restart();
  const restored = await restarted.newPage();
  await restored.goto(savedUrl);
  await ready(restored, 3);
  await expect(restored.locator('.react-flow__node')).toHaveCount(5);
  await restored.getByRole('button', { name: 'Methods', exact: true }).click();
  await expect(restored.getByLabel('Notes', { exact: true })).toHaveValue('Compare the method with my project.');
  await restored.getByRole('button', { name: 'Refresh PDF outline', exact: true }).click();
  await ready(restored, 3);
  await expect(restored.getByLabel('Notes', { exact: true })).toHaveValue('Compare the method with my project.');
  await restored.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => restored.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await restored.getByRole('button', { name: 'Hide tools', exact: true }).click();
  await restored.getByRole('button', { name: 'Fit View', exact: true }).click();
  await restored.screenshot({ path: testInfo.outputPath('pdf-reader-narrow.png'), fullPage: true });
});

test('backup excludes bytes, missing originals are explicit, and exact reattachment restores the same section and map', async ({ installed }) => {
  const page = await installed.context.newPage();
  await page.goto(`${origin}/reader.html`);
  await page.getByLabel('Choose PDF file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await expect(page.getByRole('alert')).toContainText('Invalid PDF');
  await page.getByLabel('Choose PDF file').setInputFiles(fixture);
  await ready(page); await baseline(page);
  await page.getByRole('button', { name: 'Scope and Definitions', exact: true }).click();
  await page.getByRole('link', { name: 'Go to page 1', exact: true }).click();
  await ready(page);
  await page.getByLabel('Notes', { exact: true }).fill('Keep this exact section.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await ready(page);
  const originalUrl = page.url();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const backupPath = (await (await downloaded).path())!;
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  expect(backup.snapshot.nodes).toHaveLength(5);
  expect(backup).not.toHaveProperty('blobs');
  expect(backup.snapshot).not.toHaveProperty('blobs');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove saved PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bring this paper back.' })).toBeVisible();
  const different = Buffer.concat([await readFile(fixture), Buffer.from('\n%different')]);
  await page.getByLabel('Choose PDF file').setInputFiles({ name: 'different.pdf', mimeType: 'application/pdf', buffer: different });
  await expect(page.getByRole('alert')).toContainText('different PDF');
  await expect(page.getByRole('heading', { name: 'Bring this paper back.' })).toBeVisible();
  await page.getByLabel('Choose PDF file').setInputFiles(fixture);
  await ready(page);
  expect(page.url()).toBe(originalUrl);
  await page.getByRole('button', { name: 'Scope and Definitions', exact: true }).click();
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep this exact section.');
  // Importing into My maps creates a separate graph whose PDF link opens the
  // shared local reader at its exact destination and preserves the copied map.
  const workspace = await installed.context.newPage();
  await workspace.goto(`${origin}/workspace.html`);
  await workspace.getByLabel('Import graph backup', { exact: true }).setInputFiles(backupPath);
  await expect(workspace.getByRole('heading', { name: 'demo-paper.pdf (copy)', exact: true })).toBeVisible();
  await workspace.getByRole('button', { name: 'Scope and Definitions', exact: true }).click();
  const nextReader = workspace.waitForEvent('popup');
  await workspace.getByRole('link', { name: 'Go to page 1', exact: true }).click();
  const copy = await nextReader;
  await ready(copy);
  expect(new URL(copy.url()).searchParams.get('map')).not.toBe(new URL(originalUrl).searchParams.get('map'));
  expect(new URL(copy.url()).searchParams.get('y')).toBe(new URL(originalUrl).searchParams.get('y'));
  await expect(copy.locator('.react-flow__node')).toHaveCount(5);
});

test('PDF AI preview processes only selected pages and leaves the manual graph unchanged', async ({ installed }, testInfo) => {
  const page = await installed.context.newPage();
  const remoteRequests: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  await page.goto(`${origin}/reader.html`);
  await page.getByLabel('Choose PDF file').setInputFiles(fixture);
  await ready(page); await baseline(page);
  await page.getByRole('button', { name: 'Select content for AI', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Analyze Page 2', exact: true }).check();
  await page.getByRole('button', { name: 'Preview selected text', exact: true }).click();
  // The preview is a labeled group rather than a page-level landmark.
  const content = page.locator('[aria-label="Selected text preview"]');
  await expect(content).toBeVisible();
  await expect(content.locator('.generation-passages')).toContainText('Twenty-four participants');
  await expect(content.locator('.generation-passages')).not.toContainText('One added sign');
  await expect(content.locator('.generation-passages')).not.toContainText('Signage budget');
  await expect(page.getByRole('button', { name: 'Generate with AI', exact: true })).toBeDisabled();
  expect(remoteRequests).toEqual([]);
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath('pdf-text-preview.png') });
  await page.getByRole('checkbox', { name: 'Analyze Page 3', exact: true }).check();
  await expect(content).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview selected text', exact: true }).click();
  await expect(content.locator('.generation-passages')).toContainText('One added sign');
  await page.getByLabel('AI purpose').selectOption('navigation-overview');
  await expect(content).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
});
