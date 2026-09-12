# Hackathon tasks

The private repository and workflow starter are ready. Application implementation is pending. Teammate access still needs to be confirmed.

| Order | Owner | Milestone | Completion check | Status |
| --- | --- | --- | --- | --- |
| 0A | Team | Create private repository and add workflow starter | Six setup files are present on `main` | Complete |
| 0B | Team | Invite teammate and clone repository | Both can access and clone it | Unverified |
| 1 | A | Scaffold WXT + React + TypeScript | Both laptops run the extension; lockfile committed | Pending |
| 2 | A + B | Define graph, node, edge, target, and adapter types | Both adapters and UI can use one sample graph | Pending |
| 3A | A | Shared graph UI and basic autosave | Expand, select, search, focus, and restore sample layout | Pending |
| 3B | B | Stable extension ID and Google authorization | Actual extension reads a demo folder and tabbed Doc | Pending |
| 4 | B, with A for UI | Drive graph overlay | Expand a real folder and open a file; restore normal Drive view | Pending |
| 5 | B, with A for UI | Docs graph panel | Read nested tabs and navigate to the correct tab | Pending |
| 6 | A | Independent PDF reader and section graph | Open a text PDF and jump to outline/page destinations | Pending |
| 7 | B | Minimal source authoring | Create a Drive folder and add/rename a Doc tab with permission | Pending |
| 8 | A + B | Personal edits, refresh, and reopening | Preserve layouts/notes after reload and refresh; correct PDF anchors | Pending |
| 9 | A + B | Integrated demo and production build | Packaged extension passes real-browser walkthrough | Pending |
| 10 | A + B | Deck, backup recording, and rehearsal | Complete rehearsed demo of Drive, Docs, and a paper | Pending |

3A and 3B run in parallel. A can start milestone 6 once the shared graph is stable while B finishes Google integration. Use roughly equal work time, and hand off a smaller task when one person is blocked.

## Scope controls

- Timebox authentication debugging. If blocked, A continues the real PDF experience and shared UI while B records the specific blocker. Label prepared sample data clearly; do not call it a live integration.
- Prioritize exact navigation and persistence over extra graph styling.
- Optional after core completion: evidence-backed related-section suggestions, further source editing, or PDF links. Defer OCR, behavioral learning, arbitrary publisher support, and cloud synchronization.
- Freeze features before preparing and rehearsing the presentation.

## Current handoff

- Working: private GitHub repository, project scope, and lightweight AI workflow documents.
- Not implemented: application, APIs, authentication, extension UI, PDF reader, and build scripts.
- Next: confirm teammate access, clone separate working copies, and scaffold the WXT React application.
- Manual step: the repository owner must invite the teammate in GitHub; the current connection has no collaborator-invitation action.
