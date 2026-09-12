import { expect, chromium, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

/**
 * A suggestion accepted onto the map must still say where it came from.
 *
 * The storage test proves the node is written with a destination; this proves
 * the destination reaches the canvas as the control a person actually clicks.
 * The two are separate failures: the record can be perfect while the card
 * shows nothing, which is exactly what "I still can't get to the pages" looks
 * like from the outside.
 *
 * Accepting is driven through the background message the review panel sends,
 * so this needs no relay and cannot collide with one already running.
 */

const extensionId = 'pidejkbkldalibjaehjfpjkcpjpcenpk';
const FINGERPRINT = 'd4c3b2a1'.repeat(8);

test('an accepted suggestion carries an Open control to its page', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-destination-'));
  const extension = resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1400, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });

  try {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/workspace.html`);
    await page.getByLabel('New map name').fill('Branching paper');
    await page.getByRole('button', { name: 'Create map', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Branching paper', exact: true })).toBeVisible();

    const applied = await page.evaluate(async ({ fingerprint }) => {
      const id = (globalThis as any).crypto.randomUUID();
      void id;
      const runtime = (globalThis as any).chrome.runtime;
      const maps = await runtime.sendMessage({ type: 'LIST_GRAPHS' });
      const graph = maps.ok ? maps.data[0] : undefined;
      if (!graph) return { ok: false, error: 'no map' };
      const passage = {
        passageId: 'page-3', sourceId: `local-pdf:${fingerprint}`, accountKey: 'local', version: fingerprint,
        locator: { kind: 'pdf', fingerprint, pageIndex: 3 },
        heading: 'Findings', text: 'Backtracking rose with branch count.', charCount: 36,
      };
      return runtime.sendMessage({
        type: 'APPLY_PROPOSALS',
        graphId: graph.id, revision: graph.contentRevision,
        inputHash: 'e'.repeat(64), sourceTitle: 'Branching paper',
        passages: [passage],
        draft: {
          draftVersion: 1, inputHash: 'e'.repeat(64),
          nodes: [{ tempId: 'n1', label: 'Branching drives backtracking', kind: 'idea', rationale: 'Stated in Findings.', evidencePassageIds: ['page-3'] }],
          relationships: [],
        },
        acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
        rejectNodeTempIds: [], rejectRelationshipTempIds: [],
      });
    }, { fingerprint: FINGERPRINT });

    expect(applied, `accepting failed: ${JSON.stringify(applied)}`).toMatchObject({ ok: true });

    await page.reload();
    const card = page.locator('.react-flow__node').filter({ hasText: 'Branching drives backtracking' });
    await expect(card).toHaveCount(1);
    // The arrow is the whole point: without it the passage is unreachable.
    await expect(card.getByRole('button', { name: /^Open / })).toBeVisible();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
