import 'fake-indexeddb/auto';
import { test, expect } from '@playwright/test';
import { Dexie } from 'dexie';
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

test('a backup carries decisions, and a version 1 backup still imports', async () => {
  const graph = await newGraph();
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  const exported = await repo.exportGraph(graph.id);
  const parsed = JSON.parse(exported);
  expect(parsed.version).toBe(2);
  expect(parsed.snapshot.decisions).toHaveLength(1);

  // Importing the backup restores the decision, pointed at the copied record.
  const copyId = await repo.importGraph(exported);
  const restored = await listDecisions(db, copyId);
  expect(restored).toHaveLength(1);
  expect(restored[0]!.decision).toBe('accepted');

  const copy = await repo.readGraph(copyId);
  expect(copy.nodes).toHaveLength(1);
  // The decision points at the copy's node, not the original's.
  expect(restored[0]!.itemId).toBe(copy.nodes[0]!.id);
  expect(restored[0]!.itemId).not.toBe(
    (await repo.readGraph(graph.id)).nodes[0]!.id,
  );

  // The copy already knows this suggestion was accepted, so regenerating there
  // does not re-offer it.
  const prior = await recallDecisions(db, copyId, draft());
  expect(prior.nodes.get('n1')?.decision).toBe('accepted');

  // A backup written before decisions existed must still load.
  const legacy = JSON.stringify({
    format: 'graphnav', version: 1,
    snapshot: { ...parsed.snapshot, decisions: undefined },
  });
  const legacyId = await repo.importGraph(legacy);
  expect(await listDecisions(db, legacyId)).toHaveLength(0);
  expect((await repo.readGraph(legacyId)).nodes).toHaveLength(1);
});

test('accepting cannot attach a second Google account to a map', async () => {
  const graph = await newGraph();
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft: draft(), inputHash: HASH, passages, sourceTitle: 'GraphNav demo paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  const snapshot = await repo.readGraph(graph.id);
  expect(snapshot.graph.accountScope).toBe('acct');

  const otherAccount: SourcePassage[] = [{ ...passages[0]!, accountKey: 'someone-else' }];
  await expect(applyProposals(db, {
    graphId: graph.id, revision: snapshot.graph.contentRevision,
    draft: draft({ nodes: [{ tempId: 'n2', label: 'From another account', kind: 'idea', rationale: '', evidencePassageIds: ['t.0:0'] }] }),
    inputHash: HASH, passages: otherAccount, sourceTitle: 'Other doc',
    acceptNodes: [{ tempId: 'n2' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  })).rejects.toThrow(/different Google account/i);

  const after = await repo.readGraph(graph.id);
  expect(after.graph.accountScope).toBe('acct');
  expect(after.nodes).toHaveLength(1);
});

test('an accepted suggestion keeps a destination you can open', async () => {
  const FINGERPRINT = 'b'.repeat(64);
  const passages: SourcePassage[] = [
    {
      passageId: 'page-2', sourceId: `local-pdf:${FINGERPRINT}`, accountKey: 'local', version: FINGERPRINT,
      locator: { kind: 'pdf', fingerprint: FINGERPRINT, pageIndex: 2 },
      heading: 'Findings', text: 'Backtracking rose with branch count.', charCount: 36,
    },
    {
      passageId: 'page-4', sourceId: `local-pdf:${FINGERPRINT}`, accountKey: 'local', version: FINGERPRINT,
      locator: { kind: 'pdf', fingerprint: FINGERPRINT, pageIndex: 4 },
      heading: 'Intervention', text: 'One sign beat signing every junction.', charCount: 37,
    },
  ];
  const draft: GraphDraft = {
    draftVersion: 1, inputHash: 'c'.repeat(64),
    nodes: [{
      tempId: 'n1', label: 'Branching drives backtracking', kind: 'idea', rationale: '',
      evidencePassageIds: ['page-2', 'page-4'],
    }],
    relationships: [],
  };

  const graph = await repo.createGraph('Paper', crypto.randomUUID(), 'import');
  await applyProposals(db, {
    graphId: graph.id, revision: graph.contentRevision, draft, inputHash: 'c'.repeat(64),
    passages, sourceTitle: 'Paper',
    acceptNodes: [{ tempId: 'n1' }], acceptRelationships: [],
    rejectNodeTempIds: [], rejectRelationshipTempIds: [],
  });

  // readGraph is the validation boundary: a node carrying a destination must
  // also carry the source record that destination belongs to, or this throws.
  const snapshot = await repo.readGraph(graph.id);
  const node = snapshot.nodes[0]!;
  expect(node.origin).toBe('generated');
  // The canvas shows its Open control only for a node with a locator, so this
  // is what puts the arrow on the card.
  expect(node.locator).toEqual({ kind: 'pdf', fingerprint: FINGERPRINT, pageIndex: 2 });
  expect(node.sourceId).toBeTruthy();
  expect(snapshot.sources.some((source) => source.id === node.sourceId)).toBe(true);
  // The remaining passages are still evidence; only the first is the destination.
  expect(node.evidence).toHaveLength(2);
});

test('suggestions accepted before destinations existed gain one on upgrade', async () => {
  const FINGERPRINT = 'f'.repeat(64);
  const name = 'graphnav-upgrade-' + crypto.randomUUID();

  // Open at version 3 the way a database written before this change is, so
  // the upgrade has something to upgrade. Declaring the schema through
  // GraphDatabase would create it at the current version and prove nothing.
  const before = new Dexie(name);
  before.version(1).stores({
    graphs: 'id, accountScope, updatedAt',
    sources: 'id, &sourceKey, [provider+accountKey]',
    nodes: 'id, graphId, sourceId, &[graphId+importKey]',
    relationships: 'id, graphId, *memberNodeIds, &[graphId+importKey], [graphId+scopeKey]',
    itemEdits: '[graphId+itemType+itemId], graphId',
    layoutItems: '[graphId+itemType+itemId], graphId',
    sourceCache: 'id, &[sourceId+sourceVersion+chunkKey], lastAccessedAt',
    blobs: 'id',
  });
  before.version(2).stores({ proposalDecisions: '[graphId+proposalKey], graphId, decision' });
  before.version(3).stores({ undoEntries: '++seq, graphId, [graphId+seq]' });
  await before.open();
  const graphId = crypto.randomUUID();
  const graph = { id: graphId, contentRevision: 0 };
  await before.table('graphs').put({
    id: graphId, title: 'Paper', createdVia: 'import', contentRevision: 0,
    sourceBindings: [], view: { x: 0, y: 0, zoom: 1 }, createdAt: Date.now(), updatedAt: Date.now(),
  });
  const sourceId = crypto.randomUUID();
  await before.table('sources').put({
    id: sourceId, sourceKey: JSON.stringify(['local-pdf', 'local', FINGERPRINT]),
    provider: 'local-pdf', accountKey: 'local', resourceId: FINGERPRINT, kind: 'pdf',
    title: 'Paper', availability: 'available', createdAt: Date.now(), updatedAt: Date.now(),
  });
  const nodeId = crypto.randomUUID();
  await before.table('nodes').put({
    id: nodeId, graphId: graph.id, kind: 'idea', origin: 'generated',
    baseLabel: 'Branching drives backtracking', body: '',
    evidence: [{ sourceId, locator: { kind: 'pdf', fingerprint: FINGERPRINT, pageIndex: 3 }, sourceVersion: FINGERPRINT, quote: 'Backtracking rose.' }],
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  const manualId = crypto.randomUUID();
  await before.table('nodes').put({
    id: manualId, graphId: graph.id, kind: 'idea', origin: 'manual',
    baseLabel: 'My own thought', body: '', evidence: [], createdAt: Date.now(), updatedAt: Date.now(),
  });
  expect((await before.table('nodes').get(nodeId))!.locator).toBeUndefined();
  before.close();

  // Reopening runs the upgrade.
  const after = new GraphDatabase(name);
  const repaired = new GraphRepository(after);
  const snapshot = await repaired.readGraph(graph.id);

  const generated = snapshot.nodes.find((node) => node.id === nodeId)!;
  expect(generated.locator).toEqual({ kind: 'pdf', fingerprint: FINGERPRINT, pageIndex: 3 });
  expect(generated.sourceId).toBe(sourceId);
  // A node that was never generated is left exactly as it was.
  const manual = snapshot.nodes.find((node) => node.id === manualId)!;
  expect(manual.locator).toBeUndefined();
  expect(manual.sourceId).toBeUndefined();
  await after.delete();
});
