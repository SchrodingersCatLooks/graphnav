import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, importedKey, type ImportedItem } from '../lib/storage/repository';
import { LIMITS } from '../lib/graph/types';

/**
 * Scale and failure evidence for demonstration scenario 5.
 *
 * These record measured behaviour on a labeled synthetic dataset. They are test
 * inputs, not claims about supported capacity, and timings vary by machine, so
 * the assertions are generous bounds that catch a collapse rather than tight
 * numbers that would fail on slower hardware.
 */

let db: GraphDatabase;
let repo: GraphRepository;
test.beforeEach(() => { db = new GraphDatabase('graphnav-scale-' + crypto.randomUUID()); repo = new GraphRepository(db); });
test.afterEach(async () => { await db.delete(); });

const ACCOUNT = 'account-scale';

function driveItem(resourceId: string, title: string, kind: 'folder' | 'file', parentKey?: string, accountKey = ACCOUNT): ImportedItem {
  return {
    source: { provider: 'google-drive', accountKey, resourceId, kind, title },
    locator: { kind: 'drive', fileId: resourceId },
    title,
    ...(parentKey ? { parentKey } : {}),
  };
}

/** A labeled synthetic folder tree: a root, up to 20 folders, and files beneath them. */
function syntheticTree(totalNodes: number, accountKey = ACCOUNT): ImportedItem[] {
  const root = driveItem('scale-root', 'Scale fixture', 'folder', undefined, accountKey);
  const rootKey = importedKey(root);
  const items: ImportedItem[] = [root];

  // Never create more folders than the caller asked for in total.
  const folderCount = Math.max(0, Math.min(20, totalNodes - 1));
  const folderKeys: string[] = [];
  for (let f = 0; f < folderCount; f += 1) {
    const folder = driveItem(`scale-folder-${f}`, `Folder ${String(f).padStart(2, '0')}`, 'folder', rootKey, accountKey);
    folderKeys.push(importedKey(folder));
    items.push(folder);
  }

  let index = 0;
  while (items.length < totalNodes && folderCount > 0) {
    const parent = folderKeys[index % folderCount]!;
    items.push(driveItem(`scale-file-${index}`, `Document ${index}.md`, 'file', parent, accountKey));
    index += 1;
  }
  return items;
}

test('a 500-node synthetic import stores, reopens and refreshes within usable time', async () => {
  const items = syntheticTree(LIMITS.nodes);
  expect(items).toHaveLength(500);

  const graph = await repo.createGraph('Scale fixture', crypto.randomUUID(), 'import');

  const importStart = performance.now();
  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: true, items,
  });
  const importMs = performance.now() - importStart;

  const readStart = performance.now();
  let snapshot = await repo.readGraph(graph.id);
  const readMs = performance.now() - readStart;

  expect(snapshot.nodes).toHaveLength(500);
  // Every node except the root hangs off a parent.
  expect(snapshot.relationships).toHaveLength(499);

  const refreshStart = performance.now();
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: true, items,
  });
  const refreshMs = performance.now() - refreshStart;

  snapshot = await repo.readGraph(graph.id);
  // Re-importing the same tree must not duplicate anything.
  expect(snapshot.nodes).toHaveLength(500);
  expect(snapshot.relationships).toHaveLength(499);

  console.log(`[scale] 500 nodes: import ${importMs.toFixed(0)}ms, read ${readMs.toFixed(0)}ms, refresh ${refreshMs.toFixed(0)}ms`);

  // Generous bounds: these catch a collapse, not a slow laptop.
  expect(importMs).toBeLessThan(30_000);
  expect(readMs).toBeLessThan(5_000);
  expect(refreshMs).toBeLessThan(30_000);
});

test('the node limit is enforced rather than silently dropping work', async () => {
  const graph = await repo.createGraph('Over limit', crypto.randomUUID(), 'import');
  const items = syntheticTree(LIMITS.nodes + 1);

  // Refusing loudly is correct; quietly importing 500 of 501 would be a lie.
  await expect(repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: true, items,
  })).rejects.toThrow();

  // The failed import left nothing half-written.
  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(0);
});

test('a partial read never claims a scope is complete', async () => {
  const graph = await repo.createGraph('Partial', crypto.randomUUID(), 'import');
  const items = syntheticTree(60);

  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: false, items,
  });

  let snapshot = await repo.readGraph(graph.id);
  const binding = snapshot.graph.sourceBindings.find((b) => b.key === 'scale-scope')!;
  expect(binding.complete).toBe(false);

  // A later complete read may upgrade it; an incomplete one must never claim completeness.
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: true, items,
  });
  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.graph.sourceBindings.find((b) => b.key === 'scale-scope')!.complete).toBe(true);
});

test('one account cannot import into another account\'s map', async () => {
  const graph = await repo.createGraph('Account A', crypto.randomUUID(), 'import');
  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-a', accountKey: 'account-a', complete: true, items: syntheticTree(5, 'account-a'),
  });

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.graph.accountScope).toBe('account-a');

  // A different Google account must be refused, not merged in.
  await expect(repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-b', accountKey: 'account-b', complete: true, items: syntheticTree(5, 'account-b'),
  })).rejects.toThrow(/different Google account/i);

  // And nothing from account B leaked in.
  const after = await repo.readGraph(graph.id);
  expect(after.graph.accountScope).toBe('account-a');
  expect(after.nodes).toHaveLength(5);
});

test('an interrupted import leaves no partial state behind', async () => {
  const graph = await repo.createGraph('Interrupted', crypto.randomUUID(), 'import');
  const items = syntheticTree(40);

  // A duplicate destination is rejected mid-import; the transaction must roll back.
  const corrupted = [...items, items[10]!];
  await expect(repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scale-scope', accountKey: ACCOUNT, complete: true, items: corrupted,
  })).rejects.toThrow();

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(0);
  expect(snapshot.graph.sourceBindings).toHaveLength(0);
  // The revision did not advance, so nothing reports as saved.
  expect(snapshot.graph.contentRevision).toBe(graph.contentRevision);
});

test('a stale editor is refused instead of overwriting newer work', async () => {
  const graph = await repo.createGraph('Concurrent', crypto.randomUUID(), 'import');
  const staleRevision = graph.contentRevision;

  await repo.refreshScope(graph.id, staleRevision, {
    scopeKey: 'scope-1', accountKey: ACCOUNT, complete: true, items: syntheticTree(5),
  });

  // A second caller still holding the old revision must not win.
  await expect(repo.refreshScope(graph.id, staleRevision, {
    scopeKey: 'scope-2', accountKey: ACCOUNT, complete: true, items: syntheticTree(5),
  })).rejects.toThrow();

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.graph.sourceBindings.map((b) => b.key)).toEqual(['scope-1']);
});
