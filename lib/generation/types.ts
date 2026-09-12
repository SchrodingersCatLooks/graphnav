/**
 * Contract for AI-assisted drafts (G1-B).
 *
 * Two separate things live here. `SourcePassage` is what leaves the extension:
 * bounded, selected-only text carrying the identity needed to check later that
 * it has not changed. The draft schemas are what may come back: proposals only,
 * never applied records. A model cannot name a destination, so every reference
 * it makes must resolve to a passage or an existing node we already hold.
 */

import { z } from 'zod';
import { locatorSchema } from '../graph/types.ts';

/** One request covers one document and at most this much text. */
export const GENERATION_LIMITS = {
  maxCharacters: 20_000,
  maxPassages: 200,
  maxProposedNodes: 40,
  maxProposedRelationships: 80,
  maxLabel: 200,
  maxRationale: 600,
} as const;

const id = z.string().min(1).max(300);

export const sourcePassageSchema = z.object({
  /** Stable for a given document version, so decisions can be matched later. */
  passageId: id,
  sourceId: id,
  accountKey: id,
  /** Document revision or content hash; changing it makes prior evidence stale. */
  version: id,
  locator: locatorSchema,
  /** Nearest enclosing heading, for display during review. */
  heading: z.string().max(300).optional(),
  text: z.string().min(1).max(GENERATION_LIMITS.maxCharacters),
  charCount: z.number().int().positive(),
}).strict();
export type SourcePassage = z.infer<typeof sourcePassageSchema>;

export const generationPurposes = ['navigation-overview', 'concept-connections'] as const;

export const generationInputSchema = z.object({
  purpose: z.enum(generationPurposes),
  documentId: id,
  passages: z.array(sourcePassageSchema).min(1).max(GENERATION_LIMITS.maxPassages),
  totalCharacters: z.number().int().nonnegative().max(GENERATION_LIMITS.maxCharacters),
  /** True when selection exceeded the cap and was cut; never silently hidden. */
  truncated: z.boolean(),
  /** Existing nodes a proposal may attach to. Anything else is unresolvable. */
  existingNodeIds: z.array(id).max(GENERATION_LIMITS.maxProposedNodes * 4),
}).strict().superRefine((input, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  if (new Set(input.passages.map((passage) => passage.passageId)).size !== input.passages.length) issue('Passage IDs must be unique.');
  if (new Set(input.existingNodeIds).size !== input.existingNodeIds.length) issue('Existing node IDs must be unique.');
  if (input.passages.reduce((sum, passage) => sum + passage.text.length, 0) !== input.totalCharacters) issue('The character total does not match the selected text.');
  const first = input.passages[0];
  for (const passage of input.passages) {
    if (passage.charCount !== passage.text.length) issue('A passage character count does not match its text.');
    if (first && (passage.accountKey !== first.accountKey || passage.sourceId !== first.sourceId || passage.version !== first.version)) issue('One preview must use the same source, account and version.');
    const locator = passage.locator;
    if (locator.kind === 'docs') {
      if (locator.documentId !== input.documentId || !locator.tabId || passage.sourceId !== `google-docs:${passage.accountKey}:${input.documentId}`) issue('A selected passage does not match this document and account.');
    } else if (locator.kind === 'pdf') {
      if (locator.fingerprint !== input.documentId || passage.accountKey !== 'local' || passage.sourceId !== `local-pdf:${input.documentId}` || passage.version !== input.documentId) issue('A selected passage does not match this local PDF.');
    } else issue('Only selected Docs tabs and local PDF pages can be analyzed.');
  }
});
export type GenerationInput = z.infer<typeof generationInputSchema>;

/** A proposal may point at something new in this draft or something we already store. */
export const proposedRefSchema = z.union([
  z.object({ kind: z.literal('draft'), tempId: id }).strict(),
  z.object({ kind: z.literal('existing'), nodeId: id }).strict(),
]);

export const proposedNodeSchema = z.object({
  tempId: id,
  label: z.string().trim().min(1).max(GENERATION_LIMITS.maxLabel),
  /** Drafts never propose source nodes; only the adapters create those. */
  kind: z.enum(['idea', 'note']),
  rationale: z.string().max(GENERATION_LIMITS.maxRationale),
  evidencePassageIds: z.array(id).min(1).max(8),
}).strict();

export const proposedRelationshipSchema = z.object({
  tempId: id,
  from: proposedRefSchema,
  to: proposedRefSchema,
  label: z.string().trim().min(1).max(GENERATION_LIMITS.maxLabel),
  /** Containment is structural and comes from the source, never from a draft. */
  kind: z.enum(['reference', 'personal']),
  rationale: z.string().max(GENERATION_LIMITS.maxRationale),
  evidencePassageIds: z.array(id).min(1).max(8),
}).strict();

export type ProposedRef = z.infer<typeof proposedRefSchema>;
export type ProposedNode = z.infer<typeof proposedNodeSchema>;
export type ProposedRelationship = z.infer<typeof proposedRelationshipSchema>;

export const graphDraftSchema = z.object({
  draftVersion: z.literal(1),
  /** Ties the draft to the exact input; a changed source invalidates it. */
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  nodes: z.array(proposedNodeSchema).max(GENERATION_LIMITS.maxProposedNodes),
  relationships: z.array(proposedRelationshipSchema).max(GENERATION_LIMITS.maxProposedRelationships),
}).strict();
export type GraphDraft = z.infer<typeof graphDraftSchema>;

export type DraftRejection = { reason: string };

/**
 * Validates a draft against the exact input it claims to come from.
 *
 * Shape alone is not enough: a well-formed draft can still cite a passage that
 * was never sent, point at a node we do not have, or answer a different input.
 * Those must be refused before anything reaches review, never repaired.
 */
export function validateDraft(
  value: unknown,
  input: GenerationInput,
  inputHash: string,
): { ok: true; draft: GraphDraft } | { ok: false; error: string } {
  if (!generationInputSchema.safeParse(input).success) return { ok: false, error: 'The submitted content is invalid.' };
  const parsed = graphDraftSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Malformed draft.' };
  const draft = parsed.data;

  if (draft.inputHash !== inputHash) return { ok: false, error: 'The draft does not match the submitted content.' };

  const passageIds = new Set(input.passages.map((p) => p.passageId));
  const existing = new Set(input.existingNodeIds);
  const tempIds = new Set(draft.nodes.map((n) => n.tempId));

  if (tempIds.size !== draft.nodes.length) return { ok: false, error: 'Duplicate proposed node IDs.' };

  const relationshipIds = new Set(draft.relationships.map((r) => r.tempId));
  if (relationshipIds.size !== draft.relationships.length) {
    return { ok: false, error: 'Duplicate proposed relationship IDs.' };
  }

  for (const node of draft.nodes) {
    if (!node.evidencePassageIds.every((p) => passageIds.has(p))) {
      return { ok: false, error: `Proposal "${node.label}" cites content that was not submitted.` };
    }
  }

  for (const relationship of draft.relationships) {
    if (!relationship.evidencePassageIds.every((p) => passageIds.has(p))) {
      return { ok: false, error: `Connection "${relationship.label}" cites content that was not submitted.` };
    }
    for (const ref of [relationship.from, relationship.to]) {
      const resolvable = ref.kind === 'draft' ? tempIds.has(ref.tempId) : existing.has(ref.nodeId);
      if (!resolvable) return { ok: false, error: `Connection "${relationship.label}" points at something that does not exist.` };
    }
    if (relationship.from.kind === relationship.to.kind) {
      const same = relationship.from.kind === 'draft'
        ? relationship.from.tempId === (relationship.to as { tempId: string }).tempId
        : relationship.from.nodeId === (relationship.to as { nodeId: string }).nodeId;
      if (same) return { ok: false, error: `Connection "${relationship.label}" joins a node to itself.` };
    }
  }

  return { ok: true, draft };
}

/** Content-addresses exactly what was sent, so a later source edit marks evidence stale. */
export async function hashGenerationInput(input: GenerationInput): Promise<string> {
  const canonical = JSON.stringify(generationInputSchema.parse(input));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
