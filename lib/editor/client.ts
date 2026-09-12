import { effectiveLabel, LIMITS } from '../graph/types';
import { browser } from 'wxt/browser';
import type { Catalog, EditorRepository, EditorRequest, SourceContext } from './protocol';

async function call<T>(op: EditorRequest['op'], args: unknown[]): Promise<T> {
  const response = await browser.runtime.sendMessage({ type: 'EDITOR', op, args });
  if (!response?.ok) throw new Error(response?.error ?? 'The extension did not respond. Reload GraphNav and this page, then retry.');
  return response.data as T;
}
// Only messages cross the page boundary. There is no page-origin database.
export const editorClient: EditorRepository = {
  listGraphs: () => call('listGraphs', []), readGraph: (id) => call('readGraph', [id]),
  createGraph: (title) => call('createGraph', [title]),
  addNode: (...args) => call('addNode', args), editNode: (...args) => call('editNode', args),
  connect: (...args) => call('connect', args), setPersonalEdit: (...args) => call('setPersonalEdit', args),
  removeItem: (...args) => call('removeItem', args), savePosition: (...args) => call('savePosition', args),
  saveView: (...args) => call('saveView', args), exportGraph: (id) => call('exportGraph', [id]),
  importGraph: (json) => call('importGraph', [json]),
};
const source = ({ kind, sourceId }: SourceContext): SourceContext => ({ kind, sourceId });
export const readCatalog = (context: SourceContext, refresh = false) => call<Catalog>('catalog', [source(context), refresh]);
export const applySource = (context: SourceContext, graphId: string | null, revision: number | null, mode: 'selected' | 'baseline' | 'refresh', keys: string[] = []) => call<string>('applySource', [source(context), graphId, revision, mode, keys]);
export const attachSource = (context: SourceContext, graphId: string, revision: number, nodeId: string, key: string) => call<void>('attachSource', [source(context), graphId, revision, nodeId, key]);
export const createContextMap = (title: string, context: SourceContext) => call<string>('createContextMap', [title, source(context)]);
export async function arrangeMap(graphId: string, revision: number, newOnly = false) {
  const { sourceLayout } = await import('./layout');
  const snapshot = await editorClient.readGraph(graphId);
  if (snapshot.graph.contentRevision !== revision) throw new Error('This map changed. Reload before arranging it.');
  const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
  const ids = new Set(snapshot.nodes.filter((node) => !hidden.has(node.id)).sort((a, b) => effectiveLabel(a, snapshot.itemEdits).localeCompare(effectiveLabel(b, snapshot.itemEdits), undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id)).map((node) => node.id));
  const relations = snapshot.relationships.filter((r) => !hidden.has(r.id) && r.members.every((m) => ids.has(m.nodeId)));
  const junctions = relations.filter((r) => r.members.length > 2).map((r) => r.id);
  const links = relations.flatMap((r) => r.members.length === 2 ? [{ from: (r.members.find((m) => m.role === 'from') ?? r.members[0]!).nodeId, to: (r.members.find((m) => m.role === 'to') ?? r.members[1]!).nodeId }] : r.members.map((m) => ({ from: m.role === 'to' ? r.id : m.nodeId, to: m.role === 'to' ? m.nodeId : r.id })));
  const positions = new Map<string, { x: number; y: number }>();
  const allIds = [...ids, ...junctions];
  let top = 0;
  // Bound each layout calculation to the same size as a canvas page.
  for (let offset = 0; offset < allIds.length; offset += LIMITS.visibleNodes) {
    const batch = await sourceLayout(allIds.slice(offset, offset + LIMITS.visibleNodes), links);
    for (const [id, point] of batch) positions.set(id, { x: point.x, y: point.y + top });
    top += Math.max(0, ...[...batch.values()].map((point) => point.y)) + 180;
  }
  const fixed = snapshot.layoutItems.filter((p) => p.pinned || newOnly), fixedIds = new Set(fixed.map((p) => p.itemId));
  const occupied = fixed.map((p) => ({ x: p.x, y: p.y }));
  const placed = [...positions].filter(([id]) => !fixedIds.has(id)).map(([itemId, point]) => {
    while (occupied.some((p) => Math.abs(p.x - point.x) < 210 && Math.abs(p.y - point.y) < 100)) point.x += 230;
    occupied.push(point);
    return { itemId, itemType: ids.has(itemId) ? 'node' : 'relationship', ...point };
  });
  await call<void>('arrange', [graphId, revision, placed, newOnly]);
}
