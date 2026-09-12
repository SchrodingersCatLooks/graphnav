import { GraphRepository, importedKey } from '../storage/repository';
import { getAccountKey } from '../google/account';
import { importDocTabs, importDriveFolder } from '../google/import';
import { editorRequestSchema, scopeKey, type Catalog, type SourceContext } from './protocol';
import type { ScopedImport } from '../messages';

type Readers = { account: () => Promise<string>; read: (context: SourceContext, account: string) => Promise<ScopedImport> };
const readers: Readers = { account: getAccountKey, read: (context, account) => context.kind === 'drive' ? importDriveFolder(context.sourceId, account) : importDocTabs(context.sourceId, account) };

export class EditorService {
  private cache = new Map<string, { at: number; data: ScopedImport }>();
  constructor(private repository: GraphRepository, private sources: Readers = readers) {}
  private async source(context: SourceContext, force: boolean) {
    const account = await this.sources.account();
    const key = JSON.stringify([account, scopeKey(context)]), cached = this.cache.get(key);
    if (!force && cached && Date.now() - cached.at < 60_000) return cached.data;
    const data = await this.sources.read(context, account);
    if (data.accountKey !== account || data.scopeKey !== scopeKey(context)) throw new Error('The source response does not match the requested account and location.');
    this.cache.delete(key); this.cache.set(key, { at: Date.now(), data });
    if (this.cache.size > 10) this.cache.delete(this.cache.keys().next().value!);
    return data;
  }
  async handle(raw: unknown, ownPage = false): Promise<unknown> {
    const request = editorRequestSchema.parse(raw), repository = this.repository;
    const args = request.args;
    // On Google pages, do not expose another signed-in account's saved maps.
    const graphId = ['readGraph', 'addNode', 'editNode', 'connect', 'saveView', 'exportGraph', 'arrange'].includes(request.op) ? args[0] :
      ['saveConnection', 'setPersonalEdit', 'removeItem', 'savePosition'].includes(request.op) ? (args[0] as { graphId: string }).graphId : undefined;
    if (!ownPage && typeof graphId === 'string') {
      const graph = (await repository.readGraph(graphId)).graph;
      if (graph.accountScope && graph.accountScope !== await this.sources.account()) throw new Error('Connect the Google account that owns this map.');
    }
    switch (request.op) {
      case 'listGraphs': {
        const rows = await repository.listGraphs();
        if (ownPage) return rows;
        const account = await this.sources.account().catch(() => null);
        return rows.filter((graph) => !graph.accountScope || graph.accountScope === account);
      }
      case 'readGraph': return repository.readGraph(...request.args);
      case 'openPageMap': {
        const [context] = request.args, account = await this.sources.account();
        const find = async () => (await repository.listGraphs()).find((graph) => graph.accountScope === account && graph.createdVia === 'import' && graph.sourceBindings[0]?.key === scopeKey(context));
        const cached = await find();
        if (cached) return { graphId: cached.id, created: false };
        const source = await this.source(context, false);
        return repository.db.transaction('rw', repository.db.tables, async () => {
          const existing = await find();
          if (existing) return { graphId: existing.id, created: false };
          const graph = await repository.createGraph(source.title, crypto.randomUUID(), 'import');
          await repository.refreshScope(graph.id, graph.contentRevision, {
            scopeKey: source.scopeKey, accountKey: account, complete: source.complete, items: source.items,
            selection: { mode: 'baseline', memberKeys: source.items.map(importedKey), missingKeys: [] },
          });
          return { graphId: graph.id, created: true };
        });
      }
      case 'createGraph': return repository.createGraph(...request.args);
      case 'createContextMap': {
        const accountScope = await this.sources.account().catch(() => null);
        return repository.db.transaction('rw', repository.db.graphs, async () => {
          const [title, context] = request.args, graph = await repository.createGraph(title);
          await repository.db.graphs.update(graph.id, { accountScope, sourceBindings: [{ key: scopeKey(context), complete: false, refreshedAt: 0, mode: 'selected', memberKeys: [], missingKeys: [] }] });
          return graph.id;
        });
      }
      case 'attachSource': {
        const [context, graphId, revision, nodeId, key] = request.args;
        const source = await this.source(context, false), item = source.items.find((item) => importedKey(item) === key);
        if (!item) throw new Error('This source changed. Reload the source list.');
        return repository.attachSource(graphId, revision, nodeId, item);
      }
      case 'arrange': return repository.arrange(...request.args);
      case 'addNode': return repository.addNode(...request.args);
      case 'editNode': return repository.editNode(...request.args);
      case 'connect': return repository.connect(...request.args);
      case 'saveConnection': return repository.saveConnection(...request.args);
      case 'setPersonalEdit': return repository.setPersonalEdit(...request.args);
      case 'removeItem': return repository.removeItem(...request.args);
      case 'savePosition': return repository.savePosition(...request.args);
      case 'saveView': return repository.saveView(...request.args);
      case 'exportGraph': return repository.exportGraph(...request.args);
      case 'importGraph': return repository.importGraph(...request.args);
      case 'catalog': {
        const [context, refresh] = request.args;
        const source = await this.source(context, refresh);
        const byKey = new Map(source.items.map((item) => [importedKey(item), item]));
        const path = (key?: string): string => {
          const labels: string[] = [], seen = new Set<string>();
          while (key && !seen.has(key)) { seen.add(key); const parent = byKey.get(key); if (!parent) break; labels.unshift(parent.title); key = parent.parentKey; }
          return labels.join(' / ');
        };
        return { context, title: source.title, complete: source.complete, items: source.items.map((item) => ({ key: importedKey(item), title: item.title, kind: item.locator.kind === 'docs' && item.locator.tabId ? 'tab' : item.source.kind, locator: item.locator, parentKey: item.parentKey, path: path(item.parentKey) })) } satisfies Catalog;
      }
      case 'applySource': {
        const [context, target, revision, action, keys] = request.args;
        const source = await this.source(context, action === 'refresh');
        // All network work finishes before entering the atomic save transaction.
        return repository.db.transaction('rw', repository.db.tables, async () => {
          const bound = target ? (await repository.readGraph(target)).graph : (await repository.listGraphs()).find((g) => g.accountScope === source.accountKey && g.sourceBindings.some((b) => b.key === source.scopeKey));
          const graph = bound ?? await repository.createGraph(source.title, crypto.randomUUID(), 'import');
          if (graph.accountScope && graph.accountScope !== source.accountKey) throw new Error('This map belongs to a different Google account.');
          const old = await repository.readGraph(graph.id), binding = graph.sourceBindings.find((b) => b.key === source.scopeKey);
          const available = new Map(source.items.map((item) => [importedKey(item), item]));
          if (keys.some((key) => !available.has(key))) throw new Error('A selected source changed. Reload the source list and select it again.');
          if (action === 'selected' && !keys.length) throw new Error('Choose at least one source to add.');
          const mode = action === 'baseline' ? 'baseline' : binding?.mode ?? (binding ? 'baseline' : 'selected');
          const previous = binding?.memberKeys ?? (binding ? old.nodes.flatMap((n) => n.importKey && available.has(n.importKey) ? [n.importKey] : []) : []);
          const members = new Set([...previous, ...(mode === 'baseline' ? available.keys() : keys)]);
          const present = new Set([...members].filter((key) => available.has(key)));
          const items = source.items.filter((item) => present.has(importedKey(item))).map((item) => {
            // Selection never adds a parent implicitly or invents containment.
            if (!item.parentKey || present.has(item.parentKey)) return item;
            const { parentKey: _parent, ...withoutParent } = item; return withoutParent;
          });
          const missingKeys = source.complete ? [...members].filter((key) => !available.has(key)) : (binding?.missingKeys ?? []).filter((key) => !available.has(key));
          await repository.refreshScope(graph.id, target ? revision ?? -1 : graph.contentRevision, { scopeKey: source.scopeKey, accountKey: source.accountKey, complete: source.complete, items, selection: { mode, memberKeys: [...members], missingKeys } });
          return graph.id;
        });
      }
    }
  }
}
