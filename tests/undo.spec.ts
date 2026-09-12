import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, importedKey } from '../lib/storage/repository';
import { applyProposals, listDecisions } from '../lib/storage/proposals';
import type { GraphDraft, SourcePassage } from '../lib/generation/types';

/**
 * Undo.
 *
 * Stores the state before a change rather than an inverse of it. An inverse
 * has to be written and kept correct for every operation; a before-state is
 * right by construction and cannot drift as commands change.
 */

let db: GraphDatabase;
let repo: GraphRepository;
test.beforeEach(() => { db = new GraphDatabase('graphnav-undo-' + crypto.randomUUID()); repo = new GraphRepository(db); });
test.afterEach(async () => { await db.delete(); });

const current = async (id: string) => (await repo.readGraph(id)).graph.contentRevision;

test('adding a node can be taken back, and the step is named', async () => {
  const graph = await repo.createGraph('Plan');
  await repo.addNode(graph.id, graph.contentRevision, { id: crypto.randomUUID(), label: 'First', position: { x: 0, y: 0 } });
  await repo.addNode(graph.id, await current(graph.id), { id: crypto.randomUUID(), label: 'Second', position: { x: 10, y: 10 } });
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(2);

  expect(await repo.undoDepth(graph.id)).toMatchObject({ steps: 2, label: 'Add node' });

  const undone = await repo.undo(graph.id);
  expect(undone).toEqual({ undone: 'Add node' });

  const after = await repo.readGraph(graph.id);
  expect(after.nodes.map((n) => n.baseLabel)).toEqual(['First']);
  // Undoing is itself a change, so the revision moves forward rather than back.
  expect(after.graph.contentRevision).toBeGreaterThan(graph.contentRevision);
});

test('a rename is restored to exactly its previous text', async () => {
  const graph = await repo.createGraph('Plan');
  const id = crypto.randomUUID();
  await repo.addNode(graph.id, graph.contentRevision, { id, label: 'Original wording', position: { x: 0, y: 0 } });
  await repo.editNode(graph.id, await current(graph.id), id, { label: 'Changed wording', body: '' });

  expect((await repo.readGraph(graph.id)).nodes[0]!.baseLabel).toBe('Changed wording');
  await repo.undo(graph.id);
  expect((await repo.readGraph(graph.id)).nodes[0]!.baseLabel).toBe('Original wording');
});

test('removing an item brings back the item and its connections', async () => {
  const graph = await repo.createGraph('Plan');
  const a = crypto.randomUUID(), b = crypto.randomUUID();
  await repo.addNode(graph.id, graph.contentRevision, { id: a, label: 'A', position: { x: 0, y: 0 } });
  await repo.addNode(graph.id, await current(graph.id), { id: b, label: 'B', position: { x: 50, y: 0 } });
  await repo.connect(graph.id, await current(graph.id), {
    id: crypto.randomUUID(), label: 'supports',
    members: [{ nodeId: a, role: 'from' }, { nodeId: b, role: 'to' }],
  });

  await repo.removeItem({ graphId: graph.id, itemType: 'node', itemId: a }, await current(graph.id));
  let snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(1);
  expect(snapshot.relationships).toHaveLength(0);

  await repo.undo(graph.id);
  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(2);
  // The connection returns too: restoring a node without its links would be a
  // half-undo the user has to repair by hand.
  expect(snapshot.relationships).toHaveLength(1);
  expect(snapshot.relationships[0]!.memberNodeIds).toContain(a);
});

test('accepting AI suggestions can be taken back, decisions included', async () => {
  const passages: SourcePassage[] = [{
    passageId: 't.0:0', sourceId: 'google-docs:acct:doc-1', accountKey: 'acct', version: 'rev-1',
    locator: { kind: 'docs', documentId: 'doc-1', tabId: 't.0' },
    text: 'Junctions with more branches produce more backtracking.', charCount: 55,
  }];
  const draft: GraphDraft = {
    draftVersion: 1, inputHash: 'a'.repeat(64),
    nodes: [{ tempId: 'n1', label: 'Branching drives backtracking', kind: 'idea', rationale: '', evidencePassageIds: ['t.0:0'] }],
    relationships: [],
  };

  const graph = await repo.createGraph('Paper', crypto.randomUUID(), 'import');
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft, inputHash: 'a'.repeat(64),
    passages, sourceTitle: 'Paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(1);
  expect(await listDecisions(db, graph.id)).toHaveLength(1);

  // applyProposals is its own transaction, so it records its own step.
  await repo.undo(graph.id);
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(0);
  // The decision goes back too, or the suggestion would be gone from the map
  // yet still suppressed as "already added" on the next generation.
  expect(await listDecisions(db, graph.id)).toHaveLength(0);
});

test('undo stops cleanly at the beginning instead of erroring', async () => {
  const graph = await repo.createGraph('Plan');
  expect(await repo.undoDepth(graph.id)).toMatchObject({ steps: 0 });
  expect(await repo.undo(graph.id)).toBeNull();

  await repo.addNode(graph.id, graph.contentRevision, { id: crypto.randomUUID(), label: 'Only', position: { x: 0, y: 0 } });
  await repo.undo(graph.id);
  expect(await repo.undo(graph.id)).toBeNull();
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(0);
});

test('history is bounded, so the journal cannot grow without limit', async () => {
  const graph = await repo.createGraph('Plan');
  for (let i = 0; i < GraphRepository.UNDO_DEPTH + 8; i += 1) {
    await repo.addNode(graph.id, await current(graph.id), { id: crypto.randomUUID(), label: `Node ${i}`, position: { x: i, y: 0 } });
  }
  const depth = await repo.undoDepth(graph.id);
  expect(depth.steps).toBe(GraphRepository.UNDO_DEPTH);

  // The most recent steps are the ones kept.
  await repo.undo(graph.id);
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(GraphRepository.UNDO_DEPTH + 7);
});

test('one map\'s history does not reach another', async () => {
  const a = await repo.createGraph('A');
  const b = await repo.createGraph('B');
  await repo.addNode(a.id, a.contentRevision, { id: crypto.randomUUID(), label: 'In A', position: { x: 0, y: 0 } });

  expect(await repo.undoDepth(b.id)).toMatchObject({ steps: 0 });
  expect(await repo.undo(b.id)).toBeNull();
  // A's history is untouched by asking B to undo.
  expect(await repo.undoDepth(a.id)).toMatchObject({ steps: 1 });
  expect((await repo.readGraph(a.id)).nodes).toHaveLength(1);
});

test('a failed change leaves no undo step behind', async () => {
  const graph = await repo.createGraph('Plan');
  await repo.addNode(graph.id, graph.contentRevision, { id: crypto.randomUUID(), label: 'Real', position: { x: 0, y: 0 } });
  const before = await repo.undoDepth(graph.id);

  // A stale revision is refused; nothing should be recorded for it.
  await expect(repo.addNode(graph.id, graph.contentRevision, { id: crypto.randomUUID(), label: 'Stale', position: { x: 0, y: 0 } }))
    .rejects.toThrow();

  expect(await repo.undoDepth(graph.id)).toMatchObject({ steps: before.steps });
});

test('dragging a node does not fill history with layout steps', async () => {
  const graph = await repo.createGraph('Plan');
  const id = crypto.randomUUID();
  await repo.addNode(graph.id, graph.contentRevision, { id, label: 'Movable', position: { x: 0, y: 0 } });
  const before = await repo.undoDepth(graph.id);

  for (let i = 1; i <= 5; i += 1) {
    await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: id }, { x: i * 10, y: 0 });
  }

  // Otherwise a single drag would bury every meaningful step.
  expect(await repo.undoDepth(graph.id)).toMatchObject({ steps: before.steps });
});

test('imported sources come back when a refresh is undone', async () => {
  const graph = await repo.createGraph('Drive', crypto.randomUUID(), 'import');
  const folder = {
    source: { provider: 'google-drive' as const, accountKey: 'acct', resourceId: 'f1', kind: 'folder' as const, title: 'Root' },
    locator: { kind: 'drive' as const, fileId: 'f1' }, title: 'Root',
  };
  const child = { ...folder, source: { ...folder.source, resourceId: 'f2', title: 'Child' }, locator: { kind: 'drive' as const, fileId: 'f2' }, title: 'Child', parentKey: importedKey(folder) };

  await repo.refreshScope(graph.id, graph.contentRevision, { scopeKey: 's', accountKey: 'acct', complete: true, items: [folder, child] });
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(2);

  await repo.undo(graph.id);
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(0);
});
