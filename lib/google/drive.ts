/** Drive folder reads. Metadata only; the granted scope cannot read file bodies. */

import { authorizedGet } from './auth';
import type { ListFolderResult, SourceItem } from '../messages';

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FIELDS = 'nextPageToken,files(id,name,mimeType,parents,webViewLink)';

/** Bounded so one call cannot walk an entire Drive. */
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
};

type FileListResponse = { files?: DriveFile[]; nextPageToken?: string };

/** Metadata for one file or folder, used to label the container being imported. */
export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', 'id,name,mimeType,parents,webViewLink');
  return authorizedGet<DriveFile>(url.toString());
}

function toItem(file: DriveFile, folderId: string): SourceItem {
  return {
    id: file.id,
    title: file.name,
    type: file.mimeType === FOLDER_MIME ? 'folder' : 'file',
    parentId: file.parents?.[0] ?? folderId,
    locator: { kind: 'drive', fileId: file.id, webViewLink: file.webViewLink },
  };
}

/**
 * Immediate children of one folder. Children load on demand, one level at a
 * time, rather than crawling the tree.
 */
export async function listFolderChildren(folderId: string): Promise<ListFolderResult> {
  const items: SourceItem[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    url.searchParams.set('fields', FIELDS);
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    url.searchParams.set('orderBy', 'folder,name');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const page = await authorizedGet<FileListResponse>(url.toString());
    for (const file of page.files ?? []) items.push(toItem(file, folderId));

    pageToken = page.nextPageToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  return { items, truncated: Boolean(pageToken) };
}
