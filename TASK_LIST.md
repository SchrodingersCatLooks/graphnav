# Shared task tracker

This is the only task-status list, and its authoritative copy is on `main`.
Publish claims, progress, blockers, and handoffs directly to main using [AGENTS.md](./AGENTS.md#shared-documentation-lives-on-main); preserve other owners' updates.
[BUILD_PLAN.md](./BUILD_PLAN.md#ordered-work-and-paired-ownership) defines the 15-step implementation order; each Order below points to its exact instructions, tools, dependencies, and exit gate.
[FEATURE_SPEC.md](./FEATURE_SPEC.md) supplies use cases and contracts; [STATUS.md](./STATUS.md) records merged progress.
Statuses are **TODO**, **DOING**, **BLOCKED**, **REVIEW**, and **DONE**.
DONE means the task result is verified and published on main; application tasks also require their runtime merge and acceptance.
A scheduled step or published specification is not evidence that an application feature is complete.
A tasks belong to Rajvansh on `rajvansh-ui`; B tasks belong to Eddy on `partner-data`.

The target remains 6 AM code freeze and 4 PM submission on September 12, local Eastern time.
Expired feature timeboxes have been replaced with dependencies rather than implying that missed slots were completed.
Steps 1-9 establish the core; 10-13 finish the additional intended interactions; 14 verifies the claimed release; 15 covers rest/pitch/submission.
A deadline-driven reduction needs an explicit decision and accurate open tasks.
Source suggestions, autofill, selected-item creation, and editable baselines without GPT are required V1 behavior.

Current validation policy: focused automated checks and targeted installed-Chrome verification; repeated partner-laptop acceptance is not a routine merge gate.
Historical passes and unverified account-specific behavior remain labeled accurately.

## Planning and accepted foundation

| ID | Owner | Task | Status | Evidence or remaining completion check |
| --- | --- | --- | --- | --- |
| DOC-0 | Rajvansh | Create private repo and initial workflow | DONE | Starter committed in 7139f9e |
| DOC-1 | Rajvansh | Capture idea notes, joint build plan, and tracking workflow | DONE | IDEA, BUILD_PLAN, TASK_LIST, STATUS, and linked AI instructions |
| DOC-2 | Rajvansh | Specify GitHub checkpoints and larger-source requirements | DONE | Commit/push, incremental-loading, and performance rules recorded |
| DOC-3 | Rajvansh | Define manual V1 followed by GPT-assisted V2 | DONE | Original release-order decision recorded; DOC-4 brings both into the current target |
| DOC-4 | Rajvansh | Complete V1 + V2 route, individual owners, and deadline plan | DONE | 15-step V1 + V2 route and individual owners published to main through PR #7 (19e23fd); documentation verified, no application completion implied |
| DOC-5 | Rajvansh | Audit all use cases and specify tools, behavior, data, owners, and acceptance | DONE | FEATURE_SPEC and supporting contracts published to main through PR #7; 16 use cases, exact tools/data/UI contracts, and acceptance references verified |
| DOC-6 | Rajvansh | Order the implementation and make source-assisted manual creation mandatory | DONE | Ordered plan, N1 tasks, and mandatory source-assisted manual/baseline behavior published to main through PR #7; task IDs/owners/dependencies/links validated |
| DOC-7 | Rajvansh | Publish shared planning documents to main | DONE | PR #7 merged as 19e23fd; nine Markdown files published; main runtime/config/dependencies/tests unchanged; PR #6 subsequently merged as 4cfe83d |
| DOC-8 | Rajvansh | Keep shared planning and tracking updates directly on main | DONE | Standing rule recorded in AGENTS with tracker/plan/README/STATUS pointers; normal direct-main documentation push, conflict reconciliation, and separate runtime branches; documentation validation passed |
| M1-A | Rajvansh | Scaffold extension and Graph panel | DONE | PR #3 merged as 92a76ce; both-laptop acceptance and original six browser tests passed; historical record below |

## Implementation in execution order

Each person claims one bounded task at a time and pushes the contract before the other lane integrates it.
N1 covers the reusable chooser/contract and its Drive gate; M3 and M4 own the subsequent Docs/PDF integration gates.
Task IDs are preserved for existing handoffs even where the numbered order changes.

| ID | Owner | Order | Task | Status | Required completion check |
| --- | --- | --- | --- | --- | --- |
| M0-A | Rajvansh | 1 | Finish own-laptop baseline acceptance | REVIEW | Screenshots show Google connected, the expected extension ID, and two nodes/one link with Saved locally; still need real folder/Doc outputs, reopen, backup, and same-commit acceptance |
| M0-B | Eddy | 1 | Prepare meaningful shared Doc and PDF demo content | DOING | Shared folder (ten subfolders, one nested level) and four-tab Doc with one nested sub-tab exist, are shared with the second account as Editor, and their IDs are recorded in GOOGLE_SETUP.md. Both read correctly through the installed extension. Still open: no authorized text PDF selected, and Doc text has not been checked for supporting two non-containment connections. |
| M1-B | Eddy | 1 | Google sign-in and first real reads | DONE | Google auth/read implementation merged in PR #6 (4cfe83d); Eddy reports real ten-child Drive and four-tab Docs reads, imports and restart; combined typecheck/build/48 tests pass. Rajvansh live-account read is not newly claimed. |
| M1-C-A | Rajvansh | 1 | Publish/reconcile graph, storage, and UI contracts | DONE | Shared source identity, personal overlay, typed messages, Dexie transactions, and backups integrated on main in PR #6; optional source-binding selection metadata documented in EDITOR_HANDOFF; combined 48 tests pass. |
| M1-C-B | Eddy | 1 | Review exact shared contract and import handoff | REVIEW | Eddy adapters use the merged repository; read EDITOR_HANDOFF and lib/editor before further changes. Explicit partner review of the new selection metadata and bridge remains open. |
| G0-A | Rajvansh | 1 | Confirm API access, funding, and demo configuration | BLOCKED | User is unsure who has an API project/key. Identify account owner, private server configuration and test-spend cap; never paste a key in chat/GitHub or put it in the extension. Other implementation can continue. |
| N1-A | Rajvansh | 2 | Build reusable Add existing / autofill chooser | REVIEW | Chooser/autofill, duplicate-name paths, multi-select, Already added, nested folder browsing, and personal source attachment are merged. Installed fixture tests prove selected-only import/refresh and reopening; direct account walkthrough and PDF reuse remain open. |
| N1-B | Eddy | 2 | Supply source candidates and selected-item import contract | REVIEW | Rajvansh integrated this bridge in lib/editor using Eddy readers: authorized candidates, validated selections, account separation, atomic import, deduplication and saved selected/baseline membership. Eddy should review the published contract; PDF adapter reuse remains M4. |
| M2-B | Eddy | 2-3 | Complete Drive import, account scope, and worker edit commands | REVIEW | Drive adapter, account lookup, nested expansion and editor RPC are merged. Eddy reports real imports/restart; combined tests cover selected/baseline refresh and transactions. Review legacy import concurrency/account filtering and the new editor contract before closing. |
| M2-A | Rajvansh | 3 | Put the reusable editor in the Drive panel | REVIEW | PR #9 (487b315) adds focus previews, cycle-safe collapse, shared canvas/list pagination and bounded ELK layout to the merged editor. Typecheck/build/52 tests pass; 500-node synthetic import/layout measured 868 ms, 50 source/idea nodes per view, screenshots inspected. Targeted current live-account walkthrough remains under M0/M6. |
| M3-A | Rajvansh | 4 | Show a usable graph on the left of Docs | REVIEW | Merged left Docs graph, selected/nested-tab chooser, baseline, current-tab highlight, same-browser-tab navigation and panel reopening. Installed fixtures and zoom/host-editing regressions pass; targeted current live-Doc check remains. |
| M3-B | Eddy | 4 | Complete Docs import and same-document tab navigation | REVIEW | Rajvansh integrated same-Doc NAVIGATE routing with Eddy tab locators and readers. Exact nested-tab URL and no extra browser tab verified in installed fixture; do not duplicate this handler. |
| M5-A | Rajvansh | 5 | Finish save/refresh/errors and panel preferences | REVIEW | PR #9 (487b315) adds persistent width/dock settings and unavailable-destination UI using Eddy's checker; notes and settings survive complete browser restart in installed fixtures. Typecheck/build/52 tests pass; real-account destination check remains under M0/M6. Floating placement remains X4. |
| M5-B | Eddy | 5 | Prove persistence and refresh through the worker | REVIEW | Eddy refresh/availability tests merged, combined 48 tests pass; new source imports are atomic in editor service. Real deleted-target check, legacy import concurrency, and complete scope/backup acceptance remain open. |
| G0-B | Eddy | 6 | Build the minimal local AI relay and startup path | TODO | Local authenticated extension-to-relay request reaches the model with a server-held key; restrict origin/payload/rate; document startup for both laptops; stopping the relay leaves manual maps usable |
| G1-A | Rajvansh | 6 | Select and preview exactly what will be analyzed | TODO | Choose Doc tabs or, after M4, PDF pages; show selected content and limits; Generate requires a deliberate click; unsupported/oversize content is explained |
| G1-B | Eddy | 6 | Extract text and agree the generation input/draft types | REVIEW | Reported at `f412f9b` on `partner-data`. Selected-tab extraction reads chosen tabs only (a nested tab is located but not read unless selected), walks table cells, groups text under its nearest heading, collects https links from selected text only, and caps at 20,000 characters with truncation reported. Draft contract allows only idea/note proposals and reference/personal connections, never source nodes or containment; every proposal must cite submitted passages and resolve to a draft or existing node, and carries the input hash so a mismatched draft is refused and a later source edit makes evidence stale. 11 tests against `tests/fixtures/docs-tabs-response.json`, a labeled synthetic Docs response Rajvansh can build G1-A against. No model called. |
| G2-A | Rajvansh | 7 | Add real Generate and draft-preview states | TODO | Progress, cancel, retry, empty result, and failure states work; late/cancelled output does not replace the graph; a real response appears inside the current surface |
| G2-B | Eddy | 7 | Generate and validate a structured graph draft | TODO | Real model response proposes supported concepts/relationships beyond containment; schema, sizes, IDs, evidence excerpts, and selected-source references validate; unsupported references never reach live storage; model ID/timing recorded |
| G3-A | Rajvansh | 8 | Inspect evidence and accept/edit/reject suggestions | TODO | Preview supporting passage and destination; accept one, edit another, reject another; distinguish suggestions, personal edges, and source structure using the same editor |
| G3-B | Eddy | 8 | Persist proposals, decisions, and accepted records safely | TODO | Additive database/backup migration preserves 88a4d00 maps and old backups; acceptance is atomic; refresh/regeneration retains user edits and exact rejection/removal decisions without duplicating accepted items |
| M4-A | Rajvansh | 9 | Add the extension-owned PDF reader and graph | TODO | Local file picker, readable pages, graph beside the PDF, three working jumps, personal editing, and reused selected-text generation/review controls; reuse N1 section/page suggestions and autofill; Add selected or Build baseline must work with GPT unavailable. |
| M4-B | Eddy | 9 | Supply PDF text, identity, destinations, and storage | DOING | Eddy PDF.js extraction, SHA-256 identity, outline/heading locators and fixture tests merged. Reader, real-paper test, durable bytes/reattachment and selected-content generation integration remain open. |
| X1-A | Rajvansh | 10 | Group relationship controls | TODO | UC-08: select several members and From/To or peer roles; one labeled junction; edit members and recover from removal |
| X1-B | Eddy | 10 | Group editing commands and invariants | TODO | Validate same-graph unique membership, role combinations, deletion behavior, backup, and reopen using existing member-list records |
| X2-A | Rajvansh | 11 | Add sources to an existing project map | TODO | UC-09: source chooser attaches a Doc tab and PDF section to the same map; create a cross-source edge; keep independent maps; preview any multi-source AI selection |
| X2-B | Eddy | 11 | Multi-source binding, import, and bounded analysis | TODO | Canonical reuse without dangling cross-graph members; one Google account plus local PDF; reconcile Drive/Docs identity; refresh one binding without disturbing another; selected-only AI input |
| X3-A | Rajvansh | 12 | Explicit source-authoring controls | TODO | UC-10: Create folder, Add tab, Rename tab; distinguish personal labels from source titles; authorized action, permission failure, and readback states; graph drag never writes Google |
| X3-B | Eddy | 12 | Google folder and Doc-tab author actions | TODO | Verify minimal scopes; implement files.create and tab batchUpdate requests; use returned IDs/revision controls; prevent blind retry duplicates; real allowed and read-only demo tests |
| X4-A | Rajvansh | 13 | Optional movable floating panel | TODO | UC-11: drag/resize/dock/reset with popover behavior, keyboard access, viewport clamping, and normal host editing |
| X4-B | Eddy | 13 | Persist and restore panel placement | TODO | Versioned extension-owned rectangle/dock settings remain separate from graph view; resizing or display change cannot leave controls offscreen |
| X7-A | Rajvansh | 13 | Heading/bookmark navigation controls | TODO | Show section anchors and evidence previews; exact live heading jump when supported; clear tab/excerpt fallback for missing anchors |
| X7-B | Eddy | 13 | Tab-aware heading/bookmark locators | TODO | Additive locator/backup migration; resolve API heading/bookmark IDs; verify real Chrome deep links and stale-anchor fallback; no invented offset URL |
| G4-A | Rajvansh | 14 | Verify useful AI navigation and correction | TODO | Two real demo runs across Doc/PDF for the full target; inspect all shown evidence and at least two supported non-containment links; correct a bad suggestion; navigate, reopen, and regenerate; distinguish actual results from fixtures |
| G4-B | Eddy | 14 | Verify failures, limits, and repeat generation | TODO | Timeout/refusal/invalid citation/prompt-like source text/empty input/stale revision/duplicate click/source change/late response tests pass; failed requests do not mutate live records; record actual limits, duration, and request usage |
| M6-A | Rajvansh | 14 | Run focused visual and end-to-end acceptance | TODO | All required BUILD_PLAN acceptance rows pass on the exact release commit; 50-node view remains readable; no host editing/zoom regression; product claims match results |
| M6-B | Eddy | 14 | Harden, build, package, and document startup | TODO | Clean install, typecheck, build, full tests, migrations/backup/limits, real source clicks, relay startup, and zip pass; record artifact path and commit; no credentials or private sources in package |
| M7-A | Rajvansh | 15 | Prepare deck and product story | TODO | Explain problem, in-page workflow, a meaningful AI connection, evidence, architecture, and tested limits with actual screenshots |
| M7-B | Eddy | 15 | Prepare live demo and backup recording | TODO | Same frozen commit as deck; clean browser/source setup; relay launch tested; recording and package accessible |
| M8-A | Rajvansh | 15 | Rehearse pitch and own submission | TODO | Two timed rehearsals, clear teammate handoffs, final deck/links checked, submission receipt before 4 PM Eastern |
| M8-B | Eddy | 15 | Rehearse demo and verify release materials | TODO | Live and backup paths rehearsed; technical answers match code; package/recording/access independently checked before submission |

## Separately scoped expansion

These remain future provider/public-release choices, not prerequisites for the bounded Drive/Docs/local-PDF product.

| ID | Owner | Task | Status | Required completion check |
| --- | --- | --- | --- | --- |
| X5-A | Rajvansh | Additional source capability UI | TODO | UC-15: identify open-only versus text-readable versus source-editable items; unsupported content never appears as fully analyzed |
| X5-B | Eddy | Additional format/provider adapter | TODO | Separately choose Drive PDF download, OCR, or another management API; verify scopes, parser, identity, locator, refresh, and limits for the chosen integration |
| X6-A | Rajvansh | Public installation and sharing experience | TODO | UC-16: onboarding, permissions, privacy/data controls, and truthful sharing status; actual external-user installation tested |
| X6-B | Eddy | Public relay/release and optional sync design | TODO | Hosted authenticated model access, abuse/budget controls, Google/Chrome release requirements; implement graph sync/conflicts only if collaboration is explicitly selected |

## Active handoffs

| Owner | Current task and branch | Latest result and checks | Blocker | Next action |
| --- | --- | --- | --- | --- |
| Rajvansh | M2-A / M5-A checkpoint merged; next M4-A / G1-A | PR #9 merged as 487b315. Typecheck/build/52 tests pass; temporary integration with Eddy f412f9b also passes all 63 tests. UI settings, focus, collapse, paged lists/canvas, readable layout and source warnings verified in installed fixtures. | Live-account reload/check pending; PDF reader and AI UI open; API project owner unresolved. | Continue PDF reader and selected-content preview against the shared contracts. Eddy should fetch main and read EDITOR_HANDOFF before changing shared messages. |
| Partner | G1-B / `partner-data` at `f412f9b` | Reported from branch, unmerged. G1-B extraction and draft contract complete with 11 fixture-backed tests; combined suite 58 of 59 passing, the one failure being the known intermittent `workspace.spec.ts:43`, which passes in isolation. Earlier runtime through `4738cb2` is merged on main via PR #6. | G0-B cannot start: the model key and API project owner are unresolved (G0-A). PDF has no reader or real-paper acceptance. No model has been called, so G2-B is unstarted. | Await G0-A, then G0-B relay. Meanwhile M0-B demo PDF and M4-B real-paper checks. |

Eddy's latest branch report is preserved above, including his reported intermittent workspace test.
His earlier runtime through `4738cb2` is merged in PR #6.
Rajvansh separately tested `c209a87` plus Eddy's `f412f9b` in an isolated integration checkout: typecheck, build, and all 63 tests pass, including that workspace test.
The reported intermittent failure was not reproduced in that run; it is not declared permanently fixed.
The new G1-B files remain on partner-data for contract review, not on main through PR #9.
See EDITOR_HANDOFF for the concrete input-validation review follow-ups before connecting a relay.
A relay can be implemented and tested with a mock provider while the API key is unresolved; an actual model call still requires the account owner's private configuration.
No future task is marked active or complete solely because it has a scheduled time.

## M1-A second-machine acceptance

Eddy explicitly confirms the full README checklist passes on macOS 26.5.2 / Chrome 152.0.7977.84 after correctly reloading the extension and Google tabs.
He built in a detached worktree with Node 22.23.2 / npm 10.9.8; `npm ci`, `npm run typecheck`, and `npm run build` passed.
The accepted runtime is identical at `c313a1d` and `fb2695d`.
The accepted M1-A production content-script bundle matched his SHA-256:

```text
5d17d121164ae70f2041064e20bce5a4683fc4ba8e9debea2fb39b9564455c51
```

Passed: My Drive/folder labels, Graph/X toggle, Escape with focus restoration, Docs header and close button above the toolbar, ordinary Docs typing/scrolling, increased browser zoom, and absence on unrelated sites.
Rajvansh's local checks passed on Node 22.23.2 / npm 10.9.9: type-check, production build, and all six synthetic browser tests.
His live Docs inspection also showed the complete header/X and sampled panel edge above Google controls.
The code/configuration/dependencies/tests remained unchanged from `c313a1d` through the accepted merge.

Correction to historical failures: the original `c3ce042` overlap preceded the popover fix.
Eddy's later failure attributed to `c313a1d` was caused by an improperly reloaded extension and a stale content script, as confirmed in his correction.
The popover/visualViewport implementation passes his corrected full test; no extra UI patch was needed after `c313a1d`.
PR #3 merged as `92a76ce`; M1-A is DONE.

## M1-B handoff and M0 sources

The scaffold is now on main; its absence no longer blocks Eddy's lane.
Eddy owns the public manifest key, Identity permission, OAuth client/scopes, required Google API access, and background worker on `partner-data`.
The exact public block remains in his GOOGLE_SETUP.md at `9f68af6`.
After adding it, both laptops must verify extension ID `pidejkbkldalibjaehjfpjkcpjpcenpk`.
Rajvansh retains the shell component and CSS; dependency changes remain coordinated.
M1-C is REVIEW: the user approved local storage and asked Rajvansh to implement the first slice; Eddy retains Google integration.
The exact contract and manifest/UI handoff are in [M1C_HANDOFF.md](./M1C_HANDOFF.md).
Eddy's `a83d545` runtime is integrated into `rajvansh-ui` as `b98100f`; his manifest, messages, Google helpers, and background entrypoint were preserved unchanged.

Eddy reports the demo folder and four-tab Doc reads passing and has recorded their IDs in GOOGLE_SETUP.md.
M0 and M1-B remain REVIEW pending Rajvansh's account/browser check and the required merge.
The current automated auth checks use synthetic worker responses and do not establish Rajvansh's Google authorization.
