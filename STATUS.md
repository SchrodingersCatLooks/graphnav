# Current project status

Last shared update: 2026-09-12, reviewing main c6d700f for the user's product check-in.

## Working on main

[PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6) merged the saved editor, Google integration, and on-page Drive/Docs graphs.
[PR #9](https://github.com/SchrodingersCatLooks/graphnav/pull/9) adds graph browsing and saved panel settings.
[PR #10](https://github.com/SchrodingersCatLooks/graphnav/pull/10) adds the local PDF reader and editable section maps.
[PR #11](https://github.com/SchrodingersCatLooks/graphnav/pull/11) adds selected-content preview and integrates Eddy work through 179d98f.
[PR #14](https://github.com/SchrodingersCatLooks/graphnav/pull/14) adds floating panel movement, resizing and saved placement.
[PR #15](https://github.com/SchrodingersCatLooks/graphnav/pull/15) adds the selected project-map workflow across Docs and PDFs.
The current main runtime includes bcfd0d7's UI and Eddy's ddf566d proposal-store backend, merged as c6d700f.
Eddy's application work through 179d98f is included through normal merges.

- Drive and Docs offer Add existing with source names, kinds, paths, and destinations filled in; choose selected items or build a structural baseline without GPT.
- Browse nested Drive folders into the current map, add personal ideas and labeled connections, edit notes/labels, and attach an existing source to a personal node.
- The shared React Flow editor runs on the Google page and in the optional My maps workspace.
- ELK arranges nodes in bounded batches and wraps wide sibling layers; manual drags become saved pins.
  Imported containment and personal connections have different line styles.
- Search, consistent canvas/list pages, cycle-safe branch collapse, and compact focus previews make larger maps accessible.
  Focus previews preserve saved positions and do not allow dragging; use Show whole map to arrange.
- Compact, standard, and wide panel presets plus left/right docking persist in extension-owned storage.
- Floating panels support pointer/keyboard move/resize, docking/reset and cancelled-drag rollback.
  Placement survives Chrome restarting and clamps to the visual viewport without changing saved graph records.
- Check destinations uses Eddy's checker and shows unavailable sources while retaining personal notes.
- The Docs panel sits on the left, navigates exact document tabs in the same browser tab, highlights the current tab, and restores the panel after navigation.
- The extension background owns Dexie storage and validated edit commands.
  Selected-only refresh retains the selected membership and personal edits; baselines and expanded folders have separate scope bindings.
- Maps, annotations, positions, viewport, and JSON backups survive reopening.
  Google source identity includes the verified account key.
- Choose a target map above source choices and add a PDF directly from a Drive/Docs map.
  A Doc tab and PDF section can share a personal connection; navigation preserves the chosen map beside the exact destination.
  Separate source refresh and independent maps remain intact in the installed fixture test.
- Eddy's direct target-availability checker and PDF section extractor are merged foundations.
  The extension-owned PDF reader now uses that extractor, with a local library, section/page suggestions, selected imports or a baseline, and the shared graph beside the paper.
- PDF nodes open exact pages and section anchors, including separate sections on the same page.
  Bytes survive Chrome restarting; removing bytes retains maps, and exact-fingerprint reattachment restores destinations.
  Backups visibly explain that they exclude original PDF bytes.

- Docs and PDF readers offer a shared selected-content panel, purpose choices and the complete bounded text preview.
  Selection/purpose/map changes invalidate preview state, cancelled/late reads cannot replace newer choices, and preview sends nothing to a model.
- Generation input validation binds text, character totals, passage IDs, account/source/locator/version and allowed map-node IDs.
  Empty drafts require valid identity/schema; late output after timeout and caller cancellation are refused.
  The merged extension client pairs with a local relay and displays validated drafts/evidence.
  One real OpenAI request returned eight ideas and eight connections from two explicitly selected authored PDF pages, with exact evidence navigation and unchanged saved graph.
- Eddy's authored six-page demo paper and generation/scale tests are now included on main.
- Eddy's additive proposal-decision table and typed acceptance/recall methods are now merged.
  Their storage tests pass, but no browser control calls them yet; generated suggestions remain unsaved previews in the current UI.
  Proposal decisions are not yet included by the editor's actual export/import methods despite the newer backup schema accepting them.

## Verification and limits

For c6d700f, extension/relay typechecks, production build and 34 focused tests pass.
The focused set covers proposals, storage, requests, installed on-page workflows and the PDF reader; a new full-suite or real-account pass is not claimed.
REVIEW_WALKTHROUGH describes the requested user check-in and expected current behavior.

Node 22.23.2 / npm 10.9.9: extension/relay typechecks, production build and all 118 combined tests passed for the PR #14 integration.
Floating controls passed installed pointer/keyboard, cancellation, restart, dock/reset, narrow-window/zoom, top-layer and host-editing checks.
PR #15 passed both typechecks, production build and all 19 affected tests.
Its full suite passed 118/119, with one timeout during browser-fixture setup before PDF preview code ran and a worker-teardown timeout afterward.
The same PDF preview test passed three isolated reruns; the browser-startup cause remains unestablished and is tracked under M6-B.
Installed Chromium tests use isolated profiles and synthetic Google API responses.
They cover the on-page select/edit/refresh/restart loop, exact nested-tab navigation, popover/zoom regressions, ordinary host editing, workspace backups, and storage isolation.
Storage tests cover atomic rollback, stale revisions, account mismatch, attachment identity, and pinned layout preservation.
Screenshots were inspected and graph-control rendering was corrected.
The build retains large-chunk warnings; the PDF standard-font warning is resolved with bundled local fonts.
The installed reader tests render actual PDF bytes, navigate all three fixture pages and distinct same-page sections, preserve notes through restart/refresh, copy backups, reject wrong-file reattachment, and check narrow layouts.
Desktop/narrow screenshots were inspected; scoped text-layer styles prevent the PDF viewer from altering graph controls.
These tests use authored synthetic content, not acceptance on an independent publication.
Eddy separately reports real Google reads/imports/navigation and a full Chrome restart passing.
No new live-account run on Rajvansh's laptop is claimed here.
Repeated partner-laptop checks are not a routine merge gate.

The graph stores at most 500 nodes and 2,000 relationships; the current canvas shows at most 50 matching nodes.
Source reads follow at most five Drive pages and report a partial result rather than deleting unseen items.
The synthetic 500-node document imported and arranged in 868 ms in one measured run, with 50 source/idea nodes displayed per page.
This includes mocked API responses and is not a real Google latency or production-scale benchmark.
Group junctions are additional rendered elements; dense relationship-heavy graphs still need broader performance testing.
PDF limits are 20 MiB per file, 300 pages, and 100 MiB total saved PDF bytes.
Password-protected PDFs and OCR are unsupported.
Group membership controls, mixed-source workflow completion, source authoring, and persistent AI review remain open.
Backups currently exclude PDF bytes and future AI decisions.
No complete-MVP or production-scale acceptance is claimed.

## Next work and account action

Rajvansh is addressing the user's screenshot-based UX1-A feedback before continuing G3-A.
The claim covers Drive Home entry and SPA panel state, cached current-page maps, a graph-first overlay, click-based connections/editing/navigation, and Google connection controls.
Shared changes are limited to panel/navigation/auth messages and editor source-map selection; Eddy retains proposal storage and backup integration.
No screenshot defect is marked fixed until the reproduction and changed user path pass.

G1 selected-content preview and G2 relay generation/evidence display are merged through PR #13.
Eddy should bring main into partner-data and read GENERATION_HANDOFF before editing shared generation/type/request files.
His relay work through a8325dc is merged and reconciled with the extension client.
Eddy owns G3-B proposal persistence, decisions, additive migration and atomic acceptance/backup methods.
Rajvansh owns the G3-A review UI; X2-A's manual project-map selection/navigation is now merged.
Eddy's typed proposal-store/decision handoff is now present in PROPOSAL_STORE_HANDOFF at ddf566d and on main c6d700f.
Rajvansh can review and connect G3-A after the user's current usability check-in.
The remaining G3-B review includes decision backup export/import; the editor still emits version 1 snapshots without decisions.
Combined multi-source AI input, group membership controls and source-authoring/heading actions remain open.
Persistent accepted/edited/rejected AI decisions remain open; no complete V2 acceptance is claimed.

The replacement private key authenticated successfully and completed one real gpt-5-mini-2025-08-07 request in 24,973 ms, using 757 input and 1,552 output tokens.
Its private ignored .env.relay.local file is not committed or bundled; Chrome stores only a separate relay pairing code.
The relay defaults to one active request, five starts per minute and twenty starts per launch.
No account-wide monetary budget was configured.
The exposed chat credential should be rotated before final use; do not put replacement keys in chat, tracked GitHub files, extension storage or the browser bundle.
Startup and authenticated health were verified; the relay was restarted for this check-in and is ready locally on port 8787.
Use relay/README.md to start it for the demo, then pair from the extension settings.
At the user's request, the current key is also stored as the encrypted repository Actions secret OPENAI_API_KEY and its presence was verified.
GitHub's secret UI does not reveal its value, and cloning the repository does not provide a local relay key to Eddy.
Each laptop needs private local configuration; the user must share a credential securely with Eddy or grant project access so he can create his own key.
Eddy's authored six-page demo PDF is now on main at demo/GraphNav-demo-paper.pdf; it is not an independent publication.
Its content and the shared Doc still need the final evidence/usefulness check.

V1 and V2 both remain in the requested target.
The user removed the 6 AM code freeze; there is no automatic stop at that time.
The full V1/V2 and usability target remains, with 4 PM Eastern submission and flexible human rest, meals, pitch work, and submission buffer recorded in BUILD_PLAN.
The remaining open rows are requirements, not silently approved cuts.

## Shared rules

GitHub holds code and shared planning; private maps, Google data, PDF bytes, and tokens do not sync through GitHub.
Planning and tracking updates go directly to main from a current clean documentation checkout.
Application code stays in the assigned branch until a checked working checkpoint is merged normally.
The assistants must fetch/read current main and the published handoffs; a committed instruction does not prove another assistant has read it.
Google files remain read only in the current UI; changing a graph never renames or moves source files.

## Completed action log

- 2026-09-12: Pulled c6d700f, rebuilt it and passed both typechecks plus 34 focused tests for the user's product review.
  Started the local relay and verified authenticated health without making a new paid request.
  Published REVIEW_WALKTHROUGH, recorded Eddy's proposal-store handoff and the remaining decision-backup integration, and kept full-MVP acceptance open.

- 2026-09-12: Merged X2-A manual workflow PR #15 as e5dcb88 and pulled main into rajvansh-ui again.
  A Doc-tab/PDF-section project map, personal connection, both navigation directions, independent refresh and restart passed installed fixture testing.
  Recorded the full-suite browser-startup flake and its three passing isolated reruns without claiming a fix.
  Stored OPENAI_API_KEY as an encrypted GitHub Actions repository secret on explicit request; no credential entered a tracked file, commit or extension bundle.

- 2026-09-12: Pulled current main before implementing X4-A, merged PR #14 as 373369f, then pulled main again.
  The 24e6a2e runtime passes both typechecks, production build and all 118 tests.
  Desktop/narrow screenshots inspected; panel gestures leave nodes, relationships, positions and annotations unchanged.
  Updated stale AI/freeze prose and claimed X2-A UI/navigation outside Eddy's proposal persistence files.

- 2026-09-12: Added the initial repository workflow starter.
- 2026-09-12: Added useful idea-note context, shared nightly milestones, and task/status update instructions. No application features were implemented by this documentation change.

- 2026-09-12: Added explicit GitHub push verification and larger-source design/acceptance criteria (DOC-2). Documentation only; no scalability or runtime checks have been executed.

- 2026-09-12: Recorded the user's manual V1 / GPT-assisted V2 decision (DOC-3), moved basic manual editing into the first graph milestone, and added the pending G1–G4 generation queue. Found the existing unmerged shell in PR #3 and updated the handoff to its unresolved browser acceptance. No application implementation or runtime verification was performed by this documentation update.

- 2026-09-12: Merged M1-A PR #3 as `92a76ce` after Eddy's corrected full second-machine acceptance.
  Verified main contains the tested scaffold and matches the accepted runtime; marked M1-A DONE and handed M1-B manifest/background ownership to Eddy.
  M0 sources and M1-C remain open; no Google API read is claimed.

- 2026-09-12: Updated the shared blocker after Eddy's M1-B handoff: his real reads pass; Rajvansh's second-account check is pending.
  Recorded the user's approved local-storage direction and linked the combined PR #6 review.
  Main still contains only the accepted scaffold; no new milestone is marked merged or DONE.

- 2026-09-12: DOC-4 records the user's full V1 + V2 target, on-page/left-Docs experience, individual task ownership, and deadline with protected rest/presentation time.
  Updated the plan using the observed `88a4d00` UI and `c6e6b5e` partner checkpoints; no runtime change, merge, live source acceptance, or new passing application test is claimed.

- 2026-09-12: DOC-5 publishes the feature/use-case specification after auditing IDEA history, runtime contracts, and official integration documentation.
  Added paired completion/expansion tasks and removed contradictory blanket scope deferrals; main/runtime remain unchanged and no new acceptance is claimed.

- 2026-09-12: DOC-6 records the user's source-assisted manual workflow and replaces expired feature slots with concrete ordered lane instructions, tools, handoffs, and gates.
  Added N1-A/N1-B, reordered the existing task rows without resetting evidence, and preserved Eddy's latest reported handoff; documentation only.

- 2026-09-12: DOC-7 merged PR #7 as `19e23fd`, publishing nine shared planning/reference Markdown files to main.
  Verified the main diff is documentation only, relative links/anchors resolve, all 52 task IDs are unique, and Eddy's handoff is preserved.
  DOC-4 through DOC-7 are DONE for documentation publication; runtime tasks keep their prior statuses and PR #6 remains open.

- 2026-09-12: DOC-8 records the user's standing direct-main documentation instruction in AGENTS and the shared entrypoints.
  Verified documentation links/diff and preserved existing application statuses and partner handoff; no runtime changes.

For the next entry, record: date, task IDs, actual result, checks performed, commit or PR when available, and next checkpoint. Keep this short; do not duplicate the full task list.

- 2026-09-12: Merged PR #6 as `4cfe83d` after typecheck, build, and 48 passing tests.
  Main now contains the shared local editor and source-assisted on-page Drive/Docs integration, including Eddy's work through `4738cb2`.
  Updated README, tracker, and editor handoff directly on main; remaining V1/V2 requirements remain open.

- 2026-09-12: Merged PR #9 as `487b315` for M2-A/M5-A.
  Verified current main runtime matches `c209a87`, with typecheck/build/52 tests and inspected screenshots.
  The isolated combination with Eddy's `f412f9b` passes all 63 tests; his branch and current tracker updates are preserved.
  M2-A/M5-A remain REVIEW for their targeted live-account checks; PDF and AI work remain open.

- 2026-09-12: Removed the 6 AM freeze at the user's request.
  Rajvansh claims M4-A for the PDF reader and documents its shared boundary in PDF_HANDOFF.
  This is a claim and schedule update, not a completed PDF or V2 feature.

- 2026-09-12: Merged M4-A manual PDF reader slice in PR #10 as dc57282.
  Typecheck/build/all 58 tests pass, including actual PDF rendering, restart, exact page/section jumps, notes/refresh, backups, quota/rollback, and missing-file recovery.
  M4-A stays REVIEW because generation reuse and final demo acceptance remain; G1-A is now claimed in GENERATION_HANDOFF.

- 2026-09-12: Merged PR #11 as 1453ec6 with Eddy work through 179d98f and selected Doc/PDF preview.
  Combined 94 tests passed; final preview layout rerun in four installed cases and screenshots inspected.
  G1-A is DONE, G2-A is claimed, and server credentials/live generation/decision persistence remain open.

- 2026-09-12: G0-A now has project metadata and a private local setup path.
  Actual credentials and live API access remain unverified; no model request or new runtime acceptance is claimed.

- 2026-09-12: Merged PR #12 as c947fa1, runtime 148dfa4.
  Typecheck/build/all 102 tests pass; pairing, generation, evidence navigation, cancellation, refusal and manual fallback are verified with an installed extension and local synthetic provider.
  Actual OpenAI authentication returned 401 invalid_api_key; no model request succeeded.
  Eddy’s de16b0c relay needs client/server reconciliation, and G3-B database/proposal ownership is explicitly assigned to Eddy.

- 2026-09-12: Replacement private API credential passed authentication and model availability lookup.
  Eddy’s server checkpoint a8325dc is on main; its full integration is being checked by Rajvansh, including correcting the old hash computation and adding request limits.
  This supersedes the earlier authentication failure but does not yet claim a generated result or successful provider billing.

- 2026-09-12: Merged PR #13 as 5fa1ba4 after extension/relay typechecks, build, all 116 tests and 14 affected final checks.
  A real installed-extension request used gpt-5-mini-2025-08-07 on authored PDF pages 2 and 3: eight ideas/eight connections, 24,973 ms, 757 input/1,552 output tokens.
  Evidence navigation and unchanged saved baseline passed, and the screenshot was inspected.
  A preceding browser attempt timed out before any provider call; the fresh-profile run passed.
  G0/G2 are complete for this scoped connection/draft loop; G3/G4 remain open.
  Rajvansh claims X4-A and its separate placement preference bridge while Eddy owns the proposal store/decision API.
