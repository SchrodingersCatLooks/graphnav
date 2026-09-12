import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, importedKey } from '../lib/storage/repository';
import { EditorService } from '../lib/editor/service';
import type { ScopedImport } from '../lib/messages';
import type { Catalog } from '../lib/editor/protocol';

let db: GraphDatabase, repo: GraphRepository, service: EditorService, account: string, source: ScopedImport;
const context = { kind: 'drive', sourceId: 'root-folder' };
const item = (id: string, title: string) => ({ source: { provider: 'google-drive' as const, accountKey: account, resourceId: id, kind: 'folder' as const, title }, locator: { kind: 'drive' as const, fileId: id }, title });
const call = (op: string, args: unknown[] = [], ownPage = true) => service.handle({ type: 'EDITOR', op, args }, ownPage);
test.beforeEach(() => {
  db = new GraphDatabase('editor-service-' + crypto.randomUUID()); repo = new GraphRepository(db); account = 'fixture-account';
  const root = item('root-folder', 'Root');
  source = { scopeKey: 'drive:folder:root-folder', title: 'Root', accountKey: account, complete: true, items: [root, ...['one', 'two'].map((id) => ({ ...item(id, 'Same title'), parentKey: importedKey(root) }))] };
  service = new EditorService(repo, { account: async () => account, read: async () => structuredClone(source) });
});
test.afterEach(async () => { await db.delete(); });

test('selected-only refresh preserves identities, personal work, and membership after worker restart', async () => {
  const catalog = await call('catalog', [context, false]) as Catalog;
  expect(catalog.items[1]!.path).toBe('Root');
  expect(catalog.items[1]!.key).not.toBe(catalog.items[2]!.key);
  const keys = [catalog.items[0]!.key, catalog.items[1]!.key];
  const id = await call('applySource', [context, null, null, 'selected', keys]) as string;
  let saved = await repo.readGraph(id);
  const selectedId = saved.nodes.find((n) => n.importKey === keys[1])!.id;
  await repo.setPersonalEdit({ graphId: id, itemType: 'node', itemId: selectedId }, saved.graph.contentRevision, { displayLabel: 'My label', notes: 'Keep this note' });
  await repo.savePosition({ graphId: id, itemType: 'node', itemId: selectedId }, { x: 710, y: -22 });
  saved = await repo.readGraph(id);
  await repo.addNode(id, saved.graph.contentRevision, { id: 'idea', label: 'Launch', position: { x: 0, y: 0 } });
  saved = await repo.readGraph(id);
  await repo.connect(id, saved.graph.contentRevision, { id: 'link', label: 'supports', members: [{ nodeId: selectedId, role: 'from' }, { nodeId: 'idea', role: 'to' }] });
  source.items[1]!.title = 'Renamed by owner';
  source.items.push({ ...item('new', 'New unselected folder'), parentKey: keys[0] });
  service = new EditorService(repo, { account: async () => account, read: async () => structuredClone(source) });
  saved = await repo.readGraph(id);
  await call('applySource', [context, id, saved.graph.contentRevision, 'refresh', []]);
  saved = await repo.readGraph(id);
  expect(saved.nodes).toHaveLength(3);
  expect(saved.nodes.find((n) => n.id === selectedId)?.baseLabel).toBe('Renamed by owner');
  expect(saved.itemEdits[0]).toMatchObject({ displayLabel: 'My label', notes: 'Keep this note' });
  expect(saved.layoutItems.find((l) => l.itemId === selectedId)).toMatchObject({ x: 710, y: -22, pinned: true });
  expect(saved.relationships.find((r) => r.id === 'link')?.baseLabel).toBe('supports');
  source.items = [source.items[0]!];
  await call('applySource', [context, id, saved.graph.contentRevision, 'refresh', []]);
  saved = await repo.readGraph(id);
  expect(saved.graph.sourceBindings[0]!.missingKeys).toEqual([keys[1]]);
  expect(saved.nodes.some((n) => n.id === selectedId)).toBe(true);
  expect(saved.relationships).toHaveLength(1); // Removed containment, preserved personal link.
});

test('baseline, partial reads, and repeated selections do not duplicate or silently remove sources', async () => {
  const id = await call('applySource', [context, null, null, 'baseline', []]) as string;
  let saved = await repo.readGraph(id);
  const ids = saved.nodes.map((n) => n.id).sort();
  source.complete = false; source.items = [source.items[0]!];
  await call('applySource', [context, id, saved.graph.contentRevision, 'refresh', []]);
  saved = await repo.readGraph(id);
  expect(saved.nodes.map((n) => n.id).sort()).toEqual(ids);
  expect(saved.relationships).toHaveLength(2);
  expect(saved.graph.sourceBindings[0]!.missingKeys).toEqual([]);
  await call('applySource', [context, id, saved.graph.contentRevision, 'selected', [importedKey(source.items[0]!)]]);
  expect((await repo.readGraph(id)).nodes).toHaveLength(3);
});

test('new import failure rolls back the whole graph, sources, and nodes', async () => {
  db.nodes.hook('creating', () => { throw new DOMException('Full', 'QuotaExceededError'); });
  await expect(call('applySource', [context, null, null, 'baseline', []])).rejects.toThrow('Full');
  expect(await repo.listGraphs()).toEqual([]);
  expect(await db.sources.count()).toBe(0);
});

test('source metadata comes from the reader, requests are validated, and accounts stay isolated', async () => {
  await expect(call('applySource', [context, null, null, 'selected', ['invented']])).rejects.toThrow('selected source changed');
  await expect(call('catalog', [{ kind: 'drive', sourceId: "bad'query" }, false])).rejects.toThrow();
  const first = await call('applySource', [context, null, null, 'baseline', []]) as string;
  account = 'other-account';
  source = { ...source, accountKey: account, items: source.items.map((i) => ({ ...i, source: { ...i.source, accountKey: account }, parentKey: undefined })) };
  await expect(call('readGraph', [first], false)).rejects.toThrow('account that owns');
  const second = await call('applySource', [context, null, null, 'baseline', []]) as string;
  expect(first).not.toBe(second);
  expect((await call('listGraphs', [], false) as { id: string }[]).map((g) => g.id)).toEqual([second]);
  await expect(call('applySource', [context, first, 1, 'baseline', []])).rejects.toThrow('different Google account');
});

test('a personal node can attach a chosen source without changing its label, notes, or identity', async () => {
  const id = await call('createContextMap', ['My project', context]) as string;
  await call('addNode', [id, 0, { id: 'idea', label: 'My idea', body: 'My notes', position: { x: 30, y: 40 } }]);
  const catalog = await call('catalog', [context, false]) as Catalog;
  await call('attachSource', [context, id, 1, 'idea', catalog.items[1]!.key]);
  const saved = await repo.readGraph(id);
  expect(saved.nodes).toHaveLength(1);
  expect(saved.nodes[0]).toMatchObject({ id: 'idea', baseLabel: 'My idea', body: 'My notes', origin: 'manual', locator: { kind: 'drive', fileId: 'one' } });
  expect(saved.graph.sourceBindings[0]!.mode).toBe('selected');
  expect(saved.sources).toHaveLength(1);
  expect(JSON.parse(await repo.exportGraph(id)).snapshot.nodes[0].id).toBe('idea');
});

test('arranging skips saved pins and a stale source import cannot change membership', async () => {
  const id = await call('applySource', [context, null, null, 'baseline', []]) as string;
  const saved = await repo.readGraph(id), node = saved.nodes[0]!;
  await repo.savePosition({ graphId: id, itemType: 'node', itemId: node.id }, { x: 600, y: 300 });
  await call('arrange', [id, saved.graph.contentRevision, [{ itemId: node.id, itemType: 'node', x: 0, y: 0 }], false]);
  expect((await repo.readGraph(id)).layoutItems[0]).toMatchObject({ x: 600, y: 300, pinned: true });
  await expect(call('applySource', [context, id, 0, 'selected', [importedKey(source.items[0]!)]] )).rejects.toThrow('changed in another tab');
  expect((await repo.readGraph(id)).graph.sourceBindings).toEqual(saved.graph.sourceBindings);
});

test('the page map is separate from personal maps, reused without refetching, and created once across concurrent opens', async () => {
  const personal = await call('createContextMap', ['Personal project', context]) as string;
  await call('addNode', [personal, 0, { id: 'idea', label: 'Keep this idea', position: { x: 25, y: 35 } }]);
  const [first, second] = await Promise.all([call('openPageMap', [context]), call('openPageMap', [context])]) as { graphId: string; created: boolean }[];
  expect(first!.graphId).toBe(second!.graphId);
  expect(first!.graphId).not.toBe(personal);
  const snapshot = await repo.readGraph(first!.graphId);
  expect(snapshot.nodes).toHaveLength(3);
  expect((await repo.readGraph(personal)).nodes).toHaveLength(1);
  await repo.setPersonalEdit({ graphId: first!.graphId, itemType: 'node', itemId: snapshot.nodes[0]!.id }, snapshot.graph.contentRevision, { displayLabel: 'My root', notes: 'Keep this' });
  const offlineSource = new EditorService(repo, { account: async () => account, read: async () => { throw new Error('Source request unavailable'); } });
  const restored = await offlineSource.handle({ type: 'EDITOR', op: 'openPageMap', args: [context] });
  expect(restored).toEqual({ graphId: first!.graphId, created: false });
  expect((await repo.readGraph(first!.graphId)).itemEdits[0]).toMatchObject({ displayLabel: 'My root', notes: 'Keep this' });
});

test('a new context map belongs to its connected account before any source import', async () => {
  const id = await call('createContextMap', ['Private idea', context]) as string;
  await call('addNode', [id, 0, { id: 'private-node', label: 'My idea', position: { x: 0, y: 0 } }]);
  account = 'other-account';
  expect((await call('listGraphs', [], false) as { id: string }[]).map((graph) => graph.id)).not.toContain(id);
  await expect(call('readGraph', [id], false)).rejects.toThrow('account that owns');
});
