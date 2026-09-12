import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository, importedKey } from '../lib/storage/repository';
import { PdfLibrary, pdfCatalog, PDF_LIMITS } from '../lib/pdf/library';
import type { PdfExtraction } from '../lib/pdf/extract';

async function setup() {
  const db = new GraphDatabase(`pdf-library-${crypto.randomUUID()}`);
  const repository = new GraphRepository(db), library = new PdfLibrary(repository);
  const fingerprint = await library.save(new TextEncoder().encode('Synthetic bytes for storage tests; parsing is tested separately.'), 'Paper.pdf');
  const extraction: PdfExtraction = { fingerprint, pageCount: 3, origin: 'outline', mergedDuplicates: 0, sections: [
    { id: 'methods', title: 'Methods', pageIndex: 1, origin: 'outline' },
    { id: 'results', title: 'Results', pageIndex: 2, origin: 'outline' },
  ] };
  return { db, repository, library, extraction };
}
test('selected PDF import stays selected after refresh and preserves personal notes and connections', async () => {
  const { db, repository, library, extraction } = await setup();
  try {
    const catalog = pdfCatalog(extraction, 'Paper', 'sections');
    const methods = catalog.items.find((item) => item.title === 'Methods')!;
    const id = await library.apply(extraction, 'Paper', 'sections', null, 'selected', [importedKey(methods)]);
    let snapshot = await repository.readGraph(id);
    expect(snapshot.nodes).toHaveLength(1);
    const nodeId = snapshot.nodes[0]!.id;
    await repository.setPersonalEdit({ graphId: id, itemType: 'node', itemId: nodeId }, snapshot.graph.contentRevision, { displayLabel: 'My method name', notes: 'Keep my analysis' });
    snapshot = await repository.readGraph(id);
    const idea = await repository.addNode(id, snapshot.graph.contentRevision, { id: crypto.randomUUID(), label: 'My project', body: '', position: { x: 200, y: 100 } });
    snapshot = await repository.readGraph(id);
    await repository.connect(id, snapshot.graph.contentRevision, { id: crypto.randomUUID(), label: 'informs', members: [{ nodeId, role: 'from' }, { nodeId: idea, role: 'to' }] });
    snapshot = await repository.readGraph(id);
    await library.apply({ ...extraction, sections: [...extraction.sections, { id: 'new', title: 'New section', pageIndex: 0, point: { x: .2, y: .5 }, origin: 'outline' }] }, 'Paper', 'sections', snapshot, 'refresh', []);
    const refreshed = await repository.readGraph(id);
    expect(refreshed.nodes).toHaveLength(2);
    expect(refreshed.itemEdits[0]).toMatchObject({ displayLabel: 'My method name', notes: 'Keep my analysis' });
    expect(refreshed.relationships).toHaveLength(1);
    await library.remove(extraction.fingerprint);
    expect(await library.read(extraction.fingerprint)).toBeUndefined();
    expect(await repository.readGraph(id)).toEqual(refreshed);
  } finally { await db.delete(); }
});
test('simultaneous initial imports reuse one map and invalid selections leave no partial graph', async () => {
  const { db, repository, library, extraction } = await setup();
  try {
    await expect(library.apply(extraction, 'Paper', 'sections', null, 'selected', ['invented'])).rejects.toThrow('Choose a section');
    expect(await repository.listGraphs()).toHaveLength(0);
    expect(await db.nodes.count()).toBe(0);
    const ids = await Promise.all([
      library.apply(extraction, 'Paper', 'sections', null, 'baseline', []),
      library.apply(extraction, 'Paper', 'sections', null, 'baseline', []),
    ]);
    expect(new Set(ids).size).toBe(1);
    expect(await repository.listGraphs()).toHaveLength(1);
    expect((await repository.readGraph(ids[0]!)).nodes).toHaveLength(3);
  } finally { await db.delete(); }
});
test('PDF library bounds and exact fingerprints reject replacement without losing existing bytes', async () => {
  const { db, library, extraction } = await setup();
  try {
    const original = await library.read(extraction.fingerprint);
    await expect(library.save(new Uint8Array([1, 2]), 'Wrong.pdf', extraction.fingerprint)).rejects.toThrow('exact original');
    await expect(library.save(new Uint8Array(PDF_LIMITS.bytes + 1), 'Too large.pdf')).rejects.toThrow('20 MiB');
    // Model a full library without allocating 100 MiB in the test process.
    await db.blobs.put({ id: `pdf:${'a'.repeat(64)}`, blob: new Blob(), mimeType: 'application/pdf', byteSize: PDF_LIMITS.totalBytes, createdAt: 0 });
    await expect(library.save(new Uint8Array([3, 4]), 'Extra.pdf')).rejects.toThrow('100 MiB');
    expect((await library.read(extraction.fingerprint))?.byteSize).toBe(original?.byteSize);
    expect(await db.blobs.count()).toBe(2);
    expect(await library.list()).toContainEqual(expect.objectContaining({ name: 'Saved PDF', fingerprint: 'a'.repeat(64) }));
  } finally { await db.delete(); }
});
test('a PDF without a usable outline offers every page as a real destination', async () => {
  const { db, extraction } = await setup();
  try {
    const catalog = pdfCatalog({ ...extraction, origin: 'heading', sections: [] }, 'Paper', 'sections');
    expect(catalog.items.map((item) => item.locator)).toEqual([0, 1, 2].map((pageIndex) => ({ kind: 'pdf', fingerprint: extraction.fingerprint, pageIndex })));
    expect(catalog.items.slice(1).every((item) => item.parentKey === importedKey(catalog.items[0]!))).toBe(true);
  } finally { await db.delete(); }
});
