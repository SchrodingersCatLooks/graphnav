import { test as base, expect, chromium, type BrowserContext } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

// Real installed production extension, synthetic host pages. No Google API reads.
const hostFixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GraphNav shell fixture</title>
  <style>
    html { font-size: 32px; }
    body { margin: 0; padding: 40px; background: #f4f6f8; color: #263642; font: 14px/1.6 system-ui; }
    h1 { font-size: 24px; }
    button { color: rgb(190, 0, 100); font-size: 42px; }
    #editor { width: 200px; min-height: 80px; padding: 12px; background: white; border: 1px solid #cbd5df; }
  </style></head><body>
  <p>GRAPHNAV TEST FIXTURE · Synthetic host, no Google data</p>
  <h1>Keep working on your page</h1>
  <div id="editor" contenteditable="true" role="textbox" aria-label="Fixture editor">Sample text</div>
  <button id="host-button">Host button</button>
  </body></html>`;

const test = base.extend<{ extensionContext: BrowserContext }>({
  extensionContext: async ({}, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'graphnav-test-'));
    const extension = resolve('.output/chrome-mv3');
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 800 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await context.route(/^https:\/\/(drive|docs)\.google\.com\//, (route) => route.fulfill({
      contentType: 'text/html', body: hostFixture,
    }));
    try {
      await use(context);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
  page: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});

test('Drive shell opens, closes, restores focus, and preserves host editing and styles', async ({ page }, testInfo) => {
  await page.goto('https://drive.google.com/drive/u/0/folders/fixture-folder');
  const trigger = page.getByRole('button', { name: 'Graph', exact: true });
  const editor = page.getByRole('textbox', { name: 'Fixture editor' });
  const hostButton = page.locator('#host-button');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveCSS('font-size', '14px');
  await expect(hostButton).toHaveCSS('font-size', '42px');
  await expect(hostButton).toHaveCSS('color', 'rgb(190, 0, 100)');
  await editor.fill('Before opening');
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Drive folder', { exact: true })).toBeVisible();
  await expect(page.getByText('Google data is not connected yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close graph panel' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('drive-panel.png') });

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await editor.fill('After closing');
  await expect(editor).toHaveText('After closing');
  await trigger.click();
  // A non-modal panel must not steal Escape from the host editor.
  await editor.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close graph panel' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await trigger.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(hostButton).toHaveCSS('color', 'rgb(190, 0, 100)');
});

test('Docs shell uses document context and supports keyboard opening', async ({ page }) => {
  await page.goto('https://docs.google.com/document/u/1/d/fixture-doc/edit?tab=t.fixture');
  const trigger = page.getByRole('button', { name: 'Graph', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Google Docs', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your document map starts here' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('textbox').fill('Still editable');
  await expect(page.getByRole('textbox')).toHaveText('Still editable');
});

test('Drive SPA navigation updates context without duplicate buttons', async ({ page }) => {
  await page.goto('https://drive.google.com/drive/u/1/my-drive');
  const trigger = page.getByRole('button', { name: 'Graph', exact: true });
  await trigger.click();
  await expect(page.getByText('My Drive', { exact: true })).toBeVisible();
  await page.evaluate(() => history.pushState({}, '', '/drive/u/1/folders/next-folder'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await trigger.click();
  await expect(page.getByText('Drive folder', { exact: true })).toBeVisible();
  await expect(trigger).toHaveCount(1);
  await page.evaluate(() => history.pushState({}, '', '/drive/u/1/recent'));
  await expect(trigger).toHaveCount(0);
  await page.evaluate(() => history.pushState({}, '', '/drive/u/1/my-drive'));
  await expect(trigger).toHaveCount(1);
  await page.reload();
  await expect(trigger).toHaveCount(1);
});

test('Docs home and unrelated websites do not display the Graph control', async ({ page }) => {
  await page.goto('https://docs.google.com/document/');
  // Wait for the content script to mount before asserting that it renders no UI.
  await expect(page.locator('graphnav-ui')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Graph', exact: true })).toHaveCount(0);
  await page.route('https://example.com/**', (route) => route.fulfill({ contentType: 'text/html', body: hostFixture }));
  await page.goto('https://example.com/');
  await expect(page.locator('graphnav-ui')).toHaveCount(0);
});

test('Panel and close controls fit a small viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 500 });
  await page.goto('https://drive.google.com/drive/my-drive');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.y + box!.height).toBeLessThanOrEqual(500);
  await page.screenshot({ path: testInfo.outputPath('small-panel.png') });
  await page.getByRole('button', { name: 'Close graph panel' }).click();
  await expect(panel).toHaveCount(0);
});
