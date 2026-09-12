# On-page editor integration

Rajvansh's integration is merged on main through PR #6 (`4cfe83d`), including Eddy's runtime through `4738cb2`.
The existing background worker, Google readers, PDF extractor, and Dexie repository remain the shared implementation.
The `lib/editor` messages expose repository actions and source selection to the same React editor in the workspace and Google-page shadow root.
Only the background worker opens the database for on-page UI requests.

The small shared-schema addition is optional source-binding metadata: `mode` (`selected` or `baseline`), `memberKeys`, and `missingKeys`.
Old bindings remain valid and behave as baselines.
These fields record the user's selection so Refresh cannot silently import an entire folder into a selected-only map.
Missing keys mean absent from the latest complete scope read, not proof that a file was deleted.
Personal nodes, labels, notes, connections, and layout remain separate and survive refresh.

The editor service validates selected IDs against authorized adapter results; the page cannot supply trusted source metadata.
Nested folder reads reuse Eddy's adapter and expand into the current map.
Same-document destinations navigate in the current Docs tab; other destinations open separately.
Eddy can continue content extraction and generation work without editing the shell, editor components, or editor service.
This is a published handoff, not evidence that the other assistant has read it.

The existing Storage permission stores transient per-tab state in extension-owned session storage and width/dock preferences in extension-owned local storage.
PANEL_PREFERENCES validates drive/docs surface, width preset (420/580/780), and left/right dock.
No OAuth scopes or database schema changed in PR #9.
PANEL_STATE includes current URL context because Chrome sender.url can retain the original URL during SPA navigation.
No Google page IndexedDB or page storage holds private maps or panel preferences.
ELK runs with the shared editor, outside database transactions; sources are committed before optional layout, and a layout failure is reported separately.
Repository arrangement preserves user pins and revision checks.
Same-document navigation and current-tab highlighting are implemented, not pending backend work.

Eddy's next integration is G3-B: persistent proposals and accept/edit/reject decisions, using the boundary in GENERATION_HANDOFF.
Selected-content extraction, the local relay and one real OpenAI PDF generation are merged through PR #13.
Keep schema additions additive and publish the typed proposal API before Rajvansh wires G3-A review controls.

## Historical PR #9 integration and G1-B review

PR #9 (`487b315`) adds focus/collapse, shared list/canvas pagination, bounded layout, saved panel preferences, and source-availability UI.
The UI calls the existing CHECK_TARGETS handler; do not create another availability checker.
Focus uses a compact preview without changing saved positions; ordinary layout continues to preserve pins.
The main runtime passes typecheck/build/52 tests, and a temporary combination with Eddy's `f412f9b` passes all 63 tests.
Eddy's G1-B files remain unmerged in their own review lane.

The proposed passage/draft shape is suitable for the React editor; React Flow still consumes projected graph records after an accepted draft is applied.
Before wiring the relay, Eddy should address these concrete review points in G1-B/G2-B:

- Apply the 200-passage limit across all selected tabs; extractFromDocument currently checks the per-tab passages array.
- Validate passage character counts, their total, unique passage IDs, and one selected source/account against actual input rather than trusting numeric fields supplied with text.
- Bind hashGenerationInput to source/account/locator identity and the allowed existing-node set as well as purpose, document ID, version and text.
- Describe the boundary precisely: the Docs API returns document tab content, while the extractor processes the selected tabs for preview/submission.
  Unsupported header/footer/footnote/image text must not be described as fully analyzed.

These earlier G1/G2 review points were addressed in the integration through PR #13.
Its verified model call returned eight ideas and eight connections from two authored PDF pages; persistent review and full real-source acceptance remain open.
See relay/README.md for private configuration, actual request limits and the verified provider result.

## PR #15 project-map navigation

PR #15 merged as e5dcb88, runtime bcfd0d7.
The existing editor and PdfLibrary imports already support chosen Doc/PDF sources in one map; the new UI exposes target-map selection before adding items.
OPEN_PDF_READER accepts an optional graphId and opens the private reader with that target map.
NAVIGATE accepts optional graphId, carries it in the extension-owned PDF URL, and seeds the Doc panel/map before navigating a new or existing Doc tab.
PANEL_STATE optionally reads/writes graphId through a separate panel-map session key so late map selection cannot reopen a closed panel.
Map requests from Google content scripts keep the existing account ownership check.
No Dexie schema, proposal store, acceptance methods or backup formats changed.
Installed tests cover selected membership, a personal Doc/PDF edge, navigation both ways, separate refresh, independent maps and complete restart.
Combined multi-source AI input is still open and must not be inferred from shared-map membership.
