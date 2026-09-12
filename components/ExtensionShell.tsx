import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PageContext } from '../lib/page-context';
import { GraphMark } from './GraphMark';

export function ExtensionShell({ context }: { context: PageContext }) {
  const [open, setOpen] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

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
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div ref={surface} className="graphnav-shell" popover="manual">
      {open && (
        <section
          id="graphnav-panel"
          className="graphnav-panel flex flex-col"
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

          <div className="panel-content flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow">YOUR WORKSPACE</span>
              <span className="preview-badge">Interface preview</span>
            </div>
            <div className="empty-state flex flex-col items-center justify-center">
              <span className="empty-mark flex items-center justify-center"><GraphMark size={52} /></span>
              <h2>Your {context.kind === 'drive' ? 'folder' : 'document'} map starts here</h2>
              <p>Explore your {context.kind === 'drive' ? 'files and folders' : 'document tabs'} in a connected view.</p>
              <div className="connection-notice">
                <span className="status-dot" aria-hidden="true" />
                Google data is not connected yet
              </div>
              <p className="next-step">This first version opens the workspace.<br />Your source map comes next.</p>
            </div>
          </div>

          <footer className="panel-footer flex items-center justify-between gap-3">
            <span>Close the panel to return to your page.</span>
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
        onClick={() => open ? close() : setOpen(true)}
      >
        <GraphMark size={22} />
        Graph
      </button>
    </div>
  );
}
