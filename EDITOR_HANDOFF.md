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

The Storage manifest permission stores only transient panel state in extension-owned session storage.
PANEL_STATE includes current URL context because Chrome sender.url can retain the original URL during SPA navigation.
No Google page IndexedDB or page storage holds private maps or panel preferences.
ELK runs with the shared editor, outside database transactions; sources are committed before optional layout, and a layout failure is reported separately.
Repository arrangement preserves user pins and revision checks.
Same-document navigation and current-tab highlighting are implemented, not pending backend work.

Eddy's next needed integration is G0-B/G1-B: a minimal relay and bounded selected-content/draft contract.
API ownership is unresolved; the relay can be implemented and tested without committing a credential or claiming a live model call.
Keep schema additions additive and publish the contract before Rajvansh wires generation review controls.
