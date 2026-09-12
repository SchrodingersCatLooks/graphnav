# GraphNav: execution plan through V1 and V2

Updated 2026-09-12 at Rajvansh's request.
The target now includes a real V2 AI workflow in this build session.
V2 is no longer an optional after-hackathon item.
This plan describes intended work; [TASK_LIST.md](./TASK_LIST.md) is the only task-status list, and [STATUS.md](./STATUS.md) distinguishes merged progress from branch work.

## Read the feature contract with this schedule

[FEATURE_SPEC.md](./FEATURE_SPEC.md) defines 16 user workflows, exact tools/APIs, reusable controls, extraction and AI contracts, storage changes, and acceptance stories.
It is the feature-level companion to this execution sequence.
The earlier schedule omitted explicit implementation for some original authoring and connection requirements; the new X tasks preserve those requirements without claiming a delivery decision was already made.
Core is the currently targeted navigation MVP; Completion is the rest of the described experience needing a reconciled delivery slot; Expansion is a separately scoped provider/public-release track.
No coverage label is an implementation status or user-approved scope reduction.

## Finish line

Build one Chrome extension that works alongside the user's existing information.
The complete hackathon MVP passes these eight checks:

1. Open GraphNav inside a real Drive folder and get nodes from its folders/files without typing them again.
2. Open a real Doc and use a graph on the left while continuing to edit the document.
   Top-level and nested tab nodes navigate within that document; opening a separate workspace tab is optional.
3. Create personal idea/note nodes, connect one node to several others, label/edit/remove relationships, and attach real destinations.
4. Restore graphs, notes, connections, positions, and view after reopening; Refresh preserves personal work and identifies unavailable targets.
5. Select supported Doc content, generate an actual AI draft with useful connections beyond the existing folder/tab tree, and inspect its supporting excerpts.
6. Accept, edit, or reject suggestions; reopen and regenerate without losing those decisions or duplicating accepted work.
7. Open a local text-based PDF in the extension reader, navigate at least three section/page anchors, and reuse the same manual and AI workflow over selected PDF text.
8. Run the agreed final build on both laptops, recover an exported backup, and perform a rehearsed demonstration from that exact commit.

This is an installed hackathon MVP for the two test accounts, not a public Chrome Web Store release.
Google graphs stay on Google pages; the extension-owned PDF reader and optional personal workspace have their own tabs.
Google APIs supply authorized metadata/Doc content; PDF.js supplies local PDF text and destinations.
AI proposes semantic relationships over selected text; ordinary imports and personal editing work without AI.

## Deadline and realistic scope

The user wants code finished by **6:00 AM** and submission by **4:00 PM**, September 12, in their local Eastern time.
Use the laptop's Eastern clock, including daylight saving, rather than assuming a fixed UTC offset from the user's shorthand “EST.”
The table below budgets approximately 4 hours 40 minutes from 1:20 AM to 6:00 AM with both people working concurrently.
These are aggressive timeboxes, not estimates proving that every item fits or guarantees of completion.
Live Google behavior, the first real model request, and PDF integration are the largest uncertainties.
The 1:20-based slots are the original budget; by the feature audit around 2 AM, the early slots have elapsed without newly verified runtime gates.
Start the next implementation checkpoint with the actual clock and results; do not pretend elapsed slots or newly documented completion work fit automatically.
Reassess at each gate using actual results; never mark a failed gate complete to match the clock.

**Protect the Drive + Docs + real AI + saved editing loop first.**
PDF remains part of the complete MVP, with a bounded slot after that loop.
If a required feature cannot fit, Rajvansh makes an explicit scope decision at the checkpoint, and the tracker/deck name the missing feature.
A reduced Drive/Docs/AI demo is a possible fallback, not an automatic declaration that the complete MVP is finished.

## Ordered work and paired ownership

Each row is a shared integration checkpoint, with one concrete lane per person.
A dependency is a working interface/result, so UI can use labeled fixtures while Eddy finishes its data side.
Source and model acceptance still require real reads and a real model response.

| Step and target time | Rajvansh: interface and review | Eddy: data and runtime | Exit check before moving on |
| --- | --- | --- | --- |
| 1. Baseline and access, now to 1:40 | M0-A, M1-C-A: verify own-account reads, finish PR #6 review handoff, and confirm API project/budget readiness under G0-A | M0-B, M1-C-B, M1-B: review the shared types, keep demo sources ready, and prepare the current import checkpoint for integration | Both use a known commit and the fixed extension ID; real folder/Doc reads pass; contract ownership is explicit; an API credential/budget owner is identified |
| 2. Drive graph on the page, 1:40-2:25 | M2-A: reuse the graph/editor inside the existing panel; import current folder, expand/focus, add/connect/edit, open a real destination | M2-B: finish the existing import messages, scope/account resolution, paginated child loading, and validated graph-edit messages | Current folder plus its ten demo children appear; a personal idea links to a file; navigation, editing, and reopening work inside Drive |
| 3. Docs graph on the left, 2:25-3:05 | M3-A: reuse the editor in a left panel with a reachable close button, current-tab selection, and sufficient room for normal editing | M3-B: integrate the existing tab mapper and implement/test exact top-level and nested tab navigation | Four demo tabs plus the document root appear with correct nesting; clicking a tab opens it in the same Doc; typing, scrolling, and zoom remain usable |
| 4. V1 durability and selected text, 3:05-3:25 | M5-A + G1-A: show refresh/save/errors, prove reopen, and add a selected-tab/text preview for Generate | M5-B + G1-B: verify refresh/account/worker behavior and extract bounded Doc text with stable source anchors | One complete on-page create/connect/edit/navigate/reopen/refresh loop passes; the exact text to send to AI is inspectable |
| 5. Real AI draft, 3:25-4:00 | G2-A: integrate Generate, progress, cancel, retry, and draft preview using the agreed response shape | G0-B + G2-B: implement a small local model relay, make a real structured request, validate references, and return a bounded draft | A real selected Doc produces inspectable concepts and non-containment relationships; unselected content and provider keys do not enter the page |
| 6. Review and keep AI work, 4:00-4:30 | G3-A: show evidence and accept/edit/reject controls in the existing graph, distinguishing suggestions from saved items | G3-B: persist drafts/decisions with an additive migration; apply accepted records transactionally and deduplicate regeneration | Accept one suggestion, edit another, reject another, reopen, refresh, regenerate; previous decisions and personal work survive |
| 7. PDF using the same graph, 4:30-5:15 | M4-A: local-file picker, extension-owned PDF reader, graph beside the page, and reuse selection/review controls | M4-B: PDF.js text/bookmark extraction, SHA-256 byte identity, stored bytes, correct page anchors, and the same generation input | Three section jumps work; reopening restores the PDF and edits; a real selected-text PDF draft can be reviewed and saved |
| 8. Integrated release gate, 5:15-6:00 | G4-A + M6-A: run the real walkthrough, fix blocking UI issues, and verify readable graphs on both laptops | G4-B + M6-B: run checks, exercise errors/upgrades/limits, verify server startup, and package the agreed commit | Both-laptop acceptance evidence, passing checks, working backup/restore, reproducible setup, and a packaged commit; freeze code at 6:00 |

M5 and G1 are small separate commits within step 4, not two assistants editing the same files simultaneously.
Eddy can prepare G0-B after his Google work passes while Rajvansh finishes its visual acceptance.
A full PDF implementation is not a prerequisite for proving V2 on a Doc.
The manual acceptance gate must pass on the initial Google surfaces before AI proposals can modify a live graph.

## Step 1: reconcile the actual starting point

Do not rebuild the scaffold or database.
Read the current remote branches and preserve existing work before choosing the next commit.
The observed starting evidence for this plan is:

- Main contains accepted M1-A through PR #3, followed by the status update in PR #5.
- `rajvansh-ui` runtime checkpoint `88a4d00` supplies the personal workspace, Dexie repository, source/personal separation, backup/import, and visible auth state.
  Its clean install, type-check, build, and 22 automated tests passed locally.
- Eddy's `partner-data` at `c6e6b5e` includes `88a4d00`, import code from `9e2a084`, account lookup, navigation, and sender/request validation tests.
  His handoff reports live imports with eleven Drive nodes and five Doc nodes, repeated-import reuse, and correct nested-tab/folder destinations.
  Its new runtime is not automatically present in Rajvansh's branch or main.
  Read and review it before integration; fresh complete acceptance is still required.
- Rajvansh's screenshots show Google connected, the expected extension ID in the workspace URL, and two personal nodes with a connection and Saved locally.
  They do not prove the two demo reads, browser restart, backup restore, or full installed acceptance.
- Eddy's older ordering-sensitive backup assertion report is addressed by the identity-based assertion in `88a4d00`.
  Rerun checks on the combined import checkpoint instead of carrying forward either an old failure or an old pass.

Use [README](./README.md) for current run/reload commands and [M1C_HANDOFF](./M1C_HANDOFF.md) for the exact demo IDs and real read requests.
The raw folder response has ten children; its imported graph should normally have eleven nodes including the root.
The raw Doc response has four tabs; its imported graph should normally have five nodes including the document root.
Record these separately to avoid misreporting a successful import as an extra-item defect.

## Shared architecture and file ownership

| Area | Primary owner | Contract and boundaries |
| --- | --- | --- |
| Panels, popup, workspace, shared graph/editor, visual styles, PDF reader UI | Rajvansh | Reuse components; Google pages must offer the core workflow without leaving for My maps; Docs defaults to the left |
| Google auth/account/reads, import adapters, background dispatcher, request validation | Eddy | Preserve the stable manifest key; keep tokens in the worker; validate exact sender origin, request shape, graph ownership, and account scope |
| Existing graph/storage contract | Rajvansh through M1-C review, then Eddy for integration/storage extensions | Keep the implemented UUID/locator/member-list contract; M1C_HANDOFF is the baseline; announce shared-type changes before editing |
| Content extraction and generation contracts, model relay, proposal validation | Eddy | Rajvansh reviews the draft/input types before building controls; return references into selected input, not invented navigation URLs |
| V2 database/backup migrations and decision persistence | Eddy, reviewed by Rajvansh | Additive upgrades preserve existing records and import older backups; no delete-and-recreate migration |
| Root dependencies/lockfile and React Flow/ELK/PDF.js UI additions | Rajvansh | Coordinate additions once; Eddy owns a separate relay package if needed and requests root changes explicitly |
| Planning and release status | Rajvansh as coordinator; each owner maintains their task evidence | User requested this shared plan revision; after this checkpoint each person edits their own rows and the merger updates STATUS |

React Flow is the renderer; ELK is the planned automatic layout for new visible structure, not a database format.
Keep manually positioned nodes pinned and layout only the visible graph.
M2-A owns the shared toolbar/inspector, node/edge distinctions, cycle-safe focus/collapse/search, outline fallback, and accessible connection controls specified in FEATURE_SPEC.
Use application logic to preserve manual coordinates around an ELK result; library installation alone does not provide these interactions.
The current initial grid must not be described as ELK already working.
Retain the tested popover/visualViewport behavior while adding left docking and a bounded resizable panel.
Save panel width/dock preference separately from graph coordinates; optional floating panel placement is tracked in X4-A/X4-B with viewport-clamped persistence; its delivery slot remains explicit.

The extension-owned workspace/reader may access the shared repository directly.
Drive/Docs content scripts use a typed client through Eddy's single background dispatcher; they do not open IndexedDB on Google's origin.
Add editing commands for create/connect/edit/remove, position/view changes, personal overrides, refresh, and backup actions used by the on-page UI.
Use revision checks for content edits and validate references before writes.
Store lookup must consider verified account plus source binding, support independent personal maps, and avoid duplicate default graphs when imports arrive together.
A READ_GRAPH or LIST_GRAPHS request from a Google panel must not expose another account's imported data.

## Source navigation, refresh, and useful graph behavior

For Drive, begin with the current folder or My Drive root and fetch children on demand.
Expose loading, empty, error, partial-results, and pagination states.
A partial result must never delete unseen nodes or claim a complete refresh.
Offer file opening separately from expanding a folder; recognize supported Docs as documents with real destinations.
Unsupported file formats may still be link nodes, but are not silently treated as AI-readable text.

For Docs, retain document ID and tab ID throughout import, selection, evidence, and navigation.
Recurse nested tabs and verify the actual tab changes in the existing editor.
Text extraction for G1 reads supported tab content; the current tab-title mapper alone does not supply AI input.
The current NAVIGATE worker command opens a new browser tab with `browser.tabs.create`.
Its exact-destination check does not fulfill same-tab Docs navigation; M3-B must add a validated current-source-tab path and M3-A must test it in the real editor.
Do not claim exact paragraph highlighting until implemented and verified.
The MVP evidence destination can be the correct tab plus a displayed excerpt.

For PDFs, support a local text-based file, bundled PDF.js/worker, and bookmarks first.
When bookmarks are absent, offer page-aware section anchors with correction and a clearly labeled page fallback.
Persist the original bytes separately from graph records and use their SHA-256 fingerprint to identify reattachments.
The same reader must implement the saved page/section jump; Chrome's built-in viewer is not the integration surface.
An unsupported scan receives an explicit explanation; OCR and arbitrary publisher URL loading are later work.

Refresh updates imported base records and containment while keeping personal labels, notes, edges, positions, and decisions.
A missing folder child may have moved; only a confirmed source error makes its target unavailable.
Show unavailable targets without retargeting a node or deleting personal links.
Exercise worker restart, account changes, repeated imports, complete/partial refresh, source rename, and stale concurrent edits.

## V2 contract: selected text to an editable graph

G1-A/G1-B agree the following input before G2 integration:

- Selected source identity and version/content hash, selected tab IDs or PDF pages, and current graph revision.
- Bounded passages with stable passage IDs, plain text, and resolvable Doc-tab or PDF-page locators.
- Existing graph item IDs and prior accepted/rejected decisions relevant to the selected scope.
- A visible scope summary and explicit Generate action authorizing submission of that selected content.

Start with one Doc or one PDF at a time.
Initial target limits are 20,000 selected text characters, 20 proposed new nodes, 30 two-member relationships, one active request, and a 60-second request timeout.
These are planned guardrails, not already enforced limits; measure and tune them during G4.
Show an oversize-selection error or ask the user to narrow the selection; do not silently omit text and claim the whole document was analyzed.
No full-Drive crawl, embedding database, or autonomous tool-using agent is needed for this MVP.

G2 returns a versioned draft with proposal IDs, temporary new-node IDs, references to allowed existing nodes, labels, relationship kinds, and evidence passage IDs/excerpts.
The application resolves source destinations from the validated input.
Generated relationships must include useful non-containment connections where the text supports them, rather than merely restating a tab tree.
Empty/insufficient-evidence results are valid and should not cause fabricated connections.
Treat source text as data, including any instructions written inside it, and render all generated text as text rather than executable markup.

Use the OpenAI Responses API with a supported structured-output model, selected after verifying project access and a small real evaluation.
Schema-constrained output supplies the record shape; still check references and semantic support, and handle refusals/incomplete responses explicitly.
[Official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
The exact model ID and measured latency/cost belong in the G2 handoff; no untested model or account access is assumed by this plan.

For this two-laptop demo, implement one small Node/TypeScript relay package that runs locally on each testing laptop.
The provider key belongs in the server environment, never in extension code, IndexedDB, GitHub, or chat.
[Official API authentication guidance](https://developers.openai.com/api/reference/overview#authentication).
Bind the local relay to loopback, restrict allowed extension origins, and require a local session credential so arbitrary pages cannot use it.
Add payload/output limits and bounded retries; cancellation must prevent applying a late result even if an upstream request has already started.
Log status/timing/request IDs without recording full source passages or credentials.
A local relay is additional demo setup and needs to be running for AI; ordinary maps remain usable when it is stopped.
A public hosted relay, accounts, billing, and installation without developer setup are separate release work.
No AWS or cloud graph database is required.

G3 stores proposal runs and review decisions separately from live graph records.
Accepting a suggestion is one transaction that maps temporary IDs, saves evidence/provenance, creates valid nodes/relationships, and records the decision.
Editing before acceptance stores the user's corrected version.
Rejection and removal of an accepted item must survive regeneration so the same proposal is not silently resurrected.
Use deterministic source/member/proposal identities to suppress exact repeats; do not claim perfect semantic deduplication of paraphrases.
Changed source content marks old evidence for review without overwriting the accepted idea.
Version the database and backup formats separately, retain old backups, and test an upgrade from the current saved workspace.

## Acceptance matrix and release gate

M6 cannot mark the complete MVP ready until every required row passes or a user-approved scope reduction is explicitly recorded.
Runtime checks include the combined source code from both branches, not just the earlier 22-test workspace checkpoint.

| Check | Rajvansh verifies | Eddy verifies | Evidence to record |
| --- | --- | --- | --- |
| Google access and imports | Own-account raw reads and on-page controls | Own-account reads, imported records, nested parents, pagination | Commit, extension ID, counts, real destination clicks; no tokens |
| Manual editing | Add an idea, connect it to two real nodes, label/edit/remove, close/reopen | Worker command validation, revisions, transaction rollback | Saved state and working destinations on Drive and Docs |
| Refresh and accounts | Personal work survives rename/refresh; unavailable state is understandable | Account-qualified lookup/read/list, no cross-account result; partial refresh and concurrent import tests | Before/after IDs and test results using authorized fixtures |
| Layout and host editing | Left Docs panel, reachable X/Escape, restored focus, normal typing/scrolling, 100%/150% zoom | Saved panel/view/layout restores and never alters source structure | Both laptops and actual Chrome versions |
| AI value and review | Inspect evidence; accept/edit/reject; show at least two supported non-containment links in the prepared demo | Validate every referenced ID/excerpt, persist decisions, reject malformed/unselected references | Two real generation runs, selected scope, model ID, duration; no unsupported quality claim |
| AI failure and regeneration | Retry/cancel/empty states leave manual editing usable | Timeout, refusal, invalid response, duplicate click, stale revision, source change, and late response tests | Zero unintended live graph changes on rejected/failed requests |
| PDF | Three correct jumps, personal edit/reopen, selected-text AI review | Byte identity, persistence, page anchors, unsupported scan/oversize errors | File fingerprint and results from an authorized demo PDF |
| Backup and upgrade | Export/import a separate map; reattach PDF when necessary | Current-to-new DB upgrade; old/new backup validation; no credentials in export | Test results and recovered original notes/layout/decisions |
| Bounded graph | Search/focus/collapse keep the graph readable | 500 stored nodes and 50 visible-node cap; excess capacity fails visibly | Actual load/reopen/layout times and request counts on stated hardware |
| Release | Complete the walkthrough from a clean reload of the final build | npm ci, typecheck, production build, full tests, zip, documented relay startup | Shared commit, both acceptance records, package location, known limitations |

Current storage caps are 500 nodes, 2,000 relationships, 32 members, and a 5 MB JSON backup.
Do not reuse the older plan's 1,000-stored-node fixture without first changing and testing the implementation limits.
A practical first responsiveness target is a usable cached 50-node view within two seconds on the demo laptops; record the actual result and investigate if it misses.
Provider request and generation times are measured separately from local render time.
Existing model-independent automated tests must continue to pass.
Use synthetic fixtures for deterministic edge cases and actual authorized sources/model calls for integration acceptance.

## Time checks and recovery

- By 1:40: if Google access or API project setup is blocked, identify the exact laptop/account action immediately.
  Continue independent UI work with labeled fixtures while Eddy investigates; fixtures do not fulfill live acceptance.
- By 3:05: Drive and Docs must have a working on-page manual path before spreading effort to more surfaces.
  If behind, remove optional styling/animation/automatic-layout refinements and discuss the PDF slot; keep navigation, saving, and visible errors.
- By 4:30: the Doc AI generation/review/save loop should pass.
  If it does not, use the PDF slot to finish that loop only after Rajvansh explicitly accepts the reduced demo scope; leave PDF tasks open.
  If a local relay/model request is still blocked, do not rename structural import as AI generation.
- At 5:15: stop expanding scope and run the release matrix on the intended demo build.
  Fix data loss, wrong destinations, broken auth, inaccessible controls, and broken setup before cosmetic changes.
- At 6:00: freeze the verified build and record any incomplete capabilities honestly.
  Do not let unfinished features consume the reserved sleep/meals/presentation blocks by default.

## Original requirements needing an explicit delivery slot

Do not repeat the earlier blanket deferral as though the user approved it.
X1 covers group editing, X2 selected multi-source project maps, X3 real folder/tab authoring, X4 floating panel placement, and X7 heading/bookmark navigation.
FEATURE_SPEC identifies their UI, APIs, data changes, account actions, and acceptance; TASK_LIST assigns both lanes.
These remain intended-product completion requirements whose delivery must be reconciled with the 6 AM target.
If all are required by code freeze as well as the core, explicitly revise the deadline or scope against demonstrated progress rather than promise unsupported completion.

Keep destructive source restructuring, arbitrary remote PDF loading, OCR, automatic whole-Drive discovery, additional management platforms, cloud sync, and public Web Store release in the separately scoped expansion track X5/X6.
An expansion is not automatically selected merely because the architecture can support it.
Multiple ordinary connections per node remain core, and a group-capable schema alone does not satisfy the group editing use case.

The immediate implementation handoff is M1-C contract/integration review followed by M2-A/M2-B on-page editing, while G0-A resolves API access in parallel.
Then finish same-tab Docs navigation and selected text, prove a real reviewed AI loop, reuse it in the PDF reader, and pass the release matrix.
Use FEATURE_SPEC's five end-to-end stories at each relevant gate.

## After code freeze: rest, pitch, and submission

All times are the user's local Eastern time on September 12.
This reserves five hours for sleep, both meals, at least three hours for presentation/release work, and submission buffer.

| Time | Rajvansh | Eddy | Result |
| --- | --- | --- | --- |
| 6:00-11:00 | Sleep | Sleep | Stop development after saving the exact checkpoint |
| 11:00-11:30 | Breakfast | Breakfast | Resume with the frozen build |
| 11:30-1:00 | M7-A: short deck, product story, screenshots, honest scope | M7-B: clean demo setup, exact-commit backup recording, setup checklist | Deck and recording show the same working features |
| 1:00-1:30 | Lunch | Lunch | No new feature commitments |
| 1:30-2:30 | M8-A: rehearse problem/product/value and handoffs | M8-B: rehearse live demo, technical explanation, and failure recovery | Two complete timed runs, including a backup-demo switch |
| 2:30-3:00 | Check submission text, links, deck export | Check package, permissions, demo links, recording | Final submission materials complete |
| 3:00-3:15 | Submit with teammate review | Verify receipt/access | Aim to submit before the hard deadline |
| 3:15-4:00 | Submission buffer and final organizer requirements | Submission buffer | 4 PM deadline protected |

Suggested demo: open Drive and navigate a file, open the Doc's left graph, add a personal link, generate selected-content suggestions, show evidence and accept one, reopen with the saved work, then show PDF navigation if its gate passed.
Keep the walkthrough within the organizer's actual limit and prepare a 2-3 minute version.
Do not invent user metrics or show an unimplemented feature as live.

## GitHub handoff rules

Rajvansh works on `rajvansh-ui`; Eddy works on `partner-data`, each in their own clone.
Fetch before starting, preserve local edits, and claim one task at a time in TASK_LIST.
Each assistant reads AGENTS, README, IDEA, this plan, STATUS, and its exact task row.
At every gate, commit/push a reviewable slice and return a GitHub link with tests and the remaining laptop actions.
Review and merge working slices normally into main, then bring main into both branches without resets or force pushes.
If an unmerged checkpoint is needed early, use an explicit normal merge and record its hash; do not claim it is on main.
The merger updates STATUS with actual shared progress.
GitHub shares code and plans, not private graph databases, Google content, PDFs, or credentials.

For either coding assistant, use: “Work in SchrodingersCatLooks/graphnav on my assigned branch.
Read AGENTS.md, README.md, IDEA.md, FEATURE_SPEC.md, BUILD_PLAN.md, TASK_LIST.md, and STATUS.md.
I am [Rajvansh/Eddy], implementing [one task ID].
Inspect the latest remote checkpoint and preserve existing work.
Use the current shared contract and coordinate shared-file changes.
Implement the task's exit check, run applicable tests, update my task evidence, commit/push, and return the exact laptop actions and GitHub link.
Do not treat the schedule as evidence that a feature passes.”
