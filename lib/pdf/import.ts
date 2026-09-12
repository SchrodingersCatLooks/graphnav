/**
 * Maps extracted PDF sections into the shared import shape.
 *
 * A personal PDF graph is local: it is scoped to the document's byte
 * fingerprint rather than a Google account, so the same paper reopens its saved
 * graph on any laptop without any source authorization.
 */

import { importedKey, type ImportedItem } from '../storage/repository';
import type { ScopedImport } from '../messages';
import type { PdfExtraction } from './extract';

/** Local PDFs carry this account key; the repository validates it. */
export const LOCAL_ACCOUNT_KEY = 'local';

export function pdfScopeKey(fingerprint: string): string {
  return `pdf:sections:${fingerprint}`;
}

export function importPdfSections(extraction: PdfExtraction, documentTitle: string): ScopedImport {
  const source = {
    provider: 'local-pdf' as const,
    accountKey: LOCAL_ACCOUNT_KEY,
    resourceId: extraction.fingerprint,
    kind: 'pdf' as const,
    title: documentTitle,
  };

  const root: ImportedItem = {
    source,
    locator: { kind: 'pdf', fingerprint: extraction.fingerprint, pageIndex: 0 },
    title: documentTitle,
  };

  const keyBySectionId = new Map<string, string>();
  const items: ImportedItem[] = [root];
  const seen = new Set<string>([importedKey(root)]);

  for (const section of extraction.sections) {
    const entry: ImportedItem = {
      source,
      locator: {
        kind: 'pdf',
        fingerprint: extraction.fingerprint,
        pageIndex: section.pageIndex,
        ...(section.point ? { point: section.point } : {}),
      },
      title: section.title,
    };

    // A section whose destination is indistinguishable from one already added
    // would collide on import, so drop it rather than fail the whole scope.
    const key = importedKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);

    keyBySectionId.set(section.id, key);
    items.push(entry);
  }

  // Resolve parents after every key exists, so ordering does not matter.
  let index = 1;
  for (const section of extraction.sections) {
    const key = keyBySectionId.get(section.id);
    if (!key) continue;
    const parent = section.parentId ? keyBySectionId.get(section.parentId) : undefined;
    items[index]!.parentKey = parent ?? importedKey(root);
    index += 1;
  }

  return {
    scopeKey: pdfScopeKey(extraction.fingerprint),
    // Heading proposals are a complete reading of what we could detect.
    complete: true,
    title: documentTitle,
    accountKey: LOCAL_ACCOUNT_KEY,
    items,
  };
}
