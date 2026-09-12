# Current project status

Last documentation update: 2026-09-12. Update this file after a merged milestone or a shared blocker changes. This file describes the shared branch; individual work in progress belongs in TASK_LIST.

## What is working

- Private GitHub repository and shared AI workflow documents.
- The current 15-step implementation plan, feature specification, owner/task tracker, and supporting contracts are on main through [PR #7](https://github.com/SchrodingersCatLooks/graphnav/pull/7), merged as `19e23fd`.
  This publication changes documentation only; the application work remains in PR #6.
- M1-A scaffold merged through [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3) as `92a76ce`.
  Main contains WXT/React/TypeScript/Tailwind, package scripts, lockfile, Chrome installation instructions, and automated browser checks.
- Graph button and reversible empty panel on My Drive, real Drive folders, and Google Docs.
  Context changes, Graph/X toggle, Escape focus restoration, host editing, and the popover/viewport layout are covered by the acceptance record.
- Node 22.23.2/npm 10.9.9: type-check, production build, and six synthetic browser tests passed.
  Eddy reports a clean build on Node 22.23.2/npm 10.9.8 and the full Chrome 152.0.7977.84/macOS 26.5.2 checklist passing after a proper reload.
  His accepted content-script hash matches the M1-A merge checkpoint.

## What is not implemented or verified

- No Google authentication or real API reads, manual graph editor, PDF reader, source actions, persistence, or GPT generator in the merged scaffold.
- Eddy now reports real folder and nested-Doc reads passing at M1-B checkpoint `a83d545`, with the expected extension ID.
  That code and Rajvansh's local-storage/editor work are integrated on `rajvansh-ui` for [PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6) review, not merged into main.
- Demo source IDs are recorded in GOOGLE_SETUP.md; access and real reads on Rajvansh's account remain unverified.
- Eddy's newer `partner-data` checkpoint `c6e6b5e` adds Drive/Docs import mapping, account lookup, navigation, and worker request validation/tests.
  He reports real imports and exact destinations passing; browser-restart acceptance and Rajvansh's own-account acceptance remain open.
  The current navigation opens a new browser tab, so the desired same-tab Docs behavior remains M3-B work.
  This planning update inspected those changes but did not merge or independently verify them.
  Rajvansh's screenshots show connected status, the expected extension ID, and a small personal map; raw source reads and the full acceptance sequence remain pending.

## Version status

- **V1 manual:** the shell is merged and accepted; manual graph creation/editing, source navigation, and saving are the next implementation work.
  Imported structure is allowed, and personal ideas with meaningful labeled relationships remain core.
- **V2 GPT-assisted:** planned next stage, implementation not started.
  It will generate grounded, editable drafts through the same graph/navigation/storage system.
  The user now requires V2 in the current MVP effort rather than leaving it optional after the hackathon.

## Current shared milestone

**M1-B and M1-C: prove real Google reads and agree the shared graph format.**

- Eddy owns the implemented manifest/auth/read worker and the next Drive adapter integration.
  Rajvansh still needs to confirm extension ID `pidejkbkldalibjaehjfpjkcpjpcenpk` and the real demo reads in his own Chrome profile.
- The user approved Dexie/IndexedDB without AWS and assigned the initial storage implementation to Rajvansh.
  Rajvansh retains visible UI ownership; Eddy reviews the concrete contract and supplies verified account context and source adapters.
  [M1C_HANDOFF.md](./M1C_HANDOFF.md) records the response to his proposal and ownership; TASK_LIST tracks unmerged work.
- Next shared checkpoint: the installed extension reads the shared folder and tabbed Doc, and both lanes agree stable graph/node/edge IDs, source destinations, relationship labels/origins, and editing commands.
- The complete forward route is in [BUILD_PLAN.md](./BUILD_PLAN.md), with individual A/B tasks in TASK_LIST.
  Target code freeze is 6 AM and submission is 4 PM on September 12, local Eastern time; the plan reserves sleep, meals, deck/demo preparation, and submission buffer.

## Blockers

The scaffold handoff no longer blocks M1-B.
Eddy corrected the previous second-machine failure report: an improperly reloaded extension left a stale content script in the tab.
After a proper reload, the popover/visualViewport fix passes the full checklist, including header/X reachability and increased zoom.
No further UI defect is established by that earlier report, and no new runtime patch was needed.
Google API reads pass on Eddy's laptop according to his handoff.
The remaining M1-B acceptance blocker is Rajvansh's own account/browser check; M0 remains open until both-account access is confirmed.

## Decision record

- Independent Drive, Docs, and paper graphs share one extension and graph component.
- Rajvansh and partner now work on UI and data within each common milestone. This replaces the earlier split that assigned the whole PDF experience to one person.
- Manual Refresh and local personal state are the prototype persistence model.
- Local graph storage uses extension-owned IndexedDB through Dexie, with no AWS or cloud sync in V1.
  Personal edits and source identity remain separate; exact shared types are awaiting Eddy's integration review.
- Current release order: first prove V1 on-page manual editing/navigation/saving, then V2 editable drafts over selected content, and reuse both for the PDF experience.
  V2 is required by the current target but remains unimplemented.
  Docs uses a left graph with same-document tab navigation; the personal workspace is optional for Google workflows.
  The 6 AM target is aggressive; any reduction of the complete MVP requires an explicit scope decision and accurate feature claims.
- Code and task updates must be committed and pushed at working checkpoints, with a returned GitHub commit or PR link. Users' graph data remains separate.
- Larger-source design requires incremental loading, a bounded visible graph, separate adapters/storage, and versioned personal state. Performance remains untested until implementation.

- Feature coverage audit: FEATURE_SPEC now traces manual planning, on-page Drive/Docs, content-aware AI, PDF reading, many/group connections, selected source combinations, author actions, placement, persistence, and expansion boundaries.
  Original completion requirements have explicit X tasks; the earlier blanket deferral is not treated as a user-approved scope reduction.
  The deadline needs actual checkpoint reassessment, and the account owner must approve any Google write grant before real authoring actions.

- Source-assisted V1 is now explicit: ready-to-add suggestions and autofilled source nodes, Add selected, and editable structural baselines must work without GPT.
  BUILD_PLAN supplies 15 dependency-ordered steps, and N1 assigns the shared chooser/contract before Drive, Docs, PDF, and AI integration.
  Current runtime/main acceptance is unchanged by this planning clarification.

- Standing workflow decision: shared planning/tracking/reference documents are updated directly on main at claims and checkpoints from a clean main-based checkout.
  Both assistants must preserve concurrent teammate edits; runtime code continues on feature branches and reaches main through its separate review/acceptance process.

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
