# Tonight's build plan

Build **one Chrome extension** with the same graph interface for Drive folders, Google Docs tabs, and individual research PDFs. **V1 is manual graph creation/editing plus real source navigation and saving. V2 adds GPT-assisted draft generation to that same product.** Finish a useful manual experience first; do not substitute a generated diagram for the editor or make V1 depend on a model call.

This is a proposed 15-hour schedule measured from when you start: **12 hours building and 3 hours preparing the presentation**. If less time remains, use the cut order below and preserve the last 3 hours. Current progress belongs in [TASK_LIST.md](./TASK_LIST.md) and [STATUS.md](./STATUS.md), not in this schedule.

## Who does what

**You, Rajvansh:** own the things the user sees and clicks: extension scaffold, graph component, panels, action forms, PDF reader interface, and visual testing.

**Your partner:** owns getting real information into those same screens: Google sign-in, source adapters, exact navigation targets, PDF extraction, saved state, and source writes.

Both spend the same blocks on the same milestone. For example, during Docs work you build the tab panel while your partner supplies the tab data and click action. During PDF work you build the reader while your partner supplies section anchors. Neither person builds a separate product. Rebalance a task whenever one person is blocked.

## Two starting paths

The user chooses **Create your own map** or **Generate from existing content**, then edits the resulting graph with the same controls.
Creating a personal map starts empty and allows idea/note nodes without an existing source.
Generating a map creates real nodes and navigation destinations from a Drive folder, Doc, or PDF, then allows personal edits and extra connections.
V1 can import source structure and supports user-created meaningful connections.
V2 adds generated concepts and relationships with evidence and review.

Keep M1-A scoped to its shell and M1-B to authorized reads.
Agree support for both graph origins in M1-C before graph and storage code diverge.
M2 starts the manual create/connect/edit/save cycle alongside Drive sources; M3 and M4 reuse it for Docs and PDFs.
M5 completes editing and refresh across the implemented surfaces.
During M6, verify both creating a personal map and editing a generated map, including reopening each without losing personal work.
These are planned acceptance checks, not completed features.

## The schedule

| Time from start | Shared result | You | Partner | Both verify before moving on |
| --- | --- | --- | --- | --- |
| 0:00–0:30 | Same project and demo | Clone repo; agree on the interface and scope | Clone repo; prepare one demo folder, tabbed Doc, and text PDF | Same plan, shared source access, one task each |
| 0:30–2:00 | Extension shell and first Google read | Scaffold WXT/React/TypeScript; load the extension; add Graph button and empty panel | Configure Google project and sign-in; read a folder and Doc; define shared data types with you | Both run the same merged scaffold; real API response or a documented auth blocker |
| 2:00–4:00 | First manual graph with real Drive sources | Build source/idea nodes, add/connect/label/edit/remove personal items, and basic expand/open controls | Supply real source nodes and destinations; implement graph edit commands and initial save | Add an idea and labeled connection to a real source, open it, edit the connection, and reopen saved state |
| 4:00–6:00 | Real Docs tab graph | Reuse graph in a Docs panel; show selected tab and preview/details | Read tabs recursively and wire exact tab navigation | Navigate to a top-level tab and a nested tab in the real Doc |
| 6:00–8:00 | Paper graph and reader | Build extension PDF reader with graph beside it | Use PDF.js to read bookmarks/text and map section nodes to destinations | Open a paper and click at least three nodes to the correct locations |
| 8:00–10:00 | Complete V1 editing and refresh | Finish note/relationship editing and focus; show save/refresh status; add a source-action form if time allows | Preserve edits during refresh, persist PDFs, and implement one source action if time allows | Add/edit/remove personal nodes and edges; reopen and refresh without losing accepted edits; test any implemented source write |
| 10:00–12:00 | Reliable demonstration build | Improve labels and readability; test each surface on partner's build | Fix data/auth/navigation bugs; produce packaged build and verify restart | Same final commit, clean build, actual browser walkthrough, then freeze features |
| 12:00–13:00 | Story and demo assets | Draft the short deck | Record a backup demo and prepare a clean demo browser | Deck describes only working features |
| 13:00–15:00 | Rehearsed presentation | Lead problem, product, and value | Lead demo and technical explanation | Both rehearse the full pitch, timing, handoffs, and questions |

At each checkpoint, merge a working slice into `main`, pull it, and run it together. A screenshot of a graph is not completion: its clicks must work. If the initial manual editor takes longer than M2, finish its create/connect/edit/save cycle before adding another surface; shorten secondary integrations instead of dropping manual editing.

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
| Dexie + extension-owned IndexedDB | Save graph records and layout; PDF bytes later | You supply the initial repository; partner integrates source adapters |

Agree on this small data contract before writing adapters:

The M1-C [storage design](./STORAGE_DESIGN.md) specifies records, relationships with two or more members, stable source locators, saved layouts, and later AI draft review.
Use extension-owned IndexedDB for graph records and future PDF bytes, with chrome.storage.local reserved for small preferences.
The user approved local IndexedDB/Dexie and no AWS for V1; Rajvansh has implemented the initial shared types and repository.
Eddy's integration review and real Drive adapter remain outstanding; see the [M1-C response](./M1C_HANDOFF.md).

- **Graph:** independent stable graph ID, creation mode (`manual` or `import`), optional verified account scope, source bindings, revision, and saved view.
  An imported map retains provider identities in its source records and locators.
  Personal maps must be creatable and reopenable before a source is attached.
- **Node:** stable ID, title, type (`source`, `idea`, or `note` plus source subtype), and a target such as file ID, document ID plus tab ID, or PDF fingerprint plus destination/page.
  Keep source titles separate from personal display labels; ideas/notes may have no external target.
- **Relationship:** stable ID, members with `from`/`to` or `peer` roles, relationship type/label, and current origin (`imported` or `manual`).
  Distinguish source containment and explicit references from personal interpretations.
  V2 will add proposal decisions and provenance; the current runtime does not accept AI-origin records.
  Preserve accepted user edits independently of later drafts.
- **Personal state:** positions, view, personal concept/note nodes, notes, and custom relationships, kept separate from imported source fields.
  Collapse state and panel resizing remain later UI work.
  Refresh applies to source-generated data and preserves the person's additions.
- **Adapter:** `load`, `refresh`, and `navigate`, with optional supported source actions.
  No token in graph data.
- **Graph editing:** shared commands to add/update/remove personal nodes and edges and attach source destinations.
  Removing a personal graph item does not delete its original file.
- **V2 generation boundary:** a separate module accepts selected source excerpts and returns draft nodes/edges plus evidence references.
  Keep the model call out of the graph UI; do not build this module until V1's manual cycle works.

Current ownership after the user's storage implementation request: Rajvansh owns the first `lib/graph/` and `lib/storage/` slice, `components/graph/`, package changes, and visible entrypoints.
Eddy owns `lib/adapters/`, Google reads/authentication, and the background worker.
M2-B still includes the Drive adapter, real navigation, and routing source operations through the repository; the repository foundation is now supplied by Rajvansh.
Rajvansh wires the visible panel to Eddy's AUTH_STATUS and CONNECT messages.
Review the concrete [M1-C handoff](./M1C_HANDOFF.md) before further shared-type changes.
Only one person edits shared types, package files, or WXT configuration at a time; hand off changes explicitly.

## Steps 4 to 6 Reuse the graph with real sources

**Drive:** start at one demo folder, then add a My Drive overview showing top-level folders/files and a focused view for any folder. Load children on demand, handle pagination, and give every file a real open action. Do not scan the whole Drive before showing anything.

**Docs:** request tabs with `includeTabsContent=true`, recurse through nested tabs, and retain tab IDs. Verify the exact tab opens inside Google Docs. [Docs tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs).

**PDF:** start with a local text-based PDF in our extension-owned reader. Use PDF.js bookmarks when present; otherwise propose page-aware heading anchors and let the user correct them. Use bundled code/workers. Do not attempt to inject into Chrome's built-in PDF viewer. Remote URL import is optional; local file selection keeps the first reader independent of publisher restrictions.

**Creation:** manual idea nodes and labeled relationships are core V1. Once their create/edit/remove/save cycle works, add one real source action and then the others if time permits. Target folder creation and Doc tab add/rename. Google Docs exposes `addDocumentTab` and `updateDocumentTabProperties` requests. Verify against the actual account before claiming support. [Docs write requests](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request).

## Planned V2 GPT-assisted generation

V2 is the next product stage, not a requirement to finish tonight's V1. Start after the manual acceptance check passes and time remains before the feature freeze; otherwise continue after the hackathon. Do not mark it DOING or completed until work actually starts.

| Task | Rajvansh | Partner | Completion check |
| --- | --- | --- | --- |
| G1 Select and extract | Source selection and selected-content preview | Extract bounded Doc/PDF content with stable passage/tab/page references | Selected input can be inspected and every source anchor resolves |
| G2 Propose a graph | Loading/error/cancel state for Generate draft | Server-side GPT call behind a replaceable generator interface; validate structured proposals and reference IDs | A bounded draft with source/idea nodes and evidence-backed proposed edges is returned |
| G3 Review and persist | Show evidence and accept/edit/reject controls in the existing editor | Keep drafts separate; persist acceptance and preserve user edits on refresh/regeneration | Accept one edge, edit another, reject another, reopen and regenerate without losing those decisions |
| G4 Verify product value | Test the full navigation and correction workflow | Check invalid citations, model errors, content limits, and repeated generation | Source destinations work; failed generation leaves manual editing and saved graphs usable |

Folder metadata is sufficient for a structural Drive view, but V2 needs actual content from supported selected files. Initially support one Doc or text PDF; do not silently read a whole Drive for semantic analysis. Send only selected content to the model with the user's authorization. Keep the provider API key on a server, outside the extension and GitHub. A development server can run locally for a prototype; deployment and multiuser authentication are separate work.

Check the current official model API documentation when implementing G2. Record provenance and source excerpts; discard or flag proposals whose referenced passages or destinations cannot be validated. The graph editor, source integrations, navigation, and persistence remain independent of generation.

**Personal authoring starts in M2 and is completed across surfaces in M5:** expose Create your own map, add personal nodes and connections, and save them without requiring Google access or a PDF.
Use the same authoring controls to edit a generated map while keeping source destinations intact.
Adding a personal node does not create a Google file or modify a PDF; real source creation remains a separate explicit action.

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

By hour 10, protect the V1 manual create/connect/edit/navigate/save cycle. Keep GPT generation in the planned V2 queue if it is not ready; defer full citation extraction, extra themes, arbitrary publisher pages, a full editor, additional platforms, and cloud sync. Reduce source creation actions and secondary integrations before removing core manual editing. Correct PDF anchors manually if automatic heading detection is unreliable. If an integration is blocked, explicitly reduce the demo to the real completed surfaces.

At hour 12 stop adding features. Show: normal interface → Graph → attach a source and add an idea → connect and label them → edit the connection → open the exact source destination → reopen with saved state → repeat briefly in another completed surface. Show V2 only if the actual selected-content, evidence-review, and saved-edit workflow works; otherwise identify it as planned. Target a 2–3 minute demo and adjust to the organizer's actual limit. Keep the backup recording from the same final build.

If possible, ask two people unfamiliar with the sample to find a tab and a paper section. Record only actual task results. Use those observations to simplify confusing controls, not to invent performance claims.
