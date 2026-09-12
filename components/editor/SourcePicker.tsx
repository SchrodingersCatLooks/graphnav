import { useEffect, useRef, useState } from 'react';
import { applySource, readCatalog } from '../../lib/editor/client';
import { scopeKey, type Candidate, type Catalog, type SourceContext } from '../../lib/editor/protocol';
import { locatorKey, type GraphSnapshot, type GraphNode } from '../../lib/graph/types';
import { getPageContext } from '../../lib/page-context';
import { nameMatch } from '../../lib/editor/name-match';
import { BatchSourcePicker } from './BatchSourcePicker';

type Props = { context: SourceContext; snapshot: GraphSnapshot | null; selectedNode?: GraphNode; busy: boolean; authEpoch: number; onFocus: (id: string) => void; apply: (action: (snapshot: GraphSnapshot | null) => Promise<string | void>) => Promise<boolean> };
type Row = { item: Candidate; catalog: Catalog; depth: number };
function childContext(item: Candidate): SourceContext | undefined {
  if (item.locator.kind === 'drive') {
    if (item.kind === 'folder') return { kind: 'drive', sourceId: item.locator.fileId };
    const linked = item.locator.webViewLink ? getPageContext(item.locator.webViewLink) : null;
    if (linked?.kind === 'docs' && linked.sourceId === item.locator.fileId) return { kind: 'docs', sourceId: linked.sourceId };
  }
}
export function SourcePicker(props: Props) {
  const { context, snapshot, busy, authEpoch, apply, onFocus } = props;
  const [catalogs, setCatalogs] = useState<Map<string, Catalog>>(new Map()), [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set()), [error, setError] = useState(''), [query, setQuery] = useState(''), [limit, setLimit] = useState(40), [batch, setBatch] = useState(false);
  const epoch = useRef(0), pending = useRef(new Map<string, Promise<Catalog | undefined>>());
  const rootScope = scopeKey(context), root = catalogs.get(rootScope);
  async function read(source: SourceContext, force = false) {
    const key = scopeKey(source), generation = epoch.current;
    if (!force && catalogs.has(key)) return catalogs.get(key);
    if (pending.current.has(key)) return pending.current.get(key)!;
    setLoading((old) => new Set(old).add(key)); setError('');
    const work = readCatalog(source, force).then((catalog) => {
      if (epoch.current === generation) setCatalogs((old) => new Map(old).set(key, catalog));
      return epoch.current === generation ? catalog : undefined;
    }).catch((reason) => { if (epoch.current === generation) setError(reason instanceof Error ? reason.message : 'Could not load source choices.'); return undefined; }).finally(() => {
      if (epoch.current === generation) { pending.current.delete(key); setLoading((old) => { const next = new Set(old); next.delete(key); return next; }); }
    });
    pending.current.set(key, work); return work;
  }
  useEffect(() => {
    ++epoch.current; pending.current.clear(); setError(''); setCatalogs(new Map()); setExpanded(new Set()); setQuery(''); setLimit(40);
    void readCatalog(context).then((catalog) => { if (epoch.current === generation) { setCatalogs(new Map([[rootScope, catalog]])); setExpanded(new Set(catalog.items.filter((item) => !item.parentKey).map((item) => item.key))); } }).catch((reason) => { if (epoch.current === generation) setError(reason instanceof Error ? reason.message : 'Could not read this source.'); }).finally(() => { if (epoch.current === generation) setLoading(new Set()); });
    const generation = epoch.current; setLoading(new Set([rootScope]));
    return () => { ++epoch.current; };
  }, [rootScope, authEpoch]);
  const rows: Row[] = [];
  function descendants(item: Candidate, catalog: Catalog) {
    const source = childContext(item), nested = source && scopeKey(source) !== scopeKey(catalog.context) ? catalogs.get(scopeKey(source)) : undefined;
    if (nested) { const rootKey = nested.items.find((value) => !value.parentKey)?.key; return nested.items.filter((value) => value.parentKey === rootKey).map((value) => ({ item: value, catalog: nested })); }
    return catalog.items.filter((value) => value.parentKey === item.key).map((value) => ({ item: value, catalog }));
  }
  function visit(item: Candidate, catalog: Catalog, depth: number, seen: Set<string>) {
    if (seen.has(item.key) || depth > 30) return;
    rows.push({ item, catalog, depth });
    if (expanded.has(item.key)) for (const child of descendants(item, catalog)) visit(child.item, child.catalog, depth + 1, new Set(seen).add(item.key));
  }
  if (query.trim()) {
    const seen = new Set<string>();
    for (const catalog of catalogs.values()) for (const item of catalog.items) if (!seen.has(item.key) && nameMatch(query, item.title) !== null) { seen.add(item.key); rows.push({ item, catalog, depth: 0 }); }
    rows.sort((a, b) => nameMatch(query, a.item.title)! - nameMatch(query, b.item.title)! || a.item.title.localeCompare(b.item.title));
  } else if (root) for (const item of root.items.filter((item) => !item.parentKey)) visit(item, root, 0, new Set());
  function existing(item: Candidate) {
    const docs = childContext(item);
    return snapshot?.nodes.find((node) => node.importKey === item.key || (node.locator && locatorKey(node.locator) === locatorKey(item.locator)) || (docs?.kind === 'docs' && node.locator?.kind === 'docs' && !node.locator.tabId && node.locator.documentId === docs.sourceId));
  }
  async function add(row: Row) {
    const found = existing(row.item);
    if (found) { onFocus(found.id); return; }
    let source = row.catalog.context, item = row.item;
    // A recognized Doc adds its canonical document root, so expanded tabs join it.
    const doc = childContext(item);
    if (doc?.kind === 'docs') { const catalog = await read(doc); if (!catalog) return; source = doc; item = catalog.items.find((value) => !value.parentKey)!; }
    await apply((data) => applySource(source, data?.graph.id ?? null, data?.graph.contentRevision ?? null, 'selected', [item.key]));
  }
  async function expand(row: Row) {
    const key = row.item.key;
    if (expanded.has(key)) { setExpanded((old) => { const next = new Set(old); next.delete(key); return next; }); return; }
    const next = childContext(row.item);
    if (next && scopeKey(next) !== scopeKey(row.catalog.context) && !await read(next)) return;
    setExpanded((old) => new Set(old).add(key));
  }
  return <section className="source-tree-picker" aria-label="Add from your sources">
    <label className="source-tree-search">Search folders, docs or tabs<input type="search" aria-label="Search folders, docs or tabs" placeholder="Search by name" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(40); }} /></label>
    <p className="tree-location">{root?.title ?? 'Current source'}</p>
    {error && <p role="alert" className="source-notice">{error === 'Not connected to Google.' ? 'Use Back, then Manage Google connection to connect your account.' : error}<button disabled={busy} onClick={() => void read(context, true)}>Retry sources</button></p>}
    {loading.has(rootScope) && <p role="status">Loading source choices…</p>}
    <div className="source-tree nowheel" aria-label="Source choices">{rows.slice(0, limit).map((row) => {
      const source = childContext(row.item), hasChildren = !!source || row.catalog.items.some((item) => item.parentKey === row.item.key), added = existing(row.item);
      return <div className="source-tree-row" key={row.item.key} style={{ paddingLeft: row.depth * 16 }}>
        {hasChildren ? <button className="tree-expand" aria-label={`${expanded.has(row.item.key) ? 'Collapse' : 'Expand'} ${row.item.title}`} aria-expanded={expanded.has(row.item.key)} disabled={busy || (source && loading.has(scopeKey(source)))} onClick={() => void expand(row)}>{source && loading.has(scopeKey(source)) ? '…' : expanded.has(row.item.key) ? '⌄' : '›'}</button> : <span className="tree-spacer" />}
        <button className="tree-add" aria-label={`${added ? 'Focus' : 'Add'} ${row.item.title}${row.item.path ? ` from ${row.item.path}` : ''}`} disabled={busy} onClick={() => void add(row)}><span className="tree-kind" aria-hidden="true">{row.item.kind === 'folder' ? '▱' : row.item.kind === 'tab' ? '▤' : '▧'}</span><span><strong>{row.item.title}</strong>{query && <small>{row.item.path}</small>}</span>{added && <span className="tree-added" title="Already added">✓</span>}</button>
      </div>;
    })}</div>
    {rows.length > limit && <button onClick={() => setLimit(limit + 40)}>Show more choices ({rows.length - limit})</button>}
    {query && !rows.length && <p>No close matches in loaded sources.</p>}
    <p className="tree-help">Click to add · Arrows to browse{query ? ' · Searching loaded names' : ''}</p>
    {!!root && !root.complete && <p className="source-notice">This level is partial. Expand a smaller folder for more choices.</p>}
    <details className="batch-source-options" open={batch} onToggle={(event) => setBatch(event.currentTarget.open)}><summary>More source options</summary>{batch && <BatchSourcePicker {...props} />}</details>
  </section>;
}
