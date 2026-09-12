# Current project status

Last shared update: 2026-09-12, after runtime PR #9 merged as `487b315`.

## Working on main

[PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6) merged the saved editor, Google integration, and on-page Drive/Docs graphs.
[PR #9](https://github.com/SchrodingersCatLooks/graphnav/pull/9) adds graph browsing and saved panel settings.
The current main runtime matches tested checkpoint `c209a87`.
Eddy's application work through `4738cb2` is included through normal merges.

- Drive and Docs offer Add existing with source names, kinds, paths, and destinations filled in; choose selected items or build a structural baseline without GPT.
- Browse nested Drive folders into the current map, add personal ideas and labeled connections, edit notes/labels, and attach an existing source to a personal node.
- The shared React Flow editor runs on the Google page and in the optional My maps workspace.
- ELK arranges nodes in bounded batches and wraps wide sibling layers; manual drags become saved pins.
  Imported containment and personal connections have different line styles.
- Search, consistent canvas/list pages, cycle-safe branch collapse, and compact focus previews make larger maps accessible.
  Focus previews preserve saved positions and do not allow dragging; use Show whole map to arrange.
- Compact, standard, and wide panel presets plus left/right docking persist in extension-owned storage.
- Check destinations uses Eddy's checker and shows unavailable sources while retaining personal notes.
- The Docs panel sits on the left, navigates exact document tabs in the same browser tab, highlights the current tab, and restores the panel after navigation.
- The extension background owns Dexie storage and validated edit commands.
  Selected-only refresh retains the selected membership and personal edits; baselines and expanded folders have separate scope bindings.
- Maps, annotations, positions, viewport, and JSON backups survive reopening.
  Google source identity includes the verified account key.
- Eddy's direct target-availability checker and PDF section extractor are merged foundations.
  PDF reading is not implemented yet.

## Verification and limits

Node 22.23.2 / npm 10.9.9: typecheck, production build, and all 52 tests passed for `c209a87`.
Installed Chromium tests use isolated profiles and synthetic Google API responses.
They cover the on-page select/edit/refresh/restart loop, exact nested-tab navigation, popover/zoom regressions, ordinary host editing, workspace backups, and storage isolation.
Storage tests cover atomic rollback, stale revisions, account mismatch, attachment identity, and pinned layout preservation.
Screenshots were inspected and graph-control rendering was corrected.
The build reports a large ELK chunk warning; the PDF fixture emits a standard-font configuration warning that must be resolved when adding the reader.
Eddy separately reports real Google reads/imports/navigation and a full Chrome restart passing.
No new live-account run on Rajvansh's laptop is claimed here.
Repeated partner-laptop checks are not a routine merge gate.

The graph stores at most 500 nodes and 2,000 relationships; the current canvas shows at most 50 matching nodes.
Source reads follow at most five Drive pages and report a partial result rather than deleting unseen items.
The synthetic 500-node document imported and arranged in 868 ms in one measured run, with 50 source/idea nodes displayed per page.
This includes mocked API responses and is not a real Google latency or production-scale benchmark.
Group junctions are additional rendered elements; dense relationship-heavy graphs still need broader performance testing.
Group membership controls, PDF reading, floating placement, source authoring, and AI generation/review remain open.
Backups currently exclude PDF bytes and future AI decisions.
No complete-MVP or production-scale acceptance is claimed.

## Next work and account action

Rajvansh continues the shared PDF-reader and selected-content preview UI tasks after this merged checkpoint.
Eddy should bring main into `partner-data`, read EDITOR_HANDOFF and the current tracker, and continue G0-B/G1-B: the relay and selected-content extraction contract.
The UI integration now supplies the selected-source service and same-Doc navigation; do not build a second scaffold or competing editor worker.
Eddy has fetched main and published the G1-B extraction/draft contract at `f412f9b` on partner-data, with its tracker update on main at `06e34fc`.
That new contract is not merged by PR #9.
A temporary integration with this UI checkpoint passed typecheck, build, and all 63 tests.
Eddy's previously reported intermittent workspace failure did not reproduce in that run; it remains a report to monitor rather than a declared fix.
EDITOR_HANDOFF records input-validation follow-ups before a real relay call.

The user is unsure who has an OpenAI API project/key.
G0-A remains blocked on identifying the account owner and configuring a server-held credential and test-spend limit privately.
Do not put a key in chat, GitHub, extension storage, or the browser bundle.
This does not block manual/source-assisted maps or PDF reading.
A meaningful authorized text PDF and document passages supporting useful connections are still needed for final demos.

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
