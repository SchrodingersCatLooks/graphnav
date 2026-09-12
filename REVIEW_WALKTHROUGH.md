# Review the current GraphNav experience

The [PR #16 checkpoint](https://github.com/SchrodingersCatLooks/graphnav/pull/16) addresses the reported Drive Home, contextual overlay, navigation, connection editing and crowded-control problems.
The on-page editor now starts with its graph visible and opens one focused tool drawer at a time.
AI generation still returns a preview; the accept/edit/reject UI is the separate open G3-A task.
This is not full V1/V2 MVP acceptance.

## Load the current build

Build current main using README if your local production output is older.
In Chrome, open chrome://extensions and click Reload on the existing GraphNav installation.
Then refresh every open Drive and Docs tab.
Reloading the extension alone leaves stale content scripts in those tabs.
Keep the existing installation to retain saved maps, and confirm its ID is pidejkbkldalibjaehjfpjkcpjpcenpk.
The extension folder is .output/chrome-mv3 inside the intended clone.

## Check the reported problems first

1. **Drive Home and folders.**
   Open Drive Home and click Graph.
   Connect Google if requested.
   Expect a My Drive root map with names and destinations filled in automatically, without GPT.
   Home does not mirror Google's suggested/shared feed.
   Open a real folder, including from Recent or Shared with me, and expect its source map without the old panel-state error.

2. **A useful fixed overlay.**
   Keep the graph open and click a folder node's title.
   Expect that folder in the same browser tab, the overlay still open, and that folder's own map.
   Go back and expect the previous map with your edits.
   If a personal project such as gg is selected, click This page for the current source's cached map.
   More still lets you choose your personal project again.

3. **Connect and edit with little effort.**
   Click Connect on one node and then Connect on another.
   A connection appears and its label editor opens.
   Give it a useful label, Save changes, and close the drawer with its X.
   Click the connection label to edit it again.
   Add idea creates a personal node in clear space; Edit on a node opens its label and notes.
   Arrange map helps with existing crowded layouts while preserving dragged pins.

4. **Navigate inside a Doc.**
   Open a Doc and click Graph.
   Expect its graph on the left, with the canvas taking most of the panel.
   Click a top-level or nested tab node's title and expect that exact tab in the same browser tab.
   Type and scroll in the Doc while the panel is open, then try normal and increased browser zoom.
   Close and panel controls must remain reachable.

5. **Change the connected account and check saving.**
   Open Google account to see the connected account when Google supplies its label.
   Change Google account clears the extension's cached sign-in and starts Google sign-in again; Disconnect Google disconnects it.
   Chrome controls account selection and may require a different Chrome profile for another account.
   Saved maps stay on this laptop and Google maps are filtered by their account.
   Reopen the panel, reload the page and return to the same account to verify notes, connections and positions remain.

## Where the less frequent actions moved

- Sources: existing-file/tab/section suggestions, selected imports, baseline creation and Refresh source.
  Use Start a blank map instead if you want to choose every member yourself.
- More: choose or create maps, add a PDF to the current map, and export/import a backup.
- Map options: focus, collapse, larger-map pages and destination checks.
- Panel settings: width, dock side, floating placement and reset.
- AI: selected-content preview and generation controls in Docs and the PDF reader.

## Check PDFs and AI after the overlay

Under More, choose Add a PDF to this map and open demo/GraphNav-demo-paper.pdf.
In the reader, use Sources to select sections or build the listed outline, then close the drawer.
Click source nodes to navigate to exact pages or section markers, and connect a Doc node with a PDF node.
Following a Doc or PDF destination retains the chosen project map.
Export/import under More creates a separate graph copy; keep the original PDF because graph backups exclude its bytes.

Start the local relay as described in relay/README.md.
If needed, use GraphNav's toolbar popup, AI connection and the separate RELAY_TOKEN to pair it.
Open AI, choose Select content for AI, select relevant Doc tabs or PDF pages, then Preview selected text.
Review the text before Generate with AI.
Inspect suggested concepts and connections through See supporting text and Open evidence source.
The previously verified real request took about 25 seconds; duration and suggestion counts vary.
Generated suggestions remain an unsaved draft until G3-A is integrated.
AI decision backup integration also remains open.

## What to report

Mark each of the five checks Works, Confusing or Broken.
For a problem, include what you clicked, what you expected and what appeared instead.
Prioritize wrong destinations, missing current-page maps, unreadable or overlapping nodes, excessive controls and lost edits.
Screenshots should show the map and controls without private document text or credentials.

## Verification boundary

The changed flows are exercised in an installed production extension in isolated Chromium profiles with synthetic Google responses.
The PDF checks use actual authored PDF bytes, and the AI flow uses a local test provider.
These checks cover browser restart, cached maps, same-tab navigation, two-click relationships, account switching, backup and host-editing regressions.
The exact final check count and merged commit are recorded in STATUS and TASK_LIST.
No new paid model request or new live Google-account acceptance is claimed by this checkpoint.
