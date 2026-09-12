import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageContext } from '../lib/page-context';
import { GraphMark } from './GraphMark';
import { GoogleConnection } from './GoogleConnection';
import { GraphEditor } from './editor/GraphEditor';
import { sendToBackground, type PanelPreferences } from '../lib/messages';
import { usePanelPlacement } from './usePanelPlacement';

export function ExtensionShell({ context }: { context: PageContext }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [connected, setConnected] = useState(false);
  const [preferences, setPreferences] = useState<PanelPreferences>({ width: context.kind === 'docs' ? 580 : 780, dock: context.kind === 'docs' ? 'left' : 'right' });
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
    void sendToBackground<{ open: boolean }>({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}` }).then((result) => {
      if (alive && !interacted.current && result.ok && result.data.open) { setVisited(true); setOpen(true); }
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
    if (open) closeButton.current?.focus();
  }, [open]);

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
          className={`graphnav-panel editor-panel ${context.kind === 'docs' ? 'docs-panel' : ''} flex flex-col`}
          style={{ ...placement.style, display: open ? undefined : 'none' }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="graphnav-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              if (!placement.cancelGesture()) close();
            }
          }}
        >
          <header className="panel-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="brand-mark flex items-center justify-center"><GraphMark /></span>
              <div>
                <h1 id="graphnav-title">GraphNav</h1>
                <p className="source-label">{context.label}</p>
              </div>
            </div>
            <div className="panel-header-actions">
            {placement.floating && <button type="button" className="panel-move" aria-label="Move graph panel" aria-describedby="panel-placement-help" title="Drag to move; arrow keys move, Shift moves faster" {...placement.controls('move')}><span aria-hidden="true">⠿</span> Move</button>}
            <button ref={closeButton} type="button" className="close-button" onClick={close} aria-label="Close graph panel">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            </div>
          </header>

          <div className="panel-auth"><GoogleConnection onConnected={setConnected} /></div>
          <GraphEditor layoutKey={placement.layoutKey} context={context} activeTabId={context.tabId} authEpoch={Number(connected)} />

          <footer className="panel-footer flex items-center justify-between gap-3">
            {!placement.floating && <label className="panel-width-label">Panel width<select aria-label="Panel width" value={preferences.width} onChange={(event) => void changePreferences({ ...preferences, width: Number(event.target.value) as PanelPreferences['width'] })}><option value={420}>Compact</option><option value={580}>Standard</option><option value={780}>Wide</option></select></label>}
            <button type="button" className="dock-button" onClick={() => { placement.dock(); changePreferences({ ...preferences, dock: preferences.dock === 'left' ? 'right' : 'left' }); }}>Dock {preferences.dock === 'left' ? 'right' : 'left'}</button>
            <button type="button" className="dock-button" onClick={placement.toggle}>{placement.floating ? 'Dock panel' : 'Float panel'}</button>
            <button type="button" className="dock-button" onClick={() => { placement.reset(); changePreferences({ width: context.kind === 'docs' ? 580 : 780, dock: context.kind === 'docs' ? 'left' : 'right' }); }}>Reset position</button>
            {placement.floating ? <button type="button" className="panel-resize" aria-label="Resize graph panel" aria-describedby="panel-placement-help" title="Drag to resize; arrow keys resize, Shift resizes faster" {...placement.controls('resize')}>Resize <span aria-hidden="true">↘</span></button> : <kbd>Esc</kbd>}
            {(preferenceError || placement.error) && <span className="panel-preference-error" role="alert">{preferenceError || placement.error}</span>}
          </footer>
          <span id="panel-placement-help" className="panel-sr-only">Drag this control or use arrow keys. Hold Shift for larger steps. Escape cancels a drag; otherwise Escape closes the panel.</span>
          <span className="panel-sr-only" role="status">{placement.announcement}</span>
        </section>
      )}

      <button
        ref={trigger}
        type="button"
        className="graph-trigger flex items-center justify-center gap-2"
        aria-expanded={open}
        aria-controls={open ? 'graphnav-panel' : undefined}
        aria-haspopup="dialog"
        onClick={() => { interacted.current = true; if (open) close(); else { setVisited(true); setOpen(true); void sendToBackground({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}`, open: true }).catch(() => undefined); } }}
      >
        <GraphMark size={22} />
        Graph
      </button>
    </div>
  );
}
