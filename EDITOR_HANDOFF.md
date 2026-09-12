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

Eddy's next needed integration is G0-B/G1-B: a minimal relay and bounded selected-content/draft contract.
API ownership is unresolved; the relay can be implemented and tested without committing a credential or claiming a live model call.
Keep schema additions additive and publish the contract before Rajvansh wires generation review controls.

## PR #9 integration and G1-B review

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

G0-B implementation and mock-provider checks can proceed without a credential.
Actual model acceptance remains blocked until the account owner configures a server-held key and spending limit privately.
No real model call or completed generation UI is claimed.
