/**
 * Applying and remembering AI proposals (G3-B).
 *
 * Two rules drive the whole design.
 *
 * First, a proposal is never applied through the ordinary manual-edit commands.
 * Those produce `origin: 'manual'` records with no evidence, which would erase
 * the fact that a model suggested it and what it was based on.
 *
 * Second, decisions outlive drafts. A regenerated draft has entirely new
 * tempIds, so decisions are keyed by proposal content. That is what stops a
 * second generation re-offering something already rejected, or creating a
 * duplicate of something already accepted.
 */

import type { GraphDatabase } from './database';
import { GraphRepository } from './repository';
import {
  type GraphNode,
  type ProposalDecision,
  type Relationship,
  type Source,
  type SourceInput,
  proposalDecisionSchema,
  sourceInputSchema,
  sourceKey,
} from '../graph/types';
import { keyProposals } from '../generation/proposal-key';
import type { GraphDraft, ProposedNode, ProposedRef, ProposedRelationship, SourcePassage } from '../generation/types';

export type AcceptedNode = { tempId: string; label?: string };
export type AcceptedRelationship = { tempId: string; label?: string };

export type ApplyRequest = {
  graphId: string;
  revision: number;
  draft: GraphDraft;
  inputHash: string;
  /** The passages the draft was built from, used to attach evidence. */
  passages: SourcePassage[];
  /** Title of the document the passages came from, for its source record. */
  sourceTitle: string;
  acceptNodes: AcceptedNode[];
  acceptRelationships: AcceptedRelationship[];
  rejectNodeTempIds: string[];
  rejectRelationshipTempIds: string[];
};

export type ApplyResult = {
  acceptedNodeIds: string[];
  acceptedRelationshipIds: string[];
  rejected: number;
  /** Proposals skipped because an identical one was already accepted. */
  alreadyAccepted: number;
};

/** What a reviewer should not be shown again. */
export type PriorDecisions = {
  nodes: Map<string, ProposalDecision>;
  relationships: Map<string, ProposalDecision>;
};

const stamp = () => ({ createdAt: Date.now(), updatedAt: Date.now() });

/**
 * Looks up what the user already decided about each proposal in a draft.
 *
 * Callers use this to hide or mark repeats rather than presenting a fresh draft
 * as if nothing had been decided before.
 */
export async function recallDecisions(
  db: GraphDatabase,
  graphId: string,
  draft: GraphDraft,
): Promise<PriorDecisions> {
  const keys = await keyProposals(draft);
  const stored = await db.proposalDecisions.where('graphId').equals(graphId).toArray();
  const byKey = new Map(stored.map((decision) => [decision.proposalKey, decision]));

  const pick = (source: Map<string, string>) => {
    const found = new Map<string, ProposalDecision>();
    for (const [tempId, key] of source) {
      const decision = byKey.get(key);
      if (decision) found.set(tempId, decision);
    }
    return found;
  };

  return { nodes: pick(keys.nodes), relationships: pick(keys.relationships) };
}

/**
 * Describes the record a passage's source should have.
 *
 * Evidence points at a real Source row rather than a loose string, so reading a
 * map back always resolves what an accepted suggestion was based on.
 */
function sourceInputFor(passage: SourcePassage, title: string): SourceInput | undefined {
  const locator = passage.locator;
  if (locator.kind === 'docs') {
    return sourceInputSchema.parse({
      provider: 'google-docs', accountKey: passage.accountKey,
      resourceId: locator.documentId, kind: 'document', title,
    });
  }
  if (locator.kind === 'pdf') {
    return sourceInputSchema.parse({
      provider: 'local-pdf', accountKey: 'local',
      resourceId: locator.fingerprint, kind: 'pdf', title,
    });
  }
  if (locator.kind === 'drive') {
    return sourceInputSchema.parse({
      provider: 'google-drive', accountKey: passage.accountKey,
      resourceId: locator.fileId, kind: 'file', title,
    });
  }
  // A personal web destination is not a source we hold.
  return undefined;
}

/** Evidence for the passages a proposal cited, so provenance survives review. */
function evidenceFor(passageIds: string[], passages: SourcePassage[], sourceRowIds: Map<string, string>) {
  const byId = new Map(passages.map((passage) => [passage.passageId, passage]));
  return passageIds.flatMap((passageId) => {
    const passage = byId.get(passageId);
    const sourceId = passage && sourceRowIds.get(passage.sourceId);
    // A passage whose source could not be recorded contributes no evidence
    // rather than a dangling reference.
    if (!passage || !sourceId) return [];
    return [{
      sourceId,
      locator: passage.locator,
      sourceVersion: passage.version,
      // Bounded: the excerpt is for showing why, not for storing the document.
      quote: passage.text.slice(0, 2000),
    }];
  });
}

/**
 * Applies accepted proposals and records every decision in one transaction.
 *
 * All or nothing: a partially applied draft would leave records whose
 * provenance and decisions disagree, which is worse than applying none.
 */
export async function applyProposals(
  db: GraphDatabase,
  request: ApplyRequest,
): Promise<ApplyResult> {
  const repository = new GraphRepository(db);
  const keys = await keyProposals(request.draft);

  const nodeById = new Map<string, ProposedNode>(request.draft.nodes.map((node: ProposedNode) => [node.tempId, node]));
  const relationshipById = new Map<string, ProposedRelationship>(request.draft.relationships.map((r: ProposedRelationship) => [r.tempId, r]));

  const result: ApplyResult = {
    acceptedNodeIds: [], acceptedRelationshipIds: [], rejected: 0, alreadyAccepted: 0,
  };

  const tables = [
    db.graphs, db.sources, db.nodes, db.relationships,
    db.itemEdits, db.layoutItems, db.proposalDecisions, db.undoEntries,
  ];

  await db.transaction('rw', tables, async () => {
    const graph = await db.graphs.get(request.graphId);
    if (!graph) throw new Error('This map no longer exists.');
    // Optimistic concurrency, matching every other write path.
    if (graph.contentRevision !== request.revision) {
      throw new Error('This map changed in another tab. Reload the saved map before accepting again.');
    }

    // A map holds one account's sources. Adopt the account on first use and
    // refuse a mismatch, exactly as importing a source scope does. Without this
    // an accepted suggestion could attach a source from another account and
    // quietly make the map fail its own export invariant.
    const googleAccounts = new Set(
      request.passages
        .filter((passage) => passage.locator.kind !== 'pdf')
        .map((passage) => passage.accountKey),
    );
    if (googleAccounts.size > 1) throw new Error('These passages mix Google accounts.');
    const [passageAccount] = [...googleAccounts];
    if (passageAccount) {
      if (graph.accountScope && graph.accountScope !== passageAccount) {
        throw new Error('This map belongs to a different Google account.');
      }
      graph.accountScope = passageAccount;
    }

    // Reuse an existing source row where one exists, so accepting a suggestion
    // never creates a second record for a document already in the map.
    const sourceRowIds = new Map<string, string>();
    for (const passage of request.passages) {
      if (sourceRowIds.has(passage.sourceId)) continue;
      const input = sourceInputFor(passage, request.sourceTitle);
      if (!input) continue;
      const identity = sourceKey(input);
      const found = await db.sources.where('sourceKey').equals(identity).first();
      if (found) { sourceRowIds.set(passage.sourceId, found.id); continue; }
      const created: Source = {
        ...input, id: crypto.randomUUID(), sourceKey: identity,
        availability: 'available', ...stamp(),
      };
      await db.sources.put(created);
      sourceRowIds.set(passage.sourceId, created.id);
    }

    // Accepting is the least reversible thing the AI flow does, so it records
    // a step like any other change. Captured before anything is written.
    await repository.recordUndoStep(request.graphId, 'Save AI review');

    const existing = await db.proposalDecisions.where('graphId').equals(request.graphId).toArray();
    const decided = new Map(existing.map((decision) => [decision.proposalKey, decision]));

    const record = async (proposalKey: string, decision: ProposalDecision['decision'],
      itemType?: 'node' | 'relationship', itemId?: string, acceptedLabel?: string) => {
      const previous = decided.get(proposalKey);
      const value = proposalDecisionSchema.parse({
        graphId: request.graphId,
        proposalKey,
        decision,
        ...(itemType ? { itemType } : {}),
        ...(itemId ? { itemId } : {}),
        ...(acceptedLabel ? { acceptedLabel } : {}),
        inputHash: request.inputHash,
        ...stamp(),
        createdAt: previous?.createdAt ?? Date.now(),
      });
      await db.proposalDecisions.put(value);
      decided.set(proposalKey, value);
    };

    // Nodes first: a relationship may point at one accepted in this same call.
    const appliedNodeIds = new Map<string, string>();
    for (const accepted of request.acceptNodes) {
      const proposal = nodeById.get(accepted.tempId);
      if (!proposal) throw new Error('That suggestion is not part of this draft.');
      const proposalKey = keys.nodes.get(accepted.tempId)!;

      const prior = decided.get(proposalKey);
      if (prior?.decision === 'accepted' && prior.itemId) {
        // Regenerated and accepted again: reuse, never duplicate.
        appliedNodeIds.set(accepted.tempId, prior.itemId);
        result.alreadyAccepted += 1;
        continue;
      }

      const id = crypto.randomUUID();
      const evidence = evidenceFor(proposal.evidencePassageIds, request.passages, sourceRowIds);
      // A suggestion's destination is the passage it was drawn from, so an
      // accepted one opens to that page or tab exactly as an imported node
      // does. Without this the reasoning is visible only while the draft is
      // still on screen: once it is on the map, "where did this come from?"
      // has no answer you can click. The first passage is the destination and
      // the rest stay in evidence, which is what the review panel reads.
      const destination = evidence[0];
      const node: GraphNode = {
        id, graphId: request.graphId, kind: proposal.kind,
        // Not 'manual': this record came from a model and says so forever.
        origin: 'generated',
        baseLabel: accepted.label?.trim() || proposal.label,
        body: '',
        ...(destination ? { sourceId: destination.sourceId, locator: destination.locator } : {}),
        evidence,
        ...stamp(),
      };
      await db.nodes.put(node);
      appliedNodeIds.set(accepted.tempId, id);
      result.acceptedNodeIds.push(id);
      await record(proposalKey, 'accepted', 'node', id, node.baseLabel);
    }

    for (const accepted of request.acceptRelationships) {
      const proposal = relationshipById.get(accepted.tempId);
      if (!proposal) throw new Error('That connection is not part of this draft.');
      const proposalKey = keys.relationships.get(accepted.tempId)!;

      const prior = decided.get(proposalKey);
      if (prior?.decision === 'accepted' && prior.itemId) {
        result.alreadyAccepted += 1;
        continue;
      }

      const resolve = (ref: ProposedRef): string => {
        if (ref.kind === 'existing') return ref.nodeId;
        const id = appliedNodeIds.get(ref.tempId);
        // Accepting an edge without its endpoint would leave a dangling member.
        if (!id) throw new Error('Accept the connected suggestion before this connection.');
        return id;
      };

      const from = resolve(proposal.from);
      const to = resolve(proposal.to);
      for (const nodeId of [from, to]) {
        const node = await db.nodes.get(nodeId);
        if (!node || node.graphId !== request.graphId) {
          throw new Error('That connection points outside this map.');
        }
      }

      const id = crypto.randomUUID();
      const relationship: Relationship = {
        id, graphId: request.graphId,
        members: [{ nodeId: from, role: 'from' }, { nodeId: to, role: 'to' }],
        memberNodeIds: [from, to],
        kind: proposal.kind,
        origin: 'generated',
        baseLabel: accepted.label?.trim() || proposal.label,
        evidence: evidenceFor(proposal.evidencePassageIds, request.passages, sourceRowIds),
        ...stamp(),
      };
      await db.relationships.put(relationship);
      result.acceptedRelationshipIds.push(id);
      await record(proposalKey, 'accepted', 'relationship', id, relationship.baseLabel);
    }

    // Rejections are stored too: forgetting them means re-offering them.
    for (const tempId of request.rejectNodeTempIds) {
      const proposalKey = keys.nodes.get(tempId);
      if (!proposalKey) throw new Error('That suggestion is not part of this draft.');
      await record(proposalKey, 'rejected');
      result.rejected += 1;
    }
    for (const tempId of request.rejectRelationshipTempIds) {
      const proposalKey = keys.relationships.get(tempId);
      if (!proposalKey) throw new Error('That connection is not part of this draft.');
      await record(proposalKey, 'rejected');
      result.rejected += 1;
    }

    await db.graphs.put({ ...graph, contentRevision: graph.contentRevision + 1, updatedAt: Date.now() });
  });

  // Positioning is personal state and belongs outside the acceptance transaction.
  //
  // Cards are roughly 220px wide and connection labels sit at the midpoint
  // between two nodes, so spacing must leave room for a label or the label
  // lands on top of the next card's title. Three per row keeps the block
  // readable rather than stretching it off-screen.
  const COLUMNS = 3, COLUMN_WIDTH = 340, ROW_HEIGHT = 190;
  for (const [index, id] of result.acceptedNodeIds.entries()) {
    await repository.savePosition(
      { graphId: request.graphId, itemType: 'node', itemId: id },
      { x: 80 + (index % COLUMNS) * COLUMN_WIDTH, y: 320 + Math.floor(index / COLUMNS) * ROW_HEIGHT },
    );
  }

  return result;
}

export async function listDecisions(db: GraphDatabase, graphId: string): Promise<ProposalDecision[]> {
  return db.proposalDecisions.where('graphId').equals(graphId).toArray();
}
