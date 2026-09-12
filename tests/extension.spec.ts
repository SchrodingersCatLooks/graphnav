import { panelSettings } from './ui-helpers';
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
  await expect(page.getByRole('button', { name: 'Manually', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'With AI', exact: true })).toBeVisible();
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
  await expect(page.getByRole('dialog')).toBeVisible();
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

test('Docs controls stay above host toolbars and inside the visible viewport', async ({ page }, testInfo) => {
  await page.goto('https://docs.google.com/document/d/fixture-doc/edit');
  // Reproduce the installed Docs toolbar overlap without reading a private Doc.
  await page.evaluate(() => {
    const toolbar = document.createElement('div');
    toolbar.textContent = 'Synthetic fixed toolbar';
    toolbar.style.cssText = 'position:fixed;inset:0 0 auto;height:120px;z-index:999999;background:#e9eef6';
    document.body.append(toolbar);
  });
  const trigger = page.getByRole('button', { name: 'Graph', exact: true });
  await trigger.click();
  const heading = page.getByRole('heading', { name: 'GraphNav', exact: true });
  const close = page.getByRole('button', { name: 'Close graph panel' });
  // Visible bounds alone miss toolbar overlap. Hit-testing must reach our UI.
  await expect.poll(() => heading.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.tagName;
  })).toBe('GRAPHNAV-UI');
  await close.click({ trial: true });

  // Transformed host containers must not push fixed extension controls off-screen.
  await page.evaluate(() => {
    document.body.style.transform = 'translateZ(0)';
    document.body.style.height = '1800px';
    document.body.style.overflow = 'hidden';
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
  const notice = page.getByText('Google data is not connected yet');
  for (const control of [heading, close, trigger, notice]) {
    await expect.poll(() => control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const viewport = window.visualViewport!;
      return box.x >= viewport.offsetLeft && box.y >= viewport.offsetTop &&
        box.right <= viewport.offsetLeft + viewport.width + 1 &&
        box.bottom <= viewport.offsetTop + viewport.height + 1;
    })).toBe(true);
  }
  await expect(notice).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('docs-layer-and-zoom.png') });
  await close.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await cdp.detach();
});

test('panel uses worker auth state, connects only on click, and shows a cancelled sign-in', async ({ page, extensionContext }) => {
  const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent('serviceworker');
  // Synthetic Identity replies inside the isolated test profile. No real token,
  // account, consent, or API-read acceptance is implied by this UI test.
  await worker.evaluate(() => {
    const chrome = (globalThis as unknown as { chrome: { identity: { getAuthToken: (details: { interactive?: boolean }) => Promise<{ token?: string }> } } }).chrome;
    let connected = false;
    chrome.identity.getAuthToken = (async (details: { interactive?: boolean }) => {
      if (details.interactive) connected = true;
      return { token: connected ? 'synthetic-test-only' : undefined };
    }) as typeof chrome.identity.getAuthToken;
  });
  await page.goto('https://drive.google.com/drive/my-drive');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.getByText('Google data is not connected yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connect Google', exact: true }).click();
  await expect(page.getByText('Google connected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close graph panel' }).click();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.getByText('Google connected', { exact: true })).toBeVisible();
  await worker.evaluate(() => {
    const chrome = (globalThis as unknown as { chrome: { identity: { getAuthToken: (details: { interactive?: boolean }) => Promise<{ token?: string }> } } }).chrome;
    chrome.identity.getAuthToken = (async (details: { interactive?: boolean }) => {
      if (details.interactive) throw new Error('Synthetic sign-in cancelled');
      return {};
    }) as typeof chrome.identity.getAuthToken;
  });
  await page.getByRole('button', { name: 'Google account', exact: true }).click();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByText('Google data is not connected yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connect Google', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic sign-in cancelled');
  await expect(page.getByText('Google connected', { exact: true })).toHaveCount(0);
});

test('floating controls support keyboard, cancel a drag, and stay reachable after zoom and viewport changes', async ({ page }, testInfo) => {
  await page.goto('https://docs.google.com/document/d/fixture-doc/edit');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await panelSettings(page);
  await page.getByRole('button', { name: 'Float panel', exact: true }).click();
  const panel = page.getByRole('dialog');
  const move = page.getByRole('button', { name: 'Move graph panel' });
  const resize = page.getByRole('button', { name: 'Resize graph panel' });
  const before = (await panel.boundingBox())!;
  await move.focus(); await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(async () => (await panel.boundingBox())!.x).toBe(before.x + 40);
  await resize.focus(); await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await panel.boundingBox())!.width).toBe(before.width - 10);
  const committed = (await panel.boundingBox())!;
  const handle = (await move.boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down(); await page.mouse.move(handle.x + 160, handle.y + 30, { steps: 5 });
  expect((await panel.boundingBox())!.x).toBeGreaterThan(committed.x);
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(panel).toBeVisible();
  expect(await panel.boundingBox()).toEqual(committed);

  // Shrinking must clamp the display without overwriting the preferred rectangle.
  await page.setViewportSize({ width: 390, height: 600 });
  await expect.poll(async () => { const box = (await panel.boundingBox())!; return box.x >= 16 && box.y >= 16 && box.x + box.width <= 374 && box.y + box.height <= 520; }).toBe(true);
  await page.getByRole('button', { name: 'Close graph panel' }).click({ trial: true });
  await page.screenshot({ path: testInfo.outputPath('floating-narrow.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => panel.boundingBox()).toEqual(committed);
  await page.evaluate(() => {
    const rail = document.createElement('div');
    rail.style.cssText = 'position:fixed;inset:0 0 0 auto;width:100px;z-index:2147483647;background:#ddd';
    document.body.append(rail); document.body.style.transform = 'translateZ(0)';
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
  const close = page.getByRole('button', { name: 'Close graph panel' });
  await expect.poll(() => close.evaluate((element) => {
    const box = element.getBoundingClientRect(), view = window.visualViewport!;
    return box.x >= view.offsetLeft && box.y >= view.offsetTop && box.right <= view.offsetLeft + view.width && box.bottom <= view.offsetTop + view.height && document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.tagName === 'GRAPHNAV-UI';
  })).toBe(true);
  await close.click();
  await expect(page.getByRole('button', { name: 'Graph', exact: true })).toBeFocused();
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }); await cdp.detach();
  await page.getByRole('textbox', { name: 'Fixture editor' }).fill('Editing still works');
  await expect(page.getByRole('textbox', { name: 'Fixture editor' })).toHaveText('Editing still works');
});
