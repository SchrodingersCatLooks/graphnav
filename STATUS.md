# Current project status

Last documentation update: 2026-09-12. Update this file after a merged milestone or a shared blocker changes. This file describes the shared branch; individual work in progress belongs in TASK_LIST.

## What is working

- Private GitHub repository and shared AI workflow documents.
- Product context extracted from the idea notes, a joint build schedule, and task ownership.

## What is not implemented or verified

- Main has no application code or package scripts yet. An unmerged shell, manifest configuration, lockfile, and test setup exist in PR #3; they are not absent from the project.
- No Google connection, manual graph editor, PDF reader, source actions, persistence code, or GPT generator.
- Teammate invitation acceptance, laptop setup, and Google Console setup are unverified.

## Version status

- **V1 manual:** the extension shell is under review in PR #3; the manual graph editor is not implemented. Imported source structure is allowed; user-created concepts and meaningful labeled relationships are core.
- **V2 GPT-assisted:** planned next stage, implementation not started. It will generate grounded, editable drafts through the same graph/navigation/storage system.
- Product value comes from source integration, manual editing, precise navigation, and durable user work; generation augments those capabilities.

## Current shared milestone

**M1-A: finish acceptance of the existing shell before the shared scaffold handoff.**

- [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3), branch `rajvansh-ui`, reports a runnable extension shell plus build/test results. These reports were read, not independently rerun in this documentation task.
- Rajvansh's next action: inspect existing code and browser diagnostics, preserve the scaffold, verify the exact loaded build, and resolve the partner's remaining Docs panel failures.
- Partner's next action: repeat the reported checks on the same production build and supply focused diagnostics; Google Console setup can proceed in parallel.
- Next shared checkpoint: PR #3 browser acceptance passes on both laptops, then hand off the accepted scaffold and agree M1-C before starting the manual graph in M2. M1-B authentication work remains separate.

## Blockers

PR #3 reports unresolved partner-browser Docs header/close clipping, side-rail overlap, and zoom acceptance. Its author says not to merge until those failures are resolved and the browser checklist passes. Preserve that acceptance gate. Google API access remains unverified. For new blockers, record owner, observed error, attempted fix, and next action.

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

For the next entry, record: date, task IDs, actual result, checks performed, commit or PR when available, and next checkpoint. Keep this short; do not duplicate the full task list.
