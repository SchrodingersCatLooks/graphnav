/**
 * Storing PDF bytes so a paper reopens with its pages intact (M4-B).
 *
 * Bytes are keyed by the document's own fingerprint rather than by graph, so
 * the same paper opened twice reuses one copy and reconnects to its saved map
 * without any account or authorization.
 *
 * This uses the `blobs` table already declared in the version 1 schema. It adds
 * no table, no index and no version, so it needs no migration.
 *
 * Bytes are deliberately separate from graph records: they are large, they are
 * reconstructible by re-picking the file, and personal notes and layout are
 * not. Evicting bytes must never take someone's work with it.
 */

import type { GraphDatabase } from '../storage/database';
import type { StoredBlob } from '../graph/types';

/** One paper this size is already well past what the reader should hold. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Total kept across all papers before the oldest unused ones are evicted. */
export const MAX_TOTAL_PDF_BYTES = 200 * 1024 * 1024;

const FINGERPRINT = /^[a-f0-9]{64}$/;

export class PdfTooLargeError extends Error {
  constructor(readonly byteSize: number) {
    super(`This PDF is ${Math.round(byteSize / 1024 / 1024)} MB, over the ${MAX_PDF_BYTES / 1024 / 1024} MB limit.`);
    this.name = 'PdfTooLargeError';
  }
}

export class PdfStorageFullError extends Error {
  constructor() {
    super('There is no room to save this PDF. Remove a saved paper and try again.');
    this.name = 'PdfStorageFullError';
  }
}

function assertFingerprint(fingerprint: string): void {
  if (!FINGERPRINT.test(fingerprint)) throw new Error('A stored PDF needs its byte fingerprint.');
}

/**
 * Frees space by removing the oldest stored papers, never anything else.
 *
 * Returns the fingerprints removed so the caller can tell the user which papers
 * now need re-attaching, rather than letting them discover it at open time.
 */
async function evictOldest(db: GraphDatabase, needed: number): Promise<string[]> {
  const stored = await db.blobs.toArray();
  stored.sort((a, b) => a.createdAt - b.createdAt);

  let freed = 0;
  const removed: string[] = [];
  for (const blob of stored) {
    if (freed >= needed) break;
    await db.blobs.delete(blob.id);
    freed += blob.byteSize;
    removed.push(blob.id);
  }
  return removed;
}

export type SaveResult = {
  fingerprint: string;
  byteSize: number;
  /** Papers evicted to make room; empty when nothing was removed. */
  evicted: string[];
};

export async function savePdfBytes(
  db: GraphDatabase,
  fingerprint: string,
  bytes: Uint8Array,
  mimeType = 'application/pdf',
): Promise<SaveResult> {
  assertFingerprint(fingerprint);
  const byteSize = bytes.byteLength;
  if (byteSize === 0) throw new Error('That file is empty.');
  if (byteSize > MAX_PDF_BYTES) throw new PdfTooLargeError(byteSize);

  // Content-addressed, so re-opening the same paper is free.
  const existing = await db.blobs.get(fingerprint);
  if (existing) return { fingerprint, byteSize: existing.byteSize, evicted: [] };

  const stored = await db.blobs.toArray();
  const used = stored.reduce((sum, blob) => sum + blob.byteSize, 0);
  let evicted: string[] = [];

  if (used + byteSize > MAX_TOTAL_PDF_BYTES) {
    evicted = await evictOldest(db, used + byteSize - MAX_TOTAL_PDF_BYTES);
    const remaining = (await db.blobs.toArray()).reduce((sum, blob) => sum + blob.byteSize, 0);
    if (remaining + byteSize > MAX_TOTAL_PDF_BYTES) throw new PdfStorageFullError();
  }

  const record: StoredBlob = {
    id: fingerprint,
    blob: new Blob([bytes.slice() as unknown as BlobPart], { type: mimeType }),
    mimeType,
    byteSize,
    createdAt: Date.now(),
  };

  try {
    await db.blobs.put(record);
  } catch (error) {
    // Quota failures must surface, never be swallowed into a silent no-save.
    const name = (error as { name?: string } | undefined)?.name;
    if (name === 'QuotaExceededError') throw new PdfStorageFullError();
    throw error;
  }

  return { fingerprint, byteSize, evicted };
}

/** Undefined means the paper needs re-attaching, which is not an error. */
export async function loadPdfBytes(db: GraphDatabase, fingerprint: string): Promise<Uint8Array | undefined> {
  assertFingerprint(fingerprint);
  const record = await db.blobs.get(fingerprint);
  if (!record) return undefined;
  return new Uint8Array(await record.blob.arrayBuffer());
}

export async function hasPdfBytes(db: GraphDatabase, fingerprint: string): Promise<boolean> {
  assertFingerprint(fingerprint);
  return (await db.blobs.get(fingerprint)) !== undefined;
}

/** Removing bytes never touches graph records, so personal work survives. */
export async function forgetPdfBytes(db: GraphDatabase, fingerprint: string): Promise<boolean> {
  assertFingerprint(fingerprint);
  if (!(await db.blobs.get(fingerprint))) return false;
  await db.blobs.delete(fingerprint);
  return true;
}

export type PdfStorageUsage = { count: number; totalBytes: number; limitBytes: number };

export async function pdfStorageUsage(db: GraphDatabase): Promise<PdfStorageUsage> {
  const stored = await db.blobs.toArray();
  return {
    count: stored.length,
    totalBytes: stored.reduce((sum, blob) => sum + blob.byteSize, 0),
    limitBytes: MAX_TOTAL_PDF_BYTES,
  };
}
