# M1-C proposal: shared graph contract

**Status: proposal, not agreed.** M1-C is a joint task. BUILD_PLAN names `lib/graph/types.ts`
as the file both owners agree together, so that file is deliberately not created yet. This
document exists so the shape can be reviewed on GitHub before anyone writes code against it.

Raised by the M1-B owner after implementing the Drive and Docs reads. The provisional shapes
currently in `lib/messages.ts` are an M1-B implementation detail and are **not** this contract.

## Proposed types

```ts
export const SCHEMA_VERSION = 1;

export type SourceKind = 'drive' | 'docs' | 'pdf';
export type GraphId = `${SourceKind}:${string}`;

/** Where a node actually goes. Navigation never depends on node position. */
export type Locator =
  | { kind: 'drive'; fileId: string; webViewLink?: string }
  | { kind: 'docs'; documentId: string; tabId?: string }
  | { kind: 'pdf'; fingerprint: string; page: number; dest?: string };

/** Regenerated from the source, or authored by the user. Never mixed. */
export type Origin = 'source' | 'personal';

export type GraphNode = {
  id: string;                 // stable; source nodes reuse provider IDs
  title: string;
  type: 'folder' | 'file' | 'document' | 'tab' | 'section' | 'idea';
  origin: Origin;
  parentId?: string;
  locator?: Locator;          // absent on personal idea nodes
  missing?: boolean;          // set by refresh when the target disappeared
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type: 'contains' | 'references' | 'related';
  origin: Origin;
  label?: string;             // user text on personal edges
  provenance?: string;        // required for non-structural edges
};

/** Rebuildable from the API. Safe to evict and refetch. */
export type SourceGraph = {
  schemaVersion: number;
  graphId: GraphId;
  accountKey: string;
  refreshedAt: string;
  nodes: GraphNode[];         // origin: 'source'
  edges: GraphEdge[];         // 'contains' | 'references'
};

/** Never regenerated. Survives refresh for IDs that still exist. */
export type PersonalOverlay = {
  schemaVersion: number;
  graphId: GraphId;
  positions: Record<string, { x: number; y: number }>;
  collapsed: string[];
  notes: Record<string, string>;
  nodes: GraphNode[];         // origin: 'personal'
  edges: GraphEdge[];         // origin: 'personal'
};

export interface SourceAdapter {
  load(sourceId: string): Promise<SourceGraph>;
  refresh(previous: SourceGraph): Promise<SourceGraph>;
  navigate(locator: Locator): Promise<void>;
}
```

## The five decisions worth discussing

1. **Two stores, not one.** `SourceGraph` is disposable; `PersonalOverlay` is not. AGENTS.md
   requires generated structure and personal edits to be stored separately. This is what makes
   Refresh safe: the source half can be thrown away and refetched without risking user work.
2. **`origin` on edges as well as nodes.** Without it, refresh cannot distinguish a real
   `contains` edge from a user-drawn `related` one, and will either destroy personal edges or
   resurrect dead source ones.
3. **`missing: true` instead of deletion.** IDEA.md requires marking broken destinations rather
   than silently reassigning them.
4. **`accountKey`.** The same folder ID under a different Google account is a different graph.
   Without this, one account's cache can be served to another.
5. **`schemaVersion` from the start.** Cheap now, and impossible to retrofit once saved state
   exists on two laptops.

## What this settles for each lane

- **UI:** renders `SourceGraph` and `PersonalOverlay` together; writes only to the overlay
  unless an explicit source action is invoked.
- **Data:** adapters return `SourceGraph`; storage persists the overlay separately and merges
  on refresh, preserving edits for surviving IDs.

## Open questions for the M1-A owner

1. Does this shape work for React Flow, or does the renderer need a flatter node type?
2. V1/V2: M2-A is now "manual graph editor" and M2-B is "manual nodes/edges save and reopen".
   Does M2-B still include the Drive adapter work, or has that moved later? This changes what
   the data lane builds next.
3. Who wires the panel to `AUTH_STATUS` and adds the Connect Google control? The panel is
   M1-A-owned, but BUILD_PLAN step 2 item 5 lists the Connect button under the partner lane.
   The panel currently shows a hardcoded "Google data is not connected yet" string that does
   not reflect real auth state.
