import { useEffect, useState } from 'react';
import { applySource, attachSource, readCatalog } from '../../lib/editor/client';
import { scopeKey, type Catalog, type SourceContext } from '../../lib/editor/protocol';
import type { GraphSnapshot, GraphNode } from '../../lib/graph/types';

type Props = { context: SourceContext; snapshot: GraphSnapshot | null; selectedNode?: GraphNode; busy: boolean; authEpoch: number; apply: (action: (snapshot: GraphSnapshot | null) => Promise<string | void>) => Promise<boolean> };
export function SourcePicker({ context, snapshot, selectedNode, busy, authEpoch, apply }: Props) {
  const [trail, setTrail] = useState<SourceContext[]>([context]);
  const current = trail[trail.length - 1]!;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30), [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setCatalog(null); setError(''); setSelected([]); setQuery(''); setLimit(30);
    void readCatalog(current, reload > 0).then((data) => { if (alive) setCatalog(data); }).catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : 'The source could not be read.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [current.kind, current.sourceId, reload, authEpoch]);
  const added = new Set(snapshot?.nodes.flatMap((node) => node.importKey ? [node.importKey] : []) ?? []);
  const binding = snapshot?.graph.sourceBindings.find((b) => b.key === scopeKey(current));
  const filtered = catalog?.items.filter((item) => `${item.title} ${item.path}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  async function commit(mode: 'selected' | 'baseline' | 'refresh') {
    const okay = await apply((data) => applySource(current, data?.graph.id ?? null, data?.graph.contentRevision ?? null, mode, selected));
    if (okay) { setSelected([]); if (mode === 'refresh') setReload((old) => old + 1); }
  }
  return <section className="source-picker" aria-label="Add existing sources">
    <div className="source-picker-heading"><h2>Add existing</h2><button type="button" className="text-button" disabled={loading || busy} onClick={() => setReload(reload + 1)}>Reload sources</button></div>
    <p className="muted">Choose {current.kind === 'drive' ? 'files and folders' : 'document tabs'}. Names and destinations are filled in.</p>
    {trail.length > 1 && <button disabled={loading || busy} onClick={() => setTrail(trail.slice(0, -1))}>← Parent folder</button>}
    {loading && <p className="source-notice">Loading source options…</p>}
    {error && <p className="source-notice">{error === 'Not connected to Google.' ? 'Connect Google above to see your source options. You can still create a personal map below.' : error}</p>}
    {catalog && <>
      <p className="catalog-title">{catalog.title}</p>
      <label>Find a source<input type="search" aria-label="Find a source" placeholder="Search names or parent folders" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(30); }} /></label>
      <div className="source-options">
        {filtered.slice(0, limit).map((item) => <div className="source-option" key={item.key}>
          <label><input type="checkbox" disabled={busy || (added.has(item.key) && !selectedNode)} checked={(added.has(item.key) && !selectedNode) || selected.includes(item.key)} onChange={(event) => setSelected(event.target.checked ? [...selected, item.key] : selected.filter((key) => key !== item.key))} aria-label={`Add ${item.title}${item.path ? ` from ${item.path}` : ''}`} />
            <span><strong>{item.title}</strong><small>{item.kind} {item.path ? `· ${item.path}` : '· current source'}{added.has(item.key) ? ' · Added' : ''}</small></span>
          </label>
          {item.kind === 'folder' && item.locator.kind === 'drive' && item.locator.fileId !== current.sourceId && !(current.sourceId === 'root' && !item.parentKey) && <button aria-label={`Browse ${item.title}`} title="Choose items inside this folder" disabled={busy || loading} onClick={() => { if (item.locator.kind === 'drive') setTrail([...trail, { kind: 'drive', sourceId: item.locator.fileId }]); }}>›</button>}
        </div>)}
      </div>
      {selectedNode && <button disabled={busy || loading || selected.length !== 1} onClick={() => void apply(async (data) => { if (data) { await attachSource(current, data.graph.id, data.graph.contentRevision, selectedNode.id, selected[0]!); setSelected([]); } })}>Attach destination to {selectedNode.baseLabel}</button>}
      {filtered.length === 0 && <p className="muted">No matching sources.</p>}
      {filtered.length > limit && <button onClick={() => setLimit(limit + 30)}>Show more source options ({filtered.length - limit})</button>}
      {!catalog.complete && <p className="source-notice">This list is partial. Browse a smaller folder to see items beyond the 500-item read limit. Refresh will retain unseen sources.</p>}
      <div className="source-actions"><button className="primary" disabled={busy || loading || !selected.length} onClick={() => void commit('selected')}>Add selected{selected.length ? ` (${selected.length})` : ''}</button>
        <button disabled={busy || loading || catalog.items.length === 0} onClick={() => void commit('baseline')}>Build baseline ({catalog.items.length})</button>
        {binding && <button disabled={busy || loading} onClick={() => void commit('refresh')}>Refresh source</button>}
      </div>
      <p className="local-note">Baseline adds the listed structure automatically. You can then add your own connections. No AI is used.</p>
      {binding && <p className="local-note">Refresh mode: {binding.mode === 'selected' ? 'only your selected items' : 'this source baseline'}.</p>}
      {!!binding?.missingKeys?.length && <p className="source-notice">{binding.missingKeys.length} saved source(s) were not found in this location. Your nodes and edits are kept; check their destinations.</p>}
    </>}
  </section>;
}
