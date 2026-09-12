# Tonight's build plan

Build **one Chrome extension** with the same graph interface for Drive folders, Google Docs tabs, and individual research PDFs. We will finish one usable experience together before expanding to the next.

This is a proposed 15-hour schedule measured from when you start: **12 hours building and 3 hours preparing the presentation**. If less time remains, use the cut order below and preserve the last 3 hours. Current progress belongs in [TASK_LIST.md](./TASK_LIST.md) and [STATUS.md](./STATUS.md), not in this schedule.

## Who does what

**You, Rajvansh:** own the things the user sees and clicks: extension scaffold, graph component, panels, action forms, PDF reader interface, and visual testing.

**Your partner:** owns getting real information into those same screens: Google sign-in, source adapters, exact navigation targets, PDF extraction, saved state, and source writes.

Both spend the same blocks on the same milestone. For example, during Docs work you build the tab panel while your partner supplies the tab data and click action. During PDF work you build the reader while your partner supplies section anchors. Neither person builds a separate product. Rebalance a task whenever one person is blocked.

## The schedule

| Time from start | Shared result | You | Partner | Both verify before moving on |
| --- | --- | --- | --- | --- |
| 0:00–0:30 | Same project and demo | Clone repo; agree on the interface and scope | Clone repo; prepare one demo folder, tabbed Doc, and text PDF | Same plan, shared source access, one task each |
| 0:30–2:00 | Extension shell and first Google read | Scaffold WXT/React/TypeScript; load the extension; add Graph button and empty panel | Configure Google project and sign-in; read a folder and Doc; define shared data types with you | Both run the same merged scaffold; real API response or a documented auth blocker |
| 2:00–4:00 | Real Drive graph | Build shared nodes, edges, expand/collapse, focus, and open controls | Convert Drive files/folders to graph data; wire opening, loading, and initial save | Open a real folder, expand it, open a file, close graph, and reopen it |
| 4:00–6:00 | Real Docs tab graph | Reuse graph in a Docs panel; show selected tab and preview/details | Read tabs recursively and wire exact tab navigation | Navigate to a top-level tab and a nested tab in the real Doc |
| 6:00–8:00 | Paper graph and reader | Build extension PDF reader with graph beside it | Use PDF.js to read bookmarks/text and map section nodes to destinations | Open a paper and click at least three nodes to the correct locations |
| 8:00–10:00 | Saved edits and useful authoring | Add personal connection/note controls and one source-action form; show save/refresh status | Persist state and PDFs; merge refresh safely; implement the chosen source action | Reopen without losing a note/layout; create a real folder or Doc tab with permission |
| 10:00–12:00 | Reliable demonstration build | Improve labels and readability; test each surface on partner's build | Fix data/auth/navigation bugs; produce packaged build and verify restart | Same final commit, clean build, actual browser walkthrough, then freeze features |
| 12:00–13:00 | Story and demo assets | Draft the short deck | Record a backup demo and prepare a clean demo browser | Deck describes only working features |
| 13:00–15:00 | Rehearsed presentation | Lead problem, product, and value | Lead demo and technical explanation | Both rehearse the full pitch, timing, handoffs, and questions |

At each checkpoint, merge a working slice into `main`, pull it, and run it together. A screenshot of a graph is not completion: its clicks must work.

## Step 1 Make development work

Both people need Git, Chrome, and the same supported Node/npm version. Both clone:

```bash
git clone https://github.com/SchrodingersCatLooks/graphnav.git
cd graphnav
```

You use `git switch -c rajvansh-ui`; your partner uses `git switch -c partner-data`. These are suggested branches, not branches already created for you.

You ask AI to scaffold with `npx wxt@latest init`, selecting React and npm. Generate into a temporary sibling folder and merge the application files into this repo so the initializer preserves our documents. Commit the manifest and lockfile, add type-check/build scripts, and document the exact commands and output directory in README. Your partner works on Google Console setup while you own this initial scaffold. WXT provides local extension development and a development browser workflow. [WXT installation](https://wxt.dev/guide/installation.html).

After the scaffold is merged, both use `npm ci` and the generated development script. For testing in a normal Chrome profile, use `chrome://extensions`, enable Developer mode, and load the build output using Load unpacked. Test in actual Drive and Docs pages. A localhost graph preview alone does not test extension integration.

GitHub stores and shares committed code. Each laptop runs its own development copy. Nothing is automatically live-edited on the other laptop. No separate website host, paid database, or Google partnership is required for this local prototype.

## Step 2 Connect Google early

Partner handles these manual console actions while you build the shell:

1. Create one Google Cloud project and enable Drive API and Docs API.
2. Configure the OAuth consent screen for testing and add both intended Google test accounts.
3. Stabilize the extension ID using a shared public manifest key; register a Chrome Extension OAuth client for that ID. Verify the installed ID matches on both laptops.
4. Configure `identity`, required Google host access, and the OAuth client ID in WXT's manifest configuration. Keep tokens in the extension background/Identity flow, never page code or GitHub.
5. Implement a Connect Google button using Chrome Identity. Request the capabilities needed for the current step and make one real folder read and one real Doc read before polishing the UI. [Chrome extension OAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth).

For Drive hierarchy reads, plan metadata access; for Doc content, plan document read access. `drive.file` grants access to app-created or explicitly shared files, not an unrestricted existing Drive inventory. Confirm scopes and use authorized demo content. Source authoring needs suitable write access as well as the user's edit permission; request it when adding that feature. A local test setup is not public OAuth or Web Store approval. [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

If auth has no successful read by hour 2, stop spending both people's time on it. You keep building against a clearly labeled fixture; partner gets one focused 45-minute diagnosis. If still blocked, both finish the real PDF experience first and record Google integration as incomplete. Do not disguise fixtures as live data.

## Step 3 Agree on how the pieces connect

| Piece | Job | Owner |
| --- | --- | --- |
| WXT + React + TypeScript + Tailwind | Extension shell and interface | You |
| React Flow + ELK | Shared graph interactions and automatic layout | You |
| Content scripts | Add the reversible Graph button/panel to Drive and Docs | You, with partner for page context |
| Background service worker + Chrome Identity | Handle Google authorization and API requests | Partner |
| Drive, Docs, PDF adapters | Translate each source into the same nodes and edges | Partner |
| PDF.js in the extension reader | Render PDF pages and extract source destinations | You render; partner extracts |
| Extension local storage + IndexedDB | Save graph metadata and PDF bytes | Partner; you show save status |

Agree on this small data contract before writing adapters:

- **Graph:** source kind, source ID, account key where relevant, refresh time, nodes, and edges.
- **Node:** stable ID, title, type, and a target such as file ID, document ID plus tab ID, or PDF fingerprint plus destination/page. Personal notes may have no external target.
- **Edge:** stable ID, source node, target node, and type (`contains`, `references`, `related`); include provenance for non-structural edges.
- **Personal state:** positions, collapsed nodes, notes, and custom edges, stored separately from the source graph.
- **Adapter:** `load`, `refresh`, and `navigate`, with optional supported creation actions. No token in graph data.

Suggested ownership: you own `components/graph/` and visible entrypoints; partner owns `lib/adapters/`, `lib/storage/`, and the background worker. Agree together on `lib/graph/types.ts`. Only one person edits shared types, package files, or WXT configuration at a time; hand off changes explicitly.

## Steps 4 to 6 Reuse the graph with real sources

**Drive:** start at one demo folder, then add a My Drive overview showing top-level folders/files and a focused view for any folder. Load children on demand, handle pagination, and give every file a real open action. Do not scan the whole Drive before showing anything.

**Docs:** request tabs with `includeTabsContent=true`, recurse through nested tabs, and retain tab IDs. Verify the exact tab opens inside Google Docs. [Docs tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs).

**PDF:** start with a local text-based PDF in our extension-owned reader. Use PDF.js bookmarks when present; otherwise propose page-aware heading anchors and let the user correct them. Use bundled code/workers. Do not attempt to inject into Chrome's built-in PDF viewer. Remote URL import is optional; local file selection keeps the first reader independent of publisher restrictions.

**Creation:** first ship one working source action, then add the others if time permits. Target folder creation and Doc tab add/rename. Google Docs exposes `addDocumentTab` and `updateDocumentTabProperties` requests. Verify against the actual account before claiming support. [Docs write requests](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request).

## How to use AI without getting out of sync

Give each assistant one task ID from TASK_LIST and the relevant file ownership. Use this prompt:

> Read AGENTS.md, IDEA.md, BUILD_PLAN.md, STATUS.md, and my task in TASK_LIST.md. I am [Rajvansh/partner], working on [task ID]. Implement only this task and coordinate shared files before editing them. Run the applicable checks, state anything unverified, and update the task status. Stop at the shared checkpoint and explain what we should click to test it.

Before a task, claim its row and push the claim so the other person can see it. After a working slice, push code and task updates, open a short PR, and have the other person review and test. After merging, the person who merges updates STATUS with the new shared result. Bring current `main` into the other working branch before continuing. Small commits and 60–90 minute syncs keep the branches close.

## Keep GitHub updated while building

Each person starts from a clone connected to this repository. At every working checkpoint, the coding assistant updates the owner's task row, commits the intended code and documentation, pushes the branch, and returns the commit or PR link. The first push should establish branch tracking. If the tool cannot push, it must state the blocker and what is still only local.

Merge reviewed slices into main and bring main into both working branches. Update shared STATUS after merging. Private user documents, graph caches, tokens, and PDFs stay outside GitHub. The code repository and each user's saved graph are different kinds of storage.

## Prepare for larger graphs and future integrations

- **More folders:** fetch children and subsequent pages only as needed; cap concurrent API requests and reuse cached results.
- **More visible information:** set a configurable visible-node budget and provide Show more, collapse, and focus. Layout only the visible portion.
- **More integrations:** keep one graph component, a shared graph contract, separate source adapters, and a storage interface. Another platform adds an adapter instead of requiring a new UI.
- **More saved data:** use stable source IDs, account-scoped keys, and a schema version. Bound source caches and PDF storage; report save failures. Evict reconstructible source data separately from personal notes/layouts.
- **Evidence:** during M6, use a labeled synthetic graph with 1,000 cached nodes and a configured visible limit such as 50. Check that focus, expansion, navigation, and reopening remain usable; record timings, request counts, and the tested limits. These are test inputs, not claims about supported capacity.

These choices make the prototype easier to extend and test with larger sources. They do not establish performance for millions of items or many simultaneous cloud users. Cross-device graph sync and a production backend are separate later milestones, not part of tonight's GitHub connection.

## Finish and cut order

By hour 10, protect anything already working. Drop AI suggestions, full citation extraction, extra themes, arbitrary publisher pages, a full editor, additional platforms, and cloud sync. If time is tight, ship one source creation action instead of all three, and correct PDF anchors manually if automatic heading detection is unreliable. If a whole integration is blocked, explicitly reduce the demo to the real completed surfaces.

At hour 12 stop adding features. Show: normal interface → Graph → expand/focus → open exact destination → add a personal connection or source item → reopen with saved state → repeat briefly in the other completed surface. Target a 2–3 minute demo and adjust to the organizer's actual limit. Keep the backup recording from the same final build.

If possible, ask two people unfamiliar with the sample to find a tab and a paper section. Record only actual task results. Use those observations to simplify confusing controls, not to invent performance claims.
