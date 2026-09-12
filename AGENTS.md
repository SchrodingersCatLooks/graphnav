# Instructions for AI coding assistants

Follow the user's current explicit task. Keep both teammates working toward the same shared milestone. Do not expand product scope without a user decision.

## Before editing

1. Read README, IDEA, BUILD_PLAN, STATUS, and the relevant TASK_LIST row. These are linked from README.
2. Inspect branch, git status, and existing implementation. Preserve unrelated and uncommitted teammate work.
3. Identify the human owner and task ID. Claim the row, record branch and next action, and make the claim visible before overlapping work begins.
4. Coordinate shared types, configuration, dependencies, and ownership before editing files another active task uses. Work on one bounded task with a visible completion check.

## Product boundaries

- Current release order: V1 manual graph creation/editing, source navigation, and persistence; V2 GPT-assisted draft generation. V2 is planned, not currently implemented. Do not make V1 depend on a model.
- Manual editing is a core acceptance requirement: add/edit/remove personal idea nodes and labeled edges, attach real source destinations, and preserve edits through reopening/refresh. Structural API/PDF imports are still allowed in V1.

- Build one Chrome extension with a shared graph component and distinct Drive, Docs, and PDF adapters. Each source has an independent graph; cross-document discovery is optional.
- Preserve normal Google editing. Use a reversible graph overlay/panel for Drive/Docs and an extension-owned reader for PDFs.
- Read Google sources through authorized APIs and PDFs through PDF.js. Use page context to identify the source; do not scrape Google editor text or use screenshots as the content model.
- Keep stable IDs, account context, and navigation targets separate from node positions. Label personal concept nodes without source destinations.
- Store generated structure separately from personal layouts, notes, and connections. Refresh preserves edits for surviving IDs and marks missing targets.
- A visual drag changes layout. Source writes require an explicit action, suitable authorization, and actual editing permission. Build mode does not grant permissions.
- Distinguish source containment, explicit references, and personal relationships. V2 generated concepts/edges need source anchors, supporting excerpts, and an explicit proposal/review state. Preserve accepted, edited, and rejected decisions across regeneration.
- Keep source integrations, the editable graph, and saved state useful without generation. A replaceable generator returns drafts; it does not own the UI or overwrite user work. In V2, keep provider secrets on a server and submit only authorized selected content.
- Support text-based PDFs first. Use bookmarks or page-aware heading anchors with correction. Do not claim automatic argument extraction or OCR without implementation and verification.

## Implementation and validation

- Use the agreed stack and only add dependencies needed for the task. Commit the lockfile. Scaffold in a temporary sibling folder if initialization would overwrite these documents.
- Verify current official API details when uncertain. Do not assume a narrow Google file grant grants access to an entire folder tree.
- Use authorized demo content or clearly labeled fixtures. Never commit tokens, private keys, personal source files, or unrelated production settings. Keep Google tokens out of page contexts.
- Inspect actual package scripts. For substantive code changes, run configured type checks and a production build, plus focused checks for the behavior changed. Do not add tests that merely repeat implementation details.
- Test Google integration in the installed extension. Verify exact destinations. For persistence, check reopen and Refresh; for source writes, check both read-only behavior and an authorized demo write.
- Never report checks, features, or API connections as working without evidence. If a check requires the teammate's browser, mark REVIEW or BLOCKED and give the exact click-through they must perform.

## Keep the team context current

- TASK_LIST is the only task-status list. Update the owner's task and handoff row when claiming, blocking, handing over for review, or finishing. Include checks and a PR link when available.
- STATUS describes merged shared progress. The person merging a milestone updates what works, remaining blockers, next actions for both people, and a short dated action entry.
- IDEA changes only when the product decision changes. BUILD_PLAN changes when the sequence, ownership, or architecture changes. Record material decisions in STATUS without copying old conversations.
- README is the entrypoint and home for actual run commands once they exist. CLAUDE points to these same instructions; do not create competing rule sets.
- These files are maintained during work; they are not an autonomous background tracking system. Do not fabricate completed tasks or silently mark proposed features DONE.

## GitHub checkpoints

- Before coding, verify the local repository's origin points to `SchrodingersCatLooks/graphnav`, confirm the active branch, and preserve existing changes. Each teammate uses their own clone.
- After each completed task or working checkpoint, update the relevant tracking files, commit only intended files, and push to the owner's branch. Saving locally does not update GitHub.
- Report the pushed branch and commit or PR link. If push fails, say exactly what remains local and record the blocker; do not report GitHub as updated.
- Merge reviewed working slices into main, then bring main into both working branches. GitHub stores project code and planning documents; it does not synchronize users' private graphs, Google documents, PDFs, or tokens.

## Designing for larger sources

- Load folder children on demand, follow pagination, and bound concurrent requests. Reuse cached reads and offer Refresh; never require a full Drive crawl before opening the interface.
- Keep the rendered graph bounded using focus, collapse, and Show more. Loading more data does not require rendering or laying out every cached node.
- Keep graph UI, source adapters, and storage behind separate interfaces. Use stable provider IDs and a schema version for saved state so future migrations are possible.
- Set cache limits, keep PDF bytes separate, and preserve personal edits when evicting reconstructible source cache. Handle storage failures visibly.
- Validate larger-source behavior during the existing integration milestone with a labeled synthetic dataset and a visible-node limit; record actual timings and limits. Do not claim production-scale readiness from architecture alone.

## Team workflow

- Rajvansh owns UI; partner owns data/actions within the same milestones. Suggested branches are `rajvansh-ui` and `partner-data`. Coordinate when rebalancing tasks.
- Keep commits small; push and merge working slices through a short PR. Do not reset, force-push, or overwrite teammate work.
- Bring current main into each working branch at shared checkpoints. Review and test each other's slice before proceeding.
- Finish with a concise handoff: task ID, what works, files touched, checks actually run, blockers, and next shared checkpoint.
- Preserve the last 3 hours for deck, demo recording, and rehearsal. Follow BUILD_PLAN's cut order when time runs short.
