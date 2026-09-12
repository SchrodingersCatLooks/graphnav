/** Google Docs tab reads. Tab IDs are the navigation targets the graph must keep. */

import { authorizedGet } from './auth';
import type { DocTabsResult, SourceItem } from '../messages';

type Tab = {
  tabProperties?: { tabId?: string; title?: string; parentTabId?: string };
  childTabs?: Tab[];
};

type DocumentResponse = { title?: string; tabs?: Tab[] };

/** Tabs nest arbitrarily deep, so flatten while keeping the parent link. */
function flatten(tabs: Tab[], documentId: string, out: SourceItem[]): void {
  for (const tab of tabs) {
    const tabId = tab.tabProperties?.tabId;
    if (tabId) {
      out.push({
        id: `${documentId}:${tabId}`,
        title: tab.tabProperties?.title ?? 'Untitled tab',
        type: 'tab',
        parentId: tab.tabProperties?.parentTabId
          ? `${documentId}:${tab.tabProperties.parentTabId}`
          : undefined,
        locator: { kind: 'docs', documentId, tabId },
      });
    }
    if (tab.childTabs?.length) flatten(tab.childTabs, documentId, out);
  }
}

export async function getDocumentTabs(documentId: string): Promise<DocTabsResult> {
  const url = new URL(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`);
  // Without this the response omits the tab tree entirely.
  url.searchParams.set('includeTabsContent', 'true');

  const document = await authorizedGet<DocumentResponse>(url.toString());
  const items: SourceItem[] = [];
  flatten(document.tabs ?? [], documentId, items);

  return { title: document.title ?? 'Untitled document', items };
}
