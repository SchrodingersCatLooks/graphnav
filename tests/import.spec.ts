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

test('personal work survives a source refresh, including a renamed and moved file', async () => {
  const graph = await repo.createGraph('Research', crypto.randomUUID(), 'import');
  const parent = drive('folder-root', 'Research', 'folder');
  const paper = { ...drive('file-paper', 'draft.md', 'file'), parentKey: importedKey(parent) };

  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, paper],
  });

  let snapshot = await repo.readGraph(graph.id);
  const paperNode = snapshot.nodes.find((n) => n.baseLabel === 'draft.md')!;

  // The user does real work: an idea of their own, a labeled connection to the
  // imported file, a note on it, and a dragged position.
  const ideaId = crypto.randomUUID();
  await repo.addNode(graph.id, snapshot.graph.contentRevision, {
    id: ideaId, label: 'Argument needs a counterexample', position: { x: 40, y: 60 },
  });
  snapshot = await repo.readGraph(graph.id);
  await repo.connect(graph.id, snapshot.graph.contentRevision, {
    id: crypto.randomUUID(),
    label: 'contradicts',
    members: [{ nodeId: ideaId, role: 'from' }, { nodeId: paperNode.id, role: 'to' }],
  });
  snapshot = await repo.readGraph(graph.id);
  await repo.setPersonalEdit(
    { graphId: graph.id, itemType: 'node', itemId: paperNode.id },
    snapshot.graph.contentRevision,
    { notes: 'Check section 3 against the 2019 result.' },
  );
  await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: paperNode.id }, { x: 123, y: 456 });

  // Now the source changes: the file is renamed upstream and refreshed.
  snapshot = await repo.readGraph(graph.id);
  const renamed = { ...drive('file-paper', 'draft-v2.md', 'file'), parentKey: importedKey(parent) };
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, renamed],
  });

  snapshot = await repo.readGraph(graph.id);

  // Same node, updated title from the source.
  const after = snapshot.nodes.find((n) => n.id === paperNode.id)!;
  expect(after.baseLabel).toBe('draft-v2.md');

  // The personal idea, its labeled connection, the note and the position all survive.
  expect(snapshot.nodes.find((n) => n.id === ideaId)).toBeTruthy();
  const personalEdge = snapshot.relationships.find((r) => r.origin === 'manual')!;
  expect(personalEdge.baseLabel).toBe('contradicts');
  expect(personalEdge.memberNodeIds).toContain(paperNode.id);
  expect(snapshot.itemEdits.find((e) => e.itemId === paperNode.id)!.notes)
    .toBe('Check section 3 against the 2019 result.');
  const layout = snapshot.layoutItems.find((l) => l.itemId === paperNode.id)!;
  expect([layout.x, layout.y]).toEqual([123, 456]);
});

test('a file missing from a refreshed folder keeps its node and personal links', async () => {
  const graph = await repo.createGraph('Research', crypto.randomUUID(), 'import');
  const parent = drive('folder-root', 'Research', 'folder');
  const paper = { ...drive('file-paper', 'draft.md', 'file'), parentKey: importedKey(parent) };

  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, paper],
  });
  let snapshot = await repo.readGraph(graph.id);
  const paperNode = snapshot.nodes.find((n) => n.baseLabel === 'draft.md')!;

  const ideaId = crypto.randomUUID();
  await repo.addNode(graph.id, snapshot.graph.contentRevision, {
    id: ideaId, label: 'Cite this', position: { x: 0, y: 0 },
  });
  snapshot = await repo.readGraph(graph.id);
  await repo.connect(graph.id, snapshot.graph.contentRevision, {
    id: crypto.randomUUID(), label: 'supports',
    members: [{ nodeId: ideaId, role: 'from' }, { nodeId: paperNode.id, role: 'to' }],
  });

  // The file disappears from the folder. It may have moved rather than been
  // deleted, so its node and the user's link must not be discarded.
  snapshot = await repo.readGraph(graph.id);
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent],
  });

  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes.find((n) => n.id === paperNode.id)).toBeTruthy();
  expect(snapshot.relationships.find((r) => r.origin === 'manual')!.memberNodeIds).toContain(paperNode.id);
  // Its containment edge is gone, because that folder no longer lists it.
  expect(snapshot.relationships.filter((r) => r.kind === 'contains')).toHaveLength(0);
});

test('availability marking is deliberate and only moves on a real answer', async () => {
  const graph = await repo.createGraph('Research', crypto.randomUUID(), 'import');
  const parent = drive('folder-root', 'Research', 'folder');
  const paper = { ...drive('file-paper', 'draft.md', 'file'), parentKey: importedKey(parent) };
  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, paper],
  });

  const snapshot = await repo.readGraph(graph.id);
  const paperSource = snapshot.sources.find((s) => s.resourceId === 'file-paper')!;
  expect(paperSource.availability).toBe('available');

  // A direct check says the target is gone.
  expect(await repo.markSourceAvailability(paperSource.sourceKey, 'unavailable')).toBe(true);
  let after = await repo.readGraph(graph.id);
  expect(after.sources.find((s) => s.resourceId === 'file-paper')!.availability).toBe('unavailable');

  // The node and its destination are kept, so the user can still see what broke.
  expect(after.nodes.find((n) => n.baseLabel === 'draft.md')!.locator).toEqual({ kind: 'drive', fileId: 'file-paper' });

  // Marking the same state again is a no-op, so a repeated check writes nothing.
  expect(await repo.markSourceAvailability(paperSource.sourceKey, 'unavailable')).toBe(false);

  // A later successful check restores it rather than leaving it broken forever.
  expect(await repo.markSourceAvailability(paperSource.sourceKey, 'available')).toBe(true);
  after = await repo.readGraph(graph.id);
  expect(after.sources.find((s) => s.resourceId === 'file-paper')!.availability).toBe('available');

  // An unknown source key changes nothing.
  expect(await repo.markSourceAvailability('no-such-source', 'unavailable')).toBe(false);
});

test('a refresh does not quietly resurrect a target a direct check found missing', async () => {
  const graph = await repo.createGraph('Research', crypto.randomUUID(), 'import');
  const parent = drive('folder-root', 'Research', 'folder');
  const paper = { ...drive('file-paper', 'draft.md', 'file'), parentKey: importedKey(parent) };
  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent, paper],
  });

  let snapshot = await repo.readGraph(graph.id);
  const sourceKey = snapshot.sources.find((s) => s.resourceId === 'file-paper')!.sourceKey;
  await repo.markSourceAvailability(sourceKey, 'unavailable');

  // Refreshing a folder that no longer lists the file must not flip it back.
  snapshot = await repo.readGraph(graph.id);
  await repo.refreshScope(graph.id, snapshot.graph.contentRevision, {
    scopeKey: 'scope-root', accountKey: ACCOUNT, complete: true, items: [parent],
  });

  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.sources.find((s) => s.resourceId === 'file-paper')!.availability).toBe('unavailable');
});
