import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { GraphDatabase } from '../lib/storage/database';
import { GraphRepository } from '../lib/storage/repository';
import { applyProposals, listDecisions, recallDecisions } from '../lib/storage/proposals';
import { keyProposals } from '../lib/generation/proposal-key';
import type { GraphDraft, SourcePassage } from '../lib/generation/types';

let db: GraphDatabase;
let repo: GraphRepository;
test.beforeEach(() => { db = new GraphDatabase('graphnav-proposals-' + crypto.randomUUID()); repo = new GraphRepository(db); });
test.afterEach(async () => { await db.delete(); });

const HASH = 'a'.repeat(64);

const passages: SourcePassage[] = [{
  passageId: 't.0:0',
  sourceId: 'google-docs:acct:doc-1',
  accountKey: 'acct',
  version: 'rev-1',
  locator: { kind: 'docs', documentId: 'doc-1', tabId: 't.0' },
  heading: 'Background',
  text: 'Wayfinding failures cluster at a small number of junctions.',
  charCount: 59,
}];

const draft = (over: Partial<GraphDraft> = {}): GraphDraft => ({
  draftVersion: 1,
  inputHash: HASH,
  nodes: [{
    tempId: 'n1', label: 'Decision points explain failures', kind: 'idea',
    rationale: 'Stated in Background.', evidencePassageIds: ['t.0:0'],
  }],
  relationships: [],
  ...over,
});

async function newGraph(title = 'Paper map') {
  const graph = await repo.createGraph(title, crypto.randomUUID(), 'import');
  return graph;
}

test('an accepted proposal is stored as generated, with the evidence it came from', async () => {
  const graph = await newGraph();
  const result = await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  expect(result.acceptedNodeIds).toHaveLength(1);

  const snapshot = await repo.readGraph(graph.id);
  const node = snapshot.nodes.find((n) => n.id === result.acceptedNodeIds[0])!;

  // Not 'manual': the record remembers a model suggested it.
  expect(node.origin).toBe('generated');
  expect(node.baseLabel).toBe('Decision points explain failures');
  // And remembers what it was based on, including where to look.
  expect(node.evidence).toHaveLength(1);
  expect(node.evidence[0]!.quote).toContain('cluster at a small number of junctions');
  expect(node.evidence[0]!.locator).toEqual({ kind: 'docs', documentId: 'doc-1', tabId: 't.0' });
  expect(node.evidence[0]!.sourceVersion).toBe('rev-1');
});

test('an edited label is what gets stored, not what was proposed', async () => {
  const graph = await newGraph();
  const result = await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1', label: 'Junction branching drives failure' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes.find((n) => n.id === result.acceptedNodeIds[0])!.baseLabel)
    .toBe('Junction branching drives failure');

  const decisions = await listDecisions(db, graph.id);
  expect(decisions[0]!.acceptedLabel).toBe('Junction branching drives failure');
});

test('decisions survive regeneration, so nothing is re-offered or duplicated', async () => {
  const graph = await newGraph();
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  // Regeneration: same suggestion, entirely different temporary IDs.
  const regenerated = draft({
    nodes: [{
      tempId: 'totally-different-id', label: 'Decision points explain failures', kind: 'idea',
      rationale: 'Reworded explanation from a second run.', evidencePassageIds: ['t.0:0'],
    }],
  });

  const prior = await recallDecisions(db, graph.id, regenerated);
  expect(prior.nodes.get('totally-different-id')?.decision).toBe('accepted');

  // Accepting it again reuses the existing record instead of duplicating.
  let snapshot = await repo.readGraph(graph.id);
  const again = await applyProposals(db, {
    graphId: graph.id, revision: snapshot.graph.contentRevision, draft: regenerated, inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'totally-different-id' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  expect(again.alreadyAccepted).toBe(1);
  expect(again.acceptedNodeIds).toHaveLength(0);
  snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(1);
});

test('a rejection is remembered, so a later draft can stop showing it', async () => {
  const graph = await newGraph();
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [], acceptRelationships: [],
    rejectNodeTempIds: ['n1'], rejectRelationshipTempIds: [],
  });

  const snapshot = await repo.readGraph(graph.id);
  // Rejecting creates nothing.
  expect(snapshot.nodes).toHaveLength(0);

  const prior = await recallDecisions(db, graph.id, draft({
    nodes: [{ tempId: 'fresh-id', label: 'Decision points explain failures', kind: 'idea', rationale: 'x', evidencePassageIds: ['t.0:0'] }],
  }));
  expect(prior.nodes.get('fresh-id')?.decision).toBe('rejected');
});

test('a connection is applied with real endpoints and its own evidence', async () => {
  const graph = await newGraph();
  const snapshot = await repo.readGraph(graph.id);
  const existingId = crypto.randomUUID();
  await repo.addNode(graph.id, snapshot.graph.contentRevision, {
    id: existingId, label: 'Existing idea', position: { x: 0, y: 0 },
  });

  const current = await repo.readGraph(graph.id);
  const withEdge = draft({
    relationships: [{
      tempId: 'r1',
      from: { kind: 'draft', tempId: 'n1' },
      to: { kind: 'existing', nodeId: existingId },
      label: 'supports', kind: 'reference',
      rationale: 'Same junction evidence.', evidencePassageIds: ['t.0:0'],
    }],
  });

  const result = await applyProposals(db, {
    graphId: graph.id, revision: current.graph.contentRevision, draft: withEdge, inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [{ tempId: 'r1' }],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  const after = await repo.readGraph(graph.id);
  const edge = after.relationships.find((r) => r.id === result.acceptedRelationshipIds[0])!;
  expect(edge.origin).toBe('generated');
  expect(edge.memberNodeIds).toContain(existingId);
  expect(edge.memberNodeIds).toContain(result.acceptedNodeIds[0]);
  expect(edge.evidence).toHaveLength(1);
});

test('accepting a connection without its endpoint is refused, not left dangling', async () => {
  const graph = await newGraph();
  const withEdge = draft({
    relationships: [{
      tempId: 'r1',
      from: { kind: 'draft', tempId: 'n1' },
      to: { kind: 'draft', tempId: 'n1' },
      label: 'relates to', kind: 'personal',
      rationale: 'x', evidencePassageIds: ['t.0:0'],
    }],
  });

  await expect(applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: withEdge, inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    // The connection is accepted but its node is not.
    acceptNodes: [], acceptRelationships: [{ tempId: 'r1' }],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  })).rejects.toThrow(/Accept the connected suggestion/);

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(0);
  expect(snapshot.relationships).toHaveLength(0);
  // Nothing was recorded, so the draft can still be reviewed properly.
  expect(await listDecisions(db, graph.id)).toHaveLength(0);
});

test('acceptance is all or nothing', async () => {
  const graph = await newGraph();
  const twoNodes = draft({
    nodes: [
      { tempId: 'n1', label: 'First', kind: 'idea', rationale: '', evidencePassageIds: ['t.0:0'] },
      { tempId: 'n2', label: 'Second', kind: 'idea', rationale: '', evidencePassageIds: ['t.0:0'] },
    ],
  });

  // The second acceptance names a proposal that is not in the draft.
  await expect(applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: twoNodes, inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }, { tempId: 'not-in-draft' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  })).rejects.toThrow(/not part of this draft/);

  // The first one did not survive: a half-applied draft would be worse.
  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.nodes).toHaveLength(0);
  expect(await listDecisions(db, graph.id)).toHaveLength(0);
  expect(snapshot.graph.contentRevision).toBe(graph.contentRevision);
});

test('a stale reviewer cannot apply onto a map that moved on', async () => {
  const graph = await newGraph();
  const staleRevision = graph.contentRevision;
  await repo.addNode(graph.id, staleRevision, { id: crypto.randomUUID(), label: 'Something else', position: { x: 0, y: 0 } });

  await expect(applyProposals(db, {
    graphId: graph.id, revision: staleRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  })).rejects.toThrow(/changed in another tab/);
});

test('accepted work survives reopening, and manual work is untouched', async () => {
  const graph = await newGraph();
  let snapshot = await repo.readGraph(graph.id);
  const manualId = crypto.randomUUID();
  await repo.addNode(graph.id, snapshot.graph.contentRevision, { id: manualId, label: 'My own idea', position: { x: 1, y: 2 } });

  snapshot = await repo.readGraph(graph.id);
  await applyProposals(db, {
    graphId: graph.id, revision: snapshot.graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  // Reopen the database, as a browser restart would.
  await db.close();
  const reopened = new GraphDatabase(db.name);
  const after = await new GraphRepository(reopened).readGraph(graph.id);

  expect(after.nodes).toHaveLength(2);
  expect(after.nodes.find((n) => n.id === manualId)!.origin).toBe('manual');
  expect(after.nodes.find((n) => n.origin === 'generated')).toBeTruthy();
  expect(await listDecisions(reopened, graph.id)).toHaveLength(1);
  reopened.close();
});

test('proposal identity ignores rewording of the rationale but not of the claim', async () => {
  const base = draft();
  const rewordedRationale = draft({
    nodes: [{ tempId: 'x', label: 'Decision points explain failures', kind: 'idea', rationale: 'Completely different wording here.', evidencePassageIds: ['t.0:0'] }],
  });
  const differentClaim = draft({
    nodes: [{ tempId: 'y', label: 'Signage quantity explains failures', kind: 'idea', rationale: 'Stated in Background.', evidencePassageIds: ['t.0:0'] }],
  });

  const a = await keyProposals(base);
  const b = await keyProposals(rewordedRationale);
  const c = await keyProposals(differentClaim);

  expect(b.nodes.get('x')).toBe(a.nodes.get('n1'));
  expect(c.nodes.get('y')).not.toBe(a.nodes.get('n1'));
});
