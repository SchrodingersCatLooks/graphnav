/**
 * Maps authorized Google reads into the shared import shape the repository
 * accepts. This is the M2-B seam: adapters read, the repository stores, and
 * nothing here touches tokens or the database directly.
 */

import { LIMITS } from '../graph/types';
import { importedKey, type ImportedItem } from '../storage/repository';
import type { ScopedImport } from '../messages';
import { getFileMetadata, listFolderChildren } from './drive';
import { getDocumentTabs } from './docs';

export function driveScopeKey(folderId: string): string {
  return `drive:folder:${folderId}`;
}

export function docsScopeKey(documentId: string): string {
  return `docs:tabs:${documentId}`;
}

/**
 * One folder level: the folder itself plus its immediate children, each linked
 * to the folder by `parentKey`. Children load on demand rather than crawling.
 */
export async function importDriveFolder(folderId: string, accountKey: string): Promise<ScopedImport> {
  const [folder, children] = await Promise.all([
    getFileMetadata(folderId),
    listFolderChildren(folderId),
  ]);

  const root: ImportedItem = {
    source: {
      provider: 'google-drive',
      accountKey,
      resourceId: folder.id,
      kind: 'folder',
      title: folder.name,
      ...(folder.webViewLink ? { canonicalUrl: folder.webViewLink } : {}),
    },
    locator: { kind: 'drive', fileId: folder.id, ...(folder.webViewLink ? { webViewLink: folder.webViewLink } : {}) },
    title: folder.name,
  };

  const parentKey = importedKey(root);

  // The repository rejects a refresh over LIMITS.nodes, and the root counts.
  // Trim rather than fail, and report the scope as incomplete when we do.
  const capacity = LIMITS.nodes - 1;
  const visible = children.items.slice(0, capacity);
  const trimmed = children.items.length > visible.length;

  const items: ImportedItem[] = [root];
  for (const child of visible) {
    const link = child.locator.kind === 'drive' ? child.locator.webViewLink : undefined;
    items.push({
      source: {
        provider: 'google-drive',
        accountKey,
        resourceId: child.id,
        kind: child.type === 'folder' ? 'folder' : 'file',
        title: child.title,
        ...(link ? { canonicalUrl: link } : {}),
      },
      locator: { kind: 'drive', fileId: child.id, ...(link ? { webViewLink: link } : {}) },
      title: child.title,
      parentKey,
    });
  }

  return {
    scopeKey: driveScopeKey(folderId),
    complete: !children.truncated && !trimmed,
    title: folder.name,
    accountKey,
    items,
  };
}

/**
 * A document and its tab tree. Nested tabs keep their parent link, so the stored
 * graph preserves the nesting the Docs API reports.
 */
export async function importDocTabs(documentId: string, accountKey: string): Promise<ScopedImport> {
  const document = await getDocumentTabs(documentId);

  const root: ImportedItem = {
    source: {
      provider: 'google-docs',
      accountKey,
      resourceId: documentId,
      kind: 'document',
      title: document.title,
    },
    locator: { kind: 'docs', documentId },
    title: document.title,
  };

  // Adapter item IDs are `${documentId}:${tabId}`; the repository links by
  // importedKey, so translate one to the other before resolving parents.
  const keyByItemId = new Map<string, string>();
  const items: ImportedItem[] = [root];
  const tabs = document.items.slice(0, LIMITS.nodes - 1);
  const trimmed = document.items.length > tabs.length;

  for (const tab of tabs) {
    if (tab.locator.kind !== 'docs' || !tab.locator.tabId) continue;
    const entry: ImportedItem = {
      source: {
        provider: 'google-docs',
        accountKey,
        resourceId: documentId,
        kind: 'document',
        title: document.title,
      },
      locator: { kind: 'docs', documentId, tabId: tab.locator.tabId },
      title: tab.title,
    };
    keyByItemId.set(tab.id, importedKey(entry));
    items.push(entry);
  }

  // Second pass so a parent appearing later in the list still resolves.
  let index = 1;
  for (const tab of tabs) {
    if (tab.locator.kind !== 'docs' || !tab.locator.tabId) continue;
    const parent = tab.parentId ? keyByItemId.get(tab.parentId) : undefined;
    items[index]!.parentKey = parent ?? importedKey(root);
    index += 1;
  }

  return {
    scopeKey: docsScopeKey(documentId),
    complete: !trimmed,
    title: document.title,
    accountKey,
    items,
  };
}
