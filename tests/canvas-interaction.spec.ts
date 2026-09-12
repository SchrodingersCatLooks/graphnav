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

/** Selects the first card without triggering a rename. */
const source0Click = async (page: import('@playwright/test').Page) =>
  page.locator('.react-flow__node').first().click({ position: { x: 10, y: 10 } });

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

    // F2 renames the selected node without reaching for the mouse. Enter is
    // left alone because React Flow uses it to select and move nodes.
    await source0Click(page);
    await page.keyboard.press('F2');
    const keyboardField = page.locator('.react-flow__node').first().getByRole('textbox');
    await expect(keyboardField).toBeVisible();
    await keyboardField.press('Escape');
    await expect(page.locator('.react-flow__node').first().getByRole('textbox')).toHaveCount(0);

    // The shortcut must not fire while someone is typing in a panel field.
    await page.getByLabel('Node name').fill('Typed in a field');
    await page.getByLabel('Node name').press('F2');
    await expect(page.locator('.react-flow__node').first().getByRole('textbox')).toHaveCount(0);

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
    // Undo takes back the last change, and names what it will take back.
    const undo = page.getByRole('button', { name: '↶ Undo' });
    await expect(undo).toBeEnabled();
    await expect(undo).toHaveAttribute('title', /Undo add connection|Undo add node/);
    await undo.click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);

    await undo.click();
    await expect(page.locator('.react-flow__node')).toHaveCount(1);

    // The keyboard shortcut does the same thing.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.locator('.react-flow__node').first()).toContainText('New idea');

    // Undo stops at the beginning rather than erroring or emptying the map.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ControlOrMeta+z');
    await expect(undo).toBeDisabled();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('Delete removes the selection, undo brings it back, and typing a Backspace does not', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-delete-'));
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1400, height: 960 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });

  try {
    const page = await context.newPage();
    await page.goto(workspaceUrl);
    await page.getByLabel('New map name').fill('Deletions');
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Deletions', exact: true })).toBeVisible();

    const pane = page.locator('.react-flow__pane');
    await pane.dblclick({ position: { x: 300, y: 240 } });
    await pane.dblclick({ position: { x: 700, y: 420 } });
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    await source0Click(page);
    await page.keyboard.press('Delete');
    await expect(page.locator('.react-flow__node')).toHaveCount(1);

    // Nothing is lost: the removal is a normal undo step like any other.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    // Backspace while typing edits the text rather than deleting the node.
    await source0Click(page);
    const field = page.getByLabel('Node name');
    await field.fill('Draft');
    await field.press('Backspace');
    await expect(field).toHaveValue('Draf');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    // The same goes for a rename happening on the card itself.
    await page.locator('.react-flow__node').first().dblclick();
    await page.locator('.react-flow__node').first().getByRole('textbox').press('Backspace');
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
    await page.locator('.react-flow__node').first().getByRole('textbox').press('Escape');

    // A connection can be deleted too, without taking its nodes with it.
    const options = await page.getByLabel('From', { exact: true }).locator('option').evaluateAll((els) =>
      els.map((el) => (el as HTMLOptionElement).value).filter(Boolean));
    await page.getByLabel('From', { exact: true }).selectOption(options[0]!);
    await page.getByLabel('To', { exact: true }).selectOption(options[1]!);
    await page.getByLabel('Connection label').fill('depends on');
    await page.getByRole('button', { name: 'Connect nodes', exact: true }).click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    // A new connection opens its editor over the line; put it away first.
    await page.getByRole('button', { name: 'Cancel connection changes' }).click();
    await expect(page.getByRole('dialog', { name: 'Connection' })).toHaveCount(0);

    // Clicking the label selects the connection it belongs to, so the same
    // keystroke that removes a card removes a line.
    await page.locator('.graph-edge-label').first().click();
    await expect(page.locator('.react-flow__edge.selected')).toHaveCount(1);
    await page.keyboard.press('Delete');
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
    // Only the connection goes; the nodes it joined stay put.
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
