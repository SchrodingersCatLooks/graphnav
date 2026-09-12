# Shared task tracker

Use [BUILD_PLAN.md](./BUILD_PLAN.md) for instructions and [STATUS.md](./STATUS.md) for the shared handoff. Claim one task at a time. Statuses: **TODO**, **DOING**, **BLOCKED**, **REVIEW**, **DONE**. DONE means merged and verified; REVIEW means implemented but awaiting the required check. Never treat a proposed feature as completed.

## Completed setup

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| DOC-0 | Create private repo and initial workflow | DONE | Starter committed in `7139f9e` |
| DOC-1 | Capture idea notes, joint build plan, and tracking workflow | DONE | IDEA, BUILD_PLAN, TASK_LIST, STATUS, and linked AI instructions |
| DOC-2 | Specify GitHub checkpoints and larger-source requirements | DONE | AGENTS and BUILD_PLAN include push verification, incremental loading, and performance acceptance criteria |

## Build queue

This branch tracks Rajvansh's M1-A work; fetch `partner-data` for Eddy's current claim.
Hours are elapsed from the start of the proposed build session.

| ID | When | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- | --- |
| M0 | 0–0.5h | Both | Confirm access, clone, choose demo sources and roles | TODO | Both can pull; same folder/Doc/PDF chosen |
| M1-A | 0.5–2h | Rajvansh | Scaffold extension and add Graph button/panel | REVIEW | Type-check, production build, and six synthetic browser tests passed. Partner reports Docs header/close clipping and side-rail overlap still present at `c313a1d`, including failed zoom acceptance. Resolve the second-machine failure, rerun the full checklist on both laptops, and merge after review. |
| M1-B | 0.5–2h | Partner | Configure Google sign-in and first real reads | TODO | Demo folder and Doc read through the extension, or auth gate recorded |
| M1-C | Before M2 | Both | Agree graph types and example data for manual and generated maps | TODO | UI and adapters share a shape with stable graph IDs; personal maps can exist without a source and generated maps retain navigation targets |
| M2-A | 2–4h | Rajvansh | Shared graph controls and Drive overlay | TODO | Expand/focus/open works with live adapter |
| M2-B | 2–4h | Partner | Drive adapter, navigation, initial cache | TODO | Real children/files load and reopen correctly |
| M3-A | 4–6h | Rajvansh | Reuse graph in Docs panel | TODO | Selected tab and usable controls appear in Docs |
| M3-B | 4–6h | Partner | Docs tab extraction and exact navigation | TODO | Top-level and nested tab clicks verified |
| M4-A | 6–8h | Rajvansh | PDF reader and graph interface | TODO | Same graph beside a real PDF |
| M4-B | 6–8h | Partner | PDF section extraction and destinations | TODO | At least three section jumps verified; fallback labeled |
| M5-A | 8–10h | Rajvansh | Create-your-own map, editing generated maps, refresh status, source-action form | TODO | Create a personal map with two nodes and a connection; edit a generated map while preserving destinations; personal edits and one source-action control work |
| M5-B | 8–10h | Partner | Save/refresh merge and real source creation | TODO | Reopening preserves edits; one authorized write and read-only behavior verified |
| M6-A | 10–12h | Rajvansh | Interface polish and integrated walkthrough | TODO | Real navigation verified; larger fixture remains usable within visible-node limit |
| M6-B | 10–12h | Partner | Fix integration bugs and package extension | TODO | Build/package verified; pagination, bounded loading, storage, and measured limits recorded |
| M7-A | 12–13h | Rajvansh | Draft deck and product story | TODO | Short deck matches working product |
| M7-B | 12–13h | Partner | Demo setup and backup recording | TODO | Recording matches final commit |
| M8 | 13–15h | Both | Rehearse pitch, demo, handoffs, and questions | TODO | Full run fits organizer's time limit |

M1-A and M1-B run in parallel; agree M1-C before M2. For M2 through M6, both rows describe parts of the same shared milestone. Merge and test together before the next. If blocked, record the fallback decision in STATUS and reorder the remaining tasks together.

Product clarification for the next shared handoff: both Create your own map and Generate from existing content lead to editable, saved graphs.
M1-C must account for both origins; M5 implements personal creation/editing and M6 checks reopening both kinds.
No implementation status changes follow from this clarification.

## Active handoffs

| Owner | Current task and branch | Latest result and checks | Blocker | Next action |
| --- | --- | --- | --- | --- |
| Rajvansh | M1-A / `rajvansh-ui` | Popover/viewport implementation passes six synthetic tests, but Eddy's second-machine Docs acceptance still fails at `c313a1d`; see the report below. Current live inspection on Rajvansh's open Doc shows one open manual popover with a fully visible header and close button, above the toolbar and side rail at sampled points. [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3). | Second-machine layout failure remains unresolved; cause and loaded runtime need confirmation. Local observation does not establish partner acceptance or zoom acceptance. | On Eddy's laptop, verify the exact review build and one enabled production copy, reload the extension and refresh Docs, then collect panel-only evidence if clipping persists. Rajvansh owns the UI fix. Retest the full checklist on both laptops before merge; Google Console setup can continue meanwhile. |
| Partner | Unclaimed | No application work started | Setup unverified | Claim M1-B after M0 |

Each person updates only their task rows and handoff row, then commits/pushes them. Include the PR link when work reaches REVIEW. The person merging updates shared STATUS. These files do not update themselves in the background; AI assistants are instructed to maintain them while performing tasks.

## M1-A second-machine acceptance

Eddy reports macOS 26.5.2, Chrome 152.0.7977.84, Node 26.8.2, and npm 11.19.1.
His `npm ci`, `npm run typecheck`, and `npm run build` passed.
Node 26 is an additional reported build result; Node 22 remains the pinned baseline.

| Tested commit | Reported results |
| --- | --- |
| `c3ce042` | My Drive and folder labels, Graph/X toggle, Escape with focus restoration, Docs typing/scrolling, and absence on unrelated sites passed. Docs header/close clipping and zoom acceptance failed. |
| `c313a1d` | Layout improved, but the Docs header/title/X remain partially clipped at 100% browser zoom, the side-panel icon rail overlaps the right edge, and zoom acceptance still fails. Other previously passing checks were not rerun on this commit. |

The later `adc7729` changes planning documents only and has the same runtime as `c313a1d`.
The partner's report mentions screenshots, but new screenshot attachments were not supplied with the forwarded report here.
The report establishes failed acceptance, not a confirmed cause.
Do not assume stale output, Node version, or top-layer ordering is responsible without evidence.

Rajvansh's subsequent live inspection found one `.graphnav-shell[popover="manual"]` matching `:popover-open`, a panel top of 16 CSS pixels, and a close button fully inside the viewport.
The title, close button, and sampled right edge hit-tested above Docs, and the full-page screenshot showed the complete header.
This was one existing open Doc at its current browser settings; partner reproduction and the full zoom walkthrough remain outstanding.

Next diagnostic handoff: use a separate review worktree so `partner-data` stays intact, record `git rev-parse HEAD`, build with Node 22, enable only that production output, reload GraphNav in Chrome, and refresh the Google tabs.
If clipping persists, report browser zoom, window dimensions, extension errors, and a screenshot cropped to the panel.
Claude may inspect only GraphNav's popover state, computed bounds, visual viewport, and the element covering its controls; document text and account data are unnecessary.
Rerun the entire README acceptance checklist on the same confirmed build rather than carrying passes forward from an older commit.
