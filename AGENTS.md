# Instructions for AI coding assistants

Follow the user's current explicit task. Use this file to preserve the agreed product and coordinate with the other teammate.

## Before editing

1. Read `README.md` and the relevant row of `TASK_LIST.md`.
2. Inspect the current branch, git status, and existing implementation. Preserve unrelated and uncommitted teammate work.
3. Work on one bounded milestone with a visible completion check. Coordinate ownership before changing shared data types or configuration used by another active branch.

## Product boundaries

- Build one Chrome extension with a shared graph component and distinct Drive, Docs, and PDF adapters.
- Each source has an independent graph. Do not silently replace this with a universal cross-document knowledge graph.
- Keep normal Google editing available. Use a reversible graph overlay/panel in Drive/Docs and an extension-owned reader for PDFs.
- Read Drive/Docs through authorized APIs; use PDF.js for actual PDF data. Do not scrape the Google editor for document content.
- Store stable IDs, source identity, and navigation destinations separately from node positions. Include the account context when caching Google sources.
- Persist personal positions, labels, and connections separately from generated source structure so refresh preserves them.
- A visual drag changes layout. A source mutation requires an explicit user action, suitable API authorization, and editing permission.
- Mark inferred relationships as suggestions and ground them in source passages. Containment and citations must not be mislabeled as semantic support.
- Support text-based PDFs first. Embedded outlines are optional; use page-aware heading fallback and allow corrections. Do not claim scanned-PDF/OCR support until implemented.

## Implementation and validation

- Use the stack agreed in the README. Add dependencies only when the current milestone needs them; commit the lockfile.
- Scaffold into a temporary sibling folder if an initializer would overwrite existing project files, then merge intentionally.
- Verify current official API documentation when an integration detail is uncertain.
- Use synthetic fixtures or authorized demo content. Never commit tokens, private keys, real user documents, or unrelated production settings.
- Inspect actual package scripts before running checks. Once configured, run type checking and a production build for substantive code changes, plus a focused browser check of the changed behavior.
- Test Google integration in the installed extension. For persistence changes, verify reload and refresh preserve a user's edits. For source writes, verify both read-only behavior and an authorized write using demo content.
- Do not report tests, API connections, or features as working without running the relevant check. Record concrete blockers and any unverified steps.

## Team workflow

- Person A owns `graph-and-papers`; Person B owns `google-integration`. Branch names can be adjusted by the team.
- Keep commits small and merge working slices through a short PR. Do not reset, force-push, or overwrite a teammate's work.
- Use the PR template for what changed, why, and how it was checked. Avoid duplicated logs and mandatory long-form review paperwork.
- Update the relevant task status only when work changes. Leave a concise handoff: what works, files touched, checks run, blockers, and the next task.
- Finish the requested milestone before expanding into optional AI, behavioral tracking, additional platforms, or deployment.
