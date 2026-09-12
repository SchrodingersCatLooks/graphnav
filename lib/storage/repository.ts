import { z } from 'zod';
import { GraphDatabase } from './database';
import {
  LIMITS, backupSchema, graphSchema, snapshotSchema, itemKeySchema, editValuesSchema,
  newNodeSchema, newRelationshipSchema, pointSchema, viewSchema, membersSchema,
  sourceInputSchema, locatorSchema, sourceKey, locatorKey,
  type Graph, type GraphNode, type GraphSnapshot, type ItemKey,
  type Locator, type Relationship, type Source, type SourceInput,
} from '../graph/types';

export class ConflictError extends Error {
  constructor() { super('This map changed in another tab. Reload the saved map before editing again.'); this.name = 'ConflictError'; }
}
function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
const stamp = () => ({ createdAt: Date.now(), updatedAt: Date.now() });
const itemTuple = (key: ItemKey): [string, string, string] => [key.graphId, key.itemType, key.itemId];
const importItemSchema = z.object({ source: sourceInputSchema, locator: locatorSchema, title: z.string().trim().min(1).max(200), parentKey: z.string().max(1500).optional() }).strict();
const refreshSchema = z.object({ scopeKey: z.string().min(1).max(300), accountKey: z.string().min(1).max(300), complete: z.boolean(), items: z.array(importItemSchema).max(LIMITS.nodes) }).strict();
export type ImportedItem = z.infer<typeof importItemSchema>;
export function importedKey(item: Pick<ImportedItem, 'source' | 'locator'>): string {
  return JSON.stringify([sourceKey(item.source), locatorKey(item.locator)]);
}
function validateLocatorSource(locator: Locator, source: SourceInput) {
  const matches = (locator.kind === 'drive' && source.provider === 'google-drive' && locator.fileId === source.resourceId) ||
    (locator.kind === 'docs' && source.provider === 'google-docs' && locator.documentId === source.resourceId) ||
    (locator.kind === 'pdf' && source.provider === 'local-pdf' && locator.fingerprint === source.resourceId);
  if (!matches) throw new Error('The destination does not match its source.');
}

// This validates imported backups as well as repository invariants. Zod handles
// shape/size checks; these checks establish the relationships between records.
export function validateSnapshot(value: unknown): GraphSnapshot {
  const data = snapshotSchema.parse(value);
  const { graph, sources, nodes, relationships, itemEdits, layoutItems } = data;
  const unique = (values: string[]) => { if (new Set(values).size !== values.length) throw new Error('Duplicate record IDs or import keys.'); };
  for (const records of [sources, nodes, relationships]) unique(records.map((r) => r.id));
  unique(sources.map((s) => s.sourceKey));
  unique([...nodes, ...relationships].map((r) => r.id));
  unique(graph.sourceBindings.map((s) => s.key));
  for (const records of [nodes, relationships]) unique(records.flatMap((r) => r.importKey === undefined ? [] : [r.importKey]));
  for (const records of [itemEdits, layoutItems]) unique(records.map((r) => JSON.stringify(itemTuple(r))));
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const relationMap = new Map(relationships.map((r) => [r.id, r]));
  for (const source of sources) {
    if (source.sourceKey !== sourceKey(source)) throw new Error('Invalid source identity.');
    if (source.provider !== 'local-pdf' && source.accountKey !== graph.accountScope) throw new Error('Source belongs to another account.');
  }
  for (const item of [...nodes, ...relationships, ...itemEdits, ...layoutItems]) {
    if (item.graphId !== graph.id) throw new Error('An item belongs to another graph.');
  }
  for (const node of nodes) {
    if (node.origin === 'manual' && node.importKey !== undefined) throw new Error('Personal nodes cannot use imported identity.');
    if (node.sourceId) {
      const source = requireValue(sourceMap.get(node.sourceId), 'A node references a missing source.');
      validateLocatorSource(requireValue(node.locator, 'A source node needs a destination.'), source);
      if (node.origin === 'imported' && node.importKey !== importedKey({ source, locator: node.locator! })) throw new Error('Invalid imported node identity.');
    } else if (node.origin === 'imported' || node.kind === 'source' || (node.locator && node.locator.kind !== 'web')) throw new Error('This node needs a source record.');
  }
  for (const relation of relationships) {
    if (relation.members.some((m) => !nodeMap.has(m.nodeId))) throw new Error('A relationship references a missing node.');
    if (relation.origin === 'imported') {
      if (relation.kind !== 'contains' || !relation.scopeKey || relation.members.length !== 2 || relation.members[0]!.role !== 'from' || relation.members[1]!.role !== 'to') throw new Error('Invalid imported containment.');
      if (relation.importKey !== JSON.stringify([relation.scopeKey, 'contains', relation.members[0]!.nodeId, relation.members[1]!.nodeId])) throw new Error('Invalid imported relationship identity.');
    } else if (relation.importKey !== undefined || relation.scopeKey !== undefined) throw new Error('Personal relationships cannot use imported identity.');
    if (JSON.stringify(relation.memberNodeIds) !== JSON.stringify(relation.members.map((m) => m.nodeId))) throw new Error('Invalid relationship lookup index.');
  }
  for (const edit of [...itemEdits, ...layoutItems]) {
    if (!(edit.itemType === 'node' ? nodeMap.has(edit.itemId) : relationMap.has(edit.itemId))) throw new Error('Saved edits or layout reference a missing item.');
  }
  for (const item of [...nodes, ...relationships]) for (const evidence of item.evidence) {
    validateLocatorSource(evidence.locator, requireValue(sourceMap.get(evidence.sourceId), 'Missing evidence source.'));
  }
  return data;
}

export class GraphRepository {
  readonly db: GraphDatabase;
  constructor(db = new GraphDatabase()) { this.db = db; }
  private tables() { return [this.db.graphs, this.db.sources, this.db.nodes, this.db.relationships, this.db.itemEdits, this.db.layoutItems]; }
  private async graph(id: string) { return requireValue(await this.db.graphs.get(id), 'This map no longer exists.'); }
  private async mutate<T>(id: string, revision: number, action: (graph: Graph) => Promise<T>): Promise<T> {
    return this.db.transaction('rw', this.tables(), async () => {
      const graph = await this.graph(id);
      if (graph.contentRevision !== revision) throw new ConflictError();
      const result = await action(graph);
      await this.db.graphs.put({ ...graph, contentRevision: graph.contentRevision + 1, updatedAt: Date.now() });
      return result;
    });
  }
  async listGraphs(): Promise<Graph[]> { return this.db.graphs.orderBy('updatedAt').reverse().toArray(); }
  // createdVia is optional and defaults to 'manual' so existing callers are
  // unchanged. An imported map must not claim to be a personal creation.
  async createGraph(title: string, id: string = crypto.randomUUID(), createdVia: Graph['createdVia'] = 'manual'): Promise<Graph> {
    const graph = graphSchema.parse({ id, title, createdVia, accountScope: null, contentRevision: 0, view: { x: 0, y: 0, zoom: 1 }, sourceBindings: [], ...stamp() });
    await this.db.graphs.add(graph);
    return graph;
  }
  /**
   * Records whether a source's target still resolves. Marking is deliberately
   * separate from refreshScope: absence from a folder listing is not proof a
   * file was deleted, so only a direct check may declare a target unavailable.
   */
  async markSourceAvailability(sourceKey: string, availability: Source['availability']) {
    const source = await this.db.sources.where('sourceKey').equals(sourceKey).first();
    if (!source || source.availability === availability) return false;
    await this.db.sources.put({ ...source, availability, updatedAt: Date.now() });
    return true;
  }

  async readGraph(id: string): Promise<GraphSnapshot> {
    return this.db.transaction('r', this.tables(), async () => {
      const graph = await this.graph(id);
      const nodes = await this.db.nodes.where('graphId').equals(id).toArray();
      const relationships = await this.db.relationships.where('graphId').equals(id).toArray();
      const sourceIds = new Set(nodes.flatMap((n) => n.sourceId ? [n.sourceId] : []));
      for (const item of [...nodes, ...relationships]) for (const evidence of item.evidence) sourceIds.add(evidence.sourceId);
      const sources = (await this.db.sources.bulkGet([...sourceIds])).map((s) => requireValue(s, 'A saved source is missing.'));
      return { graph, nodes, sources, relationships, itemEdits: await this.db.itemEdits.where('graphId').equals(id).toArray(), layoutItems: await this.db.layoutItems.where('graphId').equals(id).toArray() };
    });
  }
  async renameGraph(id: string, revision: number, title: string) {
    const checked = graphSchema.shape.title.parse(title);
    return this.mutate(id, revision, async (graph) => { graph.title = checked; });
  }
  async addNode(graphId: string, revision: number, input: z.input<typeof newNodeSchema>): Promise<string> {
    const value = newNodeSchema.parse(input);
    if (value.locator && value.locator.kind !== 'web') throw new Error('Source nodes must be added by the source adapter.');
    return this.mutate(graphId, revision, async () => {
      if (await this.db.nodes.where('graphId').equals(graphId).count() >= LIMITS.nodes) throw new Error(`This prototype supports ${LIMITS.nodes} stored nodes per map.`);
      if (await this.db.relationships.get(value.id)) throw new Error('This item ID is already used.');
      const node: GraphNode = { id: value.id, graphId, kind: 'idea', origin: 'manual', baseLabel: value.label, body: value.body, evidence: [], ...stamp(), ...(value.locator ? { locator: value.locator } : {}) };
      await this.db.nodes.add(node);
      await this.db.layoutItems.add({ graphId, itemType: 'node', itemId: node.id, ...value.position, pinned: false, ...stamp() });
      return node.id;
    });
  }
  async editNode(graphId: string, revision: number, nodeId: string, input: { label: string; body: string; url?: string }) {
    const parsed = newNodeSchema.parse({ id: nodeId, label: input.label, body: input.body, locator: input.url ? { kind: 'web', url: input.url } : undefined, position: { x: 0, y: 0 } });
    return this.mutate(graphId, revision, async () => {
      const node = await this.nodeInGraph(graphId, nodeId);
      if (node.origin !== 'manual' || node.sourceId) throw new Error('Use personal overrides to annotate imported nodes.');
      const { locator: _old, ...base } = node;
      await this.db.nodes.put({ ...base, baseLabel: parsed.label, body: parsed.body, ...(parsed.locator ? { locator: parsed.locator } : {}), updatedAt: Date.now() });
    });
  }
  private async nodeInGraph(graphId: string, id: string) {
    const node = requireValue(await this.db.nodes.get(id), 'Node not found.');
    if (node.graphId !== graphId) throw new Error('Node belongs to another map.');
    return node;
  }
  private async itemExists(key: ItemKey) {
    const item = key.itemType === 'node' ? await this.db.nodes.get(key.itemId) : await this.db.relationships.get(key.itemId);
    if (!item || item.graphId !== key.graphId) throw new Error('Item not found in this map.');
    return item;
  }
  async connect(graphId: string, revision: number, input: z.infer<typeof newRelationshipSchema>) {
    const value = newRelationshipSchema.parse(input);
    return this.mutate(graphId, revision, async () => {
      if (await this.db.relationships.where('graphId').equals(graphId).count() >= LIMITS.relationships) throw new Error('This map has reached the relationship limit.');
      if (await this.db.nodes.get(value.id)) throw new Error('This item ID is already used.');
      for (const member of value.members) await this.nodeInGraph(graphId, member.nodeId);
      await this.db.relationships.add({ id: value.id, graphId, members: value.members, memberNodeIds: value.members.map((m) => m.nodeId), kind: 'personal', origin: 'manual', baseLabel: value.label, evidence: [], ...stamp() });
      return value.id;
    });
  }
  async setPersonalEdit(keyInput: ItemKey, revision: number, values: z.infer<typeof editValuesSchema>) {
    const key = itemKeySchema.parse(keyInput);
    const edits = editValuesSchema.parse(values);
    return this.mutate(key.graphId, revision, async () => {
      await this.itemExists(key);
      const old = await this.db.itemEdits.get(itemTuple(key));
      // Replace the override values so omitted fields can revert to source defaults.
      await this.db.itemEdits.put({ ...key, ...stamp(), createdAt: old?.createdAt ?? Date.now(), ...edits });
    });
  }
  async removeItem(keyInput: ItemKey, revision: number) {
    const key = itemKeySchema.parse(keyInput);
    return this.mutate(key.graphId, revision, async () => {
      const item = await this.itemExists(key);
      if (item.origin === 'imported') {
        const old = await this.db.itemEdits.get(itemTuple(key));
        await this.db.itemEdits.put({ ...stamp(), ...old, ...key, hidden: true, updatedAt: Date.now() });
        return;
      }
      if (key.itemType === 'node') {
        const relations = await this.db.relationships.where('memberNodeIds').equals(key.itemId).toArray();
        for (const relation of relations) {
          const members = relation.members.filter((m) => m.nodeId !== key.itemId);
          if (membersSchema.safeParse(members).success) await this.db.relationships.put({ ...relation, members, memberNodeIds: members.map((m) => m.nodeId), updatedAt: Date.now() });
          else await this.deleteRelation(relation);
        }
        await this.db.nodes.delete(key.itemId);
      } else await this.db.relationships.delete(key.itemId);
      await this.db.itemEdits.delete(itemTuple(key));
      await this.db.layoutItems.delete(itemTuple(key));
    });
  }
  private async deleteRelation(relation: Relationship) {
    await this.db.relationships.delete(relation.id);
    const key: [string, string, string] = [relation.graphId, 'relationship', relation.id];
    await this.db.itemEdits.delete(key);
    await this.db.layoutItems.delete(key);
  }
  async savePosition(keyInput: ItemKey, point: { x: number; y: number }) {
    const key = itemKeySchema.parse(keyInput), position = pointSchema.parse(point);
    await this.db.transaction('rw', this.tables(), async () => {
      await this.graph(key.graphId);
      await this.itemExists(key);
      const previous = await this.db.layoutItems.get(itemTuple(key));
      await this.db.layoutItems.put({ ...key, ...position, ...stamp(), createdAt: previous?.createdAt ?? Date.now(), pinned: true });
    });
  }
  async saveView(graphId: string, view: Graph['view']) {
    const checked = viewSchema.parse(view);
    await this.db.transaction('rw', this.db.graphs, async () => {
      await this.graph(graphId);
      await this.db.graphs.update(graphId, { view: checked });
    });
  }

  // Eddy calls this only after authorized reads. No fetch/model call occurs
  // inside a transaction. A partial page can upsert, but cannot remove links.
  async refreshScope(graphId: string, revision: number, input: z.infer<typeof refreshSchema>) {
    const request = refreshSchema.parse(input);
    const keys = request.items.map(importedKey);
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate source items in a refresh.');
    for (const item of request.items) {
      validateLocatorSource(item.locator, item.source);
      if (item.source.accountKey !== request.accountKey) throw new Error('Refresh mixes accounts.');
    }
    return this.mutate(graphId, revision, async (graph) => {
      if (request.accountKey !== 'local') {
        if (graph.accountScope && graph.accountScope !== request.accountKey) throw new Error('This map belongs to a different Google account.');
        graph.accountScope = request.accountKey;
      }
      const importedNodes = new Map<string, GraphNode>();
      for (const [index, item] of request.items.entries()) {
        const identity = sourceKey(item.source);
        const oldSource = await this.db.sources.where('sourceKey').equals(identity).first();
        const source: Source = { ...item.source, id: oldSource?.id ?? crypto.randomUUID(), sourceKey: identity, availability: 'available', ...stamp(), createdAt: oldSource?.createdAt ?? Date.now() };
        await this.db.sources.put(source);
        const oldNode = await this.db.nodes.where('[graphId+importKey]').equals([graphId, keys[index]!]).first();
        const node: GraphNode = { id: oldNode?.id ?? crypto.randomUUID(), graphId, kind: 'source', origin: 'imported', baseLabel: item.title, body: '', sourceId: source.id, locator: item.locator, importKey: keys[index]!, evidence: [], ...stamp(), createdAt: oldNode?.createdAt ?? Date.now() };
        await this.db.nodes.put(node);
        importedNodes.set(keys[index]!, node);
      }
      if (await this.db.nodes.where('graphId').equals(graphId).count() > LIMITS.nodes) throw new Error('Import exceeds this prototype’s node limit.');
      const retained = new Set<string>();
      for (const item of request.items) if (item.parentKey) {
        const child = importedNodes.get(importedKey(item))!;
        const parent = importedNodes.get(item.parentKey) ?? await this.db.nodes.where('[graphId+importKey]').equals([graphId, item.parentKey]).first();
        if (!parent || parent.id === child.id) throw new Error('Imported parent is missing or invalid.');
        const key = JSON.stringify([request.scopeKey, 'contains', parent.id, child.id]);
        const previous = await this.db.relationships.where('[graphId+importKey]').equals([graphId, key]).first();
        const relationship: Relationship = { id: previous?.id ?? crypto.randomUUID(), graphId, members: [{ nodeId: parent.id, role: 'from' }, { nodeId: child.id, role: 'to' }], memberNodeIds: [parent.id, child.id], kind: 'contains', origin: 'imported', baseLabel: 'contains', scopeKey: request.scopeKey, importKey: key, evidence: [], ...stamp(), createdAt: previous?.createdAt ?? Date.now() };
        await this.db.relationships.put(relationship);
        retained.add(relationship.id);
      }
      if (request.complete) for (const relation of await this.db.relationships.where('[graphId+scopeKey]').equals([graphId, request.scopeKey]).toArray()) {
        if (!retained.has(relation.id)) await this.deleteRelation(relation);
      }
      if (await this.db.relationships.where('graphId').equals(graphId).count() > LIMITS.relationships) throw new Error('Import exceeds this prototype’s relationship limit.');
      const binding = { key: request.scopeKey, complete: request.complete, refreshedAt: Date.now() };
      graph.sourceBindings = [...graph.sourceBindings.filter((s) => s.key !== request.scopeKey), binding];
      graphSchema.parse(graph);
      // Missing children may have moved. Keep their nodes and personal links;
      // absence from a folder is not proof the underlying file was deleted.
    });
  }
  async exportGraph(id: string): Promise<string> {
    const snapshot = validateSnapshot(await this.readGraph(id));
    const json = JSON.stringify({ format: 'graphnav', version: 1, snapshot }, null, 2);
    if (new TextEncoder().encode(json).byteLength > LIMITS.exportBytes) throw new Error('This map exceeds the current 5 MB backup limit.');
    return json;
  }
  async importGraph(json: string): Promise<string> {
    if (new TextEncoder().encode(json).byteLength > LIMITS.exportBytes) throw new Error('Backup exceeds the 5 MB limit.');
    const snapshot = validateSnapshot(backupSchema.parse(JSON.parse(json)).snapshot);
    const graphId = crypto.randomUUID();
    const ids = new Map([...snapshot.nodes, ...snapshot.relationships].map((item) => [item.id, crypto.randomUUID()]));
    return this.db.transaction('rw', this.tables(), async () => {
      const sourceIds = new Map<string, string>();
      for (const source of snapshot.sources) {
        const existing = await this.db.sources.where('sourceKey').equals(source.sourceKey).first();
        const newId = existing?.id ?? crypto.randomUUID();
        sourceIds.set(source.id, newId);
        // Import must not roll back shared source metadata to the backup's version.
        if (!existing) await this.db.sources.add({ ...source, id: newId });
      }
      const remapEvidence = (item: GraphNode | Relationship) => item.evidence.map((e) => ({ ...e, sourceId: sourceIds.get(e.sourceId)! }));
      const nodes = snapshot.nodes.map((node) => ({ ...node, id: ids.get(node.id)!, graphId, ...(node.sourceId ? { sourceId: sourceIds.get(node.sourceId)! } : {}), evidence: remapEvidence(node), ...stamp() }));
      const relationships = snapshot.relationships.map((relation) => {
        const members = relation.members.map((m) => ({ ...m, nodeId: ids.get(m.nodeId)! }));
        const importKey = relation.origin === 'imported' && relation.scopeKey ? JSON.stringify([relation.scopeKey, 'contains', members[0]!.nodeId, members[1]!.nodeId]) : relation.importKey;
        return { ...relation, id: ids.get(relation.id)!, graphId, members, memberNodeIds: members.map((m) => m.nodeId), ...(importKey ? { importKey } : {}), evidence: remapEvidence(relation), ...stamp() };
      });
      await this.db.graphs.add({ ...snapshot.graph, id: graphId, title: snapshot.graph.title.slice(0, 193) + ' (copy)', contentRevision: 0, ...stamp() });
      await this.db.nodes.bulkAdd(nodes);
      await this.db.relationships.bulkAdd(relationships);
      await this.db.itemEdits.bulkAdd(snapshot.itemEdits.map((edit) => ({ ...edit, graphId, itemId: ids.get(edit.itemId)!, ...stamp() })));
      await this.db.layoutItems.bulkAdd(snapshot.layoutItems.map((layout) => ({ ...layout, graphId, itemId: ids.get(layout.itemId)!, ...stamp() })));
      return graphId;
    });
  }
}

export function storageError(error: unknown): string {
  if (error instanceof z.ZodError) return 'Invalid graph data: ' + (error.issues[0]?.message ?? 'Invalid input.');
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'Your browser could not save this change because storage is full. Export your saved map and free space before retrying.';
  if (error instanceof Error && ['DatabaseClosedError', 'VersionError', 'UpgradeError'].includes(error.name)) return 'The database needs attention after an update. Reload this workspace; do not clear saved data.';
  return error instanceof Error ? error.message : 'The change could not be saved. Please retry.';
}
