# Review the current GraphNav experience

Checkpoint: c6d700f on main, including Eddy's proposal-store commit ddf566d.
The current browser UI supports manual source maps and AI suggestion previews.
Accept/edit/reject buttons are not connected to the new proposal store yet.
This is a usability review, not a claim that the full V1/V2 MVP is finished.

## Start with the current extension

Build current main using README if your local production output is older.
In Chrome, open chrome://extensions and click Reload on the existing GraphNav installation.
Then refresh every open Drive and Docs tab; reloading the extension alone leaves stale content scripts in those tabs.
Keep the existing installation to retain saved maps.
Confirm its ID is pidejkbkldalibjaehjfpjkcpjpcenpk and it loads .output/chrome-mv3 from the intended clone.

## Walk through these in order

1. **Choose Drive sources without typing their names.**
   Open My Drive or the shared demo folder, click Graph, and connect Google if requested.
   Under Add existing, select three listed items and choose Add selected.
   Expect only your choices as nodes with names and destinations already filled in.
   Select a source node and use Open destination to check the actual folder or file.
   In a separate map, Build baseline should add the listed structure without an AI request.

2. **Use a graph inside a Doc.**
   Open the shared demo Doc, click Graph, and use New map name/Create map to create Review test.
   Choose two top-level tabs and one nested tab under Add existing, then Add selected.
   Select a tab node and choose Go to tab in this document.
   Expect the original browser tab to reach that exact document tab with the graph on the left.

3. **Make the map your own.**
   Add an idea named Main takeaway.
   Use From, To and Connection label to connect it to two different source nodes with meaningful labels.
   Select a node, change its Label and Notes, then Save changes.
   Drag nodes, try Arrange map, and use Hide tools to inspect readability.
   Expect several connections per node and personal edits without renaming Google files.

4. **Check space and persistence.**
   Try panel width, Float panel, Move, Resize, Dock panel and Reset position.
   Test at normal browser zoom and 125 percent, then type and scroll in the Doc.
   Close/reopen the panel and refresh the source.
   Expect a reachable close button, normal document editing, and the same chosen nodes, notes, connections and dragged positions.
   Selected-only refresh must not add unselected siblings.

5. **Connect the Doc to a PDF.**
   From Review test, choose Add a PDF to this map and open demo/GraphNav-demo-paper.pdf.
   In the reader, select two named sections or pages and choose Add selected.
   Expect those nodes in Review test beside the existing Doc nodes.
   Connect a Doc node to a PDF node, select the PDF node and choose Go to page.
   Follow the Doc node back and check that the same map remains selected.
   The PDF uses the extension's own reader tab; Google Docs should remain usable on its original page.

6. **Judge AI usefulness.**
   Start the local relay as described in relay/README.md.
   If pairing is needed, open GraphNav's toolbar popup, choose AI connection, and use the separate RELAY_TOKEN from your private local configuration.
   In the PDF reader, choose Select content for AI, select two relevant text pages, then Preview selected text.
   Read the preview before choosing Generate with AI.
   Expect suggestions with relationship labels, explanations and See supporting text/Open evidence source controls.
   Check whether at least one connection is useful beyond saying one section contains another, and whether the text supports it.
   The previously verified real request took about 25 seconds; duration and suggestion count can vary.
   Current suggestions remain an unsaved draft and do not add themselves to the graph.

7. **Reopen and back up the manual map.**
   Close/reopen the reader and select the file under Saved PDFs.
   Verify Review test still has its edits and cross-source connection.
   Export backup, then Import backup to make a separate map copy.
   Expect the manual graph and source destinations to survive; keep the original PDF because graph backups exclude its bytes.
   AI decision backup integration remains open.

## What to report

For each step, mark Works, Confusing, or Broken.
For confusion or failure, include the step, what you clicked, what you expected, and what appeared instead.
Screenshots should show the controls and map without private document text or credentials.
Prioritize controls that are hard to find, excessive scrolling, unreadable nodes/labels, wrong destinations, lost edits, and unsupported AI connections.

## Current verification

Rajvansh rebuilt c6d700f with Node 22.23.2 / npm 10.9.9.
Extension and relay typechecks, the production build, and 34 focused tests passed.
These cover proposal storage, manual storage, request validation, installed on-page workflows, and PDF reading.
Installed browser checks use isolated profiles and synthetic Google responses; they do not replace this review in the actual Google interface.
No fresh paid model request or complete-MVP acceptance is claimed by this checkpoint.
