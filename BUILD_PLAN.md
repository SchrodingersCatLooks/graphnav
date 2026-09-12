# GraphNav: ordered implementation through V1 and V2

This is the implementation order for Rajvansh on `rajvansh-ui` and Eddy on `partner-data`.
[FEATURE_SPEC](./FEATURE_SPEC.md) defines the detailed behavior, APIs, data invariants, and use cases.
[TASK_LIST](./TASK_LIST.md) is the only task-status list; its Order column refers to the numbered steps below.
[STATUS](./STATUS.md) distinguishes merged progress from unmerged work.
Read these together and preserve existing implementation.

## Product behavior to build

Manual creation must be assisted by existing source information.
A user who already has folders, files, or Doc tabs should not type their titles or destinations again.
Both starting paths remain available: build a map yourself, or start from existing content and edit the result.

| User action | Expected behavior | Needs GPT? |
| --- | --- | --- |
| Add an idea | Create a personal idea/note before a source exists; optionally attach a source later | No |
| Add existing items | Automatically show relevant folders/files, Doc tabs/sub-tabs, or PDF sections/pages; select items with names, types, hierarchy, and destinations already filled in | No |
| Build baseline from this source | Preview scope, then create a bounded editable folder/tab/section map with real containment and destinations | No |
| Generate with AI | Select readable content; propose concepts and meaningful relationships; inspect evidence; accept/edit/reject | Yes |

The picker automatically recommends known source items, not guessed semantic relationships.
Initially rank the current source and its immediate contents first, preserve tab order/hierarchy, and filter matching names within the disclosed scope.
Do not claim personal relevance or inferred meaning from a title match.
An existing saved map opens as saved; suggestions and generation must not rebuild or replace it on every visit.

Google workflows use an editable graph overlay on the existing source page, with Docs on the left and same-document tab navigation.
The PDF uses our own reader with a graph beside it.
The standalone My maps workspace remains available for personal planning.
Every starting path uses the same editor and local saving.

## Ordered work and paired ownership

Steps are dependencies, not promises that a fixed number of minutes will be sufficient.
Start API account setup during step 1; most of it can proceed independently of the UI.
Eddy can prepare a reviewed data contract while Rajvansh builds its controls against clearly labeled fixtures.
Each gate still needs real integration evidence before its tasks become DONE.

| Order | Feature / result | Rajvansh's lane | Eddy's lane | Tools / prerequisite |
| --- | --- | --- | --- | --- |
| 1 | One agreed working baseline and accounts | M0-A, M1-C-A, G0-A: review/integrate, own-account checks, API setup | M0-B, M1-B, M1-C-B: demo sources, contract review, current import handoff | Git, Node 22, WXT, existing Dexie/Google code |
| 2 | Reusable source suggestions and autofill | N1-A: Add existing chooser with selection, search, context, Already added | N1-B, M2-B: source candidate contract, selected-item import, worker edit operations | React, Zod, Drive API, typed extension messages; step 1 |
| 3 | Assisted manual and baseline graphs inside Drive | M2-A: shared on-page editor, explicit Add selected / Build baseline, connections, navigation | M2-B: bounded folder reads/imports, account scope, idempotent writes | React Flow, ELK, Drive API, Dexie; step 2 |
| 4 | The same experience for Docs tabs/sub-tabs | M3-A: left panel, tab picker, current tab, same-Doc navigation | M3-B: nested tab candidates, selected/full-outline imports, validated same-tab destination | Docs API and shared editor; step 3 |
| 5 | Durable editing, refresh, and panel layout | M5-A: save/error/refresh UI, focus/search/resize/dock recovery | M5-B: restart, partial refresh, selected membership, accounts, conflicts | Dexie, browser messaging, visualViewport; steps 3-4 |
| 6 | Real selected text and a working AI connection | G1-A: choose tabs/text scope and preview; G0-A: private credential setup | G1-B: anchored passages; G0-B: local authenticated relay and real smoke test | Docs API, Node/TypeScript, OpenAI SDK, Zod; steps 1/4 |
| 7 | AI-generated draft inside the current graph | G2-A: Generate/progress/cancel/retry and preview | G2-B: structured request, bounded draft, reference/evidence validation | Responses API, shared draft types; step 6 |
| 8 | Review and preserve AI suggestions | G3-A: evidence, accept/edit/reject, distinguish draft/saved items | G3-B: additive migration, atomic acceptance, persistent decisions | Shared editor + Dexie; steps 5/7 |
| 9 | PDF baseline, assisted editing, and AI reuse | M4-A: file picker, reader, section suggestions, shared editor/review | M4-B: PDF bytes, bookmarks/text/anchors, restore and reattachment | PDF.js, shared candidate/passage interfaces; steps 2/5/8 |
| 10 | Group relationships | X1-A: several members in one labeled connection | X1-B: membership operations/invariants and deletion behavior | Existing junction/member-list model; steps 3/5 |
| 11 | Chosen sources combined in one map | X2-A: Add another source, cross-source links and selection | X2-B: multiple bindings, canonical reuse, scoped refresh/generation | Existing adapters and repository; steps 8/9 |
| 12 | Real folder/tab authoring | X3-A: explicit Create folder / Add tab / Rename tab controls | X3-B: minimal write grant, capabilities, Google mutations/readback | Drive files.create, Docs batchUpdate; step 4 plus account approval |
| 13 | Placement and deeper navigation refinements | X4-A, X7-A: floating panel, heading/bookmark controls | X4-B, X7-B: saved rectangle, locator migration/resolution | Pointer events, visualViewport, Docs anchors; steps 4/5/6 |
| 14 | Freeze a verified release | G4-A, M6-A: full visual/user walkthrough on both laptops | G4-B, M6-B: failures, limits, checks, packaging/startup | Playwright, real Chrome, npm check, WXT zip; all features claimed for release |
| 15 | Demonstrate and submit | M7-A, M8-A: deck, pitch, submission | M7-B, M8-B: live demo, recording, technical verification | Exact frozen commit, real screenshots, rehearsal |

Steps 1-9 establish the core V1 + V2 workflow; steps 10-13 complete the additional described interactions.
This gives those requirements a concrete order rather than leaving them in an unordered backlog.
Their ordering does not mean they have been implemented, or that the user approved dropping them if time runs short.
Additional providers, OCR, public distribution, and optional cloud sync remain separately scoped X5/X6 expansion work.

## Step 1: integrate the working foundation

**Tasks:** M0-A, M0-B, M1-B, M1-C-A, M1-C-B, G0-A.
**Tools:** Git, Node 22, existing WXT extension, Chrome Identity, Dexie.

1. Rajvansh inspects `git status`, fetches both branches, and reviews Eddy's current changes before integrating them through a normal merge.
   Keep the existing workspace/storage code and stable manifest key.
2. Eddy reviews `lib/graph/types.ts`, `lib/storage/repository.ts`, and M1C_HANDOFF, then identifies the exact current import/request checkpoint.
   Settle shared message/type ownership before either person changes it.
3. Both build the same agreed commit, reload the installed extension and source tabs, and run the real demo reads on their own Google accounts.
4. Rajvansh confirms the API project and test budget; the credential owner configures the eventual relay privately.
   Eddy prepares meaningful authorized Doc text and a text PDF for later model tests.

**Gate:** same commit/extension ID, working own-account reads, contract ownership, accessible fixtures, and an identified API account owner.
**Known evidence:** `88a4d00` has the personal editor/storage/auth UI with 22 passing automated tests; `partner-data` at `c6e6b5e` includes it plus import/navigation/request work reported by Eddy.
Main remains at `240f9f2` when this plan was inspected; these newer runtime changes are not merged by a planning update.
Raw demo reads return ten folder children and four Doc tabs; baseline imports include their roots and normally contain eleven and five nodes respectively.

## Step 2: build source suggestions before AI

**Tasks:** N1-A, N1-B, M2-B.
**Tools:** shared React chooser, Zod, Drive API reads, background messages, existing repository.

1. Eddy adds a read-only candidate listing over his existing source reads.
   Return stable source/locator identity, title, type, parent/path context, and pagination/completeness metadata; listing candidates must not create live graph nodes.
2. Rajvansh builds a reusable Add existing chooser with current-source recommendations, searchable labels, hierarchy, checkboxes, Add selected, and Already added state.
   Selecting an item automatically supplies its real label and destination; typing is only needed to filter or supply a personal override.
3. Eddy adds an atomic Add selected operation targeting an explicit graph ID and revision, with account validation and duplicate protection.
   It imports only the chosen items plus any root/parent explicitly shown in the selection preview.
4. Both agree how saved source bindings distinguish selected-item membership from a baseline outline.
   Refreshing metadata for chosen nodes must not add every previously unselected source item.
5. Rajvansh uses the same chooser to attach an existing source to a personal idea without changing the idea's label/notes unless the user chooses to.

**Handoff:** Eddy pushes candidate/add-selection types and a fixture; Rajvansh implements against that exact shape; both integrate before completing the gate.
**Gate:** with GPT unavailable, select three real Drive items without typing their names/URLs; two identically named items remain distinguishable by path/identity; repeated Add does not duplicate nodes; opening the chooser alone does not change the graph.
The shared chooser starts with Drive; step 4 supplies Docs and step 9 supplies PDF through the same interface.

## Step 3: mount the editor inside Drive

**Tasks:** M2-A, M2-B.
**Tools:** `components/ExtensionShell.tsx`, shared graph/controller from the workspace, React Flow, ELK, Drive API, Dexie.

1. Rajvansh extracts reusable editor controls from `entrypoints/workspace/main.tsx` and mounts them in the existing popover panel.
   Keep the optional workspace working and preserve the tested top-layer/viewport behavior.
2. Offer Add existing, Add idea, and Build baseline from this folder.
   Build baseline previews its bounded scope and fills in names, containment, and real destinations automatically.
3. Eddy reuses IMPORT_DRIVE_FOLDER and paginated child reads, adds the selected-items path, and routes edits/view changes through the single background repository.
   Content scripts must not open IndexedDB on the Google origin.
4. Rajvansh adds readable typed nodes, accessible connections, labels/notes, Open versus Expand, search/focus/collapse, a list fallback, and bounded automatic layout.
   Preserve manually pinned positions and never treat a visual drag as a Drive move.

**Gate:** inside the actual Drive page, add chosen existing items manually and build a baseline in a separate test map; connect an idea to two files, edit a label, open a real destination, and reopen the map.
A separate My maps tab is not required for this workflow.

## Step 4: reuse assisted creation in Docs

**Tasks:** M3-A, M3-B.
**Tools:** Docs API `documents.get` with `includeTabsContent=true`, shared chooser/editor, validated source navigation.

1. Eddy traverses top-level and nested tabs and supplies candidates with document ID, tab ID, title, parent, and ordering.
   Support both Add selected tabs and Build baseline from this document using the same identity rules as Drive.
2. Rajvansh puts the graph on the left, uses indented tab suggestions with parent context, and highlights the current source tab.
   Add tab nodes with one selection, without requiring users to type a title or copy a tab URL.
3. Eddy adds a current-source-tab navigation disposition to the existing NAVIGATE contract.
   The current implementation opens a new browser tab; that does not fulfill same-document navigation.
4. Rajvansh verifies actual tab changes, source-page context changes, typing, scrolling, keyboard focus, and 100%/150% browser zoom.

**Gate:** all four demo tabs including the nested sub-tab are selectable/autofilled; the baseline includes the document root; each tab destination opens within the original editable Doc.
No GPT request occurs during suggestions or baseline creation.

## Step 5: prove durable editing and refresh

**Tasks:** M5-A, M5-B, completion of shared M2 controls.
**Tools:** Dexie transactions, existing revision checks, extension settings, visualViewport.

1. Eddy persists graph commands, selected-source membership, view and layout through the worker; test worker suspension and full browser restart.
2. Rajvansh shows saving/saved/failure/conflict states, Refresh, last refresh time, partial results, and unavailable-source explanations.
   Autosave must not report success before the write succeeds.
3. Eddy verifies that rename, partial pagination, missing/moved items, account change, and duplicate imports preserve personal links/notes and stable identities.
   Selected-only maps retain their chosen membership; baseline maps disclose newly available source items.
4. Rajvansh verifies saved width/dock, accessible Close/Escape, pinned nodes, bounded focus/search, and backup recovery.
   Keep panel geometry separate from graph coordinates and pan/zoom.

**Gate:** the real on-page manual create/select/connect/edit/navigate/reopen/refresh cycle passes with AI off; errors do not lose edits or expose another account's imported data.
This gate precedes applying AI proposals to live graphs.

## Step 6: extract selected content and connect the model

**Tasks:** G0-A, G0-B, G1-A, G1-B.
**Tools:** Docs API, anchored passage types, Zod, a local Node/TypeScript relay, official OpenAI SDK.

1. Eddy extracts selected tab paragraphs and table text with source/tab identity, passage IDs, locators, and version/hash.
   Keep explicit source links separate from inferred relationships; disclose unsupported/omitted content.
2. Rajvansh adds selected-tab controls and a preview of exactly what text will be submitted.
   Initial limits: one Doc or PDF, 20,000 selected characters, one active request, and a 60-second timeout; show oversize errors rather than silently truncating.
3. Eddy creates the small local relay with a server-held key, exact-origin allowlist, local authentication, payload/rate limits, and a documented startup command.
   The account owner supplies the credential privately; no key enters the extension or GitHub.
4. Both agree the input/draft Zod schemas and a labeled fixture before G2 UI integration.
   Eddy makes a real smoke request, records the actual accessible model ID/latency/usage, and handles authentication failure explicitly.

**Gate:** selected passages resolve to real tabs and match the preview; the relay reaches the model; unselected text is excluded and manual maps work with the relay stopped.
The relay package/startup path is planned work, not a currently available command.

## Step 7: generate a real graph draft

**Tasks:** G2-A, G2-B.
**Tools:** Responses API structured output, shared draft schema, application validation.

1. Eddy sends selected passages plus relevant existing graph IDs and prior decisions, requesting bounded concept nodes and labeled relationships with evidence.
   Start with at most 20 new nodes and 30 ordinary connections; permit an empty result when evidence is insufficient.
2. Validate schema, lengths, unique IDs, member references, selected-source boundaries, excerpts, and source version before returning the draft.
   Resolve destinations from application-owned locators instead of model-invented URLs.
3. Rajvansh renders draft proposals distinctly inside the current surface and provides Generate, progress, cancel, retry, and empty/failure states.
4. Both verify that cancellation, stale revision, duplicate clicks, late responses, and prompt-like source text cannot overwrite the live map.

**Gate:** a real selected Doc produces inspectable connections beyond containment, with correct evidence and no live writes before acceptance.
The model proposes meaning; a schema or matching excerpt does not itself prove the interpretation.

## Step 8: review, edit, and save generated work

**Tasks:** G3-A, G3-B.
**Tools:** shared inspector/editor, additive Dexie upgrade, versioned backup/draft records.

1. Rajvansh shows the supporting excerpt and Open source for each suggestion, with individual accept/edit/reject and selection-based acceptance.
2. Eddy adds generation runs/decisions and provenance through an additive migration that preserves existing version-1 maps and backup import.
   The current schema has manual/imported origins and no proposal store; this work cannot be skipped.
3. Apply accepted nodes/relationships and the decision in one transaction with graph revision checks and temporary-ID mapping.
4. Preserve accepted edits and exact rejected/removed decisions across Refresh and regeneration; suppress exact duplicates and mark changed-source evidence stale.

**Gate:** accept one proposal, edit another, reject another, restart Chrome, refresh sources, and generate again without losing decisions or resurrecting exact rejected items.
Do not claim perfect semantic deduplication of paraphrased suggestions.

## Step 9: reuse the whole workflow for PDFs

**Tasks:** M4-A, M4-B.
**Tools:** bundled `pdfjs-dist` and worker, our reader entrypoint, shared source chooser/editor/passage pipeline, Dexie blobs.

1. Rajvansh coordinates one root dependency/lockfile change and builds a local PDF picker and readable page viewer with the graph beside it.
2. Eddy uses bookmarks/destinations first, then page-aware heading candidates or a labeled page fallback, and supplies ready-to-add candidates to the same chooser.
   A reader can Add selected sections or Build baseline without GPT.
3. Persist original bytes under a SHA-256 fingerprint and resolve typed page/section locators through our reader.
   Correct one-based PDF.js page requests versus zero-based stored page indices explicitly.
4. Reuse selected-page preview, anchored text, generation, review, and saved personal editing from steps 6-8.
   Inspect extraction on the demo PDF; empty/scanned/unsupported/oversize content must have clear states.
5. Backup UI states whether bytes are included; the initial graph backup requires retaining or reattaching the original PDF with a fingerprint check.

**Gate:** three real section/page jumps, manual selection with no retyping, editable baseline with AI off, one real selected-PDF AI draft, and reopening with PDF/graph restored.

## Step 10: finish grouped connections

**Tasks:** X1-A, X1-B.
**Tools:** existing relationship member lists, React Flow junction renderer, repository validation.

1. Rajvansh adds multi-member selection with From/To or peer roles and an editable relationship label.
2. Eddy validates unique members, same-graph membership, valid roles, atomic changes, and cleanup when a member is removed.
3. Render one junction with spokes and persist its layout; do not replace a joint relationship with every possible pairwise claim.

**Gate:** create Budget + Staff jointly constrain Launch, edit membership, save/reopen/export/import, and verify the meaning remains one relationship.
This can begin after step 5 if the core integration is already progressing and shared-file ownership is clear.

## Step 11: combine chosen sources in one project map

**Tasks:** X2-A, X2-B.
**Tools:** existing chooser and adapters, multiple source bindings, canonical identities, selected-content generation.

1. Rajvansh adds Add another source to the existing map using the same autofill picker; offer a deliberate choice between the current map and a new independent map.
2. Eddy imports selected source nodes into the target graph, reuses canonical source records, and keeps refresh membership/account checks per binding.
   Never create relationship members pointing to another graph's node IDs.
3. Connect a Doc tab to a PDF section manually, then extend the bounded AI selection contract to the explicitly chosen sources.
   Reconcile a Drive file's identity with its Docs content deliberately and keep one verified Google account plus local files initially.

**Gate:** a mixed project map navigates both sources, refreshes one without disturbing the other, and leaves a separate paper map independent.
AI only analyzes the selected content within the same disclosed limits.

## Step 12: add real source-authoring actions

**Tasks:** X3-A, X3-B.
**Tools:** Drive `files.create`, Docs `documents.batchUpdate`, explicit OAuth grant and capability checks.

1. Eddy verifies the minimal write authorization for the selected demo sources and documents the exact account action before requesting it.
   Current read-only scopes do not grant authoring access.
2. Rajvansh adds distinct Create folder, Add tab, and Rename tab controls with destination/parent/name preview and visible success/failure.
   Personal label changes stay separate from real source renames.
3. Eddy performs authorized folder creation and tab add/property updates, checks capabilities/revisions, and reconciles real returned IDs through readback.
   Avoid blind retries of non-idempotent writes that might create duplicates.
4. Both test an authorized demo write and a read-only case without changing unrelated sources.

**Gate:** real created/renamed items appear in Google and GraphNav; read-only users retain personal graph editing; graph dragging never performs a source write.
Grant investigation can start during step 1; it must not block read-only suggestions or baseline creation.

## Step 13: finish placement and deeper source navigation

**Tasks:** X4-A, X4-B, X7-A, X7-B.
**Tools:** pointer events, visualViewport/popover, extension preferences, Docs heading/bookmark locators.

1. Complete floating placement as a separate small checkpoint: Rajvansh adds drag/resize/dock/reset and Eddy persists/clamps the rectangle independently of graph view.
2. Complete deeper navigation as another checkpoint: Eddy adds tab-aware heading/bookmark locators through a tested migration; Rajvansh shows section nodes and evidence controls.
3. Test actual Chrome deep links, stale-anchor fallback to tab/excerpt, viewport resize, browser zoom, keyboard close/focus, and normal document editing.

**Gate:** saved panel geometry cannot strand controls offscreen, and deeper source destinations either reach the verified anchor or clearly use the correct fallback.
Do not claim arbitrary paragraph highlighting from text offsets alone.

## Step 14: run the release acceptance and freeze

**Tasks:** G4-A, G4-B, M6-A, M6-B.
**Tools:** pinned Node 22, `npm ci`, `npm run check`, `npm run zip`, temporary test profiles, actual Chrome/accounts.

Rajvansh checks the user-facing result; Eddy checks data/runtime behavior; both run the agreed release on their laptops.
Record commit, extension ID, browser/Node versions, expected/actual outcome, and live versus fixture evidence.

| Release story | Required evidence |
| --- | --- |
| Assisted manual without AI | In Drive, choose real items without typing names/URLs, disambiguate equal titles, avoid duplicates, add an idea/edge, save/reopen |
| Editable source baselines without AI | Build bounded folder, nested-Doc, and PDF baselines; labels/destinations populate; personal edits survive Refresh |
| Google overlay | Graph/editor remains on source page; Docs navigation uses original tab; close/focus/typing/scrolling/zoom work |
| Real AI | Selected Doc and PDF drafts show evidence and useful non-containment links; accept/edit/reject, reopen/regenerate, preserve decisions |
| Data safety and recovery | Transactions, account scope, concurrent edits, partial refresh, missing targets, migrations, backup copies, PDF reattachment, and worker/browser restart |
| Failure and limits | Auth cancel/denial, empty/oversize input, model refusal/timeout/invalid evidence, late responses, prompt-like text, quota failure; no misleading saved/complete state |
| Readability and scale | Labeled 500-node fixture with at most 50 visible; record actual render timing, search/focus behavior, pin preservation, and overflow controls |
| Intended-product completion | Group links, mixed-source map, authorized source action, placement, and heading navigation pass when claimed; open requirements remain named if incomplete |
| Reproducible setup | Clean install/check/build/zip, relay startup, package and backup tested from the exact release commit; no secrets/private demo content committed |

The current implementation limits are 500 stored nodes, 2,000 relationships, 32 members, and a 5 MB JSON backup.
Any limit change requires explicit implementation/testing rather than a plan-only claim.
Do not repeat tests without a changed build or unresolved concern, but do not carry old passes forward to a new runtime.
The merger updates STATUS only after the verified slice reaches main.

## Deadline, rest, and submission

The user's target is code freeze at 6 AM and submission at 4 PM on September 12, local Eastern time.
The earlier 1:20-based feature timeboxes have been replaced by dependency order because their elapsed slots are not reliable remaining estimates.
At every gate, compare actual progress with the clock and record blockers instead of silently removing requirements.
Begin release acceptance by 5:15 AM; if required functionality is missing, make an explicit scope/deadline decision and state the incomplete capabilities accurately.
At 6 AM, save/freeze the verified checkpoint and preserve the planned rest/pitch blocks.
This plan defines the full work; it does not guarantee that every remaining feature can fit before that target.

## Step 15: prepare the pitch and submit

**Tasks:** M7-A, M7-B, M8-A, M8-B.
**Tools:** frozen extension/package, actual screenshots, slide deck, backup recording, organizer submission flow.

| Local Eastern time | Rajvansh | Eddy |
| --- | --- | --- |
| 6:00-11:00 AM | Sleep after saving the checkpoint | Sleep |
| 11:00-11:30 AM | Breakfast | Breakfast |
| 11:30 AM-1:00 PM | Deck: problem, assisted creation, source navigation, meaningful AI connection, evidence, saved work, tested limits | Clean demo setup, relay startup, exact-build backup recording, package/access checks |
| 1:00-1:30 PM | Lunch | Lunch |
| 1:30-2:30 PM | Two timed pitch rehearsals and teammate handoffs | Rehearse live and backup demo paths |
| 2:30-3:00 PM | Final deck/submission links and content | Package/recording/source access and technical accuracy |
| 3:00-3:15 PM | Submit and verify receipt | Independently verify submitted materials/access |
| 3:15-4:00 PM | Submission buffer | Submission buffer |

Show assisted creation without GPT before showing the AI improvement so the product's value is clear.
Only demonstrate features that passed step 14, and distinguish remaining intended work from the live product.

## File ownership and working checkpoints

Rajvansh owns panels, the shared editor/chooser, React Flow/ELK integration, visual styles, PDF reader UI, and coordinated root dependency changes.
Eddy owns Google reads/actions, candidate extraction, background messages/validation, content extraction, generation relay, and storage extensions after the shared contract review.
He owns a separate relay package; coordinate root lockfile edits instead of both changing it independently.
Do not create another scaffold, dispatcher, graph schema, or editor for each source.

Before editing, each person fetches, preserves local work, publishes the exact task claim directly to main, and agrees any shared type changes.
At each gate, push the application slice to the owner's branch and publish its evidence/handoff directly to the shared documents on main.
Include task ID, commit/PR, supported operations, limits, remaining laptop actions, and next owner task.
Use a clean checkout of current main for documentation-only commits and normal fast-forward pushes, preserving concurrent teammate updates as described in [AGENTS.md](./AGENTS.md#shared-documentation-lives-on-main).
Application changes continue through review and merge; bring current main into the working branches without force-push or reset.
TASK_LIST is the status record, not this ordered plan.
GitHub shares code and documents, not private graphs, PDFs, Google content, or credentials.
Use README's actual install/reload commands; the model relay instructions must be added when implemented.
