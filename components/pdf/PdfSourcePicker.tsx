import { nameMatch } from '../../lib/editor/name-match';
import { useEffect, useState } from 'react';
import { pdfCatalog, type PdfLibrary, type PdfCatalogMode } from '../../lib/pdf/library';
import { importedKey } from '../../lib/storage/repository';
import type { PdfExtraction } from '../../lib/pdf/extract';
import type { SourceToolsProps } from '../editor/GraphEditor';

export function PdfSourcePicker({ extraction, title, library, snapshot, busy, apply, selectedNode, onFocus }: SourceToolsProps & { extraction: PdfExtraction; title: string; library: PdfLibrary }) {
  const [mode, setMode] = useState<PdfCatalogMode>('sections');
  const [selected, setSelected] = useState<string[]>([]), [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20), [batch, setBatch] = useState(false);
  useEffect(() => { setSelected([]); }, [snapshot?.graph.id]);
  const catalog = pdfCatalog(extraction, title, mode);
  const added = new Set(snapshot?.nodes.flatMap((node) => node.importKey ? [node.importKey] : []) ?? []);
  const binding = snapshot?.graph.sourceBindings.find((value) => value.key === catalog.scopeKey);
  const filtered = catalog.items.filter((item) => nameMatch(query, item.title) !== null).sort((a, b) => query.trim() ? nameMatch(query, a.title)! - nameMatch(query, b.title)! || a.title.localeCompare(b.title) : 0);
  async function commit(action: 'selected' | 'baseline' | 'refresh') {
    if (await apply((data) => library.apply(extraction, title, mode, data, action, selected))) setSelected([]);
  }
  return <section className="source-picker" aria-label="Add PDF sources">
    <div className="source-picker-heading"><h2>Add from this PDF</h2></div>
    <p className="muted">Choose sections or pages. Names and destinations are ready.</p>
    <label>Source outline<select aria-label="Source outline" value={mode} disabled={busy} onChange={(event) => { setMode(event.target.value as PdfCatalogMode); setSelected([]); setLimit(20); }}><option value="sections">{extraction.sections.length ? extraction.origin === 'outline' ? 'Bookmarked sections' : 'Suggested headings' : 'Page outline'}</option><option value="pages">All pages</option></select></label>
    {mode === 'sections' && extraction.origin === 'heading' && <p className="local-note">{extraction.sections.length ? 'Headings are detected suggestions. Edit their labels in your map as needed.' : 'No usable bookmarks or headings were found. Page destinations are available.'}</p>}
    <label>Find a PDF section<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }} placeholder="Search this outline" /></label>
    <div className="source-tree nowheel" aria-label="PDF source choices">{filtered.slice(0, limit).map((item) => {
      const key = importedKey(item), node = snapshot?.nodes.find((value) => value.importKey === key);
      return <div className="source-tree-row" key={key}><button className="tree-add" disabled={busy} aria-label={`${node ? 'Focus' : 'Add'} ${item.title}`} onClick={() => {
        if (node) onFocus?.(node.id);
        else void apply((data) => library.apply(extraction, title, mode, data, 'selected', [key]));
      }}><span className="tree-kind" aria-hidden="true">▤</span><span><strong>{item.title}</strong><small>Page {item.locator.kind === 'pdf' ? item.locator.pageIndex + 1 : '?'}</small></span>{node && <span className="tree-added">✓</span>}</button></div>;
    })}</div>
    {filtered.length > limit && !batch && <button onClick={() => setLimit(limit + 20)}>Show more PDF choices ({filtered.length - limit})</button>}
    <details className="batch-source-options" open={batch} onToggle={(event) => setBatch(event.currentTarget.open)}><summary>More source options</summary>
    <div className="source-options">{filtered.slice(0, limit).map((item) => {
      const key = importedKey(item);
      return <div className="source-option" key={key}><label><input type="checkbox" aria-label={`Add ${item.title}`} checked={(!selectedNode && added.has(key)) || selected.includes(key)} disabled={busy || (!selectedNode && added.has(key))} onChange={(event) => setSelected(event.target.checked ? [...selected, key] : selected.filter((value) => value !== key))} /><span><strong>{item.title}</strong><small>Page {item.locator.kind === 'pdf' ? item.locator.pageIndex + 1 : '?'}{added.has(key) ? ' · Added' : ''}</small></span></label></div>;
    })}</div>
    {filtered.length > limit && <button onClick={() => setLimit(limit + 20)}>Show more PDF options ({filtered.length - limit})</button>}
    {!filtered.length && <p className="muted">No matching sections.</p>}
    {!catalog.complete && <p className="source-notice">This outline is limited to 500 destinations. Use All pages to navigate the whole PDF.</p>}
    {selectedNode && <button disabled={busy || selected.length !== 1} onClick={() => void apply(async (data) => {
      const item = catalog.items.find((value) => importedKey(value) === selected[0]);
      if (data && item) { await library.repository.attachSource(data.graph.id, data.graph.contentRevision, selectedNode.id, item); setSelected([]); }
    })}>Attach destination to {selectedNode.baseLabel}</button>}
    <div className="source-actions"><button className="primary" disabled={busy || !selected.length} onClick={() => void commit('selected')}>Add selected{selected.length ? ` (${selected.length})` : ''}</button><button disabled={busy} onClick={() => void commit('baseline')}>Build baseline ({catalog.items.length})</button>{binding && <button disabled={busy} onClick={() => void commit('refresh')}>Refresh PDF outline</button>}</div>
    </details>
    <p className="local-note">No AI is used to build this outline. You can add your own ideas and connections.</p>
  </section>;
}
