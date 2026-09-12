import { createRoot, type Root } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { ExtensionShell } from '../components/ExtensionShell';
import { getPageContext } from '../lib/page-context';
import '../assets/shell.css';

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

    const ui = await createShadowRootUi(ctx, {
      name: 'graphnav-ui',
      position: 'overlay',
      anchor: 'body',
      zIndex: 2147483647,
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
  },
});
