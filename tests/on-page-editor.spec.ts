import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const host = '<html><body style="margin:0;font:16px system-ui"><div style="position:fixed;inset:0 0 auto;height:80px;background:#e7edf5;z-index:999999">Synthetic Google toolbar</div><div contenteditable role="textbox" aria-label="Host editor" style="position:absolute;left:850px;top:120px">Keep editing</div></body></html>';
async function mockGoogle(context: BrowserContext) {
  await context.route(/^https:\/\/(drive|docs)\.google\.com\//, (route) => route.fulfill({ contentType: 'text/html', body: host }));
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await worker.evaluate(() => {
    const env = globalThis as any;
    env.chrome.identity.getAuthToken = async () => ({ token: 'synthetic-only' });
    env.fixtureRenamed = false;
    env.fetch = async (input: string) => {
      const url = new URL(input), folder = 'application/vnd.google-apps.folder';
      const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.pathname.endsWith('/about')) return json({ user: { permissionId: 'fixture-account' } });
      if (url.hostname === 'docs.googleapis.com' && env.fixtureLarge) return json({ title: 'Large synthetic document', tabs: Array.from({ length: 499 }, (_, index) => ({ tabProperties: { tabId: `t.section-${index}`, title: `Section ${String(index + 1).padStart(3, '0')}` } })) });
      if (url.hostname === 'docs.googleapis.com') return json({ title: 'Demo document', tabs: [
        { tabProperties: { tabId: 't.overview', title: 'Overview' } },
        { tabProperties: { tabId: 't.analysis', title: 'Analysis' }, childTabs: [{ tabProperties: { tabId: 't.detail', title: 'Details', parentTabId: 't.analysis' } }] },
      ] });
      if (url.pathname.endsWith('/files')) {
        const child = url.searchParams.get('q')?.includes("'child-folder'");
        return json({ files: child ? [{ id: 'nested-file', name: 'Evidence', mimeType: 'text/plain' }] : [
          { id: 'child-folder', name: 'Research', mimeType: folder },
          { id: 'file-one', name: env.fixtureRenamed ? 'Plan renamed' : 'Plan', mimeType: 'text/plain', webViewLink: 'https://drive.google.com/file/d/file-one/view' },
          { id: 'file-two', name: 'Plan', mimeType: 'text/plain' },
          ...(env.fixtureRenamed ? [{ id: 'new-file', name: 'New unselected file', mimeType: 'text/plain' }] : []),
        ] });
      }
      if (url.pathname.endsWith('/files/file-one') && env.fixtureUnavailable) return new Response('{}', { status: 404 });
      if (url.pathname.includes('/files/')) { const id = url.pathname.split('/').pop(); return json({ id, name: id === 'child-folder' ? 'Research' : 'Demo folder', mimeType: folder }); }
      throw new Error(`Unexpected fixture request: ${url.origin}${url.pathname}`);
    };
  });
  return worker;
}
const test = base.extend<{ installed: { context: BrowserContext; restart: () => Promise<BrowserContext> } }>({
  installed: async ({}, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'graphnav-on-page-'));
    const extension = resolve('.output/chrome-mv3');
    const launch = async () => { const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1400, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] }); await mockGoogle(context); return context; };
    let context = await launch();
    try { await use({ context, restart: async () => { await context.close(); context = await launch(); return context; } }); }
    finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
  },
});
async function open(context: BrowserContext, url: string) {
  const page = await context.newPage(); await page.goto(url);
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.getByText('Google connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Build baseline/ })).toBeEnabled();
  return page;
}
async function saved(page: Page) { await expect(page.locator('.save-state')).toHaveText('Saved locally'); }

test('Drive selected sources, manual edits, nested expansion, refresh, and complete browser restart', async ({ installed }, testInfo) => {
  const url = 'https://drive.google.com/drive/folders/root-folder';
  const page = await open(installed.context, url);
  await expect(page.getByRole('checkbox', { name: 'Add Plan from Demo folder', exact: true })).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'Add Demo folder', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Add Plan from Demo folder', exact: true }).first().check();
  await page.getByRole('button', { name: 'Add selected (2)', exact: true }).click(); await saved(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  const graphTitle = page.getByRole('heading', { name: 'Demo folder', exact: true }); await expect(graphTitle).toBeVisible();
  await page.getByLabel('Node name', { exact: true }).fill('Our idea');
  await page.getByRole('button', { name: 'Add node', exact: true }).click(); await saved(page);
  await page.getByLabel('From', { exact: true }).selectOption({ label: 'Plan' });
  await page.getByLabel('To', { exact: true }).selectOption({ label: 'Our idea' });
  await page.getByLabel('Connection label', { exact: true }).fill('supports');
  await page.getByRole('button', { name: 'Connect nodes', exact: true }).click(); await saved(page);
  await expect(page.locator('.react-flow__edge-text').filter({ hasText: 'supports' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill('My plan');
  await page.getByLabel('Notes', { exact: true }).fill('Keep my annotation');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await saved(page);
  const worker = installed.context.serviceWorkers()[0]!;
  await worker.evaluate(() => { (globalThis as any).fixtureRenamed = true; });
  await page.getByRole('button', { name: 'Refresh source', exact: true }).click(); await saved(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__node').filter({ hasText: 'My plan' })).toHaveCount(1);
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep my annotation');
  await page.getByRole('button', { name: 'Browse Research', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Add Evidence from Research', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Build baseline (2)', exact: true }).click(); await saved(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await expect(graphTitle).toBeVisible();
  await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
  await page.getByRole('button', { name: 'Arrange map', exact: true }).click(); await saved(page);
  await page.getByRole('button', { name: 'Fit View', exact: true }).click(); await saved(page);
  await page.screenshot({ path: testInfo.outputPath('drive-map.png') });
  const restarted = await installed.restart();
  const restored = await open(restarted, url); await saved(restored);
  await expect(restored.locator('.react-flow__node')).toHaveCount(5);
  await expect(restored.locator('.react-flow__node').filter({ hasText: 'My plan' })).toHaveCount(1);
  await expect(restored.locator('.react-flow__edge-text').filter({ hasText: 'supports' })).toHaveCount(1);
  await expect(restored).toHaveURL(url); // Editor must never replace the host URL with a map ID.
});

test('Docs baseline preserves nested tabs, lives on the left, and navigates the exact tab without opening another', async ({ installed }, testInfo) => {
  const page = await open(installed.context, 'https://docs.google.com/document/d/demo-doc/edit');
  await expect(page.getByRole('checkbox', { name: 'Add Details from Demo document / Analysis', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Build baseline (4)', exact: true }).click(); await saved(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.locator('.react-flow__edge-text')).toHaveCount(3);
  const panel = (await page.getByRole('dialog').boundingBox())!; expect(panel.x).toBeLessThan(30); expect(panel.width).toBeLessThan(650);
  await page.getByRole('textbox', { name: 'Host editor', exact: true }).fill('Writing while the graph is open');
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('docs-map.png') });
  const pagesBefore = installed.context.pages().length;
  await page.getByRole('link', { name: 'Go to tab in this document', exact: true }).click();
  await page.waitForURL('**/document/d/demo-doc/edit?tab=t.detail');
  expect(installed.context.pages()).toHaveLength(pagesBefore);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.current-node')).toContainText('Details');
});


test('500-node synthetic document supports bounded pages, search, focus, and collapse', async ({ installed }, testInfo) => {
  test.setTimeout(60_000);
  await installed.context.serviceWorkers()[0]!.evaluate(() => { (globalThis as any).fixtureLarge = true; });
  const page = await open(installed.context, 'https://docs.google.com/document/d/large-doc/edit');
  const started = Date.now();
  await page.getByRole('button', { name: 'Build baseline (500)', exact: true }).click(); await saved(page);
  await expect(page.locator('.count-badge')).toContainText('500 nodes');
  await expect(page.locator('.react-flow__node')).toHaveCount(50);
  const importMs = Date.now() - started;
  await page.getByRole('button', { name: 'Next 50', exact: true }).click();
  await expect(page.getByText('Page 2 of 10', { exact: true })).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(50);
  await page.getByLabel('Find a node', { exact: true }).fill('Section 499');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Section 499', exact: true }).click();
  await page.getByRole('button', { name: 'Focus selected', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect.poll(async () => (await page.locator('.react-flow__node').first().boundingBox())!.width).toBeGreaterThan(100);
  await page.screenshot({ path: testInfo.outputPath('focused-document.png') });
  await page.getByRole('button', { name: 'Show whole map', exact: true }).click();
  await page.getByRole('button', { name: 'Large synthetic document', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse branch', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Expand branch', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(50);
  await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
  await saved(page);
  await page.screenshot({ path: testInfo.outputPath('large-document.png') });
  await testInfo.attach('synthetic-import-timing.json', { body: JSON.stringify({ nodes: 500, rendered: 50, importAndLayoutMs: importMs, note: 'Synthetic API responses in temporary Chromium profile; not a real Google latency or production benchmark.' }), contentType: 'application/json' });
  console.log(`Synthetic 500-node import + layout: ${importMs} ms; canvas capped at 50.`);
});

test('panel preferences survive a complete restart and unavailable sources keep personal notes', async ({ installed }, testInfo) => {
  const url = 'https://drive.google.com/drive/folders/root-folder';
  const page = await open(installed.context, url);
  await page.getByRole('checkbox', { name: 'Add Plan from Demo folder', exact: true }).first().check();
  await page.getByRole('button', { name: 'Add selected (1)', exact: true }).click(); await saved(page);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.getByLabel('Notes', { exact: true }).fill('Keep this even if access changes');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await saved(page);
  const worker = installed.context.serviceWorkers()[0]!;
  await worker.evaluate(() => { (globalThis as any).fixtureUnavailable = true; });
  await page.getByRole('button', { name: 'Check destinations', exact: true }).click(); await saved(page);
  await expect(page.locator('.target-status')).toContainText('1 unavailable');
  await expect(page.locator('.unavailable-node')).toHaveCount(1);
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep this even if access changes');
  await expect(page.locator('.inspector .source-warning')).toContainText('Your map and notes are still saved');
  await page.getByLabel('Panel width', { exact: true }).selectOption('420');
  await page.getByRole('button', { name: 'Dock left', exact: true }).click();
  await expect.poll(async () => worker.evaluate(async () => (await (globalThis as any).chrome.storage.local.get('panel-preferences:v1:drive'))['panel-preferences:v1:drive'])).toEqual({ width: 420, dock: 'left' });
  const context = await installed.restart();
  const restored = await open(context, url); await saved(restored);
  await expect(restored.getByLabel('Panel width', { exact: true })).toHaveValue('420');
  await expect(restored.getByRole('button', { name: 'Dock right', exact: true })).toBeVisible();
  const panel = (await restored.getByRole('dialog').boundingBox())!;
  expect(panel.x).toBe(16); expect(panel.width).toBe(420);
  await expect(restored.locator('.unavailable-node')).toHaveCount(1);
  await restored.getByRole('button', { name: 'Hide tools', exact: true }).click();
  await restored.screenshot({ path: testInfo.outputPath('compact-panel.png') });
});

test('floating move and resize survive Chrome restart without changing nodes, then dock and reset recover defaults', async ({ installed }, testInfo) => {
  const url = 'https://drive.google.com/drive/folders/root-folder';
  const page = await open(installed.context, url);
  await page.getByRole('button', { name: 'Build baseline (4)', exact: true }).click(); await saved(page);
  await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
  const worker = installed.context.serviceWorkers()[0]!;
  const graphRows = () => worker.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('graphnav'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try { return await Promise.all(['nodes', 'relationships', 'layoutItems', 'itemEdits'].map((table) => new Promise((resolve, reject) => { const request = db.transaction(table).objectStore(table).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }))); }
    finally { db.close(); }
  });
  const original = await graphRows();
  await page.getByRole('button', { name: 'Float panel', exact: true }).click();
  const panel = page.getByRole('dialog');
  async function drag(name: string, dx: number, dy: number) {
    const handle = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up();
  }
  const start = (await panel.boundingBox())!;
  await drag('Move graph panel', -210, 70);
  await drag('Resize graph panel', -90, 40);
  const result = (await panel.boundingBox())!;
  expect(result).toEqual({ x: start.x - 210, y: start.y + 70, width: start.width - 90, height: start.height + 40 });
  await expect.poll(() => worker.evaluate(async () => (await (globalThis as any).chrome.storage.local.get('panel-placement:v1:drive'))['panel-placement:v1:drive'])).toEqual({ mode: 'floating', rect: result });
  expect(await graphRows()).toEqual(original);
  await expect.poll(() => page.locator('.canvas').evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    return [...canvas.querySelectorAll('.react-flow__node')].every((node) => { const box = node.getBoundingClientRect(); return box.x >= bounds.x && box.y >= bounds.y && box.right <= bounds.right && box.bottom <= bounds.bottom; });
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('floating-map.png') });

  const context = await installed.restart();
  const restored = await open(context, url); await saved(restored);
  await expect.poll(() => restored.getByRole('dialog').boundingBox()).toEqual(result);
  await expect(restored.locator('.react-flow__node')).toHaveCount(4);
  await restored.getByRole('button', { name: 'Dock left', exact: true }).click();
  await expect.poll(async () => (await restored.getByRole('dialog').boundingBox())!.x).toBe(16);
  await expect(restored.getByLabel('Panel width', { exact: true })).toHaveValue('780');
  await restored.getByRole('button', { name: 'Float panel', exact: true }).click();
  await expect.poll(() => restored.getByRole('dialog').boundingBox()).toEqual(result);
  await restored.getByRole('button', { name: 'Reset position', exact: true }).click();
  await expect(restored.getByRole('button', { name: 'Float panel', exact: true })).toBeVisible();
  await expect.poll(() => restored.getByRole('dialog').boundingBox()).toEqual({ x: 604, y: 16, width: 780, height: 904 });
  await expect(restored.getByRole('button', { name: 'Dock left', exact: true })).toBeVisible();
});

test('a chosen Doc and PDF share one project map through source navigation, refresh and restart', async ({ installed }, testInfo) => {
  const doc = await open(installed.context, 'https://docs.google.com/document/d/demo-doc/edit?tab=t.analysis');
  await doc.getByLabel('New map name', { exact: true }).fill('Research project');
  await doc.getByRole('button', { name: 'Create map', exact: true }).click(); await saved(doc);
  await doc.getByRole('checkbox', { name: 'Add Analysis from Demo document', exact: true }).check();
  await doc.getByRole('button', { name: 'Add selected (1)', exact: true }).click(); await saved(doc);
  const projectId = await doc.getByLabel('Open a map', { exact: true }).inputValue();
  let reader = await installed.context.newPage();
  await reader.goto('chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk/reader.html');
  await reader.getByLabel('Choose PDF file').setInputFiles(resolve('tests/fixtures/demo-paper.pdf'));
  await expect(reader.locator('.pdf-paper[data-page="1"]')).toBeVisible();
  await reader.getByRole('button', { name: 'Build baseline (5)', exact: true }).click(); await saved(reader);
  const independentId = await reader.getByLabel('Open a map', { exact: true }).inputValue();
  expect(independentId).not.toBe(projectId);
  await reader.close();
  const addPdf = installed.context.waitForEvent('page');
  await doc.getByRole('button', { name: 'Add a PDF to this map', exact: true }).click();
  reader = await addPdf;
  await expect(reader.getByText('Adding sources to', { exact: false })).toContainText('Research project');
  await reader.getByLabel('Choose PDF file').setInputFiles(resolve('tests/fixtures/demo-paper.pdf'));
  await expect(reader.getByLabel('Open a map', { exact: true })).toHaveValue(projectId); await saved(reader);
  await expect(reader.locator('.react-flow__node')).toHaveCount(1);
  await reader.getByRole('checkbox', { name: 'Add Methods', exact: true }).check();
  await reader.getByLabel('Open a map', { exact: true }).selectOption(independentId); await saved(reader);
  await reader.getByLabel('Open a map', { exact: true }).selectOption(projectId); await saved(reader);
  await expect(reader.getByRole('checkbox', { name: 'Add Methods', exact: true })).not.toBeChecked();
  await reader.getByRole('checkbox', { name: 'Add Methods', exact: true }).check();
  await reader.getByRole('button', { name: 'Add selected (1)', exact: true }).click(); await saved(reader);
  await reader.getByLabel('From', { exact: true }).selectOption({ label: 'Analysis' });
  await reader.getByLabel('To', { exact: true }).selectOption({ label: 'Methods' });
  await reader.getByLabel('Connection label', { exact: true }).fill('uses this method');
  await reader.getByRole('button', { name: 'Connect nodes', exact: true }).click(); await saved(reader);
  await reader.getByRole('button', { name: 'Refresh PDF outline', exact: true }).click(); await saved(reader);
  await expect(reader.locator('.react-flow__node')).toHaveCount(2);
  const linkedDoc = installed.context.waitForEvent('page');
  await reader.getByRole('button', { name: 'Analysis', exact: true }).click();
  await reader.getByRole('link', { name: 'Open destination', exact: false }).click();
  const returnedDoc = await linkedDoc;
  await expect(returnedDoc).toHaveURL('https://docs.google.com/document/d/demo-doc/edit?tab=t.analysis');
  // Reopening the same project is part of navigation, without a map-tab detour.
  await expect(returnedDoc.getByRole('dialog')).toBeVisible();
  await expect(returnedDoc.getByLabel('Open a map', { exact: true })).toHaveValue(projectId);
  await returnedDoc.getByRole('button', { name: 'Refresh source', exact: true }).click(); await saved(returnedDoc);
  await expect(returnedDoc.locator('.react-flow__node')).toHaveCount(2);
  await returnedDoc.getByLabel('Open a map', { exact: true }).scrollIntoViewIfNeeded();
  await returnedDoc.screenshot({ path: testInfo.outputPath('project-map-doc.png') });
  const linkedPdf = installed.context.waitForEvent('page');
  await returnedDoc.getByRole('button', { name: 'Methods', exact: true }).click();
  await returnedDoc.getByRole('link', { name: 'Go to page 2', exact: true }).click();
  const returnedPdf = await linkedPdf;
  await expect.poll(() => new URL(returnedPdf.url()).searchParams.get('map')).toBe(projectId);
  await expect(returnedPdf.locator('.pdf-paper[data-page="2"]')).toBeVisible(); await saved(returnedPdf);
  await expect(returnedPdf.locator('.react-flow__node')).toHaveCount(2);
  await returnedPdf.screenshot({ path: testInfo.outputPath('project-map-pdf.png') });
  await returnedPdf.getByLabel('Open a map', { exact: true }).selectOption(independentId); await saved(returnedPdf);
  await expect(returnedPdf.locator('.react-flow__node')).toHaveCount(5);
  await returnedPdf.getByLabel('Open a map', { exact: true }).selectOption(projectId); await saved(returnedPdf);
  const savedUrl = returnedPdf.url(), context = await installed.restart(), reopened = await context.newPage();
  await reopened.goto(savedUrl); await saved(reopened);
  await expect(reopened.getByLabel('Open a map', { exact: true })).toHaveValue(projectId);
  await expect(reopened.locator('.react-flow__edge-text').filter({ hasText: 'uses this method' })).toHaveCount(1);
});
