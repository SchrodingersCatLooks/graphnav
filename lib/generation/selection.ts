import type { SourcePassage } from './types';
import { sendToBackground, type DocTabsResult } from '../messages';
import type { DocsExtraction } from '../google/docs-content';

export type TextChoice = { id: string; title: string; detail?: string };
export type SelectedText = { documentId: string; passages: SourcePassage[]; totalCharacters: number; truncated: boolean; notices: string[] };
export type GenerationSource = {
  id: string;
  kind: 'docs' | 'pdf';
  disclosure: string;
  choices: () => Promise<TextChoice[]>;
  read: (ids: string[], signal: AbortSignal) => Promise<SelectedText>;
};
export function docsGenerationSource(documentId: string): GenerationSource {
  return {
    id: `docs:${documentId}`, kind: 'docs',
    disclosure: 'Google returns this document through its API. Only the tabs you choose enter this preview. Nothing is sent to AI by previewing.',
    choices: async () => {
      const result = await sendToBackground<DocTabsResult>({ type: 'GET_DOC_TABS', documentId });
      if (!result.ok) throw new Error(result.error);
      const items = result.data.items;
      return items.flatMap((item) => item.locator.kind === 'docs' && item.locator.tabId ? [{ id: item.locator.tabId, title: item.title, detail: item.parentId ? `Inside ${items.find((parent) => parent.id === item.parentId)?.title ?? 'a parent tab'}` : 'Document tab' }] : []);
    },
    read: async (tabIds, signal) => {
      signal.throwIfAborted();
      const result = await sendToBackground<DocsExtraction>({ type: 'DOC_TEXT_PREVIEW', documentId, tabIds });
      signal.throwIfAborted();
      if (!result.ok) throw new Error(result.error);
      const data = result.data;
      const empty = data.tabs.filter((tab) => !tab.passages.length).map((tab) => tab.title);
      return { documentId, passages: data.tabs.flatMap((tab) => tab.passages), totalCharacters: data.totalCharacters, truncated: data.truncated, notices: empty.length ? [`No text was included from: ${empty.join(', ')}. It may be empty or beyond the preview limit.`] : [] };
    },
  };
}
