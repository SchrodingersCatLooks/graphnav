# Current project status

Last documentation update: 2026-09-12. Update this file after a merged milestone or a shared blocker changes. This file describes the shared branch; individual work in progress belongs in TASK_LIST.

## What is working

- Private GitHub repository and shared AI workflow documents.
- M1-A scaffold merged through [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3) as `92a76ce`.
  Main contains WXT/React/TypeScript/Tailwind, package scripts, lockfile, Chrome installation instructions, and automated browser checks.
- Graph button and reversible empty panel on My Drive, real Drive folders, and Google Docs.
  Context changes, Graph/X toggle, Escape focus restoration, host editing, and the popover/viewport layout are covered by the acceptance record.
- Node 22.23.2/npm 10.9.9: type-check, production build, and six synthetic browser tests passed.
  Eddy reports a clean build on Node 22.23.2/npm 10.9.8 and the full Chrome 152.0.7977.84/macOS 26.5.2 checklist passing after a proper reload.
  His accepted content-script hash matches the current local production bundle.

## What is not implemented or verified

- No Google authentication or real API reads, manual graph editor, PDF reader, source actions, persistence, or GPT generator in the merged scaffold.
- Eddy reports Google Cloud configuration complete on `partner-data` at `9f68af6`; manifest wiring and the background auth handler are next.
- M0 demo source links and access for both accounts remain unconfirmed.
  Eddy is preparing a Doc with three top-level tabs and one nested sub-tab, plus a Drive folder with ten subfolders including one nested level.

## Version status

- **V1 manual:** the shell is merged and accepted; manual graph creation/editing, source navigation, and saving are the next implementation work.
  Imported structure is allowed, and personal ideas with meaningful labeled relationships remain core.
- **V2 GPT-assisted:** planned next stage, implementation not started.
  It will generate grounded, editable drafts through the same graph/navigation/storage system.

## Current shared milestone

**M1-B and M1-C: prove real Google reads and agree the shared graph format.**

- Eddy brings main into `partner-data` without resetting or force-pushing.
  He now owns M1-B changes to `wxt.config.ts` for the public key, Identity permission, OAuth client/scopes, required API access, and the background worker.
  The exact configuration is in [GOOGLE_SETUP.md at 9f68af6](https://github.com/SchrodingersCatLooks/graphnav/blob/9f68af6/GOOGLE_SETUP.md).
  After the key is added, both laptops must verify extension ID `pidejkbkldalibjaehjfpjkcpjpcenpk`.
- Rajvansh retains panel/CSS ownership and coordinates M1-C with Eddy before implementing the M2 graph UI.
  Dependency changes remain coordinated.
- Next shared checkpoint: the installed extension reads the shared folder and tabbed Doc, and both lanes agree stable graph/node/edge IDs, source destinations, relationship labels/origins, and editing commands.

## Blockers

The scaffold handoff no longer blocks M1-B.
Eddy corrected the previous second-machine failure report: an improperly reloaded extension left a stale content script in the tab.
After a proper reload, the popover/visualViewport fix passes the full checklist, including header/X reachability and increased zoom.
No further UI defect is established by that earlier report, and no new runtime patch was needed.
Google API reads and demo-source access still need verification; M0 remains open.

## Decision record

- Independent Drive, Docs, and paper graphs share one extension and graph component.
- Rajvansh and partner now work on UI and data within each common milestone. This replaces the earlier split that assigned the whole PDF experience to one person.
- Manual Refresh and local personal state are the prototype persistence model.
- Current release order: V1 manual graph creation/editing, navigation, and saving; V2 GPT-assisted editable drafts over selected content. V2 is planned and has not started. Additional platforms remain optional; the last 3 hours stay reserved for presentation preparation.
- Code and task updates must be committed and pushed at working checkpoints, with a returned GitHub commit or PR link. Users' graph data remains separate.
- Larger-source design requires incremental loading, a bounded visible graph, separate adapters/storage, and versioned personal state. Performance remains untested until implementation.

## Completed action log

- 2026-09-12: Added the initial repository workflow starter.
- 2026-09-12: Added useful idea-note context, shared nightly milestones, and task/status update instructions. No application features were implemented by this documentation change.

- 2026-09-12: Added explicit GitHub push verification and larger-source design/acceptance criteria (DOC-2). Documentation only; no scalability or runtime checks have been executed.

- 2026-09-12: Recorded the user's manual V1 / GPT-assisted V2 decision (DOC-3), moved basic manual editing into the first graph milestone, and added the pending G1–G4 generation queue. Found the existing unmerged shell in PR #3 and updated the handoff to its unresolved browser acceptance. No application implementation or runtime verification was performed by this documentation update.

- 2026-09-12: Merged M1-A PR #3 as `92a76ce` after Eddy's corrected full second-machine acceptance.
  Verified main contains the tested scaffold and matches the accepted runtime; marked M1-A DONE and handed M1-B manifest/background ownership to Eddy.
  M0 sources and M1-C remain open; no Google API read is claimed.

For the next entry, record: date, task IDs, actual result, checks performed, commit or PR when available, and next checkpoint. Keep this short; do not duplicate the full task list.
