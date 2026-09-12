import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { AuthRequiredError, connect, disconnect, isConnected } from '../lib/google/auth';
import { listFolderChildren } from '../lib/google/drive';
import { getDocumentTabs } from '../lib/google/docs';
import type { Request, Response } from '../lib/messages';

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
    case 'LIST_FOLDER':
      return { ok: true, data: await listFolderChildren(request.folderId) };
    case 'GET_DOC_TABS':
      return { ok: true, data: await getDocumentTabs(request.documentId) };
    default:
      return { ok: false, error: `Unknown request: ${JSON.stringify(request)}` };
  }
}

export default defineBackground(() => {
  // Registered synchronously so Chrome can revive the worker to serve a message.
  // The worker is stopped when idle, so no state is kept here between messages.
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
