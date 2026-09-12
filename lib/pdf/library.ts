import { GraphRepository, importedKey } from '../storage/repository';
import { LIMITS, type GraphSnapshot } from '../graph/types';
import { fingerprintPdf, type PdfExtraction } from './extract';
import { importPdfSections, pdfScopeKey } from './import';

export const PDF_LIMITS = { bytes: 20 * 1024 * 1024, pages: 300, totalBytes: 100 * 1024 * 1024 } as const;
export type PdfCatalogMode = 'sections' | 'pages';
const blobId = (fingerprint: string) => `pdf:${fingerprint}`;
const checkFingerprint = (value: string) => { if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('This PDF link is invalid.'); };

export function pdfCatalog(extraction: PdfExtraction, title: string, mode: PdfCatalogMode) {
  const scoped = importPdfSections(extraction, title.slice(0, 200));
  if (mode === 'pages' || !extraction.sections.length) {
    const root = scoped.items[0]!;
    scoped.items = [root, ...Array.from({ length: extraction.pageCount - 1 }, (_, index) => ({
      source: root.source, locator: { kind: 'pdf' as const, fingerprint: extraction.fingerprint, pageIndex: index + 1 }, title: `Page ${index + 2}`, parentKey: importedKey(root),
    }))];
  }
  scoped.complete = scoped.items.length <= LIMITS.nodes;
  scoped.items = scoped.items.slice(0, LIMITS.nodes);
  scoped.scopeKey = mode === 'pages' ? `pdf:pages:${extraction.fingerprint}` : pdfScopeKey(extraction.fingerprint);
  return scoped;
}

/** Only imported by the extension-owned reader, never a Google content script. */
export class PdfLibrary {
  constructor(readonly repository = new GraphRepository()) {}
  async list() {
    const rows = await this.repository.db.blobs.toArray();
    return rows.filter((row) => row.id.startsWith('pdf:')).map(({ id, name, byteSize, createdAt }) => ({ fingerprint: id.slice(4), name: name ?? 'Saved PDF', byteSize, createdAt })).sort((a, b) => b.createdAt - a.createdAt);
  }
  async read(fingerprint: string) { checkFingerprint(fingerprint); return this.repository.db.blobs.get(blobId(fingerprint)); }
  async save(bytes: Uint8Array, name: string, expectedFingerprint?: string) {
    if (!bytes.length || bytes.length > PDF_LIMITS.bytes) throw new Error('Choose a PDF up to 20 MiB.');
    const fingerprint = await fingerprintPdf(bytes);
    if (expectedFingerprint && fingerprint !== expectedFingerprint) throw new Error('This is a different PDF. Choose the exact original file to restore these destinations.');
    const db = this.repository.db;
    await db.transaction('rw', db.blobs, async () => {
      const rows = await db.blobs.toArray();
      const otherBytes = rows.filter((row) => row.id.startsWith('pdf:') && row.id !== blobId(fingerprint)).reduce((sum, row) => sum + row.byteSize, 0);
      if (otherBytes + bytes.length > PDF_LIMITS.totalBytes) throw new Error('The PDF library has reached 100 MiB. Remove a saved PDF before adding another; its graph can stay.');
      await db.blobs.put({ id: blobId(fingerprint), name: name.slice(0, 200), blob: new Blob([bytes.slice().buffer], { type: 'application/pdf' }), mimeType: 'application/pdf', byteSize: bytes.length, createdAt: rows.find((row) => row.id === blobId(fingerprint))?.createdAt ?? Date.now() });
    });
    return fingerprint;
  }
  async remove(fingerprint: string) { checkFingerprint(fingerprint); await this.repository.db.blobs.delete(blobId(fingerprint)); }
  async findMap(fingerprint: string) {
    const keys = [pdfScopeKey(fingerprint), `pdf:pages:${fingerprint}`];
    return (await this.repository.listGraphs()).find((graph) => graph.sourceBindings.some((binding) => keys.includes(binding.key)))?.id;
  }
  async apply(extraction: PdfExtraction, title: string, catalogMode: PdfCatalogMode, old: GraphSnapshot | null, action: 'selected' | 'baseline' | 'refresh', keys: string[]) {
    const source = pdfCatalog(extraction, title, catalogMode), repo = this.repository;
    if (!await this.read(extraction.fingerprint)) throw new Error('Save or reattach the PDF before adding its nodes.');
    return repo.db.transaction('rw', repo.db.tables, async () => {
      const existing = old ? null : await this.findMap(extraction.fingerprint);
      const graph = old?.graph ?? (existing ? (await repo.readGraph(existing)).graph : await repo.createGraph(title.slice(0, 200), crypto.randomUUID(), 'import'));
      const binding = graph.sourceBindings.find((value) => value.key === source.scopeKey);
      const available = new Map(source.items.map((item) => [importedKey(item), item]));
      if (keys.some((key) => !available.has(key))) throw new Error('Choose a section or page from this PDF.');
      if (action === 'selected' && !keys.length) throw new Error('Choose at least one section or page.');
      const mode = action === 'baseline' ? 'baseline' : binding?.mode ?? (binding ? 'baseline' : 'selected');
      const previous = binding?.memberKeys ?? (binding ? old?.nodes.flatMap((node) => node.importKey && available.has(node.importKey) ? [node.importKey] : []) ?? [] : []);
      const members = new Set([...previous, ...(mode === 'baseline' ? available.keys() : keys)]);
      const present = new Set([...members].filter((key) => available.has(key)));
      const items = source.items.filter((item) => present.has(importedKey(item))).map((item) => {
        if (!item.parentKey || present.has(item.parentKey)) return item;
        const { parentKey: _parent, ...entry } = item; return entry;
      });
      await repo.refreshScope(graph.id, graph.contentRevision, { scopeKey: source.scopeKey, accountKey: 'local', complete: source.complete, items, selection: { mode, memberKeys: [...members], missingKeys: source.complete ? [...members].filter((key) => !available.has(key)) : binding?.missingKeys ?? [] } });
      return graph.id;
    });
  }
}
