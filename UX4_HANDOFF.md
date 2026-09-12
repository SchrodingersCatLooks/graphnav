# UX4 editor interaction handoff

Owner: Rajvansh, rajvansh-ui, starting from main b73fa8d.
The user's current request authorizes these UI changes and the necessary storage support.
Eddy retains AI proposal decisions, acceptance and decision backup integration.

## Required behavior

1. One Add dropdown contains new personal ideas and a scrollable, searchable source tree.
   Clicking a source row adds it immediately or focuses its existing node; its arrow only browses children.
   Drive folder and recognized Google Doc contents load on expansion; nested tabs retain their hierarchy.
   Name search ranks exact, prefix and close matches within loaded source choices without crawling Drive.
2. The editor expands after a graph is chosen, with minimize, pointer/keyboard resize and fullscreen controls.
   Remember the normal rectangle independently of temporary fullscreen and compact launcher states.
3. React Flow NodeResizer supports card corner resizing and drag layout.
   Card clicks select; a separate Open action navigates the original source.
   Larger graphs use smaller default cards and omit secondary details; explicit saved card sizes win.
4. Enlarge invisible connection handles, highlight candidate destinations, and use a generous connection radius.
   Support handle dragging and click-then-click connections.
5. A new line starts without a required label and offers Add label.
   Clicking the line or tag opens an EdgeToolbar popup with connected names, presets, free text, Done/Enter, Escape, Remove label, Reverse direction and No arrow.
   EdgeLabelRenderer places interactive pills at the computed path midpoint.
6. Keep the existing saved-graph chooser behavior; remove its New Graph action.
   New Graph remains in the compact launcher.

## Additive storage seam

Reuse relationship baseLabel, kind, members, stable IDs and existing timestamps.
Containment/reference/personal kind remains independent of React Flow's renderer type.
Allow an empty relationship label, while node titles remain required.
Add optional relationshipKind and direction metadata to relationship presentation overrides in itemEdits.
Direction overrides use forward/reverse/none relative to the stable base member ordering; source member IDs and containment are not rewritten by UI direction edits.
A dedicated validated saveConnection operation merges these fields with existing notes/hidden overrides and increments the graph content revision atomically.
Imported relationships retain their immutable base information through refresh.
Add optional width/height to layoutItems and the existing position-saving operation; preserve them on later position saves and arrangement.
Old records and old backups without these fields retain their current behavior.
No new database table or index is needed, and no proposal decision or acceptance code should be rewritten.
Publish the exact final contract and test evidence after implementation.

## Verification

Use isolated installed Chromium profiles, synthetic Google responses and authored PDF bytes.
Prove lazy browsing does not add nodes, clicking rows adds once, and already-added rows focus the node.
Create a custom label, move and resize nodes, reverse or remove the arrow, reopen, refresh and export/import.
Verify label, size, positions and stable IDs survive; Remove label leaves the line intact.
Test cancellation, readable popup controls at zoom, narrow viewports, fullscreen restoration and ordinary source navigation.
Run extension/relay typechecks, production build, meaningful storage and browser tests, then merge normally and update main documentation.
