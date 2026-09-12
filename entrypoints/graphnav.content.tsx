import { createRoot, type Root } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import { ExtensionShell } from '../components/ExtensionShell';
import { getPageContext } from '../lib/page-context';
import '../assets/shell.css';

/**
 * Reloading the extension orphans the copy of this script already running in
 * an open tab: its link to the extension is cut, and the next call throws
 * "Extension context invalidated". That is normal and unavoidable under MV3 —
 * the tab simply needs refreshing — but with nothing to say so, the panel dies
 * in silence and reads as a broken product rather than a stale page.
 *
 * The notice is built from plain DOM with inline styles on purpose: by the
 * time it is needed, the shadow root and its stylesheet may be gone, and no
 * extension API can be called.
 */
function showStaleNotice() {
  const id = 'graphnav-stale-notice';
  if (document.getElementById(id)) return;
  const note = document.createElement('div');
  note.id = id;
  note.setAttribute('role', 'status');
  note.style.cssText = [
    'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
    'display:flex', 'align-items:center', 'gap:12px',
    'padding:12px 14px', 'border:1px solid #c7d7d1', 'border-radius:14px',
    'background:#fff', 'color:#1b2f32', 'box-shadow:0 8px 18px #123c3814, 0 18px 44px #123c381f',
    'font:14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = 'GraphNav was updated. Refresh this page to use it.';
  const refresh = document.createElement('button');
  refresh.textContent = 'Refresh';
  refresh.style.cssText = [
    'font:600 13px/1 inherit', 'padding:8px 12px', 'cursor:pointer',
    'border:1px solid #174e49', 'border-radius:8px', 'background:#174e49', 'color:#fff',
  ].join(';');
  refresh.addEventListener('click', () => location.reload());
  const dismiss = document.createElement('button');
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.style.cssText = [
    'font:16px/1 inherit', 'padding:6px 8px', 'cursor:pointer',
    'border:0', 'border-radius:8px', 'background:transparent', 'color:#5c7079',
  ].join(';');
  dismiss.addEventListener('click', () => note.remove());

  note.append(text, refresh, dismiss);
  document.body?.append(note);
}

/** True when this script has been cut off from the extension that injected it. */
const orphaned = (ctx: { isInvalid: boolean }) => ctx.isInvalid || !browser.runtime?.id;

export default defineContentScript({
  matches: ['https://drive.google.com/*', 'https://docs.google.com/document/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    let root: Root | undefined;

    function render(href = location.href) {
      const context = getPageContext(href);
      root?.render(context ? <ExtensionShell key={`${context.kind}:${context.sourceId}`} context={context} /> : null);
    }

    try {
      const ui = await createShadowRootUi(ctx, {
        name: 'graphnav-ui',
        // React's manual popover handles viewport positioning in the top layer.
        position: 'inline',
        anchor: 'body',
        isolateEvents: ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'pointerdown', 'pointerup'],
        onMount(container) {
          const app = document.createElement('div');
          container.append(app);
          root = createRoot(app);
          render();
          return root;
        },
        onRemove(mountedRoot) {
          mountedRoot?.unmount();
          root = undefined;
        },
      });

      if (ctx.isInvalid) return;
      ui.mount();
      // WXT's Navigation API event can fire before location.href changes.
      ctx.addEventListener(window, 'wxt:locationchange', (event) => render(event.newUrl.href));
      // Reloading while the panel is open is the common case: say so rather
      // than leaving controls that no longer do anything.
      ctx.onInvalidated(showStaleNotice);
    } catch (reason) {
      // Losing the extension mid-setup is expected on reload; anything else is
      // a real fault and must not be swallowed.
      if (orphaned(ctx)) return showStaleNotice();
      throw reason;
    }
  },
});
