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
    this.on('versionchange', () => this.close());
  }
}
