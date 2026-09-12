import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageContext } from '../lib/page-context';
import { GraphMark } from './GraphMark';
import { GoogleConnection } from './GoogleConnection';
import { GraphEditor } from './editor/GraphEditor';
import { sendToBackground } from '../lib/messages';

export function ExtensionShell({ context }: { context: PageContext }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [connected, setConnected] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);
  useEffect(() => {
    let alive = true;
    void sendToBackground<{ open: boolean }>({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}` }).then((result) => {
      if (alive && !interacted.current && result.ok && result.data.open) { setVisited(true); setOpen(true); }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

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
    interacted.current = true;
    setOpen(false);
    void sendToBackground({ type: 'PANEL_STATE', source: `${context.kind}:${context.sourceId}`, open: false }).catch(() => undefined);
    trigger.current?.focus();
  }

  return (
    <div ref={surface} className="graphnav-shell" popover="manual">
      {visited && (
        <section
          id="graphnav-panel"
          className={`graphnav-panel editor-panel ${context.kind === 'docs' ? 'docs-panel' : ''} flex flex-col`}
          style={open ? undefined : { display: 'none' }}
          role="dialog"
          aria-modal="false"
          aria-labelledby="graphnav-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
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
            <button ref={closeButton} type="button" className="close-button" onClick={close} aria-label="Close graph panel">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="panel-auth"><GoogleConnection onConnected={setConnected} /></div>
          <GraphEditor context={context} activeTabId={context.tabId} authEpoch={Number(connected)} />

          <footer className="panel-footer flex items-center justify-between gap-3">
            <span>Your Google files stay unchanged. Close to return to your page.</span>
            <kbd>Esc</kbd>
          </footer>
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
