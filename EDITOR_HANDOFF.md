# On-page editor integration

Rajvansh owns this integration on `rajvansh-ui` and has incorporated Eddy's `afa7184` folder-expansion checkpoint.
The existing background worker, Google readers, PDF extractor, and Dexie repository remain the shared implementation.
New `lib/editor` messages will expose repository actions and source selection to the same React editor in the workspace and Google-page shadow root.
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
