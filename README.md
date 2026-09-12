# GraphNav

A Chrome extension for navigating and organizing Drive folders, Google Docs tabs, and research papers through independent interactive graphs.

**Current state:** the on-page Drive/Docs editor, local PDF reader, saved graphs and selected-content AI preview/client are merged through [PR #13](https://github.com/SchrodingersCatLooks/graphnav/pull/13).
Choose existing source items without retyping, build a structural baseline, edit personal nodes/connections, arrange and navigate the map, or read a local PDF beside its graph.
The local OpenAI relay now generates real suggestions with supporting text and source navigation inside the PDF reader.
Persistent accept/edit/reject decisions remain the next G3 integration step.
See [relay setup](./relay/README.md) for the private configuration and startup command.

**Still open:** accepted/edited/rejected AI persistence, source-authoring controls, group editing, floating placement and final demo acceptance.
V1 and V2 remain in the requested MVP target; TASK_LIST records precise status.

**Verification:** Node 22.23.2 / npm 10.9.9 typecheck, production build and all 116 tests passed; the final recovery-message refinement passed 14 affected tests.
Installed browser tests use isolated profiles, synthetic Google responses, actual authored PDF bytes and a local HTTP test provider.
Separately, one actual OpenAI request returned eight ideas/eight connections from two authored PDF pages, with exact evidence navigation and unchanged saved graph.
No fresh Google-account acceptance or full saved-review loop is implied.

**Shared implementation plan:** [BUILD_PLAN.md](./BUILD_PLAN.md) gives the 15-step order, tools, exact instructions for Rajvansh and Eddy, dependencies, and acceptance gates.
[FEATURE_SPEC.md](./FEATURE_SPEC.md) defines the use cases and contracts, and [TASK_LIST.md](./TASK_LIST.md) lists the corresponding owner/status rows in execution order.
The 6 AM code freeze has been removed by the user.
Implementation continues toward the full V1/V2 target; submission remains 4 PM on September 12, local Eastern time, with human rest and pitch preparation still planned.
Publishing these documents does not merge the application features they describe.
**Documentation workflow:** keep planning, task claims, progress, and status directly updated on main at each checkpoint.
Use the [shared-documentation procedure](./AGENTS.md#shared-documentation-lives-on-main) so both assistants see current information while feature code remains on its working branch.

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
6. Open [My Drive](https://drive.google.com/drive/my-drive) or a Drive folder, click **Graph**, then **Connect Google** if needed.
   Sign-in/consent is an action on your account; use the expected GraphNav testing application and authorized account.
7. Under **Add existing**, search or select sources, then use **Add selected**.
   Names and destinations are filled in; duplicate names show parent paths.
   **Build baseline** adds the listed structure automatically without GPT.
   Browse a folder with its arrow to choose items inside it in the current map.
8. Add a personal idea and a labeled connection, or select a personal idea and one source to **Attach destination**.
   Use the inspector to edit labels/notes and open destinations.
   **Arrange map** arranges unpinned nodes; dragging a node pins its position.
   **Hide tools** gives the graph more room.
   Use **Focus selected** for a compact neighborhood preview, **Collapse branch** for containment, and **Show whole map** to return.
   Focus previews preserve saved positions; return to the whole map to drag nodes.
   **Find a node** searches the loaded map, and **Previous 50 / Next 50** keep the list and canvas on the same page.
   Choose **Panel width** and **Dock left/right** in the footer; these settings survive Chrome restarting.
9. Use **Refresh source**, close/reopen the panel, and verify your personal edits remain.
   A selected-only map must not suddenly add unselected siblings.
   Export/import a backup through the toolbar or the optional My maps workspace.
   **Check destinations** checks Google source availability and marks unavailable sources while preserving their notes.
   A failed check is reported separately from a missing destination.
10. Open a Doc, refresh it, and click **Graph**.
    Select top-level/nested tabs or build a baseline; select a node and choose **Go to tab in this document**.
    Confirm the original browser tab reaches the exact tab, the graph reopens on the left, and the current tab is highlighted.
    Verify ordinary typing/scrolling and reachable close controls at your normal and increased browser zoom.

The shell recognizes My Drive, individual Drive folders, and normal Docs document URLs, including numbered account paths.
Drive Home, Recent, Shared drives overviews, Docs home, published Docs, Sheets, and Slides are outside this first shell's supported routes.
Use **My Drive** or open a folder if Drive initially shows Home.
The URL context is only a UI hint; it is not an authenticated Google account or the shared M1-C graph contract.

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
3. Select sections and choose **Add selected**, or use **Build baseline** for the whole listed outline.
   This works without GPT or an API key.
4. Select a graph node, add notes, and choose **Go to page N**.
   Section destinations include a visible marker; two sections on one page can have different anchors.
   **Hide tools** gives the graph more room; **Sources & edit** brings controls back.
5. Close/reopen the reader or restart Chrome, then choose the paper under **Saved PDFs**.
   The original file, graph and personal edits stay in this Chrome profile.
6. Export/import a graph backup to keep a separate map copy.
   JSON backups exclude PDF bytes, so keep the original file yourself.
   If bytes are missing, **Reattach original PDF** requires the exact matching file and restores existing page/section destinations.
   **Remove saved PDF** deletes only the local bytes after confirmation; it retains maps and notes.

The local PDF library is limited to 100 MiB total.
Opening a PDF makes no upload or AI request.
Password-protected files and OCR are unsupported; pages without selectable text retain page navigation with an explanation.
V2 generation controls and the final demo acceptance are still open in TASK_LIST.

## Preview content for AI

1. In a Doc graph panel or the PDF reader, choose **Select content for AI**.
2. Choose the graph's purpose, then explicitly select document tabs or PDF pages.
   Nested tabs are separate choices.
3. Choose **Preview selected text** and inspect the complete passages shown.
   The preview is limited to 20,000 characters and 200 passages, with visible truncation and empty-text explanations.
   Changing the selection or purpose clears the old preview; **Cancel preview** ignores late results.

Previewing sends nothing to a model and does not change the manual graph.
**Generate with AI** is currently unavailable while the relay is being connected.
API keys must remain on the relay server, not in the extension, GitHub or chat.
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
Read GENERATION_HANDOFF for the active relay-client boundary; no model has been called.
Read [EDITOR_HANDOFF.md](./EDITOR_HANDOFF.md) before changing shared messages or integrating generation.
Bring current main into each working branch with a normal merge, preserving local changes.
GitHub does not synchronize private maps, Google tokens, or PDF bytes.

The selected stack and official implementation references are in FEATURE_SPEC, with implementation order in BUILD_PLAN.
Manual maps need no AI server; the planned V2 workflow requires the local model relay described there.

## Provenance

The lightweight AI workflow and PR template were adapted from `green-business-solution/green-business-solution`.
Product context was curated from the supplied Graph navigation idea notes and the team's clarifications.
No unrelated production code, AWS setup, or source-document opposition sections are included.
