# GraphNav

A Chrome extension for navigating and organizing Drive folders, Google Docs tabs, and research papers through independent interactive graphs.

**Current state:** documentation and team workflow are ready. The application has not been built. [STATUS.md](./STATUS.md) is the source of truth for what works now.

**Release order:** V1 lets users manually create/edit idea nodes and meaningful connections, attach and navigate real sources, and save their work. APIs/PDF parsing may import source structure. V2 adds GPT-assisted graph drafts with evidence and accept/edit/reject controls. V2 is planned; generation must not be required for the V1 editor.

## Start here

| File | What it answers | When to update |
| --- | --- | --- |
| [IDEA.md](./IDEA.md) | What are we building and why? | When the team changes product scope |
| [BUILD_PLAN.md](./BUILD_PLAN.md) | In what order, with which tools, and who does what? | When the shared schedule or architecture changes |
| [TASK_LIST.md](./TASK_LIST.md) | What is each person doing next? | When claiming, blocking, reviewing, or finishing a task |
| [STATUS.md](./STATUS.md) | What works, what is blocked, and what happens next? | After a merged milestone or shared blocker changes |
| [AGENTS.md](./AGENTS.md) | How should AI work in this repository? | When the team changes its workflow |

## Start development

1. Confirm your partner accepted the repository invitation. The owner can invite them in Settings → Collaborators → Add people.
2. Both clone the repository and read IDEA, BUILD_PLAN, STATUS, and their task row.
3. Rajvansh scaffolds the extension while the partner configures Google access. Merge the scaffold before both modify application files.

```bash
git clone https://github.com/SchrodingersCatLooks/graphnav.git
cd graphnav
```

Suggested branches: `rajvansh-ui` and `partner-data`. Each person edits their own laptop copy and pushes commits to GitHub. The other person receives changes by pulling and merging them; GitHub is not a simultaneous text editor.

The selected stack is WXT, React, TypeScript, Tailwind, React Flow, ELK, Google Drive/Docs APIs, Chrome Identity, PDF.js, extension local storage, and IndexedDB. Setup and official implementation references are in BUILD_PLAN. Local extension development comes first; no hosted website is required for the demo.

Install, development, type-check, build, and output-directory instructions must be added here once the actual package scripts exist. No runnable application commands are available yet.

## Provenance

The lightweight AI workflow and PR template were adapted from `green-business-solution/green-business-solution`. Product context was curated from the supplied Graph navigation idea notes and the team's clarifications. No unrelated production code, AWS setup, or source-document opposition sections are included.
