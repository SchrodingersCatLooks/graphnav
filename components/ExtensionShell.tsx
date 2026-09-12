import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageContext } from '../lib/page-context';
import { EntryChoice, type EntryScreen } from './GraphEntry';
import { GraphMark } from './GraphMark';
import { GoogleConnection } from './GoogleConnection';
import { GraphEditor } from './editor/GraphEditor';
import { sendToBackground, type PanelPreferences, type PanelState } from '../lib/messages';
import { usePanelPlacement } from './usePanelPlacement';

export function ExtensionShell({ context }: { context: PageContext }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [screen, setScreen] = useState<EntryScreen>('home');
  const [minimized, setMinimized] = useState(false), [fullscreen, setFullscreen] = useState(false), [graphTitle, setGraphTitle] = useState('GraphNav');
  const compact = screen !== 'graph';
  const backButton = useRef<HTMLButtonElement>(null);
  const title = screen === 'new' ? 'New Graph' : screen === 'manual' ? 'Manual graph' : screen === 'automated' ? 'Automated graph' : screen === 'existing' ? 'Use Existing Graph' : screen === 'account' ? 'Google connection' : graphTitle;
  const [authEpoch, setAuthEpoch] = useState(0);
  // Resolve the account before loading maps so initialization cannot interrupt a menu click.
  const [authReady, setAuthReady] = useState(false);
  const lastConnection = useRef(false);
  function connectionChanged(value: boolean) {
    if (lastConnection.current !== value) {
      lastConnection.current = value;
      setAuthEpoch((epoch) => epoch + 1);
    }
  }
  const [editorBusy, setEditorBusy] = useState(true);
  const [preferences, setPreferences] = useState<PanelPreferences>({ width: 1100, dock: context.kind === 'docs' ? 'left' : 'right' });
  const placement = usePanelPlacement(context.kind, preferences);
  const [preferenceError, setPreferenceError] = useState('');
  const preferenceChanged = useRef(false);
  const preferenceQueue = useRef(Promise.resolve());
  const surface = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);
  useEffect(() => {
    let alive = true;
    void sendToBackground<PanelState>({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}` }).then((result) => {
      if (alive && !interacted.current && result.ok && result.data.open) { setVisited(true); setScreen(result.data.graphId ? 'graph' : 'home'); setOpen(true); }
    }).catch(() => undefined);
    void sendToBackground<PanelPreferences>({ type: 'PANEL_PREFERENCES', kind: context.kind }).then((result) => { if (alive && !preferenceChanged.current && result.ok) setPreferences(result.data); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  function changePreferences(next: PanelPreferences) {
    preferenceChanged.current = true;
    setPreferences(next); setPreferenceError('');
    // Keep rapid changes in order, including after a failed write.
    preferenceQueue.current = preferenceQueue.current.then(async () => {
      try {
        const result = await sendToBackground({ type: 'PANEL_PREFERENCES', kind: context.kind, preferences: next });
        if (!result.ok) throw new Error(result.error);
        setPreferenceError('');
      } catch { setPreferenceError('Panel preference could not be saved.'); }
    });
  }

  useLayoutEffect(() => {
    const element = surface.current!;
    const viewport = window.visualViewport;
    function fitViewport() {
      element.style.setProperty('--graphnav-left', `${viewport?.offsetLeft ?? 0}px`);
      element.style.setProperty('--graphnav-top', `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty('--graphnav-width', `${viewport?.width ?? innerWidth}px`);
      element.style.setProperty('--graphnav-height', `${viewport?.height ?? innerHeight}px`);
    }
    fitViewport();
    // A manual popover sits above host toolbars without blocking the page.
    element.showPopover();
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    window.addEventListener('resize', fitViewport);
    return () => {
      viewport?.removeEventListener('resize', fitViewport);
      viewport?.removeEventListener('scroll', fitViewport);
      window.removeEventListener('resize', fitViewport);
      if (element.matches(':popover-open')) element.hidePopover();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (screen === 'manual' || screen === 'automated') surface.current?.querySelector<HTMLInputElement>('[aria-label="New map name"]')?.focus();
    else if (screen === 'home') closeButton.current?.focus();
    else backButton.current?.focus();
  }, [open, screen]);

  function back() {
    if (editorBusy) return;
    placement.cancelGesture(); setMinimized(false); setFullscreen(false);
    setScreen(screen === 'manual' || screen === 'automated' ? 'new' : 'home');
  }

  function close() {
    placement.cancelGesture();
    interacted.current = true;
    setOpen(false);
    void sendToBackground({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}`, open: false }).catch(() => undefined);
    trigger.current?.focus();
  }

  return (
    <div ref={surface} className="graphnav-shell" popover="manual">
      {visited && (
        <section
          ref={placement.panel}
          id="graphnav-panel"
          className={`graphnav-panel editor-panel ${compact ? 'launcher-panel' : ''} ${context.kind === 'docs' ? 'docs-panel' : ''} flex flex-col`}
          style={{ ...(compact ? { width: 'min(400px, calc(100% - 32px))', left: context.kind === 'docs' ? 16 : 'auto', right: context.kind === 'docs' ? 'auto' : 16, top: 'min(80px, 10%)', bottom: 'auto', height: 'auto', maxHeight: 'calc(100% - 96px)' } : minimized ? { ...placement.style, width: 'min(420px, calc(100% - 32px))', height: 'auto', bottom: 'auto' } : fullscreen ? { left: 16, top: 16, right: 16, bottom: 16, width: 'calc(100% - 32px)', height: 'calc(100% - 32px)' } : placement.style), display: open ? undefined : 'none' }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="graphnav-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              if (!placement.cancelGesture()) { if (fullscreen) setFullscreen(false); else close(); }
            }
          }}
        >
          <header className="panel-header flex items-center justify-between">
            {screen === 'home' ? <div className="launcher-brand"><span className="brand-mark"><GraphMark /></span><h1 id="graphnav-title">GraphNav</h1></div> : <>
              <button ref={backButton} className="panel-back" aria-label="Back" disabled={editorBusy} onClick={back}><span aria-hidden="true">←</span> Back</button>
              <div className="panel-step-title"><h1 id="graphnav-title">{title}</h1>{!compact && <p className="source-label">{context.label}</p>}</div>
            </>}
            <div className="panel-header-actions">
              {!compact && <button className="window-control" aria-label={minimized ? 'Restore graph' : 'Minimize graph'} onClick={() => { placement.cancelGesture(); setMinimized(!minimized); }}>{minimized ? '▢' : '−'}</button>}
              {!compact && !minimized && <button className="window-control" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen graph'} aria-pressed={fullscreen} onClick={() => { placement.cancelGesture(); setFullscreen(!fullscreen); }}>{fullscreen ? '↙' : '⛶'}</button>}
              {!compact && !minimized && !fullscreen && placement.floating && <button type="button" className="panel-move" aria-label="Move graph panel" aria-describedby="panel-placement-help" title="Drag to move; arrow keys move, Shift moves faster" {...placement.controls('move')}><span aria-hidden="true">⠿</span> Move</button>}
              <button ref={closeButton} type="button" className="close-button" onClick={close} aria-label="Close graph panel"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
            </div>
          </header>

          <div className="launcher-home" hidden={screen !== 'home'}>
            <button className="manage-connection" disabled={editorBusy} onClick={() => setScreen('account')}><span className="google-letter" aria-hidden="true">G</span><span>Manage Google connection</span><span aria-hidden="true">›</span></button>
            <div className="launcher-choices">
              <EntryChoice title="New Graph" description="Start a new map." icon="graph" accent disabled={editorBusy} onClick={() => setScreen('new')} />
              <EntryChoice title="Use Existing Graph" description="Open a saved map." icon="folder" disabled={editorBusy} onClick={() => setScreen('existing')} />
            </div>
          </div>
          <div className="panel-auth launcher-account" hidden={screen !== 'account'}><GoogleConnection expanded onConnected={connectionChanged} onInitialCheckComplete={() => setAuthReady(true)} disabled={editorBusy} /></div>
          <div hidden={minimized && !compact} className="panel-editor-container">{authReady && <GraphEditor onTitleChange={setGraphTitle} panelOpen={open} entryScreen={screen} onEntryScreenChange={setScreen} layoutKey={`${placement.layoutKey}:${fullscreen}:${minimized}`} context={context} activeTabId={context.tabId} authEpoch={authEpoch} onBusyChange={setEditorBusy} />}</div>

          <footer hidden={compact || minimized} className="panel-footer flex items-center justify-between gap-3">
            <span>{placement.floating ? 'Floating overlay' : 'Fixed overlay'}</span>
            <details className="panel-settings"><summary>Panel settings</summary><div className="panel-settings-controls">
            {!placement.floating && <label className="panel-width-label">Panel width<select aria-label="Panel width" value={preferences.width} onChange={(event) => void changePreferences({ ...preferences, width: Number(event.target.value) as PanelPreferences['width'] })}><option value={420}>Compact</option><option value={580}>Standard</option><option value={780}>Wide</option><option value={1100}>Spacious</option></select></label>}
            <button type="button" className="dock-button" onClick={() => { placement.dock(); changePreferences({ ...preferences, dock: preferences.dock === 'left' ? 'right' : 'left' }); }}>Dock {preferences.dock === 'left' ? 'right' : 'left'}</button>
            <button type="button" className="dock-button" onClick={placement.toggle}>{placement.floating ? 'Dock panel' : 'Float panel'}</button>
            <button type="button" className="dock-button" onClick={() => { placement.reset(); changePreferences({ width: 1100, dock: context.kind === 'docs' ? 'left' : 'right' }); }}>Reset position</button>
            </div></details>
            {!fullscreen ? <button type="button" className="panel-resize" aria-label="Resize graph panel" aria-describedby="panel-placement-help" title="Drag to resize; arrow keys resize, Shift resizes faster" {...placement.controls('resize')}>Resize <span aria-hidden="true">↘</span></button> : <kbd>Esc</kbd>}
            {(preferenceError || placement.error) && <span className="panel-preference-error" role="alert">{preferenceError || placement.error}</span>}
          </footer>
          <span id="panel-placement-help" className="panel-sr-only">Drag this control or use arrow keys. Hold Shift for larger steps. Escape cancels a drag; otherwise Escape closes the panel.</span>
          <span className="panel-sr-only" role="status">{placement.announcement}</span>
        </section>
      )}

      <button
        ref={trigger}
        hidden={open && fullscreen}
        type="button"
        className="graph-trigger flex items-center justify-center gap-2"
        aria-expanded={open}
        aria-controls={open ? 'graphnav-panel' : undefined}
        aria-haspopup="dialog"
        onClick={() => { interacted.current = true; if (open) close(); else { setVisited(true); if (!editorBusy) setScreen('home'); setOpen(true); void sendToBackground({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}`, open: true }).catch(() => undefined); } }}
      >
        <GraphMark size={22} />
        Graph
      </button>
    </div>
  );
}
