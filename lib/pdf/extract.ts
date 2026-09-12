/**
 * PDF section extraction.
 *
 * Embedded bookmarks are the first choice because they are the author's own
 * structure. When a document has none, headings are proposed from text with
 * page positions and labelled as such, so a proposal is never presented as the
 * author's outline. Neither path claims to understand the argument.
 */

export type SectionOrigin = 'outline' | 'heading';

export type PdfSection = {
  /** Stable within one document: path through the section tree. */
  id: string;
  title: string;
  /** Zero-based, matching the stored locator. */
  pageIndex: number;
  /** Normalized 0..1 position on the page, used to distinguish same-page sections. */
  point?: { x: number; y: number };
  parentId?: string;
  origin: SectionOrigin;
};

export type PdfExtraction = {
  fingerprint: string;
  pageCount: number;
  sections: PdfSection[];
  /** 'heading' means these are proposals the user should be able to correct. */
  origin: SectionOrigin;
  /** Sections dropped because their destination was indistinguishable from another. */
  mergedDuplicates: number;
};

/** Minimal surface of the PDF.js document we depend on, so tests can stand in for it. */
export type PdfDocumentLike = {
  numPages: number;
  getOutline(): Promise<OutlineNode[] | null>;
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: unknown): Promise<number>;
  getPage(pageNumber: number): Promise<PdfPageLike>;
};

export type OutlineNode = { title?: string; dest?: unknown; items?: OutlineNode[] };

export type PdfPageLike = {
  view: number[];
  getTextContent(): Promise<{ items: Array<{ str?: string; transform?: number[]; height?: number }> }>;
};

/** Content-addressed so the same paper reopens its saved graph on any laptop. */
export async function fingerprintPdf(bytes: Uint8Array): Promise<string> {
  const source = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer
    : bytes.slice().buffer;
  const digest = await crypto.subtle.digest('SHA-256', source as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pageSize(document: PdfDocumentLike, pageIndex: number): Promise<{ width: number; height: number }> {
  const [x0, y0, x1, y1] = (await document.getPage(pageIndex + 1)).view;
  return { width: Math.abs((x1 ?? 612) - (x0 ?? 0)) || 612, height: Math.abs((y1 ?? 792) - (y0 ?? 0)) || 792 };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Resolves an outline destination to a page index and, where given, a position. */
async function resolveDestination(
  document: PdfDocumentLike,
  dest: unknown,
): Promise<{ pageIndex: number; point?: { x: number; y: number } } | undefined> {
  try {
    const resolved = typeof dest === 'string' ? await document.getDestination(dest) : dest;
    if (!Array.isArray(resolved) || resolved.length === 0) return undefined;

    const pageIndex = typeof resolved[0] === 'number'
      ? resolved[0]
      : await document.getPageIndex(resolved[0]);
    if (!Number.isInteger(pageIndex) || pageIndex < 0) return undefined;

    // An XYZ destination carries coordinates; Fit-style destinations do not.
    const x = typeof resolved[2] === 'number' ? resolved[2] : undefined;
    const y = typeof resolved[3] === 'number' ? resolved[3] : undefined;
    if (x === undefined && y === undefined) return { pageIndex };

    const { width, height } = await pageSize(document, pageIndex);
    return {
      pageIndex,
      // PDF origin is bottom-left; store top-down so it reads like the page.
      point: { x: clamp01((x ?? 0) / width), y: clamp01(1 - (y ?? 0) / height) },
    };
  } catch {
    // A malformed destination should skip one section, not fail the document.
    return undefined;
  }
}

async function fromOutline(document: PdfDocumentLike): Promise<PdfSection[]> {
  const outline = await document.getOutline();
  if (!outline?.length) return [];

  const sections: PdfSection[] = [];

  async function walk(nodes: OutlineNode[], parentId: string | undefined, path: string): Promise<void> {
    for (const [index, node] of nodes.entries()) {
      const id = `${path}${index}`;
      const title = node.title?.trim();
      const target = node.dest === undefined ? undefined : await resolveDestination(document, node.dest);

      // A bookmark with no usable destination is still a real heading, so keep
      // it as a parent for its children rather than dropping the subtree.
      if (title && target) {
        sections.push({ id, title, pageIndex: target.pageIndex, point: target.point, parentId, origin: 'outline' });
      }
      if (node.items?.length) await walk(node.items, title && target ? id : parentId, `${id}.`);
    }
  }

  await walk(outline, undefined, '');
  return sections;
}

/**
 * Fallback when a document has no bookmarks: treat text noticeably larger than
 * the page's most common size as a heading proposal.
 */
async function fromHeadings(document: PdfDocumentLike): Promise<PdfSection[]> {
  const sections: PdfSection[] = [];

  for (let pageIndex = 0; pageIndex < document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex + 1);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => (item.str ?? '').trim().length > 0);
    if (items.length === 0) continue;

    const sizeOf = (item: { transform?: number[]; height?: number }) =>
      Math.abs(item.transform?.[0] ?? item.height ?? 0);

    const sizes = items.map(sizeOf).filter((size) => size > 0).sort((a, b) => a - b);
    if (sizes.length === 0) continue;
    const median = sizes[Math.floor(sizes.length / 2)]!;
    const { width, height } = await pageSize(document, pageIndex);

    for (const [index, item] of items.entries()) {
      // 20% larger than the page's typical text, and short enough to be a title.
      const title = (item.str ?? '').trim();
      if (sizeOf(item) < median * 1.2 || title.length > 120) continue;
      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      sections.push({
        id: `p${pageIndex}.${index}`,
        title,
        pageIndex,
        point: { x: clamp01(x / width), y: clamp01(1 - y / height) },
        origin: 'heading',
      });
    }
  }

  return sections;
}

export async function extractSections(document: PdfDocumentLike, fingerprint: string): Promise<PdfExtraction> {
  const outlineSections = await fromOutline(document);
  const sections = outlineSections.length > 0 ? outlineSections : await fromHeadings(document);
  const origin: SectionOrigin = outlineSections.length > 0 ? 'outline' : 'heading';

  // Two sections resolving to the same page and position are one destination as
  // far as the stored locator is concerned, so keep the first and count the rest.
  const seen = new Set<string>();
  const unique: PdfSection[] = [];
  let mergedDuplicates = 0;
  for (const section of sections) {
    const key = `${section.pageIndex}:${section.point?.x ?? ''}:${section.point?.y ?? ''}`;
    if (seen.has(key)) { mergedDuplicates += 1; continue; }
    seen.add(key);
    unique.push(section);
  }

  return { fingerprint, pageCount: document.numPages, sections: unique, origin, mergedDuplicates };
}
