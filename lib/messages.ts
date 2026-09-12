/**
 * Message contract between page-side code and the background worker.
 *
 * Provisional for M1-B. The graph node/edge contract is M1-C and belongs in a
 * jointly agreed `lib/graph/types.ts`; nothing here should be treated as that
 * agreement. Access tokens never appear in these messages.
 */

import { browser } from 'wxt/browser';
import type { Locator } from './graph/types';
import type { ImportedItem } from './storage/repository';

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
  | { type: 'PANEL_STATE'; source: string; open?: boolean }
  /** `intoGraphId` expands a folder into an existing map instead of starting a new one. */
  | { type: 'IMPORT_DRIVE_FOLDER'; folderId: string; intoGraphId?: string }
  | { type: 'IMPORT_DOC_TABS'; documentId: string; intoGraphId?: string }
  | { type: 'LIST_GRAPHS' }
  | { type: 'READ_GRAPH'; graphId: string }
  | { type: 'NAVIGATE'; locator: Locator }
  | { type: 'CHECK_TARGETS'; graphId: string };

export type Response<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; needsAuth?: boolean };

export type AuthStatus = { connected: boolean };
export type AccountKeyResult = { accountKey: string };
/** Returned after an import so the caller can open the stored graph. */
/** One source scope ready to hand to the repository. */
export type ScopedImport = {
  scopeKey: string;
  /** False when a read was cut short, so the repository keeps unseen children. */
  complete: boolean;
  title: string;
  accountKey: string;
  items: ImportedItem[];
};

export type ImportResult = { graphId: string; scopeKey: string; nodeCount: number; complete: boolean };
/** Where a NAVIGATE request actually sent the user. */
export type NavigateResult = { url: string };
/** `unknown` means the check failed, not that the target is gone. */
export type CheckTargetsResult = { checked: number; unavailable: number; unknown: number; changed: number };
export type ListFolderResult = { items: SourceItem[]; truncated: boolean };
export type DocTabsResult = { title: string; items: SourceItem[] };

/** Typed wrapper so callers do not hand-roll runtime.sendMessage. */
export function sendToBackground<T>(request: Request): Promise<Response<T>> {
  return browser.runtime.sendMessage(request) as Promise<Response<T>>;
}
