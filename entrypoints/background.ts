import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { AuthRequiredError, connect, disconnect, isConnected } from '../lib/google/auth';
import { getAccountKey } from '../lib/google/account';
import { checkTargets } from '../lib/google/availability';
import { listFolderChildren } from '../lib/google/drive';
import { getDocumentTabs } from '../lib/google/docs';
import { extractSelectedTabs } from '../lib/google/docs-content';
import { importDocTabs, importDriveFolder } from '../lib/google/import';
import { GraphRepository, storageError } from '../lib/storage/repository';
import { applyProposals, listDecisions, recallDecisions } from '../lib/storage/proposals';
import { pdfReaderPath } from '../lib/pdf/navigation';
import { destinationUrl } from '../lib/graph/types';
import { isTrustedSender, requestSchema, panelPreferencesSchema } from '../lib/requests';
import type { ImportResult, PanelState, Request, Response, ScopedImport } from '../lib/messages';
import { EditorService } from '../lib/editor/service';
import { getPageContext } from '../lib/page-context';
import { RelayClient } from '../lib/generation/relay';
import { GenerationUiService } from '../lib/generation/ui-service';
import { panelPlacementSchema } from '../lib/panel-placement';

// Dexie opens lazily and the worker is stopped when idle, so this holds no
// state worth losing. The database lives in the extension origin; content
// scripts reach it only through these messages.
const repository = new GraphRepository();
const editor = new EditorService(repository);
const relay = new RelayClient(
  async () => { const value = (await browser.storage.session.get('relay-pairing:v1'))['relay-pairing:v1']; return typeof value === 'string' ? value : undefined; },
  async (code) => { if (code) await browser.storage.session.set({ 'relay-pairing:v1': code }); else await browser.storage.session.remove('relay-pairing:v1'); },
);
const generation = new GenerationUiService(repository, relay);

/**
 * Chooses the map this scope belongs to.
 *
 * Expanding a subfolder must add to the map already on screen rather than
 * starting a second one, so an explicit target wins. Otherwise a scope reopens
 * the map already bound to it, and only a genuinely new scope creates a map.
 */
async function targetGraph(scoped: ScopedImport, intoGraphId?: string) {
  const graphs = await repository.listGraphs();

  if (intoGraphId) {
    const requested = graphs.find((graph) => graph.id === intoGraphId);
    if (!requested) throw new Error('That map no longer exists.');
    // A map holds one account's sources; mixing them would break refresh.
    if (scoped.accountKey !== 'local' && requested.accountScope && requested.accountScope !== scoped.accountKey) {
      throw new Error('That map belongs to a different Google account.');
    }
    return requested;
  }

  const bound = graphs.find((graph) => graph.accountScope === scoped.accountKey && graph.sourceBindings.some((b) => b.key === scoped.scopeKey));
  return bound ?? (await repository.createGraph(scoped.title, crypto.randomUUID(), 'import'));
}

async function storeImport(scoped: ScopedImport, intoGraphId?: string): Promise<ImportResult> {
  const graph = await targetGraph(scoped, intoGraphId);

  await repository.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: scoped.scopeKey,
    accountKey: scoped.accountKey,
    complete: scoped.complete,
    items: scoped.items,
  });

  return {
    graphId: graph.id,
    scopeKey: scoped.scopeKey,
    nodeCount: scoped.items.length,
    complete: scoped.complete,
  };
}

async function handle(raw: unknown, sender: { url?: string; documentId?: string; tab?: { id?: number } }): Promise<Response> {
  if (typeof raw === 'object' && raw !== null && 'type' in raw && raw.type === 'EDITOR') {
    const ownPage = !!sender.url?.startsWith(`chrome-extension://${browser.runtime.id}/`);
    return { ok: true, data: await editor.handle(raw, ownPage) };
  }
  // Parsed, not cast: an unknown or malformed message is rejected before any
  // token is touched or any source operation runs.
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Unsupported request.' };
  const request: Request = parsed.data;

  const ownPage = !!sender.url?.startsWith(`chrome-extension://${browser.runtime.id}/`);
  const owner = `${sender.documentId ?? sender.tab?.id ?? ''}:${sender.url ?? ''}`;
  async function checkMap(graphId: string) {
    const graph = (await repository.readGraph(graphId)).graph;
    if (!ownPage && graph.accountScope && graph.accountScope !== await getAccountKey()) throw new Error('Connect the Google account that owns this map.');
  }
  switch (request.type) {
    case 'AI_STATUS': return { ok: true, data: await relay.status() };
    case 'OPEN_AI_SETTINGS': await browser.tabs.create({ url: browser.runtime.getURL('/options.html') }); return { ok: true, data: null };
    case 'PAIR_RELAY':
      if (!ownPage) return { ok: false, error: 'Pair the relay from GraphNav settings.' };
      return { ok: true, data: await relay.pair(request.code) };
    case 'FORGET_RELAY':
      if (!ownPage) return { ok: false, error: 'Change pairing from GraphNav settings.' };
      await relay.forget(); return { ok: true, data: null };
    case 'GENERATE_DRAFT': return { ok: true, data: await generation.generate(request, owner, ownPage) };
    case 'CANCEL_DRAFT': generation.cancel(request.requestId, owner); return { ok: true, data: null };
    case 'AUTH_STATUS':
      return { ok: true, data: { connected: await isConnected() } };
    case 'CONNECT':
      await connect();
      return { ok: true, data: { connected: true } };
    case 'DISCONNECT':
      await disconnect();
      return { ok: true, data: { connected: false } };
    case 'ACCOUNT_KEY':
      return { ok: true, data: { accountKey: await getAccountKey() } };
    case 'LIST_FOLDER':
      return { ok: true, data: await listFolderChildren(request.folderId) };
    case 'GET_DOC_TABS':
      return { ok: true, data: await getDocumentTabs(request.documentId) };
    case 'DOC_TEXT_PREVIEW': {
      const account = await getAccountKey();
      const data = await extractSelectedTabs(request.documentId, request.tabIds, account);
      if (await getAccountKey() !== account) throw new Error('Your Google account changed. Preview the selection again.');
      if (data.tabs.length !== request.tabIds.length) throw new Error('A selected tab is no longer available. Reload the tab list and select again.');
      return { ok: true, data };
    }
    case 'PANEL_STATE': {
      const context = sender.url ? getPageContext(sender.url) : null;
      if (!context || sender.tab?.id === undefined || !request.source.startsWith(`${context.kind}:`)) return { ok: false, error: 'Panel state requires a supported source tab.' };
      const key = `panel:${sender.tab.id}`, mapKey = `panel-map:${sender.tab.id}`;
      // sender.url may retain the URL from content-script injection during SPA navigation.
      // Separate keys prevent a late map selection from reopening a closed panel.
      if (request.graphId) { await checkMap(request.graphId); await browser.storage.session.set({ [mapKey]: { source: request.source, graphId: request.graphId } }); }
      if (request.open !== undefined) await browser.storage.session.set({ [key]: { source: request.source, open: request.open } });
      const stored = await browser.storage.session.get([key, mapKey]);
      const value = stored[key], map = stored[mapKey];
      const same = !!value && typeof value === 'object' && 'source' in value && value.source === request.source;
      const state: PanelState = { open: same && 'open' in value && value.open === true,
        ...(map && typeof map === 'object' && 'source' in map && map.source === request.source && 'graphId' in map && typeof map.graphId === 'string' ? { graphId: map.graphId } : {}),
      };
      return { ok: true, data: state };
    }
    case 'PANEL_PLACEMENT': {
      const key = `panel-placement:v1:${request.kind}`;
      if (request.placement) await browser.storage.local.set({ [key]: request.placement });
      const stored = panelPlacementSchema.safeParse((await browser.storage.local.get(key))[key]);
      return { ok: true, data: stored.success ? stored.data : { mode: 'docked' } };
    }
    case 'PANEL_PREFERENCES': {
      const key = `panel-preferences:v1:${request.kind}`;
      if (request.preferences) await browser.storage.local.set({ [key]: request.preferences });
      const stored = panelPreferencesSchema.safeParse((await browser.storage.local.get(key))[key]);
      return { ok: true, data: stored.success ? stored.data : { width: request.kind === 'docs' ? 580 : 780, dock: request.kind === 'docs' ? 'left' : 'right' } };
    }
    case 'IMPORT_DRIVE_FOLDER':
      return { ok: true, data: await storeImport(await importDriveFolder(request.folderId, await getAccountKey()), request.intoGraphId) };
    case 'IMPORT_DOC_TABS':
      return { ok: true, data: await storeImport(await importDocTabs(request.documentId, await getAccountKey()), request.intoGraphId) };
    case 'LIST_GRAPHS':
      return { ok: true, data: await repository.listGraphs() };
    case 'READ_GRAPH':
      return { ok: true, data: await repository.readGraph(request.graphId) };
    case 'RECALL_DECISIONS': {
      // Lets the reviewer mark or hide repeats instead of presenting a
      // regenerated draft as if nothing had been decided before.
      const prior = await recallDecisions(repository.db, request.graphId, request.draft);
      return {
        ok: true,
        data: {
          nodes: Object.fromEntries(prior.nodes),
          relationships: Object.fromEntries(prior.relationships),
        },
      };
    }
    case 'APPLY_PROPOSALS':
      return { ok: true, data: await applyProposals(repository.db, request) };
    case 'LIST_DECISIONS':
      return { ok: true, data: await listDecisions(repository.db, request.graphId) };
    case 'CHECK_TARGETS': {
      const snapshot = await repository.readGraph(request.graphId);
      if (snapshot.graph.accountScope && snapshot.graph.accountScope !== await getAccountKey()) return { ok: false, error: 'Connect the Google account that owns this map before checking its targets.' };
      // Only Google-backed sources can be checked; a local PDF has no server.
      const targets = snapshot.sources
        .filter((source) => source.provider !== 'local-pdf')
        .map((source) => ({ sourceKey: source.sourceKey, resourceId: source.resourceId }));

      const checks = await checkTargets(targets);
      let changed = 0;
      for (const check of checks) {
        // 'unknown' means the check itself failed, so say nothing about the target.
        if (check.state === 'unknown') continue;
        if (await repository.markSourceAvailability(check.sourceKey, check.state)) changed += 1;
      }

      return {
        ok: true,
        data: {
          checked: checks.length,
          unavailable: checks.filter((c) => c.state === 'unavailable').length,
          unknown: checks.filter((c) => c.state === 'unknown').length,
          changed,
        },
      };
    }
    case 'OPEN_PDF_READER': {
      if (request.graphId) await checkMap(request.graphId);
      const url = new URL(browser.runtime.getURL('/reader.html'));
      if (request.graphId) url.searchParams.set('map', request.graphId);
      await browser.tabs.create({ url: url.href });
      return { ok: true, data: null };
    }
    case 'NAVIGATE': {
      if (request.graphId) await checkMap(request.graphId);
      // The locator is the node's stored destination, so navigation does not
      // depend on layout or on re-reading the source.
      const url = request.locator.kind === 'pdf' ? new URL(pdfReaderPath(request.locator, request.graphId), browser.runtime.getURL('/')).href : destinationUrl(request.locator);
      if (!url) return { ok: false, error: 'This destination is not supported.' };
      // Content scripts cannot open tabs themselves, so the worker does it.
      const context = sender.url ? getPageContext(sender.url) : null;
      const sameDoc = request.locator.kind === 'docs' && context?.kind === 'docs' && context.sourceId === request.locator.documentId && sender.tab?.id !== undefined;
      const destination = getPageContext(url);
      if (request.graphId && destination) {
        // Publish map context before injection, including for a newly opened Doc.
        const tabId = sameDoc ? sender.tab!.id : (await browser.tabs.create({ url: 'about:blank', active: true })).id;
        if (tabId === undefined) throw new Error('The source tab could not be opened.');
        const source = `${destination.kind}:${destination.sourceId}`;
        await browser.storage.session.set({ [`panel:${tabId}`]: { source, open: true }, [`panel-map:${tabId}`]: { source, graphId: request.graphId } });
        await browser.tabs.update(tabId, { url });
      } else if (sameDoc) {
        await browser.tabs.update(sender.tab!.id!, { url });
      } else await browser.tabs.create({ url, active: true });
      return { ok: true, data: { url } };
    }
  }
}

export default defineBackground(() => {
  browser.tabs.onRemoved.addListener((tabId) => { void browser.storage.session.remove([`panel:${tabId}`, `panel-map:${tabId}`]); });
  // Registered synchronously so Chrome can revive the worker to serve a message.
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isTrustedSender(sender, browser.runtime.id)) {
      sendResponse({ ok: false, error: 'Untrusted sender.' } satisfies Response);
      return true;
    }
    handle(request, sender)
      .then(sendResponse)
      .catch((error: unknown) => {
        const needsAuth = error instanceof AuthRequiredError;
        sendResponse({
          ok: false,
          error: storageError(error),
          ...(needsAuth ? { needsAuth: true } : {}),
        } satisfies Response);
      });
    // Keeps the message channel open for the async response above.
    return true;
  });
});
