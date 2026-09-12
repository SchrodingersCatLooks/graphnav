# Shared task tracker

Use [BUILD_PLAN.md](./BUILD_PLAN.md) for instructions and [STATUS.md](./STATUS.md) for the shared handoff. Claim one task at a time. Statuses: **TODO**, **DOING**, **BLOCKED**, **REVIEW**, **DONE**. DONE means merged and verified; REVIEW means implemented but awaiting the required check. Never treat a proposed feature as completed.

## Completed setup

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| DOC-0 | Create private repo and initial workflow | DONE | Starter committed in `7139f9e` |
| DOC-1 | Capture idea notes, joint build plan, and tracking workflow | DONE | IDEA, BUILD_PLAN, TASK_LIST, STATUS, and linked AI instructions |
| DOC-2 | Specify GitHub checkpoints and larger-source requirements | DONE | AGENTS and BUILD_PLAN include push verification, incremental loading, and performance acceptance criteria |
| DOC-3 | Define manual V1 followed by GPT-assisted V2 | DONE | IDEA, BUILD_PLAN, AGENTS, README, STATUS, and this tracker reflect the release order |

## V1 manual build queue

All application work is TODO. Hours are elapsed from the start of the proposed build session.

| ID | When | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- | --- |
| M0 | 0–0.5h | Both | Confirm access, clone, choose demo sources and roles | TODO | Both can pull; same folder/Doc/PDF chosen |
| M1-A | 0.5–2h | Rajvansh | Scaffold extension and add Graph button/panel | TODO | Same installed shell on both laptops; scripts and lockfile committed |
| M1-B | 0.5–2h | Partner | Configure Google sign-in and first real reads | TODO | Demo folder and Doc read through the extension, or auth gate recorded |
| M1-C | Before M2 | Both | Agree source/idea nodes, labeled edges, and edit commands | TODO | UI and adapters share stable IDs, targets, and origin fields |
| M2-A | 2–4h | Rajvansh | Manual graph editor and Drive overlay | TODO | Add idea, connect/label/edit/remove personal items, and open real source |
| M2-B | 2–4h | Partner | Drive adapter, edit commands, navigation, initial save | TODO | Real sources plus manual nodes/edges save and reopen with stable IDs |
| M3-A | 4–6h | Rajvansh | Reuse graph in Docs panel | TODO | Selected tab and usable controls appear in Docs |
| M3-B | 4–6h | Partner | Docs tab extraction and exact navigation | TODO | Top-level and nested tab clicks verified |
| M4-A | 6–8h | Rajvansh | PDF reader and graph interface | TODO | Same graph beside a real PDF |
| M4-B | 6–8h | Partner | PDF section extraction and destinations | TODO | At least three section jumps verified; fallback labeled |
| M5-A | 8–10h | Rajvansh | Complete V1 personal editing and refresh controls | TODO | Full manual editing works across completed surfaces; source form if time allows |
| M5-B | 8–10h | Partner | Preserve manual edits on refresh and reopening | TODO | Edits survive reload/refresh; missing targets handled; any implemented source write verified |
| M6-A | 10–12h | Rajvansh | Interface polish and integrated walkthrough | TODO | Real navigation verified; larger fixture remains usable within visible-node limit |
| M6-B | 10–12h | Partner | Fix integration bugs and package extension | TODO | Build/package verified; pagination, bounded loading, storage, and measured limits recorded |
| M7-A | 12–13h | Rajvansh | Draft deck and product story | TODO | Short deck matches working product |
| M7-B | 12–13h | Partner | Demo setup and backup recording | TODO | Recording matches final commit |
| M8 | 13–15h | Both | Rehearse pitch, demo, handoffs, and questions | TODO | Full run fits organizer's time limit |

M1-A and M1-B run in parallel; agree M1-C before M2. For M2 through M6, both rows describe parts of the same shared milestone. Merge and test together before the next. If blocked, record the fallback decision in STATUS and reorder the remaining tasks together.

## V2 GPT-assisted generation queue

Planned next stage. All tasks are TODO, not evidence of work in progress. Start only after the V1 manual create/connect/edit/navigate/save cycle works and time remains before feature freeze, or continue after the hackathon. Rajvansh owns the visible experience; partner owns extraction/generation/storage within each shared task.

| ID | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- |
| G1 | Both | Select and extract supported content with source anchors | TODO | User can inspect selected Doc/PDF excerpts and their destinations |
| G2 | Both | Return a structured GPT graph draft through a separate generator | TODO | Bounded concepts/relationships include validated source references; key stays server-side |
| G3 | Both | Review evidence, accept/edit/reject, and persist decisions | TODO | Manual and accepted edits survive reopening, refresh, and regeneration |
| G4 | Both | Verify generated and manual workflows together | TODO | Bad references/model failures handled; graph navigation/editor still work without generation |

## Active handoffs

| Owner | Current task and branch | Latest result and checks | Blocker | Next action |
| --- | --- | --- | --- | --- |
| Rajvansh | Unclaimed | No implementation merged; local work unverified | Setup unverified | Claim M1-A after M0 |
| Partner | Unclaimed | No implementation merged; local work unverified | Setup unverified | Claim M1-B after M0 |

Each person updates only their task rows and handoff row, then commits/pushes them. Include the PR link when work reaches REVIEW. The person merging updates shared STATUS. These files do not update themselves in the background; AI assistants are instructed to maintain them while performing tasks.
