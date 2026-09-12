# GraphNav

A Chrome extension for navigating and organizing Drive folders, Google Docs tabs, and research papers through independent interactive graphs.

**Current state:** the M1-A extension shell is merged and accepted through [PR #3](https://github.com/SchrodingersCatLooks/graphnav/pull/3).
It adds a Graph button and reversible empty panel on My Drive, Drive folders, and Google Docs, plus a toolbar popup with launch instructions.
Google data, interactive source graphs, sign-in, PDFs, and saved state are not implemented in this merged scaffold.
Newer personal-editor/storage/auth work is available for review in [PR #6](https://github.com/SchrodingersCatLooks/graphnav/pull/6); follow [its branch-specific build and acceptance instructions](https://github.com/SchrodingersCatLooks/graphnav/blob/3adc4da/README.md) to test that version.
[TASK_LIST.md](./TASK_LIST.md) tracks the next work; [STATUS.md](./STATUS.md) records the merged result and M1-B handoff.

**Release order:** V1 provides manual graph creation/editing, source navigation, and saving.
V2 adds GPT-assisted drafts with evidence and accept/edit/reject controls.
Both remain planned beyond the current shell on main, with partial implementation on the review branches.
The shared target includes assisted manual creation, editable source baselines without GPT, and V2 evidence-backed generation.

**Acceptance:** the full second-machine checklist passes after correctly reloading the extension and Google tabs.
Eddy corrected his earlier clipping/zoom report because a stale content script was still running.
The accepted code includes the popover/visualViewport fix; both-laptop acceptance is recorded.
See [TASK_LIST.md](./TASK_LIST.md#m1-a-second-machine-acceptance).

**Shared implementation plan:** [BUILD_PLAN.md](./BUILD_PLAN.md) gives the 15-step order, tools, exact instructions for Rajvansh and Eddy, dependencies, and acceptance gates.
[FEATURE_SPEC.md](./FEATURE_SPEC.md) defines the use cases and contracts, and [TASK_LIST.md](./TASK_LIST.md) lists the corresponding owner/status rows in execution order.
The code-freeze target is 6 AM and submission is 4 PM on September 12, local Eastern time; the plan includes rest and pitch preparation.
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

For a new local copy of the merged scaffold:

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

These steps require each teammate's laptop and a Google account with access to the demo folder and Doc.
No GraphNav OAuth setup is needed to test this empty shell.

1. Run the build commands above.
2. Type `chrome://extensions` into Chrome's address bar.
3. Turn on **Developer mode**, click **Load unpacked**, and select the clone's **`.output/chrome-mv3`** folder, not the repository root or the outer `.output` folder.
   On macOS, press **Command+Shift+G** in the folder picker and enter the complete path if the hidden `.output` folder is not visible.
4. Confirm **GraphNav 0.1.0** is enabled and has no extension errors.
   Open Chrome's puzzle-piece menu and click GraphNav to check its instructions popup.
5. Open [My Drive](https://drive.google.com/drive/my-drive), sign in if needed, and refresh the page after installing the extension.
   Click **Graph** at the bottom right.
   Expect a panel labeled **My Drive**, **Interface preview**, and **Google data is not connected yet**.
6. Close it with **X**, open it again, and press **Escape** while focus is inside the panel.
   The panel should close and keyboard focus should return to the Graph button.
   The Graph button also toggles the panel.
7. Open a real Drive folder and repeat.
   Expect **Drive folder** in the header, one Graph button, and no changes to your files.
   When changing folders without reloading, the panel closes so you can open it for the new folder.
8. Open an existing Google Doc at a URL containing `/document/d/` or `/document/u/0/d/` and refresh it.
   Open Graph and expect **Google Docs** and **Your document map starts here**.
   Close the panel and verify ordinary typing, selection, and scrolling in an authorized test Doc.
9. Narrow the window or increase Chrome zoom and confirm the panel header stays above Google's toolbar, the Graph and close buttons remain fully visible, and panel content scrolls when needed.
   Open an unrelated website and confirm it has no Graph button.
10. Both teammates should report the commit tested, Chrome version, Drive/Docs results, and any errors in the PR before M1-A is marked DONE.

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

# Type-check, production build, and all six browser tests:
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

The scaffold handoff is complete through PR #3.
Bring main into each working branch while preserving local changes; continue reviewing and merging subsequent slices through PRs.
M1-B adds the background worker, Chrome Identity, a stable public manifest key, and suitable API permissions in his M1-B slice.
Those settings are deliberately absent from M1-A.
Use Eddy's [GOOGLE_SETUP.md at 9f68af6](https://github.com/SchrodingersCatLooks/graphnav/blob/9f68af6/GOOGLE_SETUP.md) for the public configuration values.
After adding the key, both laptops must verify the installed extension ID is `pidejkbkldalibjaehjfpjkcpjpcenpk`.
Eddy reports the shared folder and nested-Doc reads/imports working on partner-data; Rajvansh's complete own-account acceptance remains open.
M1-C review uses the implemented contract linked from M1C_HANDOFF; React Flow/Dexie are present on the review branch, while ELK and PDF.js integration remain planned.
None of that branch runtime is added to main by publishing the plan.
The merger updates STATUS with verified shared progress after review and brings main into both working branches.

The selected stack and official implementation references are in FEATURE_SPEC, with implementation order in BUILD_PLAN.
Manual maps need no AI server; the planned V2 workflow requires the local model relay described there.

## Provenance

The lightweight AI workflow and PR template were adapted from `green-business-solution/green-business-solution`.
Product context was curated from the supplied Graph navigation idea notes and the team's clarifications.
No unrelated production code, AWS setup, or source-document opposition sections are included.
