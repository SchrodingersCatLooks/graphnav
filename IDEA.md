# GraphNav product context

GraphNav is a Chrome extension that lets people navigate and organize existing information through interactive graphs. A node opens something real: a folder, file, document tab, or paper section. Information stays in its original application.

This file preserves the useful product material from the attached **Graph navigation idea notes**, including its Applications and Caching screenshots, together with the team's clarifications in this conversation. Opposition sections and rebuttal discussions are omitted. The source document is unchanged. Implementation choices and tonight's limits are recorded separately below and in [BUILD_PLAN.md](./BUILD_PLAN.md).

## The idea

Folders and tabs describe where information is stored. People also understand information through relationships: a section can connect to several other sections, and an idea can belong in several contexts. Offer another way to explore and organize that information without requiring people to move their work into a new editor.

The primary job is navigation and organization. A graph is useful when it helps someone find the right place, understand the structure, or preserve a useful connection. It must have working destinations, readable labels, and a focused view. Node proximity alone does not define a relationship.

Suggested pitch: **Turn the information you already use into a map you can navigate and organize.** The differentiation to demonstrate is working inside existing applications and on existing files. Do not claim graph interfaces themselves are new.

## One extension with three experiences

| Surface | Explore existing content | Build and organize |
| --- | --- | --- |
| Google Drive | Open a graph for the current folder, expand children, and open files | Add a folder; later support explicit move and organization actions |
| Google Docs | Map tabs and nested tabs, then jump to the exact tab | Add and rename tabs; later support more structural editing |
| Research paper | Open a PDF in our reader, generate its section map, and jump to a section or page | Add personal notes, concept nodes, and connections; authors can plan ideas alongside the paper |

Each folder, document, or paper can have its **own independent graph**. A paper does not have to be connected to Drive or other papers. Cross-document connections are an optional extension of the idea.

Authors can use graphs to plan and organize their own material. Readers can generate and use graphs for other people's accessible content even when the original author has never installed GraphNav. For PDFs, planning and annotations live in our personal graph; editing the original manuscript stays in its source editor.

**Explore mode** prioritizes expanding, focusing, previewing, and opening nodes. **Build mode** exposes personal graph editing and the source actions the user is actually allowed to perform. Selecting Build mode does not grant access to someone else's files. A dragged node changes its visual position; an explicit source action changes a real folder or document.

## Interaction rules

- Keep a persistent Graph button on supported pages. Opening the map is optional; closing it restores the normal interface.
- Use the same graph controls across Drive, Docs, and the PDF reader: expand/collapse, focus, zoom, search, select, and open.
- Selecting a node shows its label, type, and available details. Do not require generated summaries for previews.
- A document tab opens that tab. A paper section opens its real page or destination. A folder expands its children or opens in Drive.
- Start with a local neighborhood and expand on demand. Keep a simple outline/list fallback available as scope allows.
- Distinguish `contains`, explicit `references`, and personal `related` connections. A personal connection can carry a short explanation.
- Concept or note nodes may be personal annotations with no source destination. Label them accordingly and attach them to real source nodes.

## How the extension works

The user installs one extension. On supported Drive and Docs pages, a small part of the extension adds the Graph button and reversible panel. It uses the current page's source identity to ask the appropriate adapter for data. An adapter is simply the code that translates one application's structure into our common nodes and edges.

1. **Drive:** after Google authorization, the Drive API supplies folder/file metadata. Start with the current folder and load its children when expanded. No ZIP export or screenshot reading is needed.
2. **Docs:** after Google authorization, the Docs API supplies tabs, nested tabs, identifiers, and content. The graph retains the exact tab destination and opens it in the existing editor.
3. **Paper:** the user opens a local PDF in the extension's own reader. PDF.js reads the file and supplies pages, text positions, and bookmarks where present. Those become section nodes with page destinations. Opening a remote paper directly is a later convenience, not a requirement for the initial demo.

React Flow displays the common graph, while ELK calculates initial positions. The user can then move nodes, focus on a neighborhood, open source destinations, and add personal connections. A background component handles Google authorization and API requests. Saved graph state belongs to the extension, separately from the original file.

This is a local Chrome prototype, with GitHub sharing the team's source code. A separate hosted platform is not necessary for the basic product. Existing source APIs provide the content; the extension provides the alternative interface. Supporting another company's management website later requires another adapter and appropriate access, not a universal screen reader.

The scope boundary is practical: tab and folder creation can change the real source through authorized APIs; a personal PDF graph changes only our saved annotations. Native document writing stays in Google Docs or the author's usual editor.

## How it becomes a lasting part of the user's workflow

1. **First open:** read the current source through its API or PDF data and generate the initial graph.
2. **Save:** cache the source structure plus personal layout, notes, and connections.
3. **Reopen:** recognize the same source and restore the saved graph. Do not rebuild it from scratch on every click.
4. **Personal edit:** autosave changes to layout, labels, notes, and connections.
5. **Refresh:** read the source again and update generated nodes while preserving personal edits for surviving source IDs. Mark missing destinations instead of silently reassigning them.

For tonight, Refresh is manual and the interface shows when data was last refreshed. Cache is scoped by source and Google account. Google source access must still be authorized; a cached graph does not grant new access. Graph metadata lives in extension local storage; saved PDF bytes live in IndexedDB. Local data survives browser restarts but is not team sync or a permanent cloud backup, and uninstalling the extension can remove it.

## Tonight's concrete target

One installed extension demonstrates a real Drive folder graph, a real tabbed Doc graph, and one text-based paper map. All reuse the same graph component. Show accurate navigation, focus, one saved personal connection, reopening, and at least one real source creation action if authorization is working.

For PDF extraction, embedded bookmarks are the first choice. Otherwise extract text with page positions, propose heading anchors, and allow correction. A manually corrected section is not an automatically understood argument. Full argument extraction, citation discovery, and arbitrary scanned PDFs are later work.

AI coding assistants help build the application. Product AI is optional: later, suggest a few connections with supporting passages and require acceptance before storing them as personal edges.

## Decisions and later possibilities

| Topic in the notes | Current decision |
| --- | --- |
| Mermaid with ELK | React Flow for interaction and ELK for layout; Mermaid is not the runtime UI |
| Local text editor | Use the existing Google editor and an extension-owned PDF reader; a full editor is outside tonight's scope |
| Other management websites | Future adapters can translate their content into the same graph format; each needs its own integration |
| Papers as sections, ideas, arguments, references | Start with section/page navigation and personal idea connections; add deeper extraction later |
| Author organization | Start with folder creation and Doc tab actions; defer drag-to-move, deletion, and broad restructuring |
| Cross-source links and inferred links | Optional after navigation, persistence, and the demo work |

The concept-map pictures are visual inspiration. Their example subject matter is not part of the product requirements.
