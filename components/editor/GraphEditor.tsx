import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { GraphMark } from '../GraphMark';
import { GraphCanvas, type Selection } from '../graph/GraphCanvas';
import { destinationUrl, effectiveLabel, LIMITS, type Graph, type GraphSnapshot, type GraphNode, type Locator } from '../../lib/graph/types';
import { editorClient as repository, createContextMap, arrangeMap, openPageMap } from '../../lib/editor/client';
import { scopeKey, type SourceContext } from '../../lib/editor/protocol';
import { SourcePicker } from './SourcePicker';
import { sendToBackground, type CheckTargetsResult, type PanelState } from '../../lib/messages';
import { projectGraph } from '../../lib/graph/view';
import { pdfReaderPath, type PdfLocator } from '../../lib/pdf/navigation';
import { GenerationPanel } from '../generation/GenerationPanel';
import { docsGenerationSource, type GenerationSource } from '../../lib/generation/selection';
import './editor.css';

const storageError = (reason: unknown) => reason instanceof Error ? reason.message : 'The change could not be saved. Please retry.';
type Action = (current: GraphSnapshot | null) => Promise<string | void>;
type Tool = 'sources' | 'idea' | 'connect' | 'edit' | 'maps' | 'ai' | null;
export type SourceToolsProps = { snapshot: GraphSnapshot | null; selectedNode?: GraphNode; busy: boolean; apply: (action: Action) => Promise<boolean> };
type Props = { generationSource?: GenerationSource; context?: SourceContext; authEpoch?: number; googleConnected?: boolean; activeTabId?: string; layoutKey?: string; initialGraphId?: string | null; sourceTools?: (props: SourceToolsProps) => ReactNode; onNavigatePdf?: (locator: PdfLocator) => Promise<void>; onBusyChange?: (busy: boolean) => void; onGraphChange?: (id: string) => void };
export function GraphEditor({ generationSource, context, authEpoch = 0, googleConnected = authEpoch > 0, activeTabId, layoutKey = 'workspace', initialGraphId, sourceTools, onNavigatePdf, onBusyChange, onGraphChange }: Props) {
  const embedded = !!context || !!sourceTools;
  const docsSource = useMemo(() => context?.kind === 'docs' ? docsGenerationSource(context.sourceId) : undefined, [context?.kind, context?.sourceId, authEpoch]);
  const aiSource = generationSource ?? docsSource;
  const [tool, setTool] = useState<Tool>(null);
  const toolsOpen = !embedded || tool !== null;
  const [connecting, setConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [pageMapId, setPageMapId] = useState<string | null>(null);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const previousLayout = useRef(layoutKey);
  useEffect(() => {
    if (previousLayout.current !== layoutKey) { previousLayout.current = layoutKey; setCanvasVersion((value) => value + 1); }
  }, [layoutKey]);
  const [focusId, setFocusId] = useState<string | null>(null), [collapsedIds, setCollapsedIds] = useState<string[]>([]), [graphPage, setGraphPage] = useState(0);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const current = useRef<GraphSnapshot | null>(null);
  const selectedMap = useRef<string | null>(null);
  const [busy, setBusy] = useState(true);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const [error, setError] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newMap, setNewMap] = useState('');
  const newMapInput = useRef<HTMLInputElement>(null);
  const [newNode, setNewNode] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [relationLabel, setRelationLabel] = useState('relates to');
  const file = useRef<HTMLInputElement>(null);
  const [importName, setImportName] = useState('');

  function showTool(next: Tool) {
    if (dirty) { setError('Save or cancel your edits first.'); return; }
    setTool(next); setConnecting(false); setConnectionStart(null);
  }
  async function pageMap() {
    if (!context) return;
    const result = await openPageMap(context);
    setPageMapId(result.graphId);
    if (result.created) {
      const data = await repository.readGraph(result.graphId);
      await arrangeMap(result.graphId, data.graph.contentRevision, true);
    }
    return result.graphId;
  }

  async function load(id: string, stillCurrent = () => true) {
    const value = await repository.readGraph(id);
    if (!stillCurrent()) return;
    if (current.current?.graph.id !== value.graph.id) {
      setFocusId(null); setCollapsedIds([]); setGraphPage(0); setCanvasVersion(0);
      setQuery(''); setFrom(''); setTo(''); setTargetStatus('');
    } else if (embedded && value.nodes.length > current.current.nodes.length) setCanvasVersion((version) => version + 1);
    current.current = value; setSnapshot(value);
    if (context && selectedMap.current !== id) {
      const result = await sendToBackground({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}`, graphId: id });
      if (!result.ok) throw new Error(result.error);
      selectedMap.current = id;
    }
    if (!embedded) history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    onGraphChange?.(id);
  }
  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    current.current = null; setSnapshot(null); setSelection(null);
    setConnecting(false); setConnectionStart(null); setPageMapId(null);
    selectedMap.current = null;
    void (async () => {
      try {
        const rows = await repository.listGraphs();
        if (!active) return;
        setGraphs(rows);
        const panel = context ? await sendToBackground<PanelState>({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}` }) : null;
        const remembered = panel?.ok ? panel.data.graphId : undefined;
        const requested = initialGraphId ?? remembered ?? (embedded ? '' : decodeURIComponent(location.hash.slice(1)));
        let id = initialGraphId !== undefined ? rows.find((graph) => graph.id === requested)?.id : context ? rows.find((graph) => graph.id === remembered)?.id ?? rows.find((graph) => graph.createdVia === 'import' && graph.sourceBindings[0]?.key === scopeKey(context))?.id : rows.find((graph) => graph.id === requested)?.id ?? rows[0]?.id;
        if (context && googleConnected && !id) id = await pageMap();
        if (!active) return;
        if (id) await load(id, () => active);
        else { current.current = null; setSnapshot(null); setSelection(null); }
        const updated = await repository.listGraphs();
        if (active) setGraphs(updated);
      } catch (reason) { if (active) setError(storageError(reason)); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [authEpoch]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty || pending.current > 0) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  useEffect(() => { onBusyChange?.(busy || dirty); }, [busy, dirty, onBusyChange]);

  // Serialize local actions, but retain revision checks against other windows.
  // The UI only says Saved after the actual transaction and reread complete.
  function perform(action: Action): Promise<boolean> {
    pending.current += 1; setBusy(true);
    let success = false;
    const work = queue.current.then(async () => {
      try {
        const id = await action(current.current);
        if (id || current.current) await load(id || current.current!.graph.id);
        setGraphs(await repository.listGraphs()); setError(''); success = true;
      } catch (reason) { setError(storageError(reason)); }
      finally { pending.current -= 1; if (!pending.current) setBusy(false); }
    });
    queue.current = work;
    return work.then(() => success);
  }
  function select(value: Selection | null) {
    if (dirty) { setError('Save or cancel your current edits before selecting something else.'); return; }
    setSelection(value); setTool('edit');
  }
  function connect(source: string, target: string, label: string) {
    if (!source || !target) return;
    const id = crypto.randomUUID();
    void perform(async (data) => {
      if (!data) return;
      await repository.connect(data.graph.id, data.graph.contentRevision, { id, label, members: [{ nodeId: source, role: 'from' }, { nodeId: target, role: 'to' }] });
      setSelection({ itemType: 'relationship', itemId: id });
      setTool('edit'); setConnecting(false); setConnectionStart(null);
    });
  }
  function chooseConnection(nodeId: string) {
    if (busy || dirty) return;
    setTool(null); setConnecting(true);
    if (!connectionStart) setConnectionStart(nodeId);
    else if (connectionStart !== nodeId) connect(connectionStart, nodeId, 'relates to');
    else { setConnecting(false); setConnectionStart(null); }
  }
  function openNode(nodeId: string) {
    if (busy || dirty) return;
    if (connecting) { chooseConnection(nodeId); return; }
    const node = current.current?.nodes.find((value) => value.id === nodeId);
    if (!node?.locator) { select({ itemType: 'node', itemId: nodeId }); return; }
    void perform(async (data) => {
      if (node.locator?.kind === 'pdf' && onNavigatePdf) await onNavigatePdf(node.locator);
      else { const result = await sendToBackground({ type: 'NAVIGATE', locator: node.locator!, graphId: data?.graph.id }); if (!result.ok) throw new Error(result.error); }
    });
  }
  async function exportMap() {
    await perform(async (data) => {
      if (!data) return;
      const json = await repository.exportGraph(data.graph.id);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'graphnav-backup.graphnav.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  function applySources(action: Action) {
    return perform(async (data) => {
      const id = await action(data);
      if (id) {
        await load(id);
        try { await arrangeMap(id, current.current!.graph.contentRevision, true); }
        catch (reason) { throw new Error(`Sources were saved, but automatic layout failed: ${storageError(reason)}`); }
        setCanvasVersion((value) => value + 1);
      }
      return id;
    });
  }
  const visibleNodes = snapshot?.nodes.filter((node) => !snapshot.itemEdits.some((e) => e.itemId === node.id && e.hidden)) ?? [];
  const selectedItem = selection?.itemType === 'node' ? snapshot?.nodes.find((n) => n.id === selection.itemId) : snapshot?.relationships.find((r) => r.id === selection?.itemId);
  const projection = snapshot ? projectGraph(snapshot, query, focusId, collapsedIds, graphPage) : null;
  const selectedNodeId = selection?.itemType === 'node' ? selection.itemId : undefined;
  const selectedHasChildren = selectedNodeId && snapshot?.relationships.some((edge) => edge.kind === 'contains' && edge.members.some((member) => member.nodeId === selectedNodeId && member.role === 'from'));

  return <div className={`graphnav-editor${embedded ? ' embedded' : ''}${toolsOpen ? '' : ' tools-closed'}`}><main className="workspace">
    <header className="workspace-header">
      {!embedded && <a className="brand" href="workspace.html"><GraphMark size={28} /><span>GraphNav</span></a>}
      {embedded ? <nav className="editor-actions" aria-label="Map actions">
        <button aria-pressed={tool === 'sources'} disabled={dirty} onClick={() => showTool(tool === 'sources' ? null : 'sources')}>Sources</button>
        <button disabled={busy || dirty || !snapshot} aria-pressed={tool === 'idea'} onClick={() => showTool(tool === 'idea' ? null : 'idea')}>Add idea</button>
        <button disabled={busy || dirty || visibleNodes.length < 2} aria-pressed={connecting} onClick={() => { showTool(null); setConnecting(!connecting); setConnectionStart(null); }}>Connect</button>
        {aiSource && <button disabled={dirty} aria-pressed={tool === 'ai'} onClick={() => showTool(tool === 'ai' ? null : 'ai')}>AI</button>}
        <button disabled={dirty} aria-pressed={tool === 'maps'} onClick={() => showTool(tool === 'maps' ? null : 'maps')}>More</button>
      </nav> : <><a className="source-link" href="reader.html" target="_blank" rel="noreferrer">Open a PDF ↗</a><button disabled={busy || dirty || !snapshot} onClick={() => void exportMap()}>Export backup</button><button disabled={busy || dirty} onClick={() => file.current?.click()}>Import backup</button></>}
      <span className="save-state" role="status">{busy ? 'Saving…' : dirty ? 'Unsaved edits' : error ? 'Needs attention' : 'Saved locally'}</span>
      <input ref={file} className="file-input" type="file" accept=".json,.graphnav.json,application/json" aria-label="Import graph backup" onChange={(event) => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (!selected) return;
        if (selected.size > LIMITS.exportBytes) { setError('Choose a graph backup smaller than 5 MB.'); return; }
        void perform(async () => { const id = await repository.importGraph(await selected.text()); setSelection(null); setImportName(selected.name); return id; });
      }} />
    </header>
    {error && <div className="error-banner" role="alert"><span>{error}</span><button disabled={busy || dirty} onClick={() => void perform(async () => undefined)}>Reload saved map</button></div>}
    <div className="workspace-body">
      <aside className="sidebar" aria-label="Map editor">
        {embedded && <div className="drawer-heading"><strong>{tool === 'sources' ? 'Add from your sources' : tool === 'idea' ? 'Add an idea' : tool === 'ai' ? 'AI suggestions' : tool === 'edit' ? 'Edit selection' : tool === 'connect' ? 'Connect by name' : 'Your maps'}</strong><button aria-label="Close tools" disabled={dirty} onClick={() => showTool(null)}>×</button></div>}
        {embedded && tool === 'maps' && <div className="backup-actions"><button disabled={busy || dirty || !snapshot} onClick={() => void exportMap()}>Export backup</button><button disabled={busy || dirty} onClick={() => file.current?.click()}>Import backup</button></div>}
        {graphs.length > 0 && <section className="map-target" hidden={embedded && tool !== 'maps'} aria-label="Choose the map to work on">
          <label>Open a map<select aria-label="Open a map" disabled={busy || dirty} value={snapshot?.graph.id ?? ''} onChange={(event) => { const id = event.target.value; setSelection(null); setQuery(''); void perform(async () => id); }}><option value="" disabled>Choose a map</option>{graphs.map((graph) => <option key={graph.id} value={graph.id}>{graph.title}</option>)}</select></label>
          {embedded && <p className="local-note">Add sources to this map, or choose another. Each map keeps its own connections.</p>}
          <div className="map-target-actions"><button type="button" disabled={busy || dirty} onClick={() => newMapInput.current?.focus()}>New map</button>
            {context && snapshot && <button type="button" disabled={busy || dirty} onClick={() => void perform(async (data) => { if (data) { const result = await sendToBackground({ type: 'OPEN_PDF_READER', graphId: data.graph.id }); if (!result.ok) throw new Error(result.error); } })}>Add a PDF to this map</button>}
          </div>
        </section>}
        <div hidden={embedded && tool !== 'sources'}>
        {context && <SourcePicker context={context} snapshot={snapshot} selectedNode={selection?.itemType === 'node' ? snapshot?.nodes.find((node) => node.id === selection.itemId && node.origin === 'manual') : undefined} busy={busy || dirty} authEpoch={authEpoch} apply={applySources} />}
        {sourceTools?.({ snapshot, selectedNode: selection?.itemType === 'node' ? snapshot?.nodes.find((node) => node.id === selection.itemId && node.origin === 'manual') : undefined, busy: busy || dirty, apply: applySources })}
          {context && <button disabled={busy || dirty} onClick={() => { setNewMap(''); showTool('maps'); requestAnimationFrame(() => newMapInput.current?.focus()); }}>Start a blank map instead</button>}
        </div>
        <div hidden={embedded && tool !== 'ai'}>
        {aiSource && <GenerationPanel source={aiSource} graphKey={`${snapshot?.graph.id ?? 'new'}:${snapshot?.graph.contentRevision ?? 0}`} graphId={snapshot?.graph.id} revision={snapshot?.graph.contentRevision} busy={busy || dirty} onNavigate={async (locator) => { if (locator.kind === 'pdf' && onNavigatePdf) await onNavigatePdf(locator); else { const result = await sendToBackground({ type: 'NAVIGATE', locator, graphId: snapshot?.graph.id }); if (!result.ok) throw new Error(result.error); } }} />}
        </div>
        <section className="map-picker" hidden={embedded && tool !== 'maps'}>
          <h1>Your workspace</h1><p className="muted">Ideas, connections, and a place to return to.</p>
          <form onSubmit={(event) => { event.preventDefault(); void perform(async () => { const id = context ? await createContextMap(newMap, context) : (await repository.createGraph(newMap)).id; setNewMap(''); setSelection(null); setQuery(''); return id; }); }}>
            <label>New map name<input ref={newMapInput} aria-label="New map name" value={newMap} onChange={(e) => setNewMap(e.target.value)} maxLength={200} placeholder="e.g. Research plan" required /></label>
            <button className="primary" disabled={busy || dirty || !newMap.trim()}>Create map</button>
          </form>
        </section>
        {snapshot && <>
          <section hidden={embedded && tool !== 'idea'}><h2>Add an idea</h2><form onSubmit={(event) => {
            event.preventDefault(); const id = crypto.randomUUID(), label = newNode;
            void perform(async (data) => {
              if (!data) return;
              const index = data.nodes.length;
              const position = embedded && data.layoutItems.length
                ? { x: Math.min(...data.layoutItems.map((item) => item.x)), y: Math.max(...data.layoutItems.map((item) => item.y)) + 240 }
                : { x: 80 + (index % 3) * 240, y: 80 + Math.floor(index / 3) * 140 };
              await repository.addNode(data.graph.id, data.graph.contentRevision, { id, label, position });
              setNewNode(''); setSelection({ itemType: 'node', itemId: id }); setTool('edit');
            });
          }}><label>Node name<input aria-label="Node name" value={newNode} onChange={(e) => setNewNode(e.target.value)} placeholder="e.g. Product launch" maxLength={200} required /></label><button disabled={busy || dirty || !newNode.trim()}>Add node</button></form></section>
          <section hidden={embedded && tool !== 'connect'}><h2>Make a connection</h2><form onSubmit={(e) => { e.preventDefault(); connect(from, to, relationLabel); }}>
            <label>From<select aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} required><option value="">Choose a node</option>{visibleNodes.map((n) => <option key={n.id} value={n.id}>{effectiveLabel(n, snapshot.itemEdits)}</option>)}</select></label>
            <label>To<select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} required><option value="">Choose a node</option>{visibleNodes.map((n) => <option key={n.id} value={n.id}>{effectiveLabel(n, snapshot.itemEdits)}</option>)}</select></label>
            <label>Connection label<input aria-label="Connection label" value={relationLabel} onChange={(e) => setRelationLabel(e.target.value)} maxLength={200} required /></label>
            <button disabled={busy || dirty || !from || !to || from === to || !relationLabel.trim()}>Connect nodes</button>
          </form></section>
          <div hidden={embedded && tool !== 'edit'}>{selectedItem && selection && <ItemEditor onNavigatePdf={onNavigatePdf} context={context} key={`${snapshot.graph.id}:${selection.itemId}`} snapshot={snapshot} selection={selection} busy={busy} dirty={dirty} onDirty={setDirty} perform={perform} onRemoved={() => { setSelection(null); setTool(null); }} />}</div>
          <section hidden={embedded && tool !== 'maps'}>
            <div className="node-list">{(projection?.nodes ?? []).map((node) => <button className={selection?.itemId === node.id ? 'selected' : ''} key={node.id} disabled={busy} onClick={() => select({ itemType: 'node', itemId: node.id })}>{effectiveLabel(node, snapshot.itemEdits)}</button>)}</div>
          </section>
        </>}
        <p className="local-note" hidden={embedded && tool !== 'maps'}>Saved in this Chrome profile. Export a backup to keep a separate copy. Source changes are read only. Your edits change this map, not your Google files.</p>
        {!!snapshot?.sources.some((source) => source.provider === 'local-pdf') && (!embedded || tool === 'maps') && <p className="local-note">PDF backups contain the graph, not the original PDF bytes. Keep the original file for reattachment on another installation.</p>}
        {importName && <p className="local-note">Imported {importName} as a separate map.</p>}
      </aside>
      <section className="map-area" aria-label="Current map">
        <div className="map-heading"><div><span className="eyebrow">{context ? snapshot?.graph.id === pageMapId || (snapshot?.graph.createdVia === 'import' && snapshot?.graph.sourceBindings[0]?.key === scopeKey(context)) ? 'THIS PAGE' : 'PROJECT MAP' : 'YOUR MAP'}</span><h2>{snapshot?.graph.title ?? 'Start with an idea.'}</h2></div>{context && <button className="page-map-button" disabled={busy || dirty} onClick={() => { setTool(null); setSelection(null); void perform(() => pageMap()); }}>This page</button>}{snapshot && <span className="count-badge">{snapshot.nodes.length} node{snapshot.nodes.length === 1 ? '' : 's'} · {snapshot.relationships.length} connection{snapshot.relationships.length === 1 ? '' : 's'}</span>}</div>
        {connecting && <div className="connect-prompt" role="status"><span>{connectionStart ? `Now click the node to connect to ${effectiveLabel(snapshot!.nodes.find((node) => node.id === connectionStart)!, snapshot!.itemEdits)}.` : 'Click two nodes to connect them.'}</span><button onClick={() => { setConnecting(false); setConnectionStart(null); }}>Cancel connection</button><button onClick={() => { setConnecting(false); setConnectionStart(null); setTool('connect'); }}>Choose by name</button></div>}
        {snapshot && <div className="map-tools" aria-label="Graph tools"><label>Find a node<input aria-label="Find a node" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setGraphPage(0); setCanvasVersion((value) => value + 1); }} placeholder="Search this map" /></label><button disabled={busy || dirty || !snapshot.nodes.length} onClick={() => void perform(async (data) => { if (data) { await arrangeMap(data.graph.id, data.graph.contentRevision); setCanvasVersion((value) => value + 1); } })}>Arrange map</button>
          <details className="map-options"><summary>Map options</summary><div>
          {snapshot.sources.some((source) => source.provider !== 'local-pdf') && <button disabled={busy || dirty} onClick={() => void perform(async (data) => {
            if (!data) return;
            const result = await sendToBackground<CheckTargetsResult>({ type: 'CHECK_TARGETS', graphId: data.graph.id });
            if (!result.ok) throw new Error(result.error);
            setTargetStatus(`${result.data.checked} sources checked. ${result.data.unavailable} unavailable. ${result.data.unknown} could not be checked.`);
          })}>Check destinations</button>}
          {selectedNodeId && <button disabled={busy || dirty} onClick={() => { setFocusId(selectedNodeId); setGraphPage(0); setQuery(''); }}>Focus selected</button>}
          {selectedHasChildren && <button disabled={busy || dirty} onClick={() => { setCollapsedIds(collapsedIds.includes(selectedNodeId!) ? collapsedIds.filter((id) => id !== selectedNodeId) : [...collapsedIds, selectedNodeId!]); setGraphPage(0); }}>{collapsedIds.includes(selectedNodeId!) ? 'Expand branch' : 'Collapse branch'}</button>}
          {(focusId || collapsedIds.length > 0) && <button onClick={() => { setFocusId(null); setCollapsedIds([]); setGraphPage(0); setCanvasVersion((value) => value + 1); }}>Show whole map</button>}
          {projection && projection.pages > 1 && <><button disabled={projection.page === 0} onClick={() => setGraphPage(projection.page - 1)}>Previous 50</button><span>Page {projection.page + 1} of {projection.pages}</span><button disabled={projection.page === projection.pages - 1} onClick={() => setGraphPage(projection.page + 1)}>Next 50</button></>}
          <span>Dashed lines show source structure. Your own connections are solid.</span></div></details></div>}
        {targetStatus && <p className="target-status" role="status">{targetStatus}</p>}
        {snapshot ? <GraphCanvas key={`${snapshot.graph.id}:${canvasVersion}:${focusId}:${collapsedIds.join(',')}:${graphPage}:${query}`} focusId={focusId} collapsedIds={collapsedIds} page={graphPage} activeTabId={activeTabId} fit={canvasVersion > 0 || !!query || !!focusId || collapsedIds.length > 0 || graphPage > 0} snapshot={snapshot} query={query} busy={busy || dirty} connectingFrom={connectionStart}
          onOpen={embedded ? openNode : undefined} onChooseConnection={embedded ? chooseConnection : undefined}
          onSelect={select} onConnect={(connection) => connect(connection.source, connection.target, 'relates to')}
          onPosition={(item, point) => { void perform(async (data) => { if (data?.graph.id === snapshot.graph.id) await repository.savePosition({ ...item, graphId: data.graph.id }, point); }); }}
          onView={(view) => { if (query || focusId || collapsedIds.length > 0 || graphPage > 0) return; void perform(async (data) => { if (data?.graph.id === snapshot.graph.id) await repository.saveView(data.graph.id, view); }); }}
        /> : <div className="welcome"><GraphMark size={66} /><h2>Make room for connections.</h2><p>{busy ? 'Opening your saved page map…' : 'Choose Sources to use existing files, or start with your own ideas.'}</p>{embedded && <div className="welcome-actions"><button onClick={() => showTool('sources')}>Choose sources</button><button onClick={() => showTool('maps')}>Create a map</button></div>}</div>}
      </section>
    </div>
  </main></div>;
}

function ItemEditor({ onNavigatePdf, context, snapshot, selection, busy, dirty, onDirty, perform, onRemoved }: { onNavigatePdf?: (locator: PdfLocator) => Promise<void>; context?: SourceContext; snapshot: GraphSnapshot; selection: Selection; busy: boolean; dirty: boolean; onDirty: (dirty: boolean) => void; perform: (action: Action) => Promise<boolean>; onRemoved: () => void }) {
  const item = selection.itemType === 'node' ? snapshot.nodes.find((n) => n.id === selection.itemId)! : snapshot.relationships.find((r) => r.id === selection.itemId)!;
  const override = snapshot.itemEdits.find((e) => e.itemId === item.id);
  const sourceNode = 'sourceId' in item && !!item.sourceId;
  const source = 'sourceId' in item ? snapshot.sources.find((value) => value.id === item.sourceId) : undefined;
  const originalText = 'body' in item && !sourceNode ? item.body : override?.notes ?? ('body' in item ? item.body : '');
  const [label, setLabel] = useState(effectiveLabel(item, snapshot.itemEdits));
  const [notes, setNotes] = useState(originalText);
  const locator: Locator | undefined = 'locator' in item ? item.locator : undefined;
  const [url, setUrl] = useState(locator?.kind === 'web' ? locator.url : '');
  useEffect(() => {
    if (!dirty) { setLabel(effectiveLabel(item, snapshot.itemEdits)); setNotes(originalText); setUrl(locator?.kind === 'web' ? locator.url : ''); }
  }, [snapshot, dirty, item, originalText, locator]);
  const link = locator?.kind === 'pdf' ? pdfReaderPath(locator, snapshot.graph.id) : locator ? destinationUrl(locator) : undefined;
  const changed = (action: () => void) => { action(); onDirty(true); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const okay = await perform(async (data) => {
      if (!data) return;
      if (selection.itemType === 'node' && item.origin === 'manual' && !sourceNode) await repository.editNode(data.graph.id, data.graph.contentRevision, item.id, { label, body: notes, url: url.trim() || undefined });
      else await repository.setPersonalEdit({ graphId: data.graph.id, ...selection }, data.graph.contentRevision, { displayLabel: label, notes, hidden: override?.hidden ?? false });
    });
    if (okay) onDirty(false);
  }
  return <section className="inspector"><h2>{selection.itemType === 'node' ? 'Edit node' : 'Edit connection'}</h2>
    {source && <p className="muted">Source: {source.title}</p>}
    {source?.availability === 'unavailable' && <p className="source-warning" role="status">This source is unavailable to the connected account. It may have moved, been deleted, or lost sharing access. Your map and notes are still saved.</p>}
    <form onSubmit={(event) => void submit(event)}>
      <label>Label<input aria-label="Label" value={label} onChange={(e) => changed(() => setLabel(e.target.value))} maxLength={200} required /></label>
      <label>Notes<textarea aria-label="Notes" value={notes} onChange={(e) => changed(() => setNotes(e.target.value))} rows={3} maxLength={20_000} /></label>
      {selection.itemType === 'node' && item.origin === 'manual' && !sourceNode && <label>Destination link (optional)<input aria-label="Destination link (optional)" type="url" value={url} onChange={(e) => changed(() => setUrl(e.target.value))} placeholder="https://…" maxLength={4000} /></label>}
      {link && <a className="source-link" href={link} target="_blank" rel="noreferrer" onClick={(event) => {
        if (locator?.kind === 'pdf' && onNavigatePdf) { event.preventDefault(); if (!dirty && !busy) void perform(async () => onNavigatePdf(locator)); return; }
        // Extension pages already have real PDF/web links. Only Google Doc
        // navigation needs the worker's panel/map handoff in this surface.
        if (!context && locator?.kind !== 'docs') { if (dirty || busy) event.preventDefault(); return; }
        event.preventDefault();
        if (dirty || busy) return;
        void perform(async () => { const result = await sendToBackground({ type: 'NAVIGATE', locator: locator!, graphId: snapshot.graph.id }); if (!result.ok) throw new Error(result.error); });
      }}>{locator?.kind === 'pdf' ? `Go to page ${locator.pageIndex + 1}` : context?.kind === 'docs' && locator?.kind === 'docs' && locator.documentId === context.sourceId ? 'Go to tab in this document' : 'Open destination ↗'}</a>}

      <button className="primary" disabled={busy || !label.trim()}>Save changes</button>
      <button type="button" disabled={busy} onClick={() => { setLabel(effectiveLabel(item, snapshot.itemEdits)); setNotes(originalText); setUrl(locator?.kind === 'web' ? locator.url : ''); onDirty(false); }}>Cancel edits</button>
      <button className="danger" type="button" disabled={busy} onClick={() => { void perform(async (data) => { if (data) await repository.removeItem({ graphId: data.graph.id, ...selection }, data.graph.contentRevision); onDirty(false); onRemoved(); }); }}>{item.origin === 'imported' ? 'Hide from map' : 'Remove from map'}</button>
    </form>
  </section>;
}
