# PDF reader integration boundary

Rajvansh claims M4-A on rajvansh-ui, starting from main at 8250221.
This checkpoint implements the local reader and source-assisted manual graph without requiring a model credential.
G1-A/G2-A/G3-A generation controls remain separate open tasks and will be reused in the reader once available.

- Entry point: reader.html, linked from the extension popup and personal workspace.
  It is an extension-owned page with a local file picker, saved PDF library, readable page viewer, page/section suggestions, and the shared GraphEditor beside the paper.
- Reuse Eddy's lib/pdf/extract.ts and import.ts; do not create another PDF parser or schema.
  A new lib/pdf/library.ts owns reader-specific blob storage and selected/baseline imports using GraphRepository transactions.
- Original bytes are stored in the existing blobs table under pdf:<SHA-256>.
  StoredBlob gains an optional name for the library label; no index/schema-version change is required, and older blobs remain valid.
  Parsing and hashing happen before transactions; failed quota/import work must not leave a partially created graph.
- Use one bundled pdfjs-dist version and worker.
  WXT copies its standard fonts, character maps, and decoding assets during build; no CDN scripts or fonts.
  Enforced limits are 20 MiB per PDF, 300 pages, 100 MiB total PDF bytes, and the existing 500-node graph limit, with visible errors/partial notices.
- Navigation: reader.html?fingerprint=<hash>&page=<one-based-page>, optional normalized x/y and map ID.
  Stored locators remain zero-based; the reader converts only at the PDF.js boundary.
  A PDF graph node opens the exact page in the current reader when it matches, or another reader page otherwise.
- GraphEditor gets a small extension-page integration hook for source tools, initial map, and typed local navigation.
  Google source messages and OAuth remain unchanged; Google pages still access maps only through the worker.
- JSON graph backups continue to exclude PDF bytes.
  The reader must say this explicitly and request the matching original PDF when bytes are missing, verifying its fingerprint before reattachment.

Eddy retains the underlying section extractor, Docs text extraction, relay/provider, and proposal-persistence lane.
GENERATION_HANDOFF now assigns the new lib/pdf/selected-text.ts and reader preview bridge to Rajvansh for G1-A integration; do not duplicate that file.
The reader-specific library glue above is claimed by Rajvansh to avoid a duplicate implementation in M4-B.
Real PDF text suitability and V2 evidence acceptance remain open even when synthetic reader tests pass.

## Merged reader checkpoint

PR #10 merged as dc57282; runtime e30ff42 passes typecheck/build/all 58 tests.
PDF.js fonts, worker, character maps and decoders are bundled locally; extension CSP permits wasm-unsafe-eval for the bundled decoders, without JavaScript unsafe-eval or a remote script origin.
Google OAuth and permissions are unchanged.
Installed Chromium tests prove three page jumps, distinct same-page anchors, selection-only refresh, personal notes, full restart, backup copies, byte deletion, wrong-file rejection and exact reattachment.
Screenshots were inspected and PDF text-layer CSS is scoped so it cannot style the editor sidebar.
This is the manual reader slice; V2 controls, OCR/password support, and final real-content acceptance are not claimed complete.

## Partner checkpoint 2e89d18 integration review

This checkpoint adds lib/pdf/storage.ts after the reader and lib/pdf/library.ts already merged in PR #10.
It has not been merged into main or connected to the reader.
Use the existing PdfLibrary contract from current main before adding another persistence path.
The reader keys bytes as pdf:<SHA-256>, saves the original name, enforces 20 MiB per file and 100 MiB total, and verifies exact-byte reattachment.
The new helper uses bare fingerprints and different 50/200 MiB limits, so its records would not reopen through the current reader.
Its eviction scans the entire blobs table rather than PDF records and deletes before the final put outside a transaction; a quota failure can therefore remove old bytes without saving the new file.
These differences require reconciliation, not a second store wired beside the first.
The existing installed reader tests already cover saved bytes, restart, exact reattachment and retaining map edits when bytes are removed.
Eddy should bring main into partner-data, retain the current PdfLibrary path, and focus M4-B on independent paper acceptance or missing shared-reader cases.
His checkpoint remains preserved on partner-data.
