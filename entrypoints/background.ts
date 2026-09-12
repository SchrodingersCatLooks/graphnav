import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { AuthRequiredError, connect, disconnect, isConnected } from '../lib/google/auth';
import { getAccountKey } from '../lib/google/account';
import { listFolderChildren } from '../lib/google/drive';
import { getDocumentTabs } from '../lib/google/docs';
import { importDocTabs, importDriveFolder } from '../lib/google/import';
import { GraphRepository } from '../lib/storage/repository';
import { destinationUrl } from '../lib/graph/types';
import { isTrustedSender, requestSchema } from '../lib/requests';
import type { ImportResult, Request, Response, ScopedImport } from '../lib/messages';

// Dexie opens lazily and the worker is stopped when idle, so this holds no
// state worth losing. The database lives in the extension origin; content
// scripts reach it only through these messages.
const repository = new GraphRepository();

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

  const bound = graphs.find((graph) => graph.sourceBindings.some((b) => b.key === scoped.scopeKey));
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

async function handle(raw: unknown): Promise<Response> {
  // Parsed, not cast: an unknown or malformed message is rejected before any
  // token is touched or any source operation runs.
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Unsupported request.' };
  const request: Request = parsed.data;

  switch (request.type) {
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
    case 'IMPORT_DRIVE_FOLDER':
      return { ok: true, data: await storeImport(await importDriveFolder(request.folderId, await getAccountKey()), request.intoGraphId) };
    case 'IMPORT_DOC_TABS':
      return { ok: true, data: await storeImport(await importDocTabs(request.documentId, await getAccountKey()), request.intoGraphId) };
    case 'LIST_GRAPHS':
      return { ok: true, data: await repository.listGraphs() };
    case 'READ_GRAPH':
      return { ok: true, data: await repository.readGraph(request.graphId) };
    case 'NAVIGATE': {
      // The locator is the node's stored destination, so navigation does not
      // depend on layout or on re-reading the source.
      const url = destinationUrl(request.locator);
      if (!url) return { ok: false, error: 'This destination opens in the PDF reader, which is M4.' };
      // Content scripts cannot open tabs themselves, so the worker does it.
      await browser.tabs.create({ url, active: true });
      return { ok: true, data: { url } };
    }
  }
}

export default defineBackground(() => {
  // Registered synchronously so Chrome can revive the worker to serve a message.
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isTrustedSender(sender)) {
      sendResponse({ ok: false, error: 'Untrusted sender.' } satisfies Response);
      return true;
    }
    handle(request)
      .then(sendResponse)
      .catch((error: unknown) => {
        const needsAuth = error instanceof AuthRequiredError;
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          ...(needsAuth ? { needsAuth: true } : {}),
        } satisfies Response);
      });
    // Keeps the message channel open for the async response above.
    return true;
  });
});
