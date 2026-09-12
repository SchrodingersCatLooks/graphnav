# Selected-content and generation integration

Rajvansh claims G1-A on rajvansh-ui after PDF reader PR #10.
Latest observed Eddy checkpoint: 179d98f, with G1-B types/extraction, authored demo paper, provider-agnostic request path, and scale tests.
This checkpoint integrates those files with preservation, not a rewrite or a second generator.

## Ownership and API boundary

- Rajvansh owns the shared selection/preview UI in components/generation, its GraphEditor/reader hooks, a typed DOC_TEXT_PREVIEW background message, and the new lib/pdf/selected-text.ts adapter.
  PDF preview reads only user-selected pages through the already loaded PDF.js document and fills local SourcePassage identities and page locators.
  This explicitly moves that small new PDF text adapter to the UI integration lane; Eddy should not duplicate it.
- Eddy retains lib/google/docs-content.ts extraction, server relay/provider startup, and G3-B proposal persistence/migrations.
  Rajvansh's integration will apply the bounded review fixes below to the existing types/request files and global passage cap, with tests and a published checkpoint.
  Bring that checkpoint into partner-data before changing the same lines.
- DOC_TEXT_PREVIEW accepts a document ID and unique selected tab IDs, validates the sender and authenticated account in the background, and returns the existing DocsExtraction shape.
  The Google API currently returns the document body; only selected tabs are processed into the displayed/submitted preview.
  Do not claim that Google fetched only selected tabs.
- Preview is separate from Generate.
  It displays selected source names, purpose, character/page limits, complete submitted passage text and truncation before any model call.
  New selection or source changes invalidate the old preview; late preview responses cannot replace newer choices.
  Generation/review will reuse this panel inside Docs and the PDF reader.
  Drive folders support structural baselines now; semantic reading of arbitrary Drive file types is not implied.

## Review fixes to integrate before real requests

- The 200-passage limit is global across selected tabs, not per tab.
  Validate character totals against actual text, unique passage IDs and existing IDs, matching account/source/locator identity, and bounded selections.
- Hash the complete validated input, including account, locator, source version and allowed existing node IDs.
  A text-identical response must not apply to another account, destination or map context.
- Validate empty drafts against the full schema/input hash before returning empty.
  Timeout/cancel must settle promptly and ignore late output, even if a provider does not cooperate with abort.
  Keep refusal, invalid, empty, busy and unavailable outcomes distinct.
- No direct OpenAI credential in extension code/storage, tests, GitHub or chat.
  The API account/funding/private server key remains G0-A; preview and mocked request/review checks can proceed.

## Acceptance

Use the selected Docs fixture, authored PDF and isolated installed extension for exact selection, nested-tab exclusion, character/passages caps, stale response cancellation, text preview and preserved manual editing.
Real generation and evidence usefulness remain open until the server-held credential and a real provider run are configured.
A clean fixture test does not complete G2/G3/G4 or claim a model call.
