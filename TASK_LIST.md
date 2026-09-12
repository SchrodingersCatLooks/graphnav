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

M1-A is merged and verified through [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3); M1-B is DOING on `partner-data`.
Hours describe the original proposed schedule, not actual elapsed time or evidence of completion.

| ID | When | Owner | Task | Status | Done when |
| --- | --- | --- | --- | --- | --- |
| M0 | 0–0.5h | Both | Confirm access, clone, choose demo sources and roles | REVIEW | Demo folder and tabbed Doc created, shared with the second test account, and recorded in GOOGLE_SETUP.md. Rajvansh to confirm access from his laptop. |
| M1-A | 0.5–2h | Rajvansh | Scaffold extension and add Graph button/panel | DONE | PR #3 merged as `92a76ce`; both-laptop acceptance confirmed. Type-check, production build, and six synthetic browser tests passed. Eddy corrected the stale-script failure report and confirms the complete reloaded-browser checklist, including zoom. |
| M1-B | 0.5–2h | Partner | Configure Google sign-in and first real reads | REVIEW | Demo folder and Doc both read through the installed extension on `35368c4`. Awaiting review and merge. |
| M1-C | Before M2 | Both | Agree source/idea nodes, labeled relationships, and storage/edit contracts | DOING | User approved IndexedDB/Dexie and asked Rajvansh to implement the first storage slice. Shared types and repository are now claimed on rajvansh-ui; Eddy retains Google adapters and authentication. Integration review remains required. |
| M2-A | 2–4h | Rajvansh | Manual graph editor and Drive overlay | DOING | Add idea, connect/label/edit/remove personal items, and open real source |
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
| Rajvansh | M1-C + M2-A storage/editor slice / `rajvansh-ui` | User approved local IndexedDB/Dexie, no AWS. Integrated Eddy's stable-ID commit `82e846c` unchanged. Claiming `lib/graph/`, `lib/storage/`, package files, and a personal-map entrypoint in [PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6). | Ten storage tests pass for reopening, rollback/quota failure, conflicts, refresh preservation, account separation, and backups. Installed-workspace acceptance is in progress. Integrated Eddy's M1-B review checkpoint a83d545 unchanged for auth UI wiring; Rajvansh's live Google reads are still unverified. | Implement transactional storage and manual create/connect/move/reopen/export/import, run checks, then hand the repository API to Eddy for Google integration. |
| Partner | M1-B / `partner-data` | M1-B done-when met. Real `LIST_FOLDER` and `GET_DOC_TABS` reads verified in the installed extension, Chrome 152.0.7977.84 / macOS 26.5.2, extension ID confirmed as `pidejkbkldalibjaehjfpjkcpjpcenpk`. Folder returned ten subfolders with `webViewLink` targets and `truncated: false`; Doc returned four tabs with the sub-tab carrying `parentId`. Node 22.23.2 type-check and production build pass. Demo source IDs recorded in [GOOGLE_SETUP.md](./GOOGLE_SETUP.md). Posted an M1-C contract proposal in [M1C_PROPOSAL.md](./M1C_PROPOSAL.md) for joint review; `lib/graph/types.ts` intentionally not created until both owners agree. | Not yet merged, so M1-B is REVIEW rather than DONE. Rajvansh has not yet confirmed the extension ID or demo-source access from his laptop. `lib/messages.ts` is provisional and is not the M1-C contract. | Open a PR for `partner-data`, get the second-laptop check, then agree M1-C node/edge types with Rajvansh before M2. |

Each person updates only their task rows and handoff row, then commits/pushes them. Include the PR link when work reaches REVIEW. The person merging updates shared STATUS. These files do not update themselves in the background; AI assistants are instructed to maintain them while performing tasks.

## M1-A second-machine acceptance

Eddy explicitly confirms the full README checklist passes on macOS 26.5.2 / Chrome 152.0.7977.84 after correctly reloading the extension and Google tabs.
He built in a detached worktree with Node 22.23.2 / npm 10.9.8; `npm ci`, `npm run typecheck`, and `npm run build` passed.
The accepted runtime is identical at `c313a1d` and `fb2695d`.
The current local production content-script bundle matches his SHA-256:

```text
5d17d121164ae70f2041064e20bce5a4683fc4ba8e9debea2fb39b9564455c51
```

Passed: My Drive/folder labels, Graph/X toggle, Escape with focus restoration, Docs header and close button above the toolbar, ordinary Docs typing/scrolling, increased browser zoom, and absence on unrelated sites.
Rajvansh's local checks passed on Node 22.23.2 / npm 10.9.9: type-check, production build, and all six synthetic browser tests.
His live Docs inspection also showed the complete header/X and sampled panel edge above Google controls.
The code/configuration/dependencies/tests remained unchanged from `c313a1d` through the accepted merge.

Correction to historical failures: the original `c3ce042` overlap preceded the popover fix.
Eddy's later failure attributed to `c313a1d` was caused by an improperly reloaded extension and a stale content script, as confirmed in his correction.
The popover/visualViewport implementation passes his corrected full test; no extra UI patch was needed after `c313a1d`.
PR #3 merged as `92a76ce`; M1-A is DONE.

## M1-B handoff and M0 sources

The scaffold is now on main; its absence no longer blocks Eddy's lane.
Eddy owns the public manifest key, Identity permission, OAuth client/scopes, required Google API access, and background worker on `partner-data`.
The exact public block remains in his GOOGLE_SETUP.md at `9f68af6`.
After adding it, both laptops must verify extension ID `pidejkbkldalibjaehjfpjkcpjpcenpk`.
Rajvansh retains the shell component and CSS; dependency changes remain coordinated.
M1-C is DOING: the user approved local storage and asked Rajvansh to implement the first slice; Eddy retains Google integration. Shared implementation review remains outstanding.

Eddy is preparing a Doc with three top-level tabs and one nested sub-tab, and a Drive folder with ten subfolders including one nested level.
M0 is DOING; source preparation is underway, but the links, required demo sources, and both-account access are not yet confirmed.
M1-B remains DOING until real API reads pass or a concrete auth blocker is recorded.
