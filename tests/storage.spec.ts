import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, ConflictError, importedKey, storageError } from '../lib/storage/repository';
import { destinationUrl, effectiveConnection, directedMembers, type GraphSnapshot } from '../lib/graph/types';

let db: GraphDatabase;
let repo: GraphRepository;
test.beforeEach(() => { db = new GraphDatabase('graphnav-unit-' + crypto.randomUUID()); repo = new GraphRepository(db); });
test.afterEach(async () => { await db.delete(); });
const add = async (snapshot: GraphSnapshot, label: string, id: string = crypto.randomUUID()) => {
  await repo.addNode(snapshot.graph.id, snapshot.graph.contentRevision, { id, label, position: { x: 10, y: 20 } });
  return repo.readGraph(snapshot.graph.id);
};
const folder = { source: { provider: 'google-drive' as const, accountKey: 'fixture-account', resourceId: 'folder-1', kind: 'folder' as const, title: 'Research' }, locator: { kind: 'drive' as const, fileId: 'folder-1' }, title: 'Research' };
const doc = { source: { provider: 'google-docs' as const, accountKey: 'fixture-account', resourceId: 'doc-1', kind: 'document' as const, title: 'Findings' }, locator: { kind: 'docs' as const, documentId: 'doc-1', tabId: 't.nested' }, title: 'Nested findings', parentKey: importedKey(folder) };
const refresh = (items = [folder, doc], complete = true) => ({ scopeKey: 'fixture-folder-1', accountKey: 'fixture-account', complete, items });

test('manual nodes, multiple connections, edits, layout and viewport survive database reopening', async () => {
  const graph = await repo.createGraph('Launch plan');
  let data = await add(await repo.readGraph(graph.id), 'Budget', 'budget');
  data = await add(data, 'Staff', 'staff');
  data = await add(data, 'Launch', 'launch');
  await repo.connect(graph.id, data.graph.contentRevision, { id: 'group', label: 'constrain', members: [{ nodeId: 'budget', role: 'from' }, { nodeId: 'staff', role: 'from' }, { nodeId: 'launch', role: 'to' }] });
  data = await repo.readGraph(graph.id);
  await repo.connect(graph.id, data.graph.contentRevision, { id: 'pair', label: 'funds', members: [{ nodeId: 'budget', role: 'from' }, { nodeId: 'launch', role: 'to' }] });
  data = await repo.readGraph(graph.id);
  await repo.setPersonalEdit({ graphId: graph.id, itemType: 'relationship', itemId: 'pair' }, data.graph.contentRevision, { displayLabel: 'limits', notes: 'Review in June' });
  await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: 'budget' }, { x: 250, y: -30 });
  await repo.savePosition({ graphId: graph.id, itemType: 'relationship', itemId: 'group' }, { x: 80, y: 90 });
  await repo.saveView(graph.id, { x: 12, y: 44, zoom: 0.8 });
  const name = db.name;
  db.close(); db = new GraphDatabase(name); repo = new GraphRepository(db);
  data = await repo.readGraph(graph.id);
  expect(data.nodes).toHaveLength(3);
  expect(data.relationships).toHaveLength(2);
  expect(data.relationships.find((r) => r.id === 'group')!.members).toHaveLength(3);
  expect(data.itemEdits[0]).toMatchObject({ displayLabel: 'limits', notes: 'Review in June' });
  expect(data.layoutItems.find((l) => l.itemId === 'budget')).toMatchObject({ x: 250, y: -30, pinned: true });
  expect(data.graph.view).toEqual({ x: 12, y: 44, zoom: 0.8 });
});

test('failure in a multi-record edit rolls back the node and revision and reports the quota error', async () => {
  const graph = await repo.createGraph('Atomic writes');
  db.layoutItems.hook('creating', () => { throw new DOMException('Storage full', 'QuotaExceededError'); });
  let failure: unknown;
  try { await repo.addNode(graph.id, 0, { id: 'failed', label: 'Must not be half-saved', position: { x: 0, y: 0 } }); } catch (error) { failure = error; }
  expect(storageError(failure)).toContain('storage is full');
  expect((await repo.readGraph(graph.id)).nodes).toHaveLength(0);
  expect((await repo.readGraph(graph.id)).graph.contentRevision).toBe(0);
});

test('stale concurrent writers cannot silently overwrite each other', async () => {
  const graph = await repo.createGraph('Two tabs');
  const otherDb = new GraphDatabase(db.name);
  const other = new GraphRepository(otherDb);
  try {
    const results = await Promise.allSettled([
      repo.addNode(graph.id, 0, { id: 'first', label: 'First', position: { x: 0, y: 0 } }),
      other.addNode(graph.id, 0, { id: 'second', label: 'Second', position: { x: 0, y: 0 } }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failure.reason).toBeInstanceOf(ConflictError);
    expect((await repo.readGraph(graph.id)).nodes).toHaveLength(1);
  } finally { otherDb.close(); }
});

test('invalid group members and cross-graph references fail without partial changes', async () => {
  const a = await repo.createGraph('A'), b = await repo.createGraph('B');
  const data = await add(await repo.readGraph(a.id), 'One', 'one');
  await add(await repo.readGraph(b.id), 'Two', 'two');
  await expect(repo.connect(a.id, data.graph.contentRevision, { id: 'bad', label: 'invalid', members: [{ nodeId: 'one', role: 'from' }, { nodeId: 'two', role: 'to' }] })).rejects.toThrow('another map');
  await expect(repo.connect(a.id, data.graph.contentRevision, { id: 'bad', label: 'invalid', members: [{ nodeId: 'one', role: 'from' }, { nodeId: 'one', role: 'to' }] })).rejects.toThrow();
  expect((await repo.readGraph(a.id)).graph.contentRevision).toBe(data.graph.contentRevision);
  expect(await db.relationships.count()).toBe(0);
});

test('source refresh preserves stable IDs, personal annotations, links and positions', async () => {
  const graph = await repo.createGraph('Imported structure');
  await repo.refreshScope(graph.id, 0, refresh());
  let data = await repo.readGraph(graph.id);
  const original = data.nodes.find((n) => n.baseLabel === doc.title)!;
  await repo.setPersonalEdit({ graphId: graph.id, itemType: 'node', itemId: original.id }, data.graph.contentRevision, { displayLabel: 'My findings', notes: 'Important', hidden: false });
  data = await add(await repo.readGraph(graph.id), 'My idea', 'idea');
  await repo.connect(graph.id, data.graph.contentRevision, { id: 'manual', label: 'supports', members: [{ nodeId: original.id, role: 'from' }, { nodeId: 'idea', role: 'to' }] });
  await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: original.id }, { x: 300, y: 100 });
  data = await repo.readGraph(graph.id);
  const renamed = { ...doc, title: 'Renamed tab', source: { ...doc.source, title: 'Renamed file' } };
  await repo.refreshScope(graph.id, data.graph.contentRevision, refresh([folder, renamed]));
  data = await repo.readGraph(graph.id);
  expect(data.nodes.find((n) => n.id === original.id)!.baseLabel).toBe('Renamed tab');
  expect(data.itemEdits[0]).toMatchObject({ displayLabel: 'My findings', notes: 'Important', hidden: false });
  expect(data.relationships.find((r) => r.id === 'manual')).toBeTruthy();
  expect(data.layoutItems.find((l) => l.itemId === original.id)).toMatchObject({ x: 300, y: 100 });
  expect(destinationUrl(original.locator!)).toBe('https://docs.google.com/document/d/doc-1/edit?tab=t.nested');
});

test('partial refresh never removes containment; complete scope can remove a moved membership without deleting its node', async () => {
  const graph = await repo.createGraph('Pagination');
  await repo.refreshScope(graph.id, 0, refresh());
  await repo.refreshScope(graph.id, 1, refresh([folder], false));
  let data = await repo.readGraph(graph.id);
  expect(data.relationships).toHaveLength(1);
  await repo.refreshScope(graph.id, data.graph.contentRevision, refresh([folder]));
  data = await repo.readGraph(graph.id);
  expect(data.relationships).toHaveLength(0);
  expect(data.nodes).toHaveLength(2);
});

test('account mismatch and missing imported parents roll back the entire refresh', async () => {
  const graph = await repo.createGraph('Account scope');
  await repo.refreshScope(graph.id, 0, refresh());
  await expect(repo.refreshScope(graph.id, 1, { ...refresh(), accountKey: 'other-account' })).rejects.toThrow('mixes accounts');
  await expect(repo.refreshScope(graph.id, 1, refresh([{ ...doc, parentKey: 'missing' }]))).rejects.toThrow('parent');
  await expect(repo.refreshScope(graph.id, 1, { ...refresh(), accountKey: 'local', items: [{ ...folder, source: { ...folder.source, accountKey: 'local' } }] })).rejects.toThrow('verified account key');
  expect((await repo.readGraph(graph.id)).graph.contentRevision).toBe(1);
});

test('removing the only from member removes an invalid group and dependent edits atomically', async () => {
  const graph = await repo.createGraph('Deletion');
  let data = await add(await repo.readGraph(graph.id), 'A', 'a');
  data = await add(data, 'B', 'b'); data = await add(data, 'C', 'c');
  await repo.connect(graph.id, data.graph.contentRevision, { id: 'r', label: 'supports', members: [{ nodeId: 'a', role: 'from' }, { nodeId: 'b', role: 'to' }, { nodeId: 'c', role: 'to' }] });
  await repo.savePosition({ graphId: graph.id, itemType: 'relationship', itemId: 'r' }, { x: 2, y: 3 });
  data = await repo.readGraph(graph.id);
  await repo.removeItem({ graphId: graph.id, itemType: 'node', itemId: 'a' }, data.graph.contentRevision);
  data = await repo.readGraph(graph.id);
  expect(data.nodes).toHaveLength(2); expect(data.relationships).toHaveLength(0);
  expect(data.layoutItems.some((l) => l.itemId === 'r' || l.itemId === 'a')).toBe(false);
});

test('backup imports a separate graph with remapped IDs and preserves source destinations', async () => {
  const graph = await repo.createGraph('Backup');
  await repo.refreshScope(graph.id, 0, refresh());
  const original = await repo.readGraph(graph.id);
  const json = await repo.exportGraph(graph.id);
  const copyId = await repo.importGraph(json);
  const copy = await repo.readGraph(copyId);
  expect(copy.graph.id).not.toBe(graph.id);
  expect(copy.nodes.map((n) => n.id)).not.toEqual(original.nodes.map((n) => n.id));
  // Copies get new UUIDs, so IndexedDB's primary-key order is not stable.
  for (const node of original.nodes) {
    const copied = copy.nodes.find((n) => n.importKey === node.importKey)!;
    expect(copied.id).not.toBe(node.id);
    expect(copied.locator).toEqual(node.locator);
  }
  expect(copy.sources.map((s) => s.id).sort()).toEqual(original.sources.map((s) => s.id).sort());
  expect(copy.relationships[0]!.memberNodeIds.every((id) => copy.nodes.some((n) => n.id === id))).toBe(true);
  await expect(repo.exportGraph(copyId)).resolves.toContain('graphnav');
  await repo.refreshScope(copyId, 0, refresh());
  expect((await repo.readGraph(copyId)).nodes).toHaveLength(2);
  expect((await repo.readGraph(copyId)).relationships).toHaveLength(1);
});

test('malformed backups, unsafe URLs and unsupported versions cannot create records', async () => {
  const graph = await repo.createGraph('Validate backup');
  const data = await add(await repo.readGraph(graph.id), 'A', 'a');
  const json = JSON.parse(await repo.exportGraph(graph.id));
  const bad = structuredClone(json); bad.snapshot.nodes[0].graphId = 'another-graph';
  await expect(repo.importGraph(JSON.stringify(bad))).rejects.toThrow('another graph');
  const unsafe = structuredClone(json); unsafe.snapshot.nodes[0].locator = { kind: 'web', url: 'javascript:alert(1)' };
  await expect(repo.importGraph(JSON.stringify(unsafe))).rejects.toThrow();
  await expect(repo.importGraph(JSON.stringify({ ...json, version: 99 }))).rejects.toThrow();
  expect(await db.graphs.count()).toBe(1);
  expect((await repo.readGraph(graph.id)).graph.contentRevision).toBe(data.graph.contentRevision);
});

test('connection semantics and card dimensions survive refresh, reopen and backup without changing base IDs', async () => {
  const graph = await repo.createGraph('Editable source connections');
  await repo.refreshScope(graph.id, 0, refresh());
  let data = await repo.readGraph(graph.id);
  const relation = data.relationships[0]!, node = data.nodes[0]!;
  const key = { graphId: graph.id, itemType: 'relationship' as const, itemId: relation.id };
  await repo.setPersonalEdit(key, data.graph.contentRevision, { notes: 'Keep this note' });
  data = await repo.readGraph(graph.id);
  await repo.saveConnection(key, data.graph.contentRevision, { label: 'Explains the evidence', relationshipKind: 'custom', direction: 'reverse' });
  await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: node.id }, { x: 300, y: 200, width: 345, height: 210 });
  await repo.savePosition({ graphId: graph.id, itemType: 'node', itemId: node.id }, { x: 420, y: 250 });
  data = await repo.readGraph(graph.id);
  await repo.refreshScope(graph.id, data.graph.contentRevision, refresh());
  const name = db.name; db.close(); db = new GraphDatabase(name); repo = new GraphRepository(db);
  data = await repo.readGraph(graph.id);
  expect(data.relationships.find((item) => item.id === relation.id)!.members).toEqual(relation.members);
  expect(effectiveConnection(relation, data.itemEdits)).toEqual({ label: 'Explains the evidence', relationshipKind: 'custom', direction: 'reverse' });
  expect(directedMembers(relation, data.itemEdits).find((member) => member.role === 'from')!.nodeId).toBe(relation.members.find((member) => member.role === 'to')!.nodeId);
  expect(data.itemEdits.find((item) => item.itemId === relation.id)).toMatchObject({ notes: 'Keep this note', createdAt: expect.any(Number), updatedAt: expect.any(Number) });
  expect(data.layoutItems.find((item) => item.itemId === node.id)).toMatchObject({ x: 420, y: 250, width: 345, height: 210 });
  const backup = await repo.exportGraph(graph.id), copyId = await repo.importGraph(backup), copy = await repo.readGraph(copyId);
  expect(copy.itemEdits.find((item) => item.itemType === 'relationship')).toMatchObject({ displayLabel: 'Explains the evidence', direction: 'reverse', relationshipKind: 'custom' });
  expect(copy.layoutItems.find((item) => item.width === 345)).toMatchObject({ height: 210 });
  await repo.saveConnection(key, data.graph.contentRevision, { label: '', relationshipKind: 'custom', direction: 'none' });
  data = await repo.readGraph(graph.id);
  expect(data.relationships.some((item) => item.id === relation.id)).toBe(true);
  expect(effectiveConnection(relation, data.itemEdits).label).toBe('');
  expect(directedMembers(relation, data.itemEdits).every((member) => member.role === 'peer')).toBe(true);
  await expect(repo.saveConnection({ ...key, itemType: 'node', itemId: node.id }, data.graph.contentRevision, { label: '', relationshipKind: 'custom', direction: 'none' })).rejects.toThrow('relationship');
  await expect(repo.setPersonalEdit({ ...key, itemType: 'node', itemId: node.id }, data.graph.contentRevision, { displayLabel: '' })).rejects.toThrow('titles');
  await expect(repo.savePosition({ ...key, itemType: 'node', itemId: node.id }, { x: 1, y: 2, width: -2 })).rejects.toThrow();
});
