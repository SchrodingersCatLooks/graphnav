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
  Planned limits are 20 MiB per PDF, 300 pages, 100 MiB total PDF bytes, and the existing 500-node graph limit, with visible errors/partial notices.
- Navigation: reader.html?fingerprint=<hash>&page=<one-based-page>, optional normalized x/y and map ID.
  Stored locators remain zero-based; the reader converts only at the PDF.js boundary.
  A PDF graph node opens the exact page in the current reader when it matches, or another reader page otherwise.
- GraphEditor gets a small extension-page integration hook for source tools, initial map, and typed local navigation.
  Google source messages and OAuth remain unchanged; Google pages still access maps only through the worker.
- JSON graph backups continue to exclude PDF bytes.
  The reader must say this explicitly and request the matching original PDF when bytes are missing, verifying its fingerprint before reattachment.

Eddy retains selected-text/draft/relay work and the underlying extractor contract.
The reader-specific library glue above is claimed by Rajvansh to avoid a duplicate implementation in M4-B.
Real PDF text suitability and V2 evidence acceptance remain open even when synthetic reader tests pass.
