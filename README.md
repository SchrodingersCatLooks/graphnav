# GraphNav

Hackathon project: a Chrome extension for creating, organizing, and navigating information through graphs.

## Current status

The private [shared repository](https://github.com/SchrodingersCatLooks/graphnav) is created and contains the team workflow starter. The application, package manifest, dependency lockfile, Google authorization, and extension build have not been created yet. Teammate access has not been verified.

## Agreed product

| Surface | First working experience | Authoring |
| --- | --- | --- |
| Google Drive | A toggleable graph overlay for folders and files; click to expand or open | Create a folder, then add further organization actions |
| Google Docs | A graph panel for tabs and nested tabs; click to navigate | Create and rename tabs where the user has editing access |
| Research PDFs | An extension-owned PDF reader with an independent section graph | Personal notes, labels, and connections; writing the original paper remains in its source editor |

Each folder, document, or paper has its own graph. Graphs work for accessible content created by other people; its author need not use this tool. Connecting separate sources is optional.

## Technical choices

- WXT, Chrome Manifest V3, React, TypeScript, and Tailwind.
- React Flow for interaction; ELK for layout.
- Chrome Identity and Google Drive/Docs APIs for authorized source access.
- PDF.js for text-based PDFs and page/outline navigation.
- Extension local storage for graph state; IndexedDB for PDF bytes when saved locally.
- No backend is needed for basic navigation. Any later AI API key belongs on a server.

Use structured APIs, HTML, and file data rather than screenshots. Every node needs a stable source identifier and a real navigation destination. Visual layout changes are separate from actions that edit the original source.

## Start development

1. Invite your teammate by their GitHub username from repository Settings → Collaborators → Add people. They must accept the invitation.
2. Both people clone this repository and create their own working branch using the commands below.
3. Give your AI coding assistant `AGENTS.md` and the next pending milestone in `TASK_LIST.md`.
4. Scaffold the WXT React/TypeScript application without overwriting these project documents. The official initializer is `npx wxt@latest init`; generate in a temporary sibling directory if it requires an empty destination, then copy only the application files into this repository.
5. Commit the generated package manifest and lockfile. After scripts exist, document the actual install, development, type-check, and build commands here.

WXT's generated `npm run dev` starts local extension development. Test the extension inside the real Drive and Docs pages; a localhost preview alone does not verify integration.

```bash
git clone https://github.com/SchrodingersCatLooks/graphnav.git
cd graphnav
```

Person A creates `graph-and-papers` with `git switch -c graph-and-papers`. Person B creates `google-integration` with `git switch -c google-integration`. GitHub authentication is required because the repository is private.

Edits stay on each person's laptop until committed and pushed. Push your branch, open a pull request, and merge a working slice into `main`; the other teammate then brings the latest `main` into their branch. Person A should merge the initial scaffold before Person B starts changing application files. There is no runnable localhost app yet.

## Team ownership

- Person A, `graph-and-papers`: shared graph UI, PDF reader, personal graph editing, and presentation visuals.
- Person B, `google-integration`: Google authorization, Drive/Docs adapters, source navigation, and source editing.
- Both: agree on the data contract first, merge working slices regularly, test together, and rehearse. Target roughly 12 build hours plus 3 presentation hours if still available.

## Starter contents and provenance

The lightweight agent workflow, PR template structure, and generic ignore rules are adapted from `green-business-solution/green-business-solution`. This starter intentionally contains no existing product code, AWS settings, credentials, production deployment workflow, old task history, or application dependencies.

- `AGENTS.md`: shared AI instructions.
- `CLAUDE.md`: points Claude to the same instructions.
- `TASK_LIST.md`: ordered milestones and handoff space.
- `.gitignore`: generated files, local credentials, and personal source files.
- `.github/pull_request_template.md`: short change and validation summary.

Reference: [WXT installation](https://wxt.dev/guide/installation.html).
