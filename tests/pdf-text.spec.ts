import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractSelectedPages } from '../lib/pdf/selected-text';
import { fingerprintPdf } from '../lib/pdf/extract';
import { generationInputSchema } from '../lib/generation/types';

test('PDF text extraction reads only chosen pages and produces validated page evidence', async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = new Uint8Array(await readFile('tests/fixtures/demo-paper.pdf'));
  const task = pdfjs.getDocument({ data: bytes.slice(), useWorkerFetch: false, standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)) });
  const pdf = await task.promise, fingerprint = await fingerprintPdf(bytes), pages: number[] = [];
  try {
    const document = { numPages: pdf.numPages, getPage: async (page: number) => { pages.push(page); return pdf.getPage(page); } };
    const result = await extractSelectedPages(document, fingerprint, [1, 1], new AbortController().signal);
    expect(pages).toEqual([2]);
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0]!.text).toContain('Twenty-four participants');
    expect(result.passages[0]!.locator).toEqual({ kind: 'pdf', fingerprint, pageIndex: 1 });
    expect(generationInputSchema.safeParse({ purpose: 'concept-connections', documentId: fingerprint, passages: result.passages, totalCharacters: result.totalCharacters, truncated: result.truncated, existingNodeIds: [] }).success).toBe(true);
    const controller = new AbortController(); controller.abort();
    await expect(extractSelectedPages(document, fingerprint, [0], controller.signal)).rejects.toThrow();
    await expect(extractSelectedPages(document, fingerprint, [3], new AbortController().signal)).rejects.toThrow('valid PDF pages');
    expect(pages).toEqual([2]);
  } finally { await task.destroy(); }
});
