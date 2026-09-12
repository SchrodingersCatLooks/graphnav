/**
 * Message contract between page-side code and the background worker.
 *
 * Provisional for M1-B. The graph node/edge contract is M1-C and belongs in a
 * jointly agreed `lib/graph/types.ts`; nothing here should be treated as that
 * agreement. Access tokens never appear in these messages.
 */

import { browser } from 'wxt/browser';

export type SourceItem = {
  /** Stable provider ID. Drive file ID, or `${documentId}:${tabId}` for a tab. */
  id: string;
  title: string;
  type: 'folder' | 'file' | 'document' | 'tab';
  /** Parent item ID within the same source, when the provider reports one. */
  parentId?: string;
  /** Where clicking this item must navigate. */
  locator: DriveLocator | DocsLocator;
};

export type DriveLocator = {
  kind: 'drive';
  fileId: string;
  /** Google's own open URL for the file or folder. */
  webViewLink?: string;
};

export type DocsLocator = {
  kind: 'docs';
  documentId: string;
  /** Present for tab nodes; the exact tab the node must open. */
  tabId?: string;
};

export type Request =
  | { type: 'AUTH_STATUS' }
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'ACCOUNT_KEY' }
  | { type: 'LIST_FOLDER'; folderId: string }
  | { type: 'GET_DOC_TABS'; documentId: string }
  | { type: 'IMPORT_DRIVE_FOLDER'; folderId: string }
  | { type: 'IMPORT_DOC_TABS'; documentId: string }
  | { type: 'LIST_GRAPHS' }
  | { type: 'READ_GRAPH'; graphId: string };

export type Response<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; needsAuth?: boolean };

export type AuthStatus = { connected: boolean };
export type AccountKeyResult = { accountKey: string };
/** Returned after an import so the caller can open the stored graph. */
export type ImportResult = { graphId: string; scopeKey: string; nodeCount: number; complete: boolean };
export type ListFolderResult = { items: SourceItem[]; truncated: boolean };
export type DocTabsResult = { title: string; items: SourceItem[] };

/** Typed wrapper so callers do not hand-roll runtime.sendMessage. */
export function sendToBackground<T>(request: Request): Promise<Response<T>> {
  return browser.runtime.sendMessage(request) as Promise<Response<T>>;
}
