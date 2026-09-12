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
import type { GraphDraft, SourcePassage } from './generation/types';
import type { GenerationRequest } from './generation/ui-service';
import type { PanelPlacement } from './panel-placement';

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
  | { type: 'AI_STATUS' }
  | { type: 'OPEN_AI_SETTINGS' }
  | { type: 'PAIR_RELAY'; code: string }
  | { type: 'FORGET_RELAY' }
  | ({ type: 'GENERATE_DRAFT' } & GenerationRequest)
  | { type: 'CANCEL_DRAFT'; requestId: string }
  | { type: 'AUTH_STATUS' }
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'ACCOUNT_KEY' }
  | { type: 'LIST_FOLDER'; folderId: string }
  | { type: 'GET_DOC_TABS'; documentId: string }
  | { type: 'DOC_TEXT_PREVIEW'; documentId: string; tabIds: string[] }
  | { type: 'PANEL_STATE'; source: string; open?: boolean; graphId?: string }
  | { type: 'PANEL_PREFERENCES'; kind: 'drive' | 'docs'; preferences?: PanelPreferences }
  | { type: 'PANEL_PLACEMENT'; kind: 'drive' | 'docs'; placement?: PanelPlacement }
  /** `intoGraphId` expands a folder into an existing map instead of starting a new one. */
  | { type: 'IMPORT_DRIVE_FOLDER'; folderId: string; intoGraphId?: string }
  | { type: 'IMPORT_DOC_TABS'; documentId: string; intoGraphId?: string }
  | { type: 'LIST_GRAPHS' }
  | { type: 'READ_GRAPH'; graphId: string }
  | { type: 'OPEN_PDF_READER'; graphId?: string }
  | { type: 'NAVIGATE'; locator: Locator; graphId?: string }
  | { type: 'CHECK_TARGETS'; graphId: string }
  /** G3-B review outcomes. */
  | { type: 'RECALL_DECISIONS'; graphId: string; draft: GraphDraft }
  | { type: 'APPLY_PROPOSALS'; graphId: string; revision: number; draft: GraphDraft; inputHash: string;
      passages: SourcePassage[]; sourceTitle: string;
      acceptNodes: Array<{ tempId: string; label?: string }>;
      acceptRelationships: Array<{ tempId: string; label?: string }>;
      rejectNodeTempIds: string[]; rejectRelationshipTempIds: string[] }
  | { type: 'LIST_DECISIONS'; graphId: string };

export type Response<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; needsAuth?: boolean };

export type AuthStatus = { connected: boolean };
export type PanelState = { open: boolean; graphId?: string };
export type PanelPreferences = { width: 420 | 580 | 780; dock: 'left' | 'right' };
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
