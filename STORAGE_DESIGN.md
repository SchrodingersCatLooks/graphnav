# GraphNav storage design

M1-C design by Rajvansh for joint review with Eddy.
The user approved IndexedDB/Dexie and asked Rajvansh to implement the first slice.
Initial shared types, version-1 database, repository commands, and the My maps workspace are now implemented on `rajvansh-ui`.
The broader fields and workflows below remain a design target; [lib/graph/types.ts](https://github.com/SchrodingersCatLooks/graphnav/blob/88a4d00/lib/graph/types.ts) is the current exact record format, and [M1C_HANDOFF.md](./M1C_HANDOFF.md) resolves the overlap with Eddy's proposal.
The first slice supports manual editing, positions/view, validated backup/import, and fixture-tested source reconciliation.
AI drafts, PDF reading/blob import, cache eviction, collapsed/resized layouts, unavailable-target UI, and live Google graph import are still pending.
Eight stores are declared; sourceCache and blobs are reserved and unused by this first workspace.
Schema version 1 is implemented; no later production upgrade exists yet.
It covers manual maps, imported Drive/Docs/PDF structure, editable AI drafts, relationships with multiple participants, and movable graph/panel layouts.
The current release order remains manual V1 followed by GPT-assisted V2.

## Recommendation and current state

Use one extension-owned IndexedDB database named `graphnav`, accessed through Dexie and a small GraphNav repository API.
Store graphs, source records, user edits, positions, cache, and PDF bytes there.
Use `chrome.storage.local` only for small application preferences.
Keep Google tokens in the background/Chrome Identity flow and future model-provider secrets on the generation server.
Neither is graph data.

The implementation uses Dexie, Zod validation, and React Flow.
It incorporates Eddy's stable manifest ID and M1-B auth/read checkpoint unchanged; no hosted database is provisioned.
This refines the earlier plan to put graph metadata in `chrome.storage.local`: related records and atomic edits belong together in IndexedDB.
Chrome's local storage API has a default 10 MB quota; IndexedDB is a better fit for indexed records, transactions, and file blobs.
Dexie supplies a small API for those transactions and versioned upgrades.
These are design choices based on our workload, not a claim that IndexedDB is best for every product.

An extension's own pages and service worker share extension-origin storage.
A content script opening IndexedDB would instead use its host page's storage.
Therefore the Drive/Docs interface requests graph operations from the extension background worker; it never opens the page's IndexedDB.
The current extension-owned My maps page calls the repository on the extension origin.
The future PDF reader can use a narrow file-blob repository path on the same origin.
[Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [extension storage ownership](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies), [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()).

## GitHub, devices, and backups

GitHub contains the schema/types, migrations, repository code, synthetic fixtures, and tests.
Every installed extension creates its own database using that code.
Private graphs, document text, PDF bytes, tokens, and actual database exports do not go into GitHub.
Sharing code or the same Google folder does not share either person's graph edits.

V1 saves locally in one Chrome profile, supports offline personal editing, and requires no database account or hosting bill.
It does not synchronize between laptops or provide live collaboration.
Use versioned export/import for intentional transfer and backup.
If automatic cross-device sync or shared simultaneous editing becomes a release requirement, add an authenticated backend and a server database such as PostgreSQL as a separate task.
That will require user/access tables and explicit conflict handling; the local schema is not a complete cloud security model.
There is no need for a graph database server or vector database in this design.

Stabilize the extension ID before storing real user work.
The M1-B public manifest key should produce `pidejkbkldalibjaehjfpjkcpjpcenpk`.
Changing extension identity creates a different storage origin; identical IDs on two laptops still do not synchronize their databases.
Browser reloads and normal same-ID updates should retain saved data; migrations must preserve it.
Local storage is not a permanent backup: uninstalling, profile loss, storage clearing, or failures can remove local data.

## One node can have many connections; one relationship can have many members

A node may participate in any number of stored relationships, subject to practical storage/loading limits.
Do not store a single parent or a single outgoing connection as the graph model.
A folder tree is one imported set of `contains` relationships, not a limit on the graph.

A relationship contains a bounded-on-input list of members, each with a `nodeId` and role.
For an ordinary directed connection, use one `from` and one `to` member.
For a relationship involving several things, use several participants in the same record.
For example, Budget and Staff jointly `constrain` Launch has two `from` members and one `to`.
An undirected group uses `peer` roles.
Do not mix directed and peer roles in the same relationship.

Require at least two distinct member nodes, all in the same graph.
Directed relationships need at least one member on each side.
Allow multiple differently labeled relationships between the same nodes and allow cycles.
A connection to another relationship is represented through an explicit idea/relationship-description node, not recursive references between relationship records in V1.

React Flow displays two-member relationships as ordinary lines.
For three or more members, the renderer creates one labeled junction and lines to the participants.
The junction is a display object with a stable key such as `relationship:<id>`; it is not an extra source or AI claim.
Store its dragged position in the layout table.
Do not turn a group into every possible pair, because that changes its meaning.
The editor should allow adding/removing members and labeling the relationship.
[React Flow edge endpoints](https://reactflow.dev/api-reference/types/edge).

## The database tables

IndexedDB calls these object stores.
They are tables of structured records, with indexes; records can contain small typed arrays or objects.
The initial database declares eight stores for V1; add the ninth when V2 generation is implemented.
The table below includes later planned fields; use the checked-in schemas for currently accepted values.
Do not add separate tables per source provider, per graph, or per UI surface.

All mutable durable records have creation/update timestamps.
Identifiers are stable strings; timestamps do not determine identity.
The database version and exported-file version are explicit and separate.

| Store | Key and main fields | Purpose and indexes |
| --- | --- | --- |
| `graphs` | `id` UUID; `title`; `createdVia` manual/import/ai; `accountScope`; `sourceBindings[]`; `contentRevision`; `view: {x,y,zoom}`; `lastOpenedAt`; `deletedAt?` | One map, including an empty personal map. Index account scope and update/open times. Each source binding records its root source, load/refresh coverage, cursor, and last successful version. A graph may have several selected sources; automatic whole-Drive discovery is not implied. |
| `sources` | `id` UUID; unique `sourceKey`; `provider`; `accountKey`; `resourceId`; `kind`; original `title`; `canonicalUrl?`; `version?`; `availability`; `blobId?`; `lastCheckedAt?` | The real folder, file, Doc, PDF, or supported future resource. Index sourceKey and provider/account. One source can appear in several graphs without copying its PDF bytes. A tab or section is a location within a source, not a new provider integration. |
| `nodes` | `id` UUID; `graphId`; `kind` source/idea/note; `origin` imported/manual/ai; `baseLabel`; `body?`; `sourceId?`; `locator?`; `importKey?`; `sourceVersion?`; `evidence[]`; `generationRef?`; `deletedAt?` | The things on the map. Index graphId, sourceId, and unique [graphId, importKey] when importKey exists. Manual nodes may have no destination. Imported labels stay original; personal label overrides live in itemEdits. |
| `relationships` | `id` UUID; `graphId`; `members: [{nodeId,role}]`; derived `memberNodeIds[]`; `kind`; `baseLabel`; `origin` imported/manual/ai; `explanation?`; `evidence[]`; `importKey?`; `generationRef?`; `deletedAt?` | One labeled relationship with two or more members. Index graphId, a multi-entry memberNodeIds index, and unique [graphId, importKey] for imports. Recompute the lookup array inside the same transaction; it is never independent user input. |
| `itemEdits` | key [`graphId`, `itemType`, `itemId`]; `displayLabel?`; `notes?`; `hidden?` | User overrides for a node or relationship. These survive source refresh. Empty text, false, and an absent override have distinct meanings. An idea/note's primary text belongs in nodes; this store also permits a personal annotation on a source node. |
| `layoutItems` | key [`graphId`, `itemType`, `itemId`]; `x`; `y`; `width?`; `height?`; `collapsed?`; `pinned?` | Node and relationship-junction positions in graph coordinates. Dimensions are persisted only for intentional user sizing, not React Flow's temporary measured bounds. Index graphId. One saved layout per graph initially. |
| `sourceCache` | `id`; `sourceId`; `sourceVersion`; `chunkKey`; `payload`; `byteSize`; `lastAccessedAt`; `expiresAt?` | Reconstructible API pages, extracted sections, and content chunks. Index [sourceId, sourceVersion, chunkKey] uniquely and lastAccessedAt for cleanup. Never make this the only home for accepted notes or AI evidence. |
| `blobs` | `id` SHA-256 of bytes; `blob`; `mimeType`; `byteSize`; `createdAt` | Original imported PDF bytes, stored once per content hash. The display filename is source metadata and does not define identity. Store binary Blob data rather than base64 inside graph records. |
| `generationRuns` - V2 | `id`; `graphId`; `inputRefs[]`; model/prompt versions; run status; bounded `proposals[]`; each proposal's ID, canonical key, evidence, decision, and accepted item IDs | Keep AI drafts and acceptance/rejection records separate from the live graph. Index graphId and creation time. Add this store when generation begins, not as a reason to block V1. |

Undefined optional import keys are omitted so manual rows do not collide in an import index.
Validate references and invariants in the repository: IndexedDB does not enforce SQL-style foreign keys.
There is no membership join table in V1 because IndexedDB can store the small member list atomically with the relationship.
If server-side relational querying becomes necessary, this list can map to a relationship-members table there.

## Source identity and navigation

`sourceKey` is built from a provider namespace, verified account key, and stable provider resource ID.
It never uses a display name, folder path, Chrome tab ID, or a URL account slot such as `u/0` as identity.
Eddy's authenticated adapter supplies the verified account key.
For a local PDF, use its byte hash with a local account namespace.
Get-or-create a source by its unique sourceKey, then preserve the assigned internal ID.

For imported nodes, build a canonical importKey from source ID and stable locator.
Upsert by [graphId, importKey]; preserve the existing node ID on every refresh.
Containment relation identity is based on endpoint IDs and relationship kind, not titles.
Renaming a file or moving it between folders therefore does not create a new file node.
Several maps of the same source get independent graph/node/layout records.

Use a tagged locator object instead of treating every destination as a generic URL:

| Source | Stored locator | What a click does |
| --- | --- | --- |
| Drive folder/file | Source resource ID and provider kind | Opens the file/folder through its adapter; folder expansion reads children separately. |
| Google Doc tab | Document source ID plus stable tab ID, including nested tabs | Opens that tab in the existing editor. |
| Doc passage evidence | Tab ID, source version, exact quote, and available provider range/anchor | Shows the supporting passage; opens its tab if precise passage navigation is unavailable. Do not promise an arbitrary paragraph jump without verifying provider support. |
| PDF section | PDF source/hash; named destination if present, otherwise zero-based page index plus normalized page coordinates; optional quote | Opens the retained PDF at the destination, with a page fallback if a more precise anchor cannot be resolved. |
| Personal idea/note | No locator required | Opens its editable details; attach a source later if desired. |
| Future provider | Provider namespace, resource ID, and versioned locator payload | Requires a real adapter; storing a URL alone does not implement another platform. |

Keep Google account scopes separate.
Initially allow one Google account scope per graph, plus local PDFs and ideas.
A source-free graph is local; attaching a Google source explicitly binds that graph to the chosen account.
The service worker validates the source/account against the request and current authorization.
Switching accounts must not query the old account's cache as the new one.
This prevents accidental account mixing within a local profile; it is not an encrypted multiuser access-control system.
Multiple local sources in one graph are supported by the model; cross-source importing UI can remain a later step.

## Personal edits and refresh

An imported node's baseLabel/version and an imported containment relationship may change on refresh.
Personal nodes, manual/accepted-AI relationships, itemEdits, and layoutItems are not overwritten.
Read the effective display label as the override when present, otherwise the base label.

1. Read source updates outside the database transaction.
2. Identify the exact successfully refreshed scope, including all pages for a folder whose child list is being reconciled.
3. In a short transaction, upsert imported rows by stable import keys, preserve user records, and record the successful scope/version.
4. Mark known unavailable targets and show a refresh result.
   A partial page, failed request, expired token, or empty cache never proves the rest of the graph was deleted.
   A provider response may mean missing or inaccessible; use an honest unavailable state rather than assuming permanent deletion.

If a file moves, update imported containment; preserve the file node, personal links, and position.
If a source disappears, keep a placeholder so the user can inspect, relink, or remove their work.
If PDF bytes change, treat the result as a new source and request an explicit replacement/remapping action.
Do not silently point existing section nodes at different pages.

Deleting a personal node affects this graph only.
In one transaction, tombstone it, remove its memberships, and tombstone relationships left with fewer than two members or without a required directed side.
Clean up its layout/override rows as appropriate.
Hide imported nodes using itemEdits rather than deleting source files.
Graph deletion never deletes Google files; PDF bytes can be removed only after references are checked and the user has chosen to remove the stored file.
No full event log or collaborative undo system is needed initially.

## AI-created graphs use the same live tables

Generation selects supported content and records its source IDs, locators, and input versions.
An evidence reference contains sourceId, locator, sourceVersion/content hash, and a short exact quote.
Cache eviction must not discard evidence attached to a durable accepted node or relationship.
A valid quote proves provenance, not that the model's interpretation is correct.

Write proposals into generationRuns, not immediately into live nodes/relationships.
Validate every proposed source reference against the selected input.
The user can accept, edit, or reject proposals individually or review a whole draft.
Acceptance writes ordinary graph rows with origin `ai` plus a generationRef and records the decision atomically.
Existing node references use IDs supplied to the model; new temporary proposal IDs are mapped to permanent IDs by our code.

Regeneration creates a new draft and never rewrites the live graph.
Use canonical proposal keys based on normalized member identities, relationship kind/label, and source anchors to suppress exact repeated accepted/rejected suggestions.
Preserve decision records even when old raw drafts are trimmed.
This is deterministic duplicate handling, not a guarantee of recognizing every paraphrase; differently worded proposals may still need review.
User removal of accepted content remains recorded and is not automatically undone by regeneration.
If a source changes, label old evidence as potentially stale instead of silently replacing the cited passage.

## Save graph positions separately from browser placement

- A node's x/y is in graph coordinates.
  Moving it updates one layoutItems row; it never changes a source locator or moves a Drive file.
- The graph's pan and zoom are in graphs.view.
  Restore them on reopening; use Fit view when the saved view is unusable on a smaller screen.
  Another open tab should not be forced to follow every pan.
- The extension panel's dock side, width, and optional floating position belong in `chrome.storage.local` preferences per supported surface.
  Use normalized viewport placement plus a saved size, and clamp to the current visual viewport so the header/X remain reachable.
- Do not persist DOM elements, React components, transient selection/focus, measured browser rectangles, access tokens, or Chrome window/tab IDs as lasting graph identity.

Autosave completed node moves on drag end, completed canvas movements, and submitted edits.
Debounce text/continuous controls for responsiveness, with an explicit flush on blur/close; show Saving/Saved/Failed based on acknowledged database commits.
Do not rely solely on an unload handler to save the graph.
[React Flow viewport format](https://reactflow.dev/api-reference/types/react-flow-json-object).

## Writes, concurrency, and capacity

Expose shared commands such as createGraph, addNode, editItem, connectMembers, removeNode, saveLayout, refreshScope, and acceptProposal.
The Drive/Docs content script calls a validated background message API.
The repository checks graph/account ownership, member existence, locator shape, input sizes, and expected contentRevision.
Use transactions for changes affecting several records; a failure must leave the previous complete graph intact.
Fetch APIs and call models before starting the short write transaction.
[Dexie transaction behavior](https://dexie.org/docs/Dexie/Dexie.transaction()).

Graph content edits use a revision check so a stale tab cannot silently overwrite another tab's changes.
Reload the latest state and expose a conflict if an edit cannot safely be reapplied.
For layout, use per-item updates and let the last completed move of that item win.
Generate stable IDs before create commands; after a lost acknowledgement reload before retrying a mutation.
Never replace the entire graph from an old UI snapshot.
Keep worker state in the database, since service-worker globals are not durable.
[Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

The PDF reader writes immutable blobs by hash through its extension-origin file path rather than sending a giant base64 message through the content script.
Only create a source reference after the Blob write succeeds; unreferenced interrupted-import blobs are reclaimable.
All mutable graph commands still use the repository's transaction and revision rules.

Load folders on demand, paginate providers, and query stored relationships using the member-node index.
Start with the existing plan's roughly 50 visible nodes; cached data can be larger.
New layout runs position new/unpinned items and preserve manually positioned items.
Neither opening the graph nor importing a folder requires reading the whole Drive.

Use storage estimates, an explicit cache byte budget, and least-recently-used cleanup of reconstructible sourceCache records.
Do not auto-evict personal edits, accepted evidence/decisions, or a user's only stored PDF.
Request persistent storage where supported and handle denial; consider unlimitedStorage only with a measured need and a reviewed permission change.
Even unlimitedStorage is not protection from a full disk, uninstall, or profile loss.
On quota/write errors, retain the last saved state, show the unsaved change, and offer cache cleanup or export.
Test the planned limits rather than claiming production-scale capacity from the schema.
[Chrome storage persistence and quotas](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies).

## Schema changes, export, and source actions

Use explicit IndexedDB schema versions and Dexie upgrade functions.
Commit each migration and synthetic old-version fixture in GitHub.
Do not clear and recreate the database to handle upgrades.
An old extension tab blocking an upgrade gets a close/reload prompt.
Keep a failed migration from advancing the version or reporting success.
[Dexie upgrades](https://dexie.org/docs/Version/Version.upgrade()).

Export a versioned `.graphnav.json` containing the graph, source references, nodes, relationships, overrides, layout, and durable AI decisions/evidence when present.
Exclude authentication data, caches, and PDF bytes by default.
Show that exports can contain personal notes/excerpts.
For a PDF export, keep the fingerprint and let the user reattach the matching PDF; an optional bundled archive can be added later.
Import validates version, record limits, references, and source locator types before committing.
Import as a new graph by default, remapping internal IDs; preserve provider source IDs and never overwrite an existing graph implicitly.

Source write actions remain separate from personal editing and require explicit user action and current source permission.
After creating a real source, store the actual returned provider ID and refresh that scope.
If an API write outcome is uncertain, reconcile against the source before retrying; do not create duplicate folders/tabs blindly.
Graph storage never grants access to a source.

## Implementation handoff and acceptance

1. M1-C: Eddy reviews the implemented shared types and repository against the [response to his proposal](./M1C_HANDOFF.md).
   The user explicitly assigned the initial storage implementation to Rajvansh; the exact contract still needs Eddy's integration review.
2. M2: Rajvansh has implemented the manual workspace and repository; Eddy adds verified account context, the Drive adapter, and background command routing.
   Two-member editing, group-junction rendering, layout, reopening, validated backups, and synthetic refresh reconciliation are implemented.
   Real Google graph imports, user-created group membership controls, and second-laptop acceptance remain open.
3. M3/M4/M5: extend the Docs/PDF adapters, PDF Blob path, unavailable-target handling, and consistent editing across surfaces.
4. V2: add generationRuns and evidence/decision review through the same repository.

Full design acceptance criteria, including later work:

- Empty manual graph needs no Google account or source.
- One node links to several others; one three-member relationship is saved once and rendered without implying extra pairs.
- Reopen restores labels, positions, collapsed state, and view; panel controls remain reachable after window/zoom changes.
- Rename/move/partial pagination/permission failure preserve stable IDs and personal edits.
- The same source in two graphs has independent edits/layout; account changes do not mix caches.
- Original and reattached PDFs navigate by fingerprint and page; changed bytes do not silently reuse old anchors.
- Two tabs, a stopped/restarted worker, failed writes, and a failed migration never silently replace saved work with a partial snapshot.
- Accept/edit/reject, regeneration, source-version changes, and removal of accepted AI content preserve user decisions.
- Export/import validates references and preserves meaningful data while excluding tokens.

The entire list is not a passed-test claim.
The current automated checks cover manual creation/editing, group storage/rendering, positions/view, database and browser reopening, failed-write rollback, stale-tab conflicts, fixture refresh/account separation, and backup validation.
Collapsed state, worker storage commands, future schema upgrades, real Google graph navigation, PDF reattachment, and AI decisions still require their own implementation and checks.
