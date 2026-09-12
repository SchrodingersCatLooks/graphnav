/**
 * Stable identity for a proposal (G3-B).
 *
 * A draft's tempIds are new every time, so they cannot tell us whether a
 * suggestion has been seen before. Identity is derived from what the proposal
 * actually says instead, which is what lets a regenerated draft recognise
 * something the user already accepted or rejected and not offer it again.
 *
 * Deliberately ignores rationale and evidence order: the same claim reworded by
 * the model in its explanation is the same claim.
 */

import type { GraphDraft, ProposedRef } from './types';

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function digest(parts: unknown[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ProposalKeys = {
  nodes: Map<string, string>;
  relationships: Map<string, string>;
};

/**
 * Keys every proposal in a draft.
 *
 * Relationship identity depends on its endpoints, and an endpoint may be
 * another proposal, so node keys are computed first and referenced by key
 * rather than by tempId.
 */
export async function keyProposals(draft: GraphDraft): Promise<ProposalKeys> {
  const nodes = new Map<string, string>();
  for (const node of draft.nodes) {
    nodes.set(node.tempId, await digest([
      'node', node.kind, normalize(node.label), [...node.evidencePassageIds].sort(),
    ]));
  }

  const relationships = new Map<string, string>();
  for (const relationship of draft.relationships) {
    const endpoint = (ref: ProposedRef) =>
      ref.kind === 'draft' ? ['draft', nodes.get(ref.tempId) ?? ref.tempId] : ['existing', ref.nodeId];
    relationships.set(relationship.tempId, await digest([
      'relationship', relationship.kind, normalize(relationship.label),
      endpoint(relationship.from), endpoint(relationship.to),
      [...relationship.evidencePassageIds].sort(),
    ]));
  }

  return { nodes, relationships };
}
