import { expect, chromium, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

/**
 * Direct canvas gestures.
 *
 * Double-click to create and double-click to rename are the default in Miro,
 * FigJam, tldraw and Obsidian Canvas, and are what make a canvas feel direct
 * rather than form-driven. The panel controls still exist for anyone who
 * prefers them; these check the fast path works and does not fire by accident.
 */

const extensionId = 'pidejkbkldalibjaehjfpjkcpjpcenpk';
const workspaceUrl = `chrome-extension://${extensionId}/workspace.html`;

test('direct canvas gestures: double-click creates, double-click renames, and dragging a connection out creates a connected node', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-canvas-'));
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1400, height: 960 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });

  try {
    const page = await context.newPage();
    await page.goto(workspaceUrl);
    await expect(page.getByRole('status')).toHaveText('Saved locally');
    await page.getByLabel('New map name').fill('Canvas gestures');
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Canvas gestures', exact: true })).toBeVisible();
    await expect(page.locator('.react-flow__node')).toHaveCount(0);

    // The empty canvas tells the user the gesture exists.
    await expect(page.locator('.canvas-empty')).toContainText('Double-click anywhere to add an idea');

    const pane = page.locator('.react-flow__pane');
    await pane.dblclick({ position: { x: 420, y: 300 } });

    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    const card = page.locator('.react-flow__node').first();
    await expect(card).toContainText('New idea');

    // It lands near where the pointer was, not at a fixed slot.
    const box = await card.boundingBox();
    const paneBox = await pane.boundingBox();
    expect(box!.x - paneBox!.x).toBeGreaterThan(200);
    expect(box!.y - paneBox!.y).toBeGreaterThan(120);

    // Double-clicking the card renames in place rather than opening a panel.
    await card.dblclick();
    const field = card.getByRole('textbox');
    await expect(field).toBeVisible();
    await field.fill('Junction hypothesis');
    await field.press('Enter');

    await expect(card).toContainText('Junction hypothesis');
    await expect(card.getByRole('textbox')).toHaveCount(0);
    await expect(page.locator('.react-flow__node')).toHaveCount(1);

    // Escape abandons a rename, leaving the saved name alone.
    await card.dblclick();
    await card.getByRole('textbox').fill('Discarded name');
    await card.getByRole('textbox').press('Escape');
    await expect(card).toContainText('Junction hypothesis');

    // Renaming survives a reload, so it was stored rather than held in the view.
    await page.reload();
    await expect(page.locator('.react-flow__node').first()).toContainText('Junction hypothesis');

    // Double-clicking a card must not also create a node underneath it.
    await page.locator('.react-flow__node').first().dblclick();
    await page.keyboard.press('Escape');
    await expect(page.locator('.react-flow__node')).toHaveCount(1);

    // Dragging a connection onto empty canvas creates the node it reached for,
    // already connected, rather than silently doing nothing.
    const source = page.locator('.react-flow__node').first();
    const handle = source.locator('.react-flow__handle').last();
    const handleBox = (await handle.boundingBox())!;
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 320, handleBox.y + 200, { steps: 12 });
    await page.mouse.up();

    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    // The original keeps its name; the new one is the untitled idea.
    await expect(page.locator('.react-flow__node')).toContainText(['Junction hypothesis', 'New idea']);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
