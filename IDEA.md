# GraphNav product context

GraphNav is a Chrome extension that lets people create and edit interactive maps for navigation, planning, and organization.
People can start their own map as they work or generate a map from existing information and then edit it.
A source-backed node opens something real: a folder, file, document tab, or paper section.
Personal idea and note nodes can exist before they have a source destination.
Source information stays in its original application.

This file preserves the useful product material from the attached **Graph navigation idea notes**, including its Applications and Caching screenshots, together with the team's clarifications in this conversation. Opposition sections and rebuttal discussions are omitted. The source document is unchanged. Implementation choices and tonight's limits are recorded separately below and in [BUILD_PLAN.md](./BUILD_PLAN.md).

## The idea

Folders and tabs describe where information is stored. People also understand information through relationships: a section can connect to several other sections, and an idea can belong in several contexts. Offer another way to explore and organize that information without requiring people to move their work into a new editor.

The primary job is navigation and organization. A graph is useful when it helps someone find the right place, understand the structure, or preserve a useful connection. It must have working destinations, readable labels, and a focused view. Node proximity alone does not define a relationship.

Suggested pitch: **Turn the information you already use into a map you can navigate and organize.** The differentiation to demonstrate is working inside existing applications and on existing files. Do not claim graph interfaces themselves are new.

## Product versions

**Current decision: complete the initial V1 manual workflow, then deliver V2 GPT-assisted graph generation in the same MVP effort.**
The user explicitly wants the complete route through V2 by the 6 AM code-freeze target on September 12, ahead of a 4 PM local Eastern submission.
V2 is required by that target but is not yet implemented.
Both versions use the same graph, source navigation, and persistence system.
The timeboxes and explicit fallback decision points are in BUILD_PLAN.

| Version | User experience | Role of automation |
| --- | --- | --- |
| V1 Manual graph | Start a personal graph or import a source outline; add source-linked nodes and idea nodes, connect them, label/edit/remove personal relationships, arrange the view, navigate, and save | APIs and PDF parsing may import real structure and source destinations. People create the meaningful conceptual connections. No model is required. |
| V2 Generate a draft | Select content, request a generated draft, inspect proposed concepts/relationships and their supporting passages, accept/edit/reject them, then navigate and save | GPT proposes an editable graph over selected content. It does not replace the graph editor or silently establish relationships as facts. |

Manual does not mean retyping every folder and tab. Automatically importing containment or explicit source links is compatible with V1. The distinguishing V1 completion check is a user-created idea and labeled relationship that can be edited, reopened, and followed to a real source. Source nodes retain provider titles/IDs; personal display labels do not rename original files.

A user can remove personal nodes/edges or hide source items from a view. Those actions never delete the original source. Source mutations such as creating a folder or renaming a Doc tab remain separate explicit actions with permission checks.

## What makes the product useful beyond generation

The product's lasting value comes from its source integrations, exact navigation destinations, an editable visual workspace, and saved user-authored relationships. V1 must be useful while generation is unavailable. V2 speeds up getting to a useful draft; switching model providers should not require replacing the editor, graph format, or saved work. A generated summary or diagram alone is not the complete experience.

V2 follows this sequence: select a bounded set of supported sources, extract content with stable passage/page/tab references, generate structured proposals, verify cited passages and targets against the input, present evidence for review, then save accepted edits separately from future generated drafts. Distinguish source nodes from idea nodes, and imported structure from manual, AI-suggested, and AI-accepted relationships. Verifying that an excerpt exists does not prove the model's interpretation is correct; the user must be able to inspect it.

Start V2 with one selected text-based Doc or PDF before expanding to collections of selected files. Drive metadata alone cannot establish semantic relationships; selected documents need readable content and appropriate access. Independent graphs remain supported, and cross-source analysis is limited to what the user selects.

## One extension with three experiences

### Two ways to start, one editable graph

Both starting options are part of the intended product:

1. **Create your own map:** start with an empty personal graph, add idea or note nodes, and connect them while planning or working on a project.
   Add source destinations when there is something real to open.
   Creating a personal map does not require existing Drive files or a PDF.
2. **Generate from existing content:** choose an accessible Drive folder, Google Doc, or local PDF and let GraphNav create its starting nodes, structure, and navigation destinations.
   Then rearrange the map and add personal notes, concept nodes, and connections.

These are starting choices, not separate products or permanently locked modes.
Both lead to the same editable graph controls and saved personal state.
Explore and Build describe the controls currently shown, independently of how the graph was first created.

Both manual creation and generated editable maps belong to the intended product.
V1 may import source structure such as folders, tabs, and PDF section anchors while users create meaningful connections.
V2 adds the content analysis and proposed concepts/relationships described above; structural imports alone do not fulfill that generation stage.

The manual workspace foundation exists on the review branch; source-page integration and generation remain open tasks.
Use TASK_LIST for current evidence and STATUS for what is merged.

### Supported source experiences

| Surface | Explore existing content | Build and organize |
| --- | --- | --- |
| Google Drive | Open a graph for the current folder, expand children, and open files | Add a folder; later support explicit move and organization actions |
| Google Docs | Map tabs and nested tabs, then jump to the exact tab | Add and rename tabs; later support more structural editing |
| Research paper | Open a PDF in our reader, generate its section map, and jump to a section or page | Add personal notes, concept nodes, and connections; authors can plan ideas alongside the paper |

Each folder, document, or paper can have its **own independent graph**. A paper does not have to be connected to Drive or other papers. Cross-document connections are an optional extension of the idea.

Authors can use graphs to plan and organize their own material. Readers can generate and use graphs for other people's accessible content even when the original author has never installed GraphNav. For PDFs, planning and annotations live in our personal graph; editing the original manuscript stays in its source editor.

**Explore mode** prioritizes expanding, focusing, previewing, and opening nodes. **Build mode** exposes personal graph editing and the source actions the user is actually allowed to perform. Selecting Build mode does not grant access to someone else's files. A dragged node changes its visual position; an explicit source action changes a real folder or document.

## Interaction rules

- Keep a persistent Graph button on supported pages.
  Opening the map is optional; closing it restores the normal interface.
- The primary Drive and Docs workflow runs inside the existing source page.
  In Docs, place the graph on the left while the original document stays editable and tab-node clicks navigate within that document.
  The separate My maps workspace remains an optional place for personal maps, not a required detour for source navigation.
- Use the same graph controls across Drive, Docs, and the PDF reader: expand/collapse, focus, zoom, search, select, and open.
- Selecting a node shows its label, type, and available details. Do not require generated summaries for previews.
- A document tab opens that tab. A paper section opens its real page or destination. A folder expands its children or opens in Drive.
- Start with a local neighborhood and expand on demand. Keep a simple outline/list fallback available as scope allows.
- Distinguish `contains`, explicit `references`, and personal labeled relationships such as `related`, `supports`, or `addresses`. Store a short explanation and origin separately from the relationship label; a manual label records the user's interpretation.
- Let users add, rename, edit, and remove personal concept/note nodes and connections. They may have no source destination; label them accordingly and allow attachment to real source nodes. Do not present a personal label change as renaming a source file.

## How the extension works

The user installs one extension. On supported Drive and Docs pages, a small part of the extension adds the Graph button and reversible panel. It uses the current page's source identity to ask the appropriate adapter for data. An adapter is simply the code that translates one application's structure into our common nodes and edges.

1. **Drive:** after Google authorization, the Drive API supplies folder/file metadata. Start with the current folder and load its children when expanded. No ZIP export or screenshot reading is needed.
2. **Docs:** after Google authorization, the Docs API supplies tabs, nested tabs, identifiers, and content. The graph retains the exact tab destination and opens it in the existing editor.
3. **Paper:** the user opens a local PDF in the extension's own reader. PDF.js reads the file and supplies pages, text positions, and bookmarks where present. Those become section nodes with page destinations. Opening a remote paper directly is a later convenience, not a requirement for the initial demo.

React Flow displays the common graph, while ELK calculates initial positions. The user can then move nodes, focus on a neighborhood, open source destinations, and add personal connections. A background component handles Google authorization and API requests. Saved graph state belongs to the extension, separately from the original file.

This is a local Chrome prototype, with GitHub sharing the team's source code. A separate hosted platform is not necessary for the basic product. Existing source APIs provide the content; the extension provides the alternative interface. Supporting another company's management website later requires another adapter and appropriate access, not a universal screen reader.

The scope boundary is practical: tab and folder creation can change the real source through authorized APIs; a personal PDF graph changes only our saved annotations. Native document writing stays in Google Docs or the author's usual editor.

## How it becomes a lasting part of the user's workflow

1. **Start:** create an empty personal map, or read the selected source through its API or PDF data and generate the initial graph.
2. **Save:** cache the source structure plus personal layout, notes, and connections.
3. **Reopen:** restore the saved graph by its stable graph ID and, for a generated map, its source and account context.
   Do not rebuild it from scratch on every click.
4. **Personal edit:** autosave changes to layout, labels, notes, and connections.
5. **Refresh:** read the source again and update generated nodes while preserving personal edits for surviving source IDs. Mark missing destinations instead of silently reassigning them.

For the MVP, Refresh is manual and the interface shows when data was last refreshed.
Cache is scoped by source and Google account.
Google source access must still be authorized; a cached graph does not grant new access.
Graph records and saved PDF bytes belong in extension-owned IndexedDB through Dexie, with small panel preferences separate.
Local data survives browser restarts but is not team sync or a permanent cloud backup, and uninstalling the extension can remove it.

## Tonight's concrete target

The complete hackathon MVP now includes V1 and V2: one installed extension with manual editing, on-page Drive/Docs navigation, grounded AI draft review, persistent personal work, and one text-based PDF experience.
First prove the full manual cycle on the Google surfaces: import or attach a source, add an idea, connect and label it, edit/remove personal items, follow a destination, save, reopen, and refresh without losing edits.
Then prove selected-Doc generation with inspectable evidence, accept/edit/reject, and preserved decisions; reuse that path for PDF text.
PDF remains in the complete target, but an explicit user-approved scope reduction can prioritize a working Drive/Docs/AI demo if the deadline is missed.
Real source creation actions remain a later extension of the MVP.

For PDF extraction, embedded bookmarks are the first choice. Otherwise extract text with page positions, propose heading anchors, and allow correction. A manually corrected section is not an automatically understood argument. Full argument extraction, citation discovery, and arbitrary scanned PDFs are later work.

AI coding assistants help implement both versions.
Begin the V2 implementation after the initial V1 on-page manual acceptance gate; it does not wait for every PDF feature or cosmetic improvement.
Do not silently defer V2 or describe an unimplemented generator as working.

## Decisions and later possibilities

| Topic in the notes | Current decision |
| --- | --- |
| Mermaid with ELK | React Flow for interaction and ELK for layout; Mermaid is not the runtime UI |
| Local text editor | Use the existing Google editor and an extension-owned PDF reader; a full editor is outside tonight's scope |
| Other management websites | Future adapters can translate their content into the same graph format; each needs its own integration |
| Papers as sections, ideas, arguments, references | Start with section/page navigation and personal idea connections; add deeper extraction later |
| Author organization | Start with folder creation and Doc tab actions; defer drag-to-move, deletion, and broad restructuring |
| Manual meaningful connections | Core V1, including editable labels, idea nodes, and source attachments |
| GPT-assisted concepts and relationships | Required in the current MVP target, with source evidence, review, and preserved edits; implementation remains open |
| Cross-source links | Supported as a future selected-scope option; no forced universal graph |

The concept-map pictures are visual inspiration. Their example subject matter is not part of the product requirements.
