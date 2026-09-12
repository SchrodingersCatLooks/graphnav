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

M1-A has an existing scaffold in [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3) and is in REVIEW awaiting final partner-browser confirmation; M1-B is DOING on `partner-data`. Hours describe the original proposed schedule, not actual elapsed time or evidence of completion.

| ID | When | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- | --- |
| M0 | 0–0.5h | Both | Confirm access, clone, choose demo sources and roles | TODO | Both can pull; same folder/Doc/PDF chosen |
| M1-A | 0.5–2h | Rajvansh | Finish acceptance of existing extension shell in PR #3 | REVIEW | Reload reportedly resolves Eddy's UI; confirm the exact commit and full checklist, including 100% and increased browser zoom, then merge after review. Earlier failures remain recorded below. |
| M1-B | 0.5–2h | Partner | Configure Google sign-in and first real reads | DOING | Demo folder and Doc read through the extension, or auth gate recorded |
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
| Rajvansh | M1-A / `rajvansh-ui`, [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3) | Reconciled newer main planning documents; `npm run check` passed on Node 22.23.2/npm 10.9.9: type-check, build, six synthetic browser tests. Rajvansh reports Eddy's UI appears fixed after reload; runtime code is unchanged. | Full reloaded-browser checklist and exact tested build are not yet confirmed; M0 demo sources are unchosen. | Obtain the final browser result and complete the scaffold handoff. Eddy owns M1-B manifest/background changes after merge; Rajvansh retains the panel/CSS lane. |
| Partner | M1-B / `partner-data` | Google Cloud setup done: `graphnav` project, Drive API and Docs API enabled, External/Testing consent screen, both test users, and a Chrome Extension OAuth client bound to extension ID `pidejkbkldalibjaehjfpjkcpjpcenpk`. Scopes `drive.metadata.readonly` and `documents.readonly` per BUILD_PLAN. Values recorded in [GOOGLE_SETUP.md](https://github.com/SchrodingersCatLooks/graphnav/blob/9f68af6/GOOGLE_SETUP.md). Also ran the M1-A browser acceptance pass on this laptop against `c3ce042` and `c313a1d`; findings reported on PR #3. | No Google API call has been made yet. Manifest wiring and the background auth handler are blocked until the M1-A scaffold is reviewed and merged. M0 demo folder and Doc are still unchosen. | Apply the manifest block from GOOGLE_SETUP.md once M1-A merges, then implement the Connect Google handler and prove one Drive folder read and one Doc read. |

Each person updates only their task rows and handoff row, then commits/pushes them. Include the PR link when work reaches REVIEW. The person merging updates shared STATUS. These files do not update themselves in the background; AI assistants are instructed to maintain them while performing tasks.

## M1-A second-machine acceptance

Eddy reports macOS 26.5.2, Chrome 152.0.7977.84, Node 26.8.2, and npm 11.19.1.
His initial `npm ci`, `npm run typecheck`, and `npm run build` passed.
Eddy subsequently reports a clean detached-worktree build on pinned Node 22.23.2 / npm 10.9.8 with the same browser failure report.
Rajvansh later reports that reloading appears to have resolved Eddy's UI; the exact reloaded commit and full checklist results have not yet been supplied.
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

Next acceptance handoff: Eddy confirms the exact loaded commit and whether the complete header/X and right edge remain visible at 100% and increased browser zoom after reload.
He should report the remaining README checklist results for that same build rather than carrying older passes forward.
No additional CSS patch is justified solely by the earlier failure report while the reload outcome is being confirmed.
The runtime diff from `c313a1d` through `fb2695d` is empty; those later checkpoints changed Markdown only.

Eddy's M1-B task/handoff rows above are synchronized from his own `partner-data` commit `9f68af6`, not newly assigned or claimed by Rajvansh.
His Google Console configuration is reported complete; no real Google API read is yet reported.
After the scaffold merges, he owns the public key, Identity/OAuth/API manifest configuration and background worker.
Rajvansh retains the shell component and CSS; both coordinate dependency changes and agree M1-C before graph implementation.
M0 still requires an authorized shared demo folder and a Doc containing at least one nested tab.
