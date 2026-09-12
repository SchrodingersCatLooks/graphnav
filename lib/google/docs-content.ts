/**
 * Reads the text of selected Google Docs tabs (G1-B).
 *
 * Only tabs the user picked are read. Nested tabs are not pulled in implicitly,
 * because "selected" has to mean what the user chose. Text is grouped under its
 * nearest heading so a reviewer can see where a proposal came from, and the
 * whole read is capped so one request cannot send an entire document.
 */

import { authorizedGet } from './auth';
import { GENERATION_LIMITS, type SourcePassage } from '../generation/types';

type TextRun = { content?: string; textStyle?: { link?: { url?: string } } };
type ParagraphElement = { textRun?: TextRun };
type Paragraph = {
  elements?: ParagraphElement[];
  paragraphStyle?: { namedStyleType?: string; headingId?: string };
};
type TableCell = { content?: StructuralElement[] };
type StructuralElement = {
  paragraph?: Paragraph;
  table?: { tableRows?: Array<{ tableCells?: TableCell[] }> };
};
type Tab = {
  tabProperties?: { tabId?: string; title?: string };
  documentTab?: { body?: { content?: StructuralElement[] } };
  childTabs?: Tab[];
};
type DocumentResponse = { title?: string; revisionId?: string; tabs?: Tab[] };

export type ExtractedTab = { tabId: string; title: string; passages: SourcePassage[] };

export type DocsApiDocument = DocumentResponse;

export type DocsExtraction = {
  documentId: string;
  title: string;
  version: string;
  tabs: ExtractedTab[];
  totalCharacters: number;
  /** True when the cap stopped the read; surfaced rather than hidden. */
  truncated: boolean;
  /** Explicit links found in the selected text only. */
  links: string[];
};

/** Google marks column breaks with a vertical tab inside run content. */
const VERTICAL_TAB = /\v/g;

function isHeading(paragraph: Paragraph): boolean {
  const style = paragraph.paragraphStyle?.namedStyleType ?? '';
  return style.startsWith('HEADING_') || style === 'TITLE' || style === 'SUBTITLE';
}

function paragraphText(paragraph: Paragraph, links: Set<string>): string {
  let text = '';
  for (const element of paragraph.elements ?? []) {
    const run = element.textRun;
    if (!run?.content) continue;
    text += run.content;
    // Links are resolved from what was selected; unselected content is never fetched.
    const url = run.textStyle?.link?.url;
    if (url && /^https:\/\//i.test(url)) links.add(url);
  }
  return text.replace(VERTICAL_TAB, ' ').trimEnd();
}

/** Flattens structural content to text lines, including table cells. */
function* walk(content: StructuralElement[], links: Set<string>): Generator<{ text: string; heading: boolean }> {
  for (const element of content) {
    if (element.paragraph) {
      const text = paragraphText(element.paragraph, links);
      if (text.trim()) yield { text: text.trim(), heading: isHeading(element.paragraph) };
    }
    if (element.table) {
      for (const row of element.table.tableRows ?? []) {
        for (const cell of row.tableCells ?? []) {
          // A table cell holds its own structural content, so recurse.
          yield* walk(cell.content ?? [], links);
        }
      }
    }
  }
}

function findTabs(tabs: Tab[], wanted: Set<string>, found: Tab[]): void {
  for (const tab of tabs) {
    const tabId = tab.tabProperties?.tabId;
    if (tabId && wanted.has(tabId)) found.push(tab);
    // Descend to locate nested tabs, but only collect ones explicitly selected.
    if (tab.childTabs?.length) findTabs(tab.childTabs, wanted, found);
  }
}

export async function extractSelectedTabs(
  documentId: string,
  tabIds: string[],
  accountKey: string,
): Promise<DocsExtraction> {
  const url = new URL(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`);
  url.searchParams.set('includeTabsContent', 'true');
  const document = await authorizedGet<DocumentResponse>(url.toString());
  return extractFromDocument(document, documentId, tabIds, accountKey);
}

/** Pure half, so the contract can be exercised against a fixture with no network. */
export function extractFromDocument(
  document: DocumentResponse,
  documentId: string,
  tabIds: string[],
  accountKey: string,
): DocsExtraction {
  const wanted = new Set(tabIds);
  const selected: Tab[] = [];
  findTabs(document.tabs ?? [], wanted, selected);

  const version = document.revisionId ?? 'unknown-revision';
  const sourceId = `google-docs:${accountKey}:${documentId}`;
  const links = new Set<string>();

  let totalCharacters = 0;
  let truncated = false;
  const tabs: ExtractedTab[] = [];

  for (const tab of selected) {
    const tabId = tab.tabProperties!.tabId!;
    const passages: SourcePassage[] = [];
    let heading: string | undefined;
    let buffer: string[] = [];
    let index = 0;

    const flush = () => {
      const text = buffer.join('\n').trim();
      buffer = [];
      if (!text) return;
      if (passages.length >= GENERATION_LIMITS.maxPassages) { truncated = true; return; }

      const remaining = GENERATION_LIMITS.maxCharacters - totalCharacters;
      if (remaining <= 0) { truncated = true; return; }
      const bounded = text.length > remaining ? text.slice(0, remaining) : text;
      if (bounded.length < text.length) truncated = true;

      totalCharacters += bounded.length;
      passages.push({
        passageId: `${tabId}:${index++}`,
        sourceId,
        accountKey,
        version,
        locator: { kind: 'docs', documentId, tabId },
        ...(heading ? { heading } : {}),
        text: bounded,
        charCount: bounded.length,
      });
    };

    for (const line of walk(tab.documentTab?.body?.content ?? [], links)) {
      if (line.heading) {
        // A heading closes the previous passage and names the next one.
        flush();
        heading = line.text;
      }
      buffer.push(line.text);
      if (totalCharacters >= GENERATION_LIMITS.maxCharacters) { truncated = true; break; }
    }
    flush();

    tabs.push({ tabId, title: tab.tabProperties?.title ?? 'Untitled tab', passages });
  }

  return {
    documentId,
    title: document.title ?? 'Untitled document',
    version,
    tabs,
    totalCharacters,
    truncated,
    links: [...links],
  };
}
