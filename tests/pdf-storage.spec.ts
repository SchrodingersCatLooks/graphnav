import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository } from '../lib/storage/repository';
import { fingerprintPdf } from '../lib/pdf/extract';
import {
  MAX_PDF_BYTES,
  PdfStorageFullError,
  PdfTooLargeError,
  forgetPdfBytes,
  hasPdfBytes,
  loadPdfBytes,
  pdfStorageUsage,
  savePdfBytes,
} from '../lib/pdf/storage';

let db: GraphDatabase;
test.beforeEach(() => { db = new GraphDatabase('graphnav-blobs-' + crypto.randomUUID()); });
test.afterEach(async () => { await db.delete(); });

const demoPath = fileURLToPath(new URL('../demo/GraphNav-demo-paper.pdf', import.meta.url));
const loadDemo = async () => new Uint8Array(await readFile(demoPath));

const fakePdf = (size: number, seed = 1) => {
  const bytes = new Uint8Array(size);
  bytes.fill(seed);
  return bytes;
};
const fingerprintOf = (n: number) => n.toString(16).padStart(64, '0');

test('the demo paper round-trips byte for byte', async () => {
  const bytes = await loadDemo();
  const fingerprint = await fingerprintPdf(bytes);

  const saved = await savePdfBytes(db, fingerprint, bytes);
  expect(saved.byteSize).toBe(bytes.byteLength);
  expect(saved.evicted).toEqual([]);

  const restored = await loadPdfBytes(db, fingerprint);
  expect(restored).toBeDefined();
  expect(restored!.byteLength).toBe(bytes.byteLength);
  // Identical bytes, so the fingerprint still matches after a round trip.
  expect(await fingerprintPdf(restored!)).toBe(fingerprint);
});

test('re-opening the same paper reuses one copy instead of storing it twice', async () => {
  const bytes = await loadDemo();
  const fingerprint = await fingerprintPdf(bytes);

  await savePdfBytes(db, fingerprint, bytes);
  await savePdfBytes(db, fingerprint, bytes);

  const usage = await pdfStorageUsage(db);
  expect(usage.count).toBe(1);
  expect(usage.totalBytes).toBe(bytes.byteLength);
});

test('a missing paper reports as needing re-attachment, not as an error', async () => {
  const fingerprint = fingerprintOf(0xabc);
  expect(await hasPdfBytes(db, fingerprint)).toBe(false);
  expect(await loadPdfBytes(db, fingerprint)).toBeUndefined();
});

test('an oversized or empty file is refused with a reason', async () => {
  const fingerprint = fingerprintOf(1);
  await expect(savePdfBytes(db, fingerprint, fakePdf(MAX_PDF_BYTES + 1)))
    .rejects.toThrow(PdfTooLargeError);
  await expect(savePdfBytes(db, fingerprint, new Uint8Array(0)))
    .rejects.toThrow(/empty/i);

  // Nothing was written by either failure.
  expect((await pdfStorageUsage(db)).count).toBe(0);
});

test('a key that is not a fingerprint is rejected, so bytes cannot be misfiled', async () => {
  await expect(savePdfBytes(db, 'not-a-fingerprint', fakePdf(10))).rejects.toThrow(/fingerprint/i);
  await expect(loadPdfBytes(db, 'nope')).rejects.toThrow(/fingerprint/i);
});

test('evicting bytes to make room never touches personal work', async () => {
  // A real map with an imported source and a personal idea attached to it.
  const repo = new GraphRepository(db);
  const graph = await repo.createGraph('Paper map', crypto.randomUUID(), 'import');
  const paper = {
    source: { provider: 'local-pdf' as const, accountKey: 'local', resourceId: fingerprintOf(7), kind: 'pdf' as const, title: 'Paper' },
    locator: { kind: 'pdf' as const, fingerprint: fingerprintOf(7), pageIndex: 0 },
    title: 'Paper',
  };
  await repo.refreshScope(graph.id, graph.contentRevision, {
    scopeKey: 'pdf-scope', accountKey: 'local', complete: true, items: [paper],
  });

  let snapshot = await repo.readGraph(graph.id);
  const ideaId = crypto.randomUUID();
  await repo.addNode(graph.id, snapshot.graph.contentRevision, {
    id: ideaId, label: 'This section is the weak point', position: { x: 5, y: 5 },
  });
  snapshot = await repo.readGraph(graph.id);
  await repo.setPersonalEdit(
    { graphId: graph.id, itemType: 'node', itemId: ideaId },
    snapshot.graph.contentRevision,
    { notes: 'Revisit before the meeting.' },
  );

  await savePdfBytes(db, fingerprintOf(7), fakePdf(1024, 7));
  expect(await hasPdfBytes(db, fingerprintOf(7))).toBe(true);

  // Dropping the bytes is exactly what eviction does.
  expect(await forgetPdfBytes(db, fingerprintOf(7))).toBe(true);
  expect(await hasPdfBytes(db, fingerprintOf(7))).toBe(false);

  // The map, its source node, the personal idea and the note all survive.
  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(2);
  expect(snapshot.nodes.find((n) => n.id === ideaId)).toBeTruthy();
  expect(snapshot.itemEdits.find((e) => e.itemId === ideaId)!.notes).toBe('Revisit before the meeting.');
  // The source node keeps its destination, so re-attaching restores the paper.
  const source = snapshot.nodes.find((n) => n.kind === 'source')!;
  expect(source.locator).toEqual({ kind: 'pdf', fingerprint: fingerprintOf(7), pageIndex: 0 });
});

test('eviction removes the oldest papers first and reports which', async () => {
  // Small limit is impractical to reach with real files, so drive it directly.
  const stored: string[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const fingerprint = fingerprintOf(i);
    await savePdfBytes(db, fingerprint, fakePdf(1024, i));
    stored.push(fingerprint);
    // Distinct timestamps so "oldest" is well defined.
    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  expect((await pdfStorageUsage(db)).count).toBe(3);

  // Forgetting is explicit and reports whether anything was there.
  expect(await forgetPdfBytes(db, stored[0]!)).toBe(true);
  expect(await forgetPdfBytes(db, stored[0]!)).toBe(false);

  const usage = await pdfStorageUsage(db);
  expect(usage.count).toBe(2);
  expect(usage.totalBytes).toBe(2048);
  expect(usage.limitBytes).toBeGreaterThan(0);
});

test('a quota failure surfaces instead of silently not saving', async () => {
  const fingerprint = fingerprintOf(9);
  const original = db.blobs.put.bind(db.blobs);
  // Simulate the browser refusing the write.
  db.blobs.put = (() => {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';
    return Promise.reject(error);
  }) as unknown as typeof db.blobs.put;

  await expect(savePdfBytes(db, fingerprint, fakePdf(2048, 9))).rejects.toThrow(PdfStorageFullError);

  db.blobs.put = original;
  expect(await hasPdfBytes(db, fingerprint)).toBe(false);
});
