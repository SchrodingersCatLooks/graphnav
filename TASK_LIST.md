# Shared task tracker

Use [BUILD_PLAN.md](./BUILD_PLAN.md) for instructions and [STATUS.md](./STATUS.md) for the shared handoff. Claim one task at a time. Statuses: **TODO**, **DOING**, **BLOCKED**, **REVIEW**, **DONE**. DONE means merged and verified; REVIEW means implemented but awaiting the required check. Never treat a proposed feature as completed.

## Completed setup

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| DOC-0 | Create private repo and initial workflow | DONE | Starter committed in `7139f9e` |
| DOC-1 | Capture idea notes, joint build plan, and tracking workflow | DONE | IDEA, BUILD_PLAN, TASK_LIST, STATUS, and linked AI instructions |
| DOC-2 | Specify GitHub checkpoints and larger-source requirements | DONE | AGENTS and BUILD_PLAN include push verification, incremental loading, and performance acceptance criteria |

## Build queue

M1-A is claimed on `rajvansh-ui`; other application work is unclaimed.
Hours are elapsed from the start of the proposed build session.

| ID | When | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- | --- |
| M0 | 0–0.5h | Both | Confirm access, clone, choose demo sources and roles | TODO | Both can pull; same folder/Doc/PDF chosen |
| M1-A | 0.5–2h | Rajvansh | Scaffold extension and add Graph button/panel | DOING | Same installed shell on both laptops; scripts and lockfile committed |
| M1-B | 0.5–2h | Partner | Configure Google sign-in and first real reads | TODO | Demo folder and Doc read through the extension, or auth gate recorded |
| M1-C | Before M2 | Both | Agree graph types and example data | TODO | UI and adapters consume the same shape |
| M2-A | 2–4h | Rajvansh | Shared graph controls and Drive overlay | TODO | Expand/focus/open works with live adapter |
| M2-B | 2–4h | Partner | Drive adapter, navigation, initial cache | TODO | Real children/files load and reopen correctly |
| M3-A | 4–6h | Rajvansh | Reuse graph in Docs panel | TODO | Selected tab and usable controls appear in Docs |
| M3-B | 4–6h | Partner | Docs tab extraction and exact navigation | TODO | Top-level and nested tab clicks verified |
| M4-A | 6–8h | Rajvansh | PDF reader and graph interface | TODO | Same graph beside a real PDF |
| M4-B | 6–8h | Partner | PDF section extraction and destinations | TODO | At least three section jumps verified; fallback labeled |
| M5-A | 8–10h | Rajvansh | Notes/connections, refresh status, creation form | TODO | Personal edits and one source-action control work |
| M5-B | 8–10h | Partner | Save/refresh merge and real source creation | TODO | Reopening preserves edits; one authorized write and read-only behavior verified |
| M6-A | 10–12h | Rajvansh | Interface polish and integrated walkthrough | TODO | Real navigation verified; larger fixture remains usable within visible-node limit |
| M6-B | 10–12h | Partner | Fix integration bugs and package extension | TODO | Build/package verified; pagination, bounded loading, storage, and measured limits recorded |
| M7-A | 12–13h | Rajvansh | Draft deck and product story | TODO | Short deck matches working product |
| M7-B | 12–13h | Partner | Demo setup and backup recording | TODO | Recording matches final commit |
| M8 | 13–15h | Both | Rehearse pitch, demo, handoffs, and questions | TODO | Full run fits organizer's time limit |

M1-A and M1-B run in parallel; agree M1-C before M2. For M2 through M6, both rows describe parts of the same shared milestone. Merge and test together before the next. If blocked, record the fallback decision in STATUS and reorder the remaining tasks together.

## Active handoffs

| Owner | Current task and branch | Latest result and checks | Blocker | Next action |
| --- | --- | --- | --- | --- |
| Rajvansh | M1-A / `rajvansh-ui` | Read all six project documents; clean clone of `2370f24`; origin and GitHub access verified. Owns package files, WXT configuration, and visible entrypoints for this scaffold. | Partner access, demo sources, and both-laptop checks remain unverified under M0; do not block the independent shell. | Scaffold WXT/React/TypeScript/Tailwind, add reversible Drive/Docs panel, run checks. Hand shared configuration back at review; M1-C types remain for joint agreement. |
| Partner | Unclaimed | No application work started | Setup unverified | Claim M1-B after M0 |

Each person updates only their task rows and handoff row, then commits/pushes them. Include the PR link when work reaches REVIEW. The person merging updates shared STATUS. These files do not update themselves in the background; AI assistants are instructed to maintain them while performing tasks.
