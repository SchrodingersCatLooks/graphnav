# GraphNav

A Chrome extension for navigating and organizing Drive folders, Google Docs tabs, and research papers through independent interactive graphs.

## Install

GraphNav is distributed as an unpacked extension, not through the Chrome Web Store.
Its Google scopes (`drive.metadata.readonly`, `documents.readonly`) are sensitive scopes, so public distribution needs Google's OAuth verification; until that completes, Drive and Docs work only for accounts added as testers on the Cloud project.

**From a release**

1. Download `graphnav-<version>-chrome.zip` from [Releases](https://github.com/SchrodingersCatLooks/graphnav/releases) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder.

**From source** — Node 22 (`.nvmrc` pins it):

```
npm install
npm run build
```

Then load unpacked from `.output/chrome-mv3`.

The extension ID is pinned by a public key in the manifest, so it is the same for every install and the registered OAuth client keeps working.

### What works without signing in

Opening a PDF, reading it beside its graph, adding sections and pages as nodes, writing your own ideas and connections, arranging the map, undo, and exporting or importing a backup. Everything is stored in your own Chrome profile; nothing is uploaded.

Click the toolbar icon and choose **Open a PDF**, or open `reader.html` from the extension. `demo/GraphNav-demo-paper.pdf` in this repository is an authored six-page paper with a three-level bookmark outline, provided so the reader can be tried without supplying your own file.

### Drive and Docs

Visit a Drive folder or a Google Doc and click **Graph** on the page. Connecting a Google account requires that account to be an approved tester while verification is pending.

### AI suggestions (optional)

Suggestions come from a relay you run yourself, so your model key stays on your machine and is never held by the extension. Nothing is sent anywhere until you select content and ask for a draft. See [relay setup](./relay/README.md). With no relay running, every feature above still works.


**Current opening flow (UX3-A, [PR #18](https://github.com/SchrodingersCatLooks/graphnav/pull/18)):** Clicking **Graph** opens a compact menu with **Manage Google connection**, **New Graph**, and **Use Existing Graph**.
**New Graph** opens a separate **Manual / Automated** screen with **Back** at the top left.
Google connection controls appear only inside the connection screen reached from the home menu.
Choose a saved map or finish creating a named map to expand the editor.
Opening or backing out of the chooser creates nothing, and creating another graph preserves existing maps.
The expanded graph keeps its saved size and placement.
Following a source destination or refreshing an already open graph resumes that graph when available.
**Add** combines new ideas with a searchable source tree.
Click a row to add or focus its node; click its arrow to browse children without adding them.
The graph opens ready to edit, with draggable and resizable cards, optional connection labels, and minimize/fullscreen controls.
Use **Done editing** for a read-only canvas.
Use a card's separate **Open ↗** action to navigate, use **This page** to recover the source map, and find map selection/backups under **More**.
Use **Back** to return to the compact menu; **Panel settings** remains available inside the expanded graph.

**Current state:** the on-page Drive/Docs editor, local PDF reader, saved graphs and selected-content AI preview/client are merged through [PR #15](https://github.com/SchrodingersCatLooks/graphnav/pull/15).
Choose existing source items without retyping, build a structural baseline, edit personal nodes/connections, arrange and navigate the map, or read a local PDF beside its graph.
The local OpenAI relay now generates real suggestions with supporting text and source navigation inside the PDF reader.
Suggestions can be added to the map, renamed on the way in, or dismissed, and those decisions persist: regenerating reports what you already decided instead of offering it again.
See [relay setup](./relay/README.md) for the private configuration and startup command.
For the current product check-in, follow [the browser review walkthrough](./REVIEW_WALKTHROUGH.md).
Eddy's morning checkpoints connect review controls to durable proposal decisions, including backup/import and undo.

PR #14 adds movable/resizable floating panels, saved placement, docking and reset.
PR #15 adds a visible project-map chooser, Add a PDF to this map, and map continuity when navigating between Docs and PDFs.
**Still open:** source-authoring controls, group editing, combined multi-source AI input, deeper Docs heading navigation, and final live demo acceptance.
V1 and V2 remain in the requested MVP target; TASK_LIST records precise status.

**Earlier editor checkpoint:** UX4-A, [PR #19](https://github.com/SchrodingersCatLooks/graphnav/pull/19).
The unified Add menu, card dimensions, connection labels/direction and window controls use the existing saved graph and PersonalOverlay storage.
Extension and relay typechecks, production build and all 142 tests (1.3 minutes) passed on Node 22.23.2 / npm 10.9.9.
Installed tests use synthetic Google responses, authored PDF bytes and a local test AI provider.
No new live Google-account acceptance or paid model call is claimed.

**Earlier verification:** Node 22.23.2 / npm 10.9.9 extension/relay typechecks, production build and all 118 tests passed for PR #14.
For PR #15, both typechecks/build and all 19 affected tests passed.
The full suite passed 118/119; one browser-fixture startup timed out before the PDF preview test ran, with a worker-teardown timeout afterward.
That test passed three isolated reruns; the startup flake remains recorded under M6-B.
Installed browser tests use isolated profiles, synthetic Google responses, actual authored PDF bytes and a local HTTP test provider.
Separately, one actual OpenAI request returned eight ideas/eight connections from two authored PDF pages, with exact evidence navigation and unchanged saved graph.
That earlier live request did not exercise saved review; the later installed-browser review test covers saving and regenerating with a synthetic provider.

**Shared implementation plan:** [BUILD_PLAN.md](./BUILD_PLAN.md) gives the 15-step order, tools, exact instructions for Rajvansh and Eddy, dependencies, and acceptance gates.
[FEATURE_SPEC.md](./FEATURE_SPEC.md) defines the use cases and contracts, and [TASK_LIST.md](./TASK_LIST.md) lists the corresponding owner/status rows in execution order.
The 6 AM code freeze has been removed by the user.
Implementation continues toward the full V1/V2 target; submission remains 4 PM on September 12, local Eastern time, with human rest and pitch preparation still planned.
Publishing these documents does not merge the application features they describe.
**Documentation workflow:** keep planning, task claims, progress, and status directly updated on main at each checkpoint.
Use the [shared-documentation procedure](./AGENTS.md#shared-documentation-lives-on-main) so both assistants see current information while feature code remains on its working branch.

**Presentation audit, 2026-09-12:** main runtime [2553ef7](https://github.com/SchrodingersCatLooks/graphnav/commit/2553ef7) passes extension and relay typechecks, production build, ZIP packaging, and all 163 tests in 1.5 minutes on Node 22.23.2 / npm 10.9.9.
Eddy's morning work adds saved AI review/decision backups, undo, direct canvas create/rename/delete, PDF-map reopening verification, and a shared visual theme.
The package-install test checks the stable extension ID and extension pages.
Tests use isolated Chromium, synthetic Google responses, authored PDFs, and a synthetic AI provider; this audit does not establish current live Google access or paid generation on the presentation laptop.
Core manual/source-assisted graphs and saved AI review are implemented; the remaining requirements and final real demo acceptance stay open in TASK_LIST.

## Start here

| File | What it answers | When to update |
| --- | --- | --- |
| [IDEA.md](./IDEA.md) | What are we building and why? | When the team changes product scope |
| [BUILD_PLAN.md](./BUILD_PLAN.md) | In what order, with which tools, and who does what? | When the shared schedule or architecture changes |
| [FEATURE_SPEC.md](./FEATURE_SPEC.md) | Which workflows, controls, APIs, data, and tests must fit together? | When requirements or integration contracts change |
| [STORAGE_DESIGN.md](./STORAGE_DESIGN.md) | What is the local storage direction and implemented review-branch subset? | When storage contracts change |
| [M1C_HANDOFF.md](./M1C_HANDOFF.md) | What is the current shared contract and Google integration handoff? | At integration checkpoints |
| [TASK_LIST.md](./TASK_LIST.md) | What is each person doing next? | When claiming, blocking, reviewing, or finishing a task |
| [STATUS.md](./STATUS.md) | What works, what is blocked, and what happens next? | After a merged milestone or shared blocker changes |
| [AGENTS.md](./AGENTS.md) | How should AI work in this repository? | When the team changes its workflow |

## Install and build

You need Git, desktop Chrome 114 or newer, Node.js 22 (at least 22.12), npm, and access to this private repository.
The clean-install check used Node 22.23.2 and npm 10.9.9 on macOS.
If you use nvm, run `nvm install` and `nvm use` inside the clone; `.nvmrc` selects Node 22.
Otherwise install Node 22 and confirm `node --version` before continuing.

For a new local copy of the current main build:

```bash
git clone https://github.com/SchrodingersCatLooks/graphnav.git
cd graphnav
npm ci
npm run typecheck
npm run build
```

For an existing clone, first inspect `git status` and preserve your work, then fetch and switch to the intended branch.
Do not overwrite an existing clone or reset local changes to follow these instructions.
The production extension is generated in **`.output/chrome-mv3/`**.
WXT generates its `manifest.json` from `wxt.config.ts`, the package version, and entrypoint declarations.
Commit the configuration and lockfile; do not edit or commit generated output.

## Test in your Chrome profile

Use your own Chrome profile and an account authorized for the source you want to read.
Repeated partner-laptop acceptance is not a routine gate; test the changed flow and report a specific failure if one occurs.

1. Build the latest main code using the commands above.
   In an existing development branch, preserve local changes, fetch origin, and merge origin/main normally before building.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Load unpacked from **`.output/chrome-mv3`**, or click **Reload** on the existing GraphNav installation.
   On macOS, use **Command+Shift+G** in the folder picker to enter its complete path.
   Keep the existing installation to preserve local maps; export a backup before deliberately removing an old copy.
4. Confirm extension ID **pidejkbkldalibjaehjfpjkcpjpcenpk**.
   If an obsolete installation has a different ID, back it up and disable it so only the expected build runs.
   The public manifest key is already configured; see GOOGLE_SETUP for the OAuth handoff.
5. Refresh open Drive/Docs tabs after every extension reload.
   Otherwise those tabs can retain an old content script even when Chrome shows the new extension build.
6. Open [Drive Home](https://drive.google.com/drive/home), My Drive or a folder, then click **Graph**.
   Expect the compact menu: **Manage Google connection**, **New Graph**, and **Use Existing Graph**.
   For sign-in, choose **Manage Google connection > Connect Google**, then **Back** after connecting.
   Sign-in and consent require your own account action.
   Choose **Use Existing Graph** and a saved map, or **New Graph > Manual**, name it and **Create map**.
   **New Graph > Automated** leads to named graph creation and selected-content AI preview/generation.
   New Graph has its own Back button and no Google account controls.
   The panel expands after choosing or creating a map.
   Open **Add** and click source rows to add their names and destinations immediately.
   Under **Add > More source options**, use **Build baseline** for the listed structure or **Add selected** for bulk selection without GPT.
   Drive Home uses your My Drive root, not Google's suggested or shared Home feed.
7. Use a source node's separate **Open ↗** button to open its destination.
   A folder opens in the same browser tab with its saved graph or the compact launcher; the overlay stays open.
   **This page** returns to this source's cached map if another project map is selected.
   In a Doc, use a tab node's **Open ↗** action to reach that exact tab in the same browser tab.
8. Click **Connect** on one node and **Connect** on another, or click/drag their connection handles.
   The line is saved immediately; labeling is optional.
   Click its **Add label** pill, existing tag or line to edit the connection.
   Choose **Supports**, **References**, **Depends on**, **Related to**, or enter your own label.
   **Done / Enter** saves; **Escape** cancels the popup draft.
   **Remove label**, then **Done**, keeps the line; **Reverse direction** swaps its arrow and endpoints, while **No arrow** makes it undirected.
   Click **Edit** on a node for its label, notes and destination details.
   Drag a node or resize its corner handles to save its position and dimensions.
   **Arrange map** respects dragged/resized pins and their sizes.
   Choose **Done editing** to pause dragging, or **Back** for the compact menu.
9. **Add** contains both a new-idea form and existing folders, documents, tabs or PDF sections.
   Click a row to add that item; an already-added row focuses its existing node.
   Click an arrow to expand children without adding them.
   Drive folder and recognized Doc children load when expanded; name search ranks exact, prefix and typo matches among loaded choices.
   **More source options** retains bulk selection, baseline, destination attachment and **Refresh source**.
   Refresh preserves personal edits, connection labels/direction, card sizes and selected-only membership.
10. Use **More** for saved-map selection, adding a PDF, and backup import/export.
    **Map options** contains focus, collapse, pagination and destination checks.
    **Panel settings** contains width, dock, float and reset controls.
    The expanded editor provides **Minimize**, **Fullscreen** and **Resize** controls.
    Resize also works from a docked panel and saves your normal rectangle; fullscreen is temporary.
    Float mode also exposes Move with pointer/keyboard support; Escape cancels a placement drag, exits fullscreen, or closes the panel.
    Use **Back > Manage Google connection** for the available account label, **Change Google account**, **Disconnect Google**, and **Check connection**.
    Chrome controls which account sign-in offers; another Chrome profile may be needed to use a different Google account.
    Close/reopen the panel, choose **Use Existing Graph**, select your map, then refresh the page and check that your notes, connections and dragged positions remain.
    Verify typing, scrolling and reachable close controls at normal and increased browser zoom.

The shell recognizes Drive Home, My Drive, individual Drive folders and normal Docs document URLs, including numbered account paths.
Recent, Shared with me and Shared drives overview pages, Docs home, published Docs, Sheets and Slides are not separate graph sources.
Open a specific folder from an overview to use its graph.
Source titles and membership come from authorized APIs; page context is a location hint, not a Google account identity.

After changing code, rerun `npm run build`, click GraphNav's **Reload** button in `chrome://extensions`, and refresh open Drive/Docs tabs.
Disable or remove GraphNav and refresh the page to remove its button completely.
If the button is missing, check the route, extension toggle/site access, selected output folder, and page refresh.
Report actual Chrome errors instead of marking the browser check passed.
See Chrome's [official unpacked-extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Read a local PDF beside its graph

1. Rebuild the extension, reload GraphNav at chrome://extensions, then open its toolbar popup and choose **Open a PDF**.
2. Choose a text PDF up to 20 MiB and 300 pages.
   Bookmarked sections or detected heading suggestions have names and page destinations already filled in.
   **All pages** provides page destinations if the outline is unsuitable.
3. If the paper has no saved graph, choose **Manual**, name the graph and **Create map**.
   Use **Add > More source options**, select sections and choose **Add selected**, or use **Build baseline** for the whole listed outline.
   This works without GPT or an API key.
4. Click a source node title to reach its page or section.
   Use its **Edit** button to add notes or inspect the destination.
   Section destinations include a visible marker; two sections on one page can have different anchors.
   Close the tool drawer to see the whole graph; **Add > More source options** reopens the source chooser.
5. Close/reopen the reader or restart Chrome, then choose the paper under **Saved PDFs**.
   The original file, graph and personal edits stay in this Chrome profile.
6. Open **More** to export/import a graph backup as a separate map copy.
   JSON backups exclude PDF bytes, so keep the original file yourself.
   If bytes are missing, **Reattach original PDF** requires the exact matching file and restores existing page/section destinations.
   **Remove saved PDF** deletes only the local bytes after confirmation; it retains maps and notes.

The local PDF library is limited to 100 MiB total.
Opening a PDF makes no upload or AI request.
Password-protected files and OCR are unsupported; pages without selectable text retain page navigation with an explanation.
V2 generation controls and the final demo acceptance are still open in TASK_LIST.

## Combine a Doc and PDF in one map

1. In the Doc graph, open **More** to create a map or choose one under **Open a map**.
2. Open **Add > More source options**, select the wanted Doc tabs and choose **Add selected**.
3. Under **More**, choose **Add a PDF to this map**, then open a file or choose one under **Saved PDFs**.
   The reader shows the target map before any PDF nodes are added.
4. Open **Add > More source options**, select the wanted PDF sections/pages and choose **Add selected**.
5. Connect a Doc tab to a PDF section with a personal label.
   Following either destination keeps the same map beside the correct Doc tab or PDF page.
6. Refresh the Doc source and PDF outline separately, then reopen the reader to verify the connection remains.

The map can combine manual ideas, a chosen Google account's sources and local PDF sections.
Independent maps remain available in the chooser.
AI still previews and generates from one selected Doc or PDF at a time; a combined multi-source AI request remains open under X2.

## Preview content for AI

1. Choose **New Graph > Automated**, give the new graph a name and choose **Continue with AI**.
   In Drive, choose one Google Doc listed in the current folder; in Docs or the PDF reader, the current source supplies the choices.
   The named map is saved separately, and generated suggestions stay drafts until you save your review.
2. Choose the graph's purpose, then explicitly select document tabs or PDF pages.
   Nested tabs are separate choices.
3. Choose **Preview selected text** and inspect the complete passages shown.
   The preview is limited to 20,000 characters and 200 passages, with visible truncation and empty-text explanations.
   Changing the selection or purpose clears the old preview; **Cancel preview** ignores late results.

Previewing sends nothing to a model and does not change the manual graph.
After pairing the running local relay in **AI connection** settings, choose **Generate with AI** to request suggestions from the selected preview.
Use **Cancel** while it runs, then inspect each suggestion's supporting text and open its evidence source.

Review each suggestion with **Add to map** or **Dismiss**. Accepting reveals an editable label, so the wording you keep is what gets stored.
A connection can only be added when the suggested ideas it joins are added too; the panel says so before you save.
Choose **Save decisions** to apply them. Nothing reaches the map until then.

Added items are recorded as AI suggestions rather than as your own writing, and keep the passage they came from, so you can always see what a suggestion was based on and open it.
Dismissed suggestions are remembered: generating again reports what you already decided rather than offering it a second time, and re-accepting something already added does not duplicate it.
Decisions travel with **Export backup** and come back on import.
API keys belong in private relay configuration or encrypted deployment secrets; never commit them or put them in the extension or chat.
The authored demo paper is available at [demo/GraphNav-demo-paper.pdf](./demo/GraphNav-demo-paper.pdf).
It is demonstration content, not a published study.

## Development and automated checks

```bash
npm run dev
```

Development starts WXT's watcher and writes **`.output/chrome-mv3-dev/`**.
Keep the command running, load that folder through Chrome's Load unpacked button, and refresh supported tabs.
The development command deliberately uses your manually selected Chrome profile instead of launching another browser.
Use only one GraphNav build at a time: disable the production copy before loading the development copy to avoid duplicate buttons.
Stop the watcher with **Ctrl+C**.
Use the production build for teammate acceptance testing.

```bash
# One-time browser download for automated testing:
npx playwright install chromium

# Type-check, production build, and the full current test suite:
npm run check

# Or run individual checks:
npm run typecheck
npm run build
npm test

# Optional distributable archive:
npm run zip
```

`npm test` loads the existing production output, so rebuild after source changes or use `npm run check`.
Tests install the production extension into a temporary Chromium profile and serve clearly labeled synthetic pages at the matching URLs.
They verify panel opening/closing, focus and Escape, normal host editing and style isolation, Docs context, Drive navigation without reloads, unsupported pages, and a small viewport.
The layout regression also checks hit-testing above a fixed host toolbar, transformed page containers, and a 150% visual viewport scale.
They do not verify real Google editor behavior, account access, API reads, or OAuth.
Screenshots and failure traces are written under ignored `test-results/`.
The temporary test profile is separate from your personal browser profile.

## Team handoff

Rajvansh uses `rajvansh-ui`; the partner uses `partner-data` in their own clone.
Each person pushes commits to GitHub, then the other person fetches and integrates reviewed changes.
GitHub does not synchronize live edits, Google files, PDFs, or private graph state.
Confirm the partner accepted the repository invitation before treating M0 as complete.

- `entrypoints/graphnav.content.tsx` mounts and cleans up the isolated React panel.
- `components/` and `assets/shell.css` own visible shell UI.
  The shell uses a non-modal manual popover and tracks the visual viewport to keep controls above page toolbars and within the visible window.
- `lib/page-context.ts` reads the URL only; it does not scrape Google content.
- `entrypoints/popup/` explains how to find the Graph button.
- The scaffold is merged; Eddy now owns the M1-B edits to `wxt.config.ts`: public manifest key, `identity`, OAuth client/scopes, and required Google API access.
  Rajvansh retains `components/ExtensionShell.tsx` and `assets/shell.css`; dependency changes remain coordinated.

The scaffold, Google identity/read integration, Dexie editor, and on-page Drive/Docs graphs are merged through PR #6.
PR #9 adds graph browsing controls, panel preferences, and source-availability UI.
PR #10 adds local PDF reading, editable section/page maps, and exact-file recovery.
Its tested runtime e30ff42 passes typecheck/build/all 58 tests.
The public manifest key and read scopes are already present on main.
PR #11 merges Eddy work through 179d98f and the selected-text preview integration.
The combined suite passes 94 tests; the final preview layout passed four focused installed-browser checks.
PR #13 integrates the relay and verifies one real OpenAI generation inside the PDF reader.
Read GENERATION_HANDOFF for the active proposal-persistence boundary and exact verification limits.
Read [EDITOR_HANDOFF.md](./EDITOR_HANDOFF.md) before changing shared messages or integrating generation.
Bring current main into each working branch with a normal merge, preserving local changes.
GitHub does not synchronize private maps, Google tokens, or PDF bytes.

The selected stack and official implementation references are in FEATURE_SPEC, with implementation order in BUILD_PLAN.
Manual maps need no AI server; the planned V2 workflow requires the local model relay described there.

## Provenance

The lightweight AI workflow and PR template were adapted from `green-business-solution/green-business-solution`.
Product context was curated from the supplied Graph navigation idea notes and the team's clarifications.
No unrelated production code, AWS setup, or source-document opposition sections are included.
