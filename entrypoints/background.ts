import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { AuthRequiredError, connect, disconnect, isConnected } from '../lib/google/auth';
import { getAccountKey } from '../lib/google/account';
import { listFolderChildren } from '../lib/google/drive';
import { getDocumentTabs } from '../lib/google/docs';
import { importDocTabs, importDriveFolder, type ScopedImport } from '../lib/google/import';
import { GraphRepository } from '../lib/storage/repository';
import type { ImportResult, Request, Response } from '../lib/messages';

// Dexie opens lazily and the worker is stopped when idle, so this holds no
// state worth losing. The database lives in the extension origin; content
// scripts reach it only through these messages.
const repository = new GraphRepository();

/** Reuses the graph already bound to this source scope instead of duplicating it. */
async function storeImport(scoped: ScopedImport, accountKey: string): Promise<ImportResult> {
  const graphs = await repository.listGraphs();
  const existing = graphs.find((graph) => graph.sourceBindings.some((b) => b.key === scoped.scopeKey));
  const graph = existing ?? (await repository.createGraph(scoped.title));

  await repository.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: scoped.scopeKey,
    accountKey,
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

async function handle(request: Request): Promise<Response> {
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
    case 'IMPORT_DRIVE_FOLDER': {
      const accountKey = await getAccountKey();
      return { ok: true, data: await storeImport(await importDriveFolder(request.folderId, accountKey), accountKey) };
    }
    case 'IMPORT_DOC_TABS': {
      const accountKey = await getAccountKey();
      return { ok: true, data: await storeImport(await importDocTabs(request.documentId, accountKey), accountKey) };
    }
    case 'LIST_GRAPHS':
      return { ok: true, data: await repository.listGraphs() };
    case 'READ_GRAPH':
      return { ok: true, data: await repository.readGraph(request.graphId) };
    default:
      return { ok: false, error: `Unknown request: ${JSON.stringify(request)}` };
  }
}

export default defineBackground(() => {
  // Registered synchronously so Chrome can revive the worker to serve a message.
  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handle(request as Request)
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
