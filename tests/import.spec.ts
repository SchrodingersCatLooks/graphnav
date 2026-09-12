import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, importedKey } from '../lib/storage/repository';

let db: GraphDatabase;
let repo: GraphRepository;
test.beforeEach(() => { db = new GraphDatabase('graphnav-import-' + crypto.randomUUID()); repo = new GraphRepository(db); });
test.afterEach(async () => { await db.delete(); });

const ACCOUNT = 'account-key-1';
/**
 * An expanded scope's root carries no parentKey: that link belongs to the scope
 * that first revealed the folder. Re-declaring it stores a second contains edge
 * for the same pair under a different scope, which renders as a duplicate edge.
 */
const asScopeRoot = <T extends { parentKey?: string }>(item: T): Omit<T, 'parentKey'> => {
  const { parentKey: _ignored, ...root } = item;
  return root;
};
const drive = (resourceId: string, title: string, kind: 'folder' | 'file', link?: string) => ({
  source: { provider: 'google-drive' as const, accountKey: ACCOUNT, resourceId, kind, title, ...(link ? { canonicalUrl: link } : {}) },
  locator: { kind: 'drive' as const, fileId: resourceId, ...(link ? { webViewLink: link } : {}) },
  title,
});

test('a folder keeps one identity whether it arrived in a listing or on its own', () => {
  // files.list returns a webViewLink; files.get may not. If that changed the key,
  // expanding a subfolder would duplicate the node instead of reusing it.
  const fromListing = drive('folder-child', '04 Raw Data', 'folder', 'https://drive.google.com/drive/folders/folder-child');
  const fromMetadata = drive('folder-child', '04 Raw Data', 'folder');
  expect(importedKey(fromMetadata)).toBe(importedKey(fromListing));

  // A renamed folder is still the same folder.
  const renamed = drive('folder-child', 'Raw Data (renamed)', 'folder');
  expect(importedKey(renamed)).toBe(importedKey(fromListing));
});

test('expanding a subfolder adds to the same map instead of duplicating its node', async () => {
  const graph = await repo.createGraph('GraphNav demo drive', crypto.randomUUID(), 'import');

  const parent = drive('folder-root', 'GraphNav demo drive', 'folder');
  const child = { ...drive('folder-child', '04 Raw Data', 'folder'), parentKey: importedKey(parent) };

  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'drive:folder:folder-root', accountKey: ACCOUNT, complete: true, items: [parent, child],
  });

  let snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(2);
  const childNodeId = snapshot.nodes.find((n) => n.baseLabel === '04 Raw Data')!.id;

  // Now expand that subfolder into the SAME map, as a second scope.
  const grandchild = { ...drive('file-log', 'session-01.csv', 'file'), parentKey: importedKey(child) };
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'drive:folder:folder-child', accountKey: ACCOUNT, complete: true, items: [asScopeRoot(child), grandchild],
  });

  snapshot = await repo.readGraph(graph.id);

  // Three nodes, not four: the subfolder was reused, not duplicated.
  expect(snapshot.nodes).toHaveLength(3);
  expect(snapshot.nodes.filter((n) => n.baseLabel === '04 Raw Data')).toHaveLength(1);
  // And it kept its original identity, so personal edits and layout survive.
  expect(snapshot.nodes.find((n) => n.baseLabel === '04 Raw Data')!.id).toBe(childNodeId);

  // The new file hangs off the subfolder, and the map records both scopes.
  const edge = snapshot.relationships.find((r) => r.memberNodeIds.includes(
    snapshot.nodes.find((n) => n.baseLabel === 'session-01.csv')!.id))!;
  expect(edge.memberNodeIds).toContain(childNodeId);
  expect(snapshot.graph.sourceBindings.map((b) => b.key).sort())
    .toEqual(['drive:folder:folder-child', 'drive:folder:folder-root']);

  // One edge per real containment, not one per scope that mentioned it.
  expect(snapshot.relationships).toHaveLength(2);
});

test('a complete refresh of one scope leaves another scope intact', async () => {
  const graph = await repo.createGraph('Two scopes', crypto.randomUUID(), 'import');
  const parent = drive('folder-root', 'Root', 'folder');
  const child = { ...drive('folder-child', 'Child', 'folder'), parentKey: importedKey(parent) };
  const grandchild = { ...drive('file-log', 'log.csv', 'file'), parentKey: importedKey(child) };

  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, child],
  });
  let snapshot = await repo.readGraph(graph.id);
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-child', accountKey: ACCOUNT, complete: true, items: [asScopeRoot(child), grandchild],
  });

  // Re-running the parent scope must not remove the expanded scope's work.
  snapshot = await repo.readGraph(graph.id);
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, child],
  });

  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(3);
  expect(snapshot.nodes.map((n) => n.baseLabel).sort()).toEqual(['Child', 'Root', 'log.csv']);
  expect(snapshot.relationships).toHaveLength(2);
});
