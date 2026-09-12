import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GENERATION_LIMITS, type SourcePassage } from '../generation/types';
import type { SelectedText } from '../generation/selection';

type ReadablePdf = Pick<PDFDocumentProxy, 'numPages' | 'getPage'>;
/** Parse only selected pages, using the reader's existing PDF.js document. */
export async function extractSelectedPages(document: ReadablePdf, fingerprint: string, pageIndices: number[], signal: AbortSignal): Promise<SelectedText> {
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('This PDF identity is invalid.');
  const selected = [...new Set(pageIndices)].sort((a, b) => a - b);
  if (!selected.length || selected.length > GENERATION_LIMITS.maxPassages || selected.some((page) => !Number.isInteger(page) || page < 0 || page >= document.numPages)) throw new Error('Choose between 1 and 200 valid PDF pages.');
  const passages: SourcePassage[] = [], empty: number[] = [];
  let totalCharacters = 0, truncated = false;
  for (const pageIndex of selected) {
    signal.throwIfAborted();
    if (totalCharacters >= GENERATION_LIMITS.maxCharacters) { truncated = true; break; }
    const page = await document.getPage(pageIndex + 1);
    signal.throwIfAborted();
    const content = await page.getTextContent();
    signal.throwIfAborted();
    let text = '';
    for (const item of content.items) if ('str' in item) text += `${item.str}${item.hasEOL ? '\n' : ' '}`;
    text = text.trim();
    if (!text) { empty.push(pageIndex + 1); continue; }
    const bounded = text.slice(0, GENERATION_LIMITS.maxCharacters - totalCharacters);
    if (bounded.length < text.length) truncated = true;
    totalCharacters += bounded.length;
    passages.push({ passageId: `page:${pageIndex}`, sourceId: `local-pdf:${fingerprint}`, accountKey: 'local', version: fingerprint, locator: { kind: 'pdf', fingerprint, pageIndex }, heading: `Page ${pageIndex + 1}`, text: bounded, charCount: bounded.length });
  }
  return { documentId: fingerprint, passages, totalCharacters, truncated, notices: empty.length ? [`No selectable text on page${empty.length === 1 ? '' : 's'} ${empty.join(', ')}. OCR is not available.`] : [] };
}
