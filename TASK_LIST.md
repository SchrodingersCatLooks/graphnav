# Shared task tracker

This is the only task-status list.
[BUILD_PLAN.md](./BUILD_PLAN.md#ordered-work-and-paired-ownership) defines the 15-step implementation order; each Order below points to its exact instructions, tools, dependencies, and exit gate.
[FEATURE_SPEC.md](./FEATURE_SPEC.md) supplies use cases and contracts; [STATUS.md](./STATUS.md) records merged progress.
Statuses are **TODO**, **DOING**, **BLOCKED**, **REVIEW**, and **DONE**.
DONE means merged and verified; a scheduled step or published specification is not completion evidence.
A tasks belong to Rajvansh on `rajvansh-ui`; B tasks belong to Eddy on `partner-data`.

The target remains 6 AM code freeze and 4 PM submission on September 12, local Eastern time.
Expired feature timeboxes have been replaced with dependencies rather than implying that missed slots were completed.
Steps 1-9 establish the core; 10-13 finish the additional intended interactions; 14 verifies the claimed release; 15 covers rest/pitch/submission.
A deadline-driven reduction needs an explicit decision and accurate open tasks.
Source suggestions, autofill, selected-item creation, and editable baselines without GPT are required V1 behavior.

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
| DOC-7 | Rajvansh | Publish shared planning documents to main | DONE | PR #7 merged as 19e23fd; nine Markdown files published; main runtime/config/dependencies/tests unchanged; PR #6 remains open for runtime review |
| M1-A | Rajvansh | Scaffold extension and Graph panel | DONE | PR #3 merged as 92a76ce; both-laptop acceptance and original six browser tests passed; historical record below |

## Implementation in execution order

Each person claims one bounded task at a time and pushes the contract before the other lane integrates it.
N1 covers the reusable chooser/contract and its Drive gate; M3 and M4 own the subsequent Docs/PDF integration gates.
Task IDs are preserved for existing handoffs even where the numbered order changes.

| ID | Owner | Order | Task | Status | Required completion check |
| --- | --- | --- | --- | --- | --- |
| M0-A | Rajvansh | 1 | Finish own-laptop baseline acceptance | REVIEW | Screenshots show Google connected, the expected extension ID, and two nodes/one link with Saved locally; still need real folder/Doc outputs, reopen, backup, and same-commit acceptance |
| M0-B | Eddy | 1 | Prepare meaningful shared Doc and PDF demo content | TODO | Reuse the existing shared folder and four-tab Doc; ensure Doc text supports at least two non-containment connections; select an authorized text PDF with three usable anchors; both accounts can access required sources |
| M1-B | Eddy | 1 | Google sign-in and first real reads | REVIEW | Eddy reports ten folder children and four Doc tabs at a83d545; stable extension ID configured; current combined-build acceptance and merge still required |
| M1-C-A | Rajvansh | 1 | Publish/reconcile graph, storage, and UI contracts | REVIEW | Types/repository in c7f1226 and complete UI in 88a4d00; M1C_HANDOFF answers the proposal; 22 tests passed for that runtime; integrate reviewed partner changes normally |
| M1-C-B | Eddy | 1 | Review exact shared contract and import handoff | TODO | Existing import code already uses the repository; explicitly settle account-qualified graph lookup, request/edit types, future storage ownership, and rerun the combined checks; review PR #6 |
| G0-A | Rajvansh | 1 | Confirm API access, funding, and demo configuration | TODO | Identify the API project/credential owner, approve a test spend cap, and configure the key privately on the relay host; no secret in chat/GitHub; do not assume ChatGPT access proves API readiness |
| N1-A | Rajvansh | 2 | Build reusable Add existing / autofill chooser | TODO | Step 2 Drive gate: context suggestions, search/path disambiguation, multi-select, Add selected, Already added, personal-source attachment; GPT-off and cancel/no-write tests; Docs/PDF reuse completed in M3-A/M4-A |
| N1-B | Eddy | 2 | Supply source candidates and selected-item import contract | TODO | Read-only candidate listing, stable account/source/locator keys, pagination, atomic revision-checked Add selected, deduplication, selected-versus-outline membership and compatible migration; Drive first, then M3-B/M4-B adapters |
| M2-B | Eddy | 2-3 | Complete Drive import, account scope, and worker edit commands | DOING | Eddy reports live imports (11 Drive nodes, 5 Doc nodes), repeated-import reuse, and exact destination opening; still verify restart, account-qualified lookup/read/list, concurrent imports, pagination, and on-page transactional edit commands; complete N1 selected-item and baseline paths through the same worker; listing is read-only and selected-only Refresh must not import unwanted siblings. |
| M2-A | Rajvansh | 3 | Put the reusable editor in the Drive panel | DOING | Reuse workspace controller in Drive popover; Add existing with autofill, Add idea, Build baseline; real typed nodes, ELK with manual pins, focus/collapse/search, accessible connections and inspector; GPT-off selected-item and baseline workflows navigate/save/reopen inside Drive |
| M3-A | Rajvansh | 4 | Show a usable graph on the left of Docs | TODO | Reuse source chooser for top/nested tabs with titles, hierarchy, and destinations prefilled; Add selected or Build baseline with AI off; left panel, current-tab highlight, same-Doc navigation, reachable close, normal typing/scrolling at 100%/150% zoom |
| M3-B | Eddy | 4 | Complete Docs import and same-document tab navigation | TODO | Reuse verified importDocTabs and locators; current NAVIGATE creates a new browser tab, so add current-Doc-tab navigation and test top-level/nested selection while staying in the original editor; supply N1-compatible nested-tab candidates and selected-item membership; do not require a full-document import to add one tab. |
| M5-A | Rajvansh | 5 | Finish save/refresh/errors and panel preferences | TODO | On-page changes and panel width/dock preference restore; Refresh and stale/partial/unavailable states are clear; show saving/failure accurately; preserve pinned layout and reachable controls |
| M5-B | Eddy | 5 | Prove persistence and refresh through the worker | TODO | Actual imports plus personal edits survive worker/browser restart, rename, partial/complete refresh, source errors, and account change; stale edits fail visibly; no duplicate default graph on simultaneous import; test selected-only refresh versus baseline scope, duplicate Add requests, and preservation of personal overrides after source rename. |
| G0-B | Eddy | 6 | Build the minimal local AI relay and startup path | TODO | Local authenticated extension-to-relay request reaches the model with a server-held key; restrict origin/payload/rate; document startup for both laptops; stopping the relay leaves manual maps usable |
| G1-A | Rajvansh | 6 | Select and preview exactly what will be analyzed | TODO | Choose Doc tabs or, after M4, PDF pages; show selected content and limits; Generate requires a deliberate click; unsupported/oversize content is explained |
| G1-B | Eddy | 6 | Extract text and agree the generation input/draft types | TODO | UC-04: traverse selected tab paragraphs/table cells and heading metadata; resolve explicit links without fetching unselected content; read actual selected content into bounded passages with source ID, version/hash, passage ID, and resolvable locator; exclude unselected content; Rajvansh can build against a labeled fixture of this exact contract |
| G2-A | Rajvansh | 7 | Add real Generate and draft-preview states | TODO | Progress, cancel, retry, empty result, and failure states work; late/cancelled output does not replace the graph; a real response appears inside the current surface |
| G2-B | Eddy | 7 | Generate and validate a structured graph draft | TODO | Real model response proposes supported concepts/relationships beyond containment; schema, sizes, IDs, evidence excerpts, and selected-source references validate; unsupported references never reach live storage; model ID/timing recorded |
| G3-A | Rajvansh | 8 | Inspect evidence and accept/edit/reject suggestions | TODO | Preview supporting passage and destination; accept one, edit another, reject another; distinguish suggestions, personal edges, and source structure using the same editor |
| G3-B | Eddy | 8 | Persist proposals, decisions, and accepted records safely | TODO | Additive database/backup migration preserves 88a4d00 maps and old backups; acceptance is atomic; refresh/regeneration retains user edits and exact rejection/removal decisions without duplicating accepted items |
| M4-A | Rajvansh | 9 | Add the extension-owned PDF reader and graph | TODO | Local file picker, readable pages, graph beside the PDF, three working jumps, personal editing, and reused selected-text generation/review controls; reuse N1 section/page suggestions and autofill; Add selected or Build baseline must work with GPT unavailable. |
| M4-B | Eddy | 9 | Supply PDF text, identity, destinations, and storage | TODO | Bundled PDF.js reads a text PDF; bookmarks or corrected page anchors resolve; inspect multi-column extraction; bytes/fingerprint restore after reopen; backup explicitly reports external PDF attachment and exact-file reattachment; wrong reattachment and unsupported scans fail clearly; passages work with G1/G2; supply N1-compatible candidates/selected membership as well as the full PDF baseline. |
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
| M6-A | Rajvansh | 14 | Run both-laptop visual and end-to-end acceptance | TODO | All required BUILD_PLAN acceptance rows pass on the exact release commit; 50-node view remains readable; no host editing/zoom regression; product claims match results |
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
| Rajvansh | DOC-7 publication complete, then N1-A/M2-A / `rajvansh-ui` | PR #6 has the personal workspace, Dexie repository, backups, and visible auth state at 88a4d00; clean install/typecheck/build and 22 tests passed for that runtime. User screenshots show connected status, expected extension ID, and a two-node personal graph. PR #7 published the 15-step plan, feature specification, and ordered tracker to main as 19e23fd; N1 makes source suggestions/autofill and GPT-free baselines explicit; runtime remains in PR #6. | Raw Google reads and full installed acceptance on Rajvansh's account are unverified; partner import changes need integration/review; API project readiness is unknown. | Complete M0-A/G0-A account actions, review Eddy's c6e6b5e checkpoint and M1-C contract, then implement N1-A shared source selection and M2-A Drive mounting against the reviewed N1-B/M2-B messages. |
| Partner | M2-B / `partner-data` | Import and navigation both verified live. `ACCOUNT_KEY` returns a Drive `permissionId`, confirming `about.get` works under the existing metadata scope. `IMPORT_DRIVE_FOLDER` stored 11 nodes, `IMPORT_DOC_TABS` stored 5, and a repeat import reused the same `graphId` (revision bumped, no duplicate). `NAVIGATE` opened the exact nested Doc sub-tab and a real Drive folder from stored locators. Dispatcher parses requests with Zod and restricts senders. Imported maps now record `createdVia: 'import'`. Node 22.23.2 type-check, production build, and all 22 tests pass. | Reopening a stored graph after a full browser restart is unverified, so M2-B is not yet REVIEW. Existing two graphs still carry the old `createdVia: 'manual'` value. Rajvansh's own-account acceptance is still outstanding, so M1-B remains REVIEW and main does not have it. | Verify reopen after restart, then M3-B, which is largely covered by the existing Docs adapter and navigation. |

Eddy's handoff above is preserved from `origin/partner-data` at `c6e6b5e`.
His navigation checkpoint reports 22 tests passing; the newer tip adds dispatcher tests, and this planning task has not rerun or certified that combined runtime.
The earlier backup ordering assertion is fixed in `88a4d00`; do not carry the old failure forward.
His imports and exact destination opening are reported live results, while same-browser-tab Docs navigation and restart acceptance remain separate checks.
The partner runtime was inspected for this plan, not merged by this documentation update.
After this shared plan revision, each person updates their own task and handoff rows and pushes a checkpoint.
The merger updates STATUS after reviewed runtime work reaches main.
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
