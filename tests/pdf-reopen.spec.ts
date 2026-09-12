import { blankMap, currentMapId, tools } from './ui-helpers';
import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Demonstration scenario 4: reopening a paper finds the work already done on it.
 *
 * The map is bound to the document's byte fingerprint, not to a session, so the
 * same file opened later reconnects rather than starting again. This is the
 * behaviour that makes a personal paper graph worth building, so it is checked
 * through the installed extension rather than inferred from the lookup code.
 */

const origin = 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';
const paper = resolve('tests/fixtures/demo-paper.pdf');

test('reopening the same paper reconnects to its saved map with personal work intact', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-reopen-'));
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });

  try {
    const page = await context.newPage();
    await page.goto(`${origin}/reader.html`);
    await page.getByLabel('Choose PDF file').setInputFiles(paper);
    await blankMap(page, 'Wayfinding paper');

    // Building the baseline binds this map to the paper's fingerprint.
    await tools(page, 'Sources');
    await page.getByRole('button', { name: /^Build baseline/ }).click();
    await expect(page.locator('.react-flow__node')).not.toHaveCount(0);
    const boundMapId = await currentMapId(page);
    const nodeCount = await page.locator('.react-flow__node').count();

    // Add something of the user's own, which is what must not be lost.
    await tools(page, 'Add idea');
    await page.getByLabel('Node name').fill('Check the junction claim');
    await page.getByRole('button', { name: 'Add node', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodeCount + 1);

    // Close the reader entirely and open the same file again.
    await page.reload();
    await page.getByLabel('Choose PDF file').setInputFiles(paper);

    // Same map, not a fresh one, and the personal idea is still there.
    await expect.poll(() => currentMapId(page)).toBe(boundMapId);
    await expect(page.locator('.react-flow__node')).toHaveCount(nodeCount + 1);
    await expect(page.getByRole('group', { name: 'Node: Check the junction claim' })).toBeVisible();
    // The paper's own sections came back too, not just the personal note.
    await expect(page.getByRole('group', { name: 'Node: Scope and Definitions' })).toBeVisible();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
