# GraphNav

A Chrome extension for navigating and organizing Drive folders, Google Docs tabs, and research papers through independent interactive graphs.

**On `rajvansh-ui`:** My maps now creates and saves personal graphs in an extension-owned IndexedDB database through Dexie.
You can add nodes and notes, make labeled connections, attach HTTPS destinations, arrange nodes, restore the view, and export/import backups.
The Drive/Docs panel uses Eddy's real auth messages for Connect Google and connection status.
His M1-B checkpoint is integrated for review; his laptop's real reads pass, and Rajvansh's account acceptance is still pending.
The editor is currently an extension-owned workspace opened from the toolbar popup; live source graphs inside the Drive/Docs panel, PDF reading, and AI generation remain later integration work.

**Merged main:** M1-A is accepted through [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3).
The newer storage/editor/auth UI work is in [PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6), pending review and merge.
[TASK_LIST.md](./TASK_LIST.md) tracks work in progress; [STATUS.md](./STATUS.md) describes merged progress.

**Release order:** V1 provides manual graph creation/editing, source navigation, and saving.
V2 adds GPT-assisted drafts with evidence and accept/edit/reject controls.
The first manual workspace is implemented on this branch; source integration and the broader V1 checks remain open.

**Historical M1-A acceptance:** its full second-machine checklist passed after correctly reloading the extension and Google tabs.
Eddy corrected his earlier clipping/zoom report because a stale content script was still running.
The accepted code includes the popover/visualViewport fix; both-laptop acceptance is recorded.
See [TASK_LIST.md](./TASK_LIST.md#m1-a-second-machine-acceptance).

## Start here

| File | What it answers | When to update |
| --- | --- | --- |
| [IDEA.md](./IDEA.md) | What are we building and why? | When the team changes product scope |
| [BUILD_PLAN.md](./BUILD_PLAN.md) | In what order, with which tools, and who does what? | When the shared schedule or architecture changes |
| [TASK_LIST.md](./TASK_LIST.md) | What is each person doing next? | When claiming, blocking, reviewing, or finishing a task |
| [STATUS.md](./STATUS.md) | What works, what is blocked, and what happens next? | After a merged milestone or shared blocker changes |
| [AGENTS.md](./AGENTS.md) | How should AI work in this repository? | When the team changes its workflow |
| [STORAGE_DESIGN.md](./STORAGE_DESIGN.md) | Approved storage direction, implemented subset, and later planned workflows | When the storage contract changes |
| [M1C_HANDOFF.md](./M1C_HANDOFF.md) | Response to Eddy, exact shared contract, ownership, and next adapter work | At shared integration checkpoints |

## Install and build

You need Git, desktop Chrome 114 or newer, Node.js 22 (at least 22.12), npm, and access to this private repository.
The clean-install check used Node 22.23.2 and npm 10.9.9 on macOS.
If you use nvm, run `nvm install` and `nvm use` inside the clone; `.nvmrc` selects Node 22.
Otherwise install Node 22 and confirm `node --version` before continuing.

For a new local copy of this review build:

```bash
git clone --branch rajvansh-ui https://github.com/SchrodingersCatLooks/graphnav.git
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

## Test saving in your Chrome profile

This check requires your laptop's Chrome profile.
No database account, AWS setup, Google sign-in, or separate server is required for personal maps.
The database is created automatically the first time you open My maps.

1. Build the branch with `npm ci`, `npm run typecheck`, and `npm run build`.
2. Open `chrome://extensions` and enable Developer mode.
3. Load unpacked from the clone's **`.output/chrome-mv3`** folder.
   On macOS, use **Command+Shift+G** in the folder picker to enter its complete path.
   For an existing same-ID installation, use **Reload** after rebuilding.
4. Confirm the extension ID is **`pidejkbkldalibjaehjfpjkcpjpcenpk`**, pinned by Eddy's public manifest key.
   Disable any old differently identified shell so it cannot inject duplicate buttons.
   Export existing graphs before removing an installation; uninstalling can erase its local database.
5. Click Chrome's puzzle-piece menu, choose **GraphNav**, then **Open my maps**.
6. Enter a map name and choose **Create map**.
   Add two nodes, select them in **From** and **To**, enter a connection label, and choose **Connect nodes**.
7. Select a node or connection to edit its label/notes, then choose **Save changes**.
   Personal nodes accept an optional HTTPS destination; **Open destination** opens the saved link.
   Text in the inspector shows **Unsaved edits** until saved or cancelled.
8. Drag a node, or focus/select it with Enter and move it with arrow keys.
   Pan or zoom, then wait for **Saved locally**.
9. Close the workspace, quit/reopen Chrome, and open My maps again.
   Confirm the map, notes, connection label, node positions, and view are restored.
10. Choose **Export backup**, then **Import backup** and select the downloaded `.graphnav.json` file.
    Expect a separate map named with `(copy)`, with working destinations and independent edits.
    Keep backups outside the repository.
11. Open the same map in two workspace tabs.
    Edit in one, then try an edit from the stale tab.
    Expect a conflict instead of an overwrite; cancel the draft and use **Reload saved map** to continue.
12. Repeat on Eddy's laptop and record the tested commit, Chrome version, results, and errors in the PR.

Current measured checks use synthetic maps in temporary Chromium profiles.
The implementation limits each map to 500 stored nodes, 2,000 relationships, 32 members per relationship, and a 5 MB JSON backup.
The canvas displays at most 50 matching nodes; use search to focus larger maps.
These are enforced prototype limits, not a production-scale performance claim.
The schema and renderer can retain group relationships, but the current editor creates two-member connections; group-member controls remain later work.
PDF bytes, caches, and authentication data are excluded from JSON backups.
There is no cloud sync; two laptops have separate graph databases.

## Test the Google panel and M1-B handoff

These checks require your own Google account and access to Eddy's shared demo sources.
Complete Google sign-in and any consent screens personally.
The panel's connection status is backed by AUTH_STATUS; **Connect Google** calls the interactive flow only when clicked.
[The M1-C handoff](./M1C_HANDOFF.md#second-laptop-acceptance) includes the demo links and exact read requests.

1. After the build, reload the extension and refresh open Google tabs.
2. Open My Drive, a real Drive folder, or a Doc and choose **Graph**.
   Expect the correct source label, a complete panel header, and **Connect Google** if disconnected.
   A cached authorized connection should show **Google connected**, with **Check connection** to refresh its state.
3. Use **Connect Google** and finish the account flow.
   A cancelled or failed request must show an error rather than claiming a connection.
4. Close with X or Escape and confirm focus returns to Graph.
   Normal Doc typing and scrolling must remain unaffected.
5. Increase browser zoom or narrow the window and confirm the panel's header, close button, and connection controls remain reachable.
6. Run the two M1-B demo-read requests from the extension popup's inspection console and record actual results.
   Eddy reports ten folder children and four Doc tabs including a nested tab; Rajvansh's account is not yet verified.
7. Confirm no Graph button appears on an unrelated website.

The shell recognizes My Drive, individual Drive folders, and normal Docs document URLs, including numbered account paths.
Drive Home, Recent, Shared drives overviews, Docs home, published Docs, Sheets, and Slides are outside this first shell's supported routes.
Use **My Drive** or open a folder if Drive initially shows Home.
The URL context is only a UI hint; it is not an authenticated Google account or the shared M1-C graph contract.

After changing code, rerun `npm run build`, click GraphNav's **Reload** button in `chrome://extensions`, and refresh open Drive/Docs tabs.
Disable or remove GraphNav and refresh the page to remove its button completely.
If the button is missing, check the route, extension toggle/site access, selected output folder, and page refresh.
Report actual Chrome errors instead of marking the browser check passed.
See Chrome's [official unpacked-extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

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

# Type-check, production build, and all storage/browser tests:
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
The workspace tests also exercise restart persistence, backup/import, conflicts, and storage-origin separation.
The storage tests use fake-indexeddb for transactional failure/refresh/reference checks.
The auth UI test uses synthetic Identity responses in the isolated worker.
These do not verify real Google editor behavior, account access, API reads, or OAuth.
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
- `entrypoints/popup/` opens My maps and explains how to find the Graph button.
- `entrypoints/workspace/` provides the extension-owned editor; `lib/storage/` provides its database and repository.
- The scaffold is merged; Eddy now owns the M1-B edits to `wxt.config.ts`: public manifest key, `identity`, OAuth client/scopes, and required Google API access.
  Rajvansh retains `components/ExtensionShell.tsx` and `assets/shell.css`; dependency changes remain coordinated.

The scaffold handoff is complete through PR #3.
Eddy's M1-B checkpoint `a83d545` is integrated into this review branch as `b98100f`, preserving his implementation.
Rajvansh owns the initial graph/storage contract, personal workspace, and visible auth-state control under the user's explicit implementation request.
Eddy owns Google auth/reads, verified account context, Drive adapters, and background command routing.
M2-B still includes Drive integration; it should reuse the repository rather than building a second storage layer.
See [M1C_HANDOFF.md](./M1C_HANDOFF.md) for the concrete response to Eddy's proposal and adapter example.

M0 and M1-B remain REVIEW until the required second-account acceptance and merge.
M1-C is awaiting Eddy's implementation review.
The manual workspace is implemented; live Drive/Docs graph imports, unavailable-target UI, collapse/resize controls, PDF reading/blob imports, cache cleanup, and GPT generation are not yet complete.
The merger updates STATUS after reviewed shared progress is merged.

The selected stack and official implementation references remain in BUILD_PLAN.
No hosted website is required for the local extension demo.

## Provenance

The lightweight AI workflow and PR template were adapted from `green-business-solution/green-business-solution`.
Product context was curated from the supplied Graph navigation idea notes and the team's clarifications.
No unrelated production code, AWS setup, or source-document opposition sections are included.
