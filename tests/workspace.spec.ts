import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const extensionId = 'pidejkbkldalibjaehjfpjkcpjpcenpk';
const workspaceUrl = `chrome-extension://${extensionId}/workspace.html`;
const test = base.extend<{ installed: { context: BrowserContext; restart: () => Promise<BrowserContext> } }>({
  installed: async ({}, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'graphnav-workspace-'));
    const extension = resolve('.output/chrome-mv3');
    const launch = () => chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1400, height: 960 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    let context = await launch();
    try { await use({ context, restart: async () => { await context.close(); context = await launch(); return context; } }); }
    finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
  },
});
async function open(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(workspaceUrl);
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  return page;
}
async function createMap(page: Page, name = 'Launch plan') {
  await page.getByLabel('New map name').fill(name);
  await page.getByRole('button', { name: 'Create map', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
async function addNode(page: Page, name: string) {
  await page.getByLabel('Node name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Add node', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await expect(page.locator('.react-flow__node').filter({ hasText: name })).toHaveCount(1);
}
async function records(page: Page, store: string) {
  return page.evaluate(async (store) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('graphnav'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try { return await new Promise<any[]>((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
    finally { db.close(); }
  }, store);
}

test('popup opens the private workspace; manual map and dragged layout survive a complete browser restart', async ({ installed }, testInfo) => {
  const popup = await installed.context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const newPage = installed.context.waitForEvent('page');
  await popup.getByRole('link', { name: 'Open my maps' }).click();
  const page = await newPage;
  await page.waitForURL(workspaceUrl);
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await createMap(page);
  await addNode(page, 'Budget');
  await addNode(page, 'Launch');
  await page.getByLabel('From', { exact: true }).selectOption({ label: 'Budget' });
  await page.getByLabel('To', { exact: true }).selectOption({ label: 'Launch' });
  await page.getByLabel('Connection label', { exact: true }).fill('funds');
  await page.getByRole('button', { name: 'Connect nodes', exact: true }).click();
  await expect(page.locator('.react-flow__edge-text')).toHaveText('funds');
  await page.getByLabel('Label', { exact: true }).fill('constrains');
  await expect(page.getByRole('status')).toHaveText('Unsaved edits');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.react-flow__edge-text')).toHaveText('constrains');
  await expect(page.getByRole('status')).toHaveText('Saved locally');

  const node = page.locator('.react-flow__node').filter({ hasText: 'Budget' });
  const box = (await node.boundingBox())!;
  const before = await records(page, 'layoutItems');
  await page.mouse.move(box.x + 70, box.y + 24);
  await page.mouse.down(); await page.mouse.move(box.x + 165, box.y + 130, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => (await records(page, 'layoutItems')).filter((row) => row.pinned).length).toBe(1);
  const after = await records(page, 'layoutItems');
  expect(after).not.toEqual(before);
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await node.focus();
  await node.press('Enter');
  await node.press('ArrowRight');
  await expect.poll(async () => (await records(page, 'layoutItems')).find((row) => row.itemId === after.find((r) => r.pinned).itemId).x).toBeGreaterThan(after.find((r) => r.pinned).x);
  const positioned = await records(page, 'layoutItems');
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  await expect.poll(async () => (await records(page, 'graphs'))[0].view.zoom).toBeGreaterThan(1);
  const savedView = (await records(page, 'graphs'))[0].view;
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await page.screenshot({ path: testInfo.outputPath('personal-map.png') });

  const restarted = await installed.restart();
  const restored = await open(restarted);
  await expect(restored.locator('.react-flow__node')).toHaveCount(2);
  await expect(restored.locator('.react-flow__edge-text')).toHaveText('constrains');
  expect(await records(restored, 'layoutItems')).toEqual(positioned);
  expect((await records(restored, 'graphs'))[0].view).toEqual(savedView);
});

test('node notes and safe destination persist; exported backup imports as a separate map', async ({ installed }) => {
  const page = await open(installed.context);
  await createMap(page, 'Research'); await addNode(page, 'Reference');
  await page.getByLabel('Notes', { exact: true }).fill('Read the methodology');
  await page.getByLabel('Destination link (optional)', { exact: true }).fill('https://example.com/paper');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await expect(page.getByRole('link', { name: 'Open destination' })).toHaveAttribute('href', 'https://example.com/paper');
  await installed.context.route('https://example.com/paper', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Synthetic destination</h1>' }));
  const destinationPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open destination' }).click();
  const destination = await destinationPromise;
  await expect(destination).toHaveURL('https://example.com/paper');
  await expect(destination.getByRole('heading')).toHaveText('Synthetic destination');
  await destination.close();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const filePath = (await download.path())!;
  const backup = JSON.parse(await readFile(filePath, 'utf8'));
  expect(backup.version).toBe(1);
  expect(backup.snapshot.nodes[0].body).toBe('Read the methodology');
  expect(backup.snapshot.nodes[0].locator.url).toBe('https://example.com/paper');
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await page.getByLabel('Import graph backup', { exact: true }).setInputFiles(filePath);
  await expect(page.getByRole('heading', { name: 'Research (copy)', exact: true })).toBeVisible();
  expect(await records(page, 'graphs')).toHaveLength(2);
  await page.getByRole('button', { name: 'Reference', exact: true }).click();
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Read the methodology');
  await page.getByRole('button', { name: 'Remove from map', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await page.getByLabel('Open a map', { exact: true }).selectOption({ label: 'Research' });
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
});

test('a group backup renders one editable junction with three spokes and saves its layout', async ({ installed }) => {
  const page = await open(installed.context);
  await createMap(page, 'Group fixture');
  for (const label of ['Budget', 'Staff', 'Launch']) await addNode(page, label);
  await page.getByLabel('From', { exact: true }).selectOption({ label: 'Budget' });
  await page.getByLabel('To', { exact: true }).selectOption({ label: 'Launch' });
  await page.getByLabel('Connection label', { exact: true }).fill('constrain');
  await page.getByRole('button', { name: 'Connect nodes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await downloaded).path())!, 'utf8'));
  const relation = backup.snapshot.relationships[0];
  const staff = backup.snapshot.nodes.find((node: { baseLabel: string }) => node.baseLabel === 'Staff');
  relation.members.push({ nodeId: staff.id, role: 'from' });
  relation.memberNodeIds.push(staff.id);
  await page.getByLabel('Import graph backup').setInputFiles({ name: 'group-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('heading', { name: 'Group fixture (copy)' })).toBeVisible();
  const junction = page.locator('.relationship-junction');
  await expect(junction).toHaveCount(1);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  await junction.click();
  await page.getByLabel('Label', { exact: true }).fill('limit');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(junction).toHaveText('limit');
  const box = (await junction.boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + 24);
  await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 100, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await records(page, 'layoutItems')).filter((row) => row.itemType === 'relationship' && row.pinned).length).toBe(1);
  const position = (await records(page, 'layoutItems')).find((row) => row.itemType === 'relationship');
  await page.reload();
  await expect(junction).toHaveText('limit');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  expect((await records(page, 'layoutItems')).find((row) => row.itemType === 'relationship')).toEqual(position);
});

test('a stale tab surfaces a conflict and preserves both the saved map and unsaved form', async ({ installed }) => {
  const first = await open(installed.context);
  await createMap(first); await addNode(first, 'Original');
  const stale = await open(installed.context);
  await stale.getByRole('button', { name: 'Original', exact: true }).click();
  await first.getByLabel('Label', { exact: true }).fill('Newer label');
  await first.getByRole('button', { name: 'Save changes' }).click();
  await expect(first.getByRole('status')).toHaveText('Saved locally');
  await stale.getByLabel('Label', { exact: true }).fill('Stale label');
  await stale.getByRole('button', { name: 'Save changes' }).click();
  await expect(stale.getByRole('alert')).toContainText('changed in another tab');
  await expect(stale.getByLabel('Label', { exact: true })).toHaveValue('Stale label');
  expect((await records(stale, 'nodes'))[0].baseLabel).toBe('Newer label');
  await stale.getByRole('button', { name: 'Cancel edits', exact: true }).click();
  await stale.getByRole('button', { name: 'Reload saved map', exact: true }).click();
  await expect(stale.getByLabel('Label', { exact: true })).toHaveValue('Newer label');
});

test('workspace controls fit a narrow screen and no personal data enters the host site database', async ({ installed }, testInfo) => {
  const page = await open(installed.context);
  await page.setViewportSize({ width: 390, height: 844 });
  await createMap(page, 'Small screen'); await addNode(page, 'A readable idea');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('workspace-narrow.png'), fullPage: true });
  const host = await installed.context.newPage();
  await host.route('https://drive.google.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Synthetic Drive page</h1>' }));
  await host.goto('https://drive.google.com/drive/my-drive');
  await expect(host.getByRole('button', { name: 'Graph', exact: true })).toBeVisible();
  expect(await host.evaluate(async () => (await indexedDB.databases()).some((database) => database.name === 'graphnav'))).toBe(false);
});

test('switching between saved maps in My maps keeps direct dragging available', async ({ installed }) => {
  const page = await open(installed.context);
  await createMap(page, 'First map'); await addNode(page, 'Original idea');
  const first = await page.getByLabel('Open a map', { exact: true }).inputValue();
  await createMap(page, 'Second map'); await addNode(page, 'Different idea');
  await page.getByLabel('Open a map', { exact: true }).selectOption(first);
  await expect(page.getByRole('status')).toHaveText('Saved locally');
  await expect(page.getByRole('heading', { name: 'First map', exact: true })).toBeVisible();
  const node = page.locator('.react-flow__node').filter({ hasText: 'Original idea' });
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 70, box.y + 24); await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 110, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => (await records(page, 'layoutItems')).filter((row) => row.graphId === first && row.pinned).length).toBe(1);
});
