import { Dexie, type Table } from 'dexie';
import type { Graph, GraphNode, Relationship, Source, ItemEdit, LayoutItem, SourceCache, StoredBlob, ProposalDecision, UndoEntry } from '../graph/types';

// Open only in an extension-owned page or service worker. Content scripts use
// the worker API after the M1-B handoff; never import this into a Google page.
export class GraphDatabase extends Dexie {
  graphs!: Table<Graph, string>;
  sources!: Table<Source, string>;
  nodes!: Table<GraphNode, string>;
  relationships!: Table<Relationship, string>;
  itemEdits!: Table<ItemEdit, [string, string, string]>;
  layoutItems!: Table<LayoutItem, [string, string, string]>;
  sourceCache!: Table<SourceCache, string>;
  blobs!: Table<StoredBlob, string>;
  proposalDecisions!: Table<ProposalDecision, [string, string]>;
  undoEntries!: Table<UndoEntry, number>;

  constructor(name = 'graphnav') {
    super(name);
    // Preserve version 1. Future changes add a version and a tested upgrade;
    // never delete a user's database to handle an upgrade error.
    this.version(1).stores({
      graphs: 'id, accountScope, updatedAt',
      sources: 'id, &sourceKey, [provider+accountKey]',
      nodes: 'id, graphId, sourceId, &[graphId+importKey]',
      relationships: 'id, graphId, *memberNodeIds, &[graphId+importKey], [graphId+scopeKey]',
      itemEdits: '[graphId+itemType+itemId], graphId',
      layoutItems: '[graphId+itemType+itemId], graphId',
      sourceCache: 'id, &[sourceId+sourceVersion+chunkKey], lastAccessedAt',
      blobs: 'id',
    });

    // Version 2 adds the proposal decision store for G3-B. It only adds a table,
    // so every existing record is untouched and no upgrade function is needed.
    // A user's maps and saved PDFs survive this exactly as they were.
    this.version(2).stores({
      proposalDecisions: '[graphId+proposalKey], graphId, decision',
    });

    // Version 3 adds the undo journal. Another additive table, so saved maps,
    // decisions and stored PDFs are untouched and no upgrade step is needed.
    this.version(3).stores({
      undoEntries: '++seq, graphId, [graphId+seq]',
    });

    /**
     * Version 4 gives suggestions accepted before destinations existed the
     * destination they always had the evidence for.
     *
     * The canvas shows a node's Open control only when the node itself carries
     * a locator. Accepted suggestions stored their cited passages but no
     * locator of their own, so a map built earlier shows ideas that cannot be
     * traced back to the page they came from, and no amount of reloading fixes
     * it — the record is simply missing a field. Regenerating would work but
     * costs the user the map they already arranged.
     *
     * This changes no table, only fills a gap from data already present, and
     * touches a node only when it is generated, has evidence, and has no
     * destination yet. Anything else is left exactly as it is.
     */
    this.version(4).upgrade(async (transaction) => {
      const nodes = transaction.table<GraphNode, string>('nodes');
      for (const node of await nodes.toArray()) {
        if (node.origin !== 'generated' || node.locator || !node.evidence?.length) continue;
        const [destination] = node.evidence;
        if (!destination) continue;
        await nodes.put({ ...node, sourceId: destination.sourceId, locator: destination.locator });
      }
    });
    this.on('versionchange', () => this.close());
  }
}
