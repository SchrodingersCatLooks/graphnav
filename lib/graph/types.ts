import { z } from 'zod';

export const LIMITS = { nodes: 500, relationships: 2000, members: 32, exportBytes: 5_000_000, visibleNodes: 50 } as const;
const id = z.string().min(1).max(300);
const label = z.string().trim().min(1).max(200);
const timestamp = z.number().int().nonnegative();
const stamps = { createdAt: timestamp, updatedAt: timestamp };
const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);
export const pointSchema = z.object({ x: coordinate, y: coordinate }).strict();
export const viewSchema = pointSchema.extend({ zoom: z.number().min(0.1).max(4) });
export const webUrlSchema = z.url().max(4000).refine((value) => new URL(value).protocol === 'https:', 'Use an https:// link.');

// Compatible with Eddy's provisional M1-B locator fields. Web links are personal
// destinations only; they do not imply an authenticated source integration.
export const locatorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('drive'), fileId: id, webViewLink: webUrlSchema.optional() }).strict(),
  z.object({ kind: z.literal('docs'), documentId: id, tabId: id.optional() }).strict(),
  z.object({ kind: z.literal('pdf'), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), pageIndex: z.number().int().nonnegative(), namedDestination: id.optional(), point: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict().optional() }).strict(),
  z.object({ kind: z.literal('web'), url: webUrlSchema }).strict(),
]);
export type Locator = z.infer<typeof locatorSchema>;
const evidenceSchema = z.object({ sourceId: id, locator: locatorSchema, sourceVersion: id, quote: z.string().max(2000) }).strict();
export const bindingSelectionSchema = z.object({
  mode: z.enum(['selected', 'baseline']),
  memberKeys: z.array(z.string().max(1500)).max(LIMITS.nodes),
  missingKeys: z.array(z.string().max(1500)).max(LIMITS.nodes),
}).strict();
export const graphSchema = z.object({
  id, title: label, createdVia: z.enum(['manual', 'import']), accountScope: id.nullable(),
  contentRevision: z.number().int().nonnegative(), view: viewSchema,
  sourceBindings: z.array(z.object({ key: id, complete: z.boolean(), refreshedAt: timestamp, ...bindingSelectionSchema.partial().shape }).strict()).max(100),
  ...stamps,
}).strict();
export type Graph = z.infer<typeof graphSchema>;
export const sourceInputSchema = z.object({
  provider: z.enum(['google-drive', 'google-docs', 'local-pdf']), accountKey: id, resourceId: id,
  kind: z.enum(['folder', 'file', 'document', 'pdf']), title: label,
  canonicalUrl: webUrlSchema.optional(), version: id.optional(),
}).strict().superRefine((s, ctx) => {
  if (s.provider === 'local-pdf' && (s.accountKey !== 'local' || s.kind !== 'pdf' || !/^[a-f0-9]{64}$/.test(s.resourceId))) ctx.addIssue({ code: 'custom', message: 'A local PDF needs its byte fingerprint and local scope.' });
  if (s.provider !== 'local-pdf' && s.accountKey === 'local') ctx.addIssue({ code: 'custom', message: 'A Google source needs a verified account key, not the reserved local scope.' });
  if (s.provider === 'google-docs' && s.kind !== 'document') ctx.addIssue({ code: 'custom', message: 'A Docs source must be a document.' });
});
export type SourceInput = z.infer<typeof sourceInputSchema>;
export const sourceSchema = sourceInputSchema.safeExtend({ id, sourceKey: z.string().max(1200), availability: z.enum(['available', 'unavailable']), ...stamps });
export type Source = z.infer<typeof sourceSchema>;
export const nodeSchema = z.object({
  id, graphId: id, kind: z.enum(['idea', 'note', 'source']), origin: z.enum(['manual', 'imported', 'generated']),
  baseLabel: label, body: z.string().max(20_000), sourceId: id.optional(), locator: locatorSchema.optional(),
  importKey: z.string().max(1500).optional(), evidence: z.array(evidenceSchema).max(32),
  ...stamps,
}).strict();
export type GraphNode = z.infer<typeof nodeSchema>;
export const membersSchema = z.array(z.object({ nodeId: id, role: z.enum(['from', 'to', 'peer']) }).strict()).min(2).max(LIMITS.members).refine((members) => {
  if (new Set(members.map((m) => m.nodeId)).size !== members.length) return false;
  return members.every((m) => m.role === 'peer') ||
    (members.every((m) => m.role !== 'peer') && members.some((m) => m.role === 'from') && members.some((m) => m.role === 'to'));
}, 'Use distinct nodes and either all peers or at least one from and one to.');
export type Members = z.infer<typeof membersSchema>;
export const relationshipLabelSchema = z.string().trim().max(200);
export const relationshipKindSchema = z.enum(['supports', 'references', 'depends-on', 'related-to', 'custom']);
export const connectionValuesSchema = z.object({ label: relationshipLabelSchema, relationshipKind: relationshipKindSchema, direction: z.enum(['forward', 'reverse', 'none']) }).strict();
export type ConnectionValues = z.infer<typeof connectionValuesSchema>;
export const relationshipSchema = z.object({
  id, graphId: id, members: membersSchema, memberNodeIds: z.array(id).max(LIMITS.members),
  kind: z.enum(['contains', 'reference', 'personal']), origin: z.enum(['manual', 'imported', 'generated']), baseLabel: relationshipLabelSchema,
  importKey: z.string().max(1500).optional(), scopeKey: id.optional(), evidence: z.array(evidenceSchema).max(32), ...stamps,
}).strict();
export type Relationship = z.infer<typeof relationshipSchema>;
/**
 * A decision the user made about one proposal.
 *
 * Keyed by proposalKey, which is derived from the proposal's content rather
 * than its temporary draft ID, so regenerating recognises the same suggestion
 * and never re-offers something already accepted or rejected.
 */
export const proposalDecisionSchema = z.object({
  graphId: id,
  proposalKey: id,
  decision: z.enum(['accepted', 'rejected']),
  /** Present when accepted: the record the proposal became. */
  itemType: z.enum(['node', 'relationship']).optional(),
  itemId: id.optional(),
  /** The label the user kept, which may differ from what was proposed. */
  acceptedLabel: label.optional(),
  /** Ties the decision to the content it was made about. */
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  ...stamps,
}).strict();
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;

export const itemKeySchema = z.object({ graphId: id, itemType: z.enum(['node', 'relationship']), itemId: id }).strict();
export type ItemKey = z.infer<typeof itemKeySchema>;
export const editValuesSchema = z.object({ displayLabel: relationshipLabelSchema.optional(), notes: z.string().max(20_000).optional(), hidden: z.boolean().optional(), relationshipKind: relationshipKindSchema.optional(), direction: connectionValuesSchema.shape.direction.optional() }).strict();
export const itemEditSchema = itemKeySchema.extend({ ...editValuesSchema.shape, ...stamps });
export type ItemEdit = z.infer<typeof itemEditSchema>;
export const geometrySchema = pointSchema.extend({ width: z.number().finite().min(120).max(1000).optional(), height: z.number().finite().min(64).max(800).optional() }).strict();
export const layoutSchema = itemKeySchema.extend({ ...geometrySchema.shape, pinned: z.boolean(), ...stamps });
export type LayoutItem = z.infer<typeof layoutSchema>;
export type GraphSnapshot = { graph: Graph; sources: Source[]; nodes: GraphNode[]; relationships: Relationship[]; itemEdits: ItemEdit[]; layoutItems: LayoutItem[]; decisions?: ProposalDecision[] };
export const snapshotSchema = z.object({
  graph: graphSchema, sources: z.array(sourceSchema).max(LIMITS.nodes), nodes: z.array(nodeSchema).max(LIMITS.nodes),
  relationships: z.array(relationshipSchema).max(LIMITS.relationships),
  itemEdits: z.array(itemEditSchema).max(LIMITS.nodes + LIMITS.relationships), layoutItems: z.array(layoutSchema).max(LIMITS.nodes + LIMITS.relationships),
  // Optional so a version 1 backup, written before decisions existed, still loads.
  decisions: z.array(proposalDecisionSchema).max(LIMITS.nodes + LIMITS.relationships).optional(),
}).strict();
/** Version 2 adds decisions. Version 1 backups still import: old files must keep working. */
export const backupSchema = z.object({ format: z.literal('graphnav'), version: z.union([z.literal(1), z.literal(2)]), snapshot: snapshotSchema }).strict();
export const BACKUP_VERSION = 2 as const;
export type SourceCache = { id: string; sourceId: string; sourceVersion: string; chunkKey: string; payload: string; byteSize: number; lastAccessedAt: number };
export type StoredBlob = { id: string; name?: string; blob: Blob; mimeType: string; byteSize: number; createdAt: number };
export const newNodeSchema = z.object({ id, label, body: z.string().max(20_000).default(''), locator: locatorSchema.optional(), position: pointSchema });
export const newRelationshipSchema = z.object({ id, label: relationshipLabelSchema, members: membersSchema });

export function effectiveLabel(item: GraphNode | Relationship, edits: ItemEdit[]): string {
  return edits.find((edit) => edit.itemId === item.id)?.displayLabel ?? item.baseLabel;
}
export function sourceKey(source: SourceInput): string {
  return JSON.stringify([source.provider, source.accountKey, source.resourceId]);
}
export function locatorKey(locator: Locator): string {
  switch (locator.kind) {
    case 'drive': return JSON.stringify(['drive', locator.fileId]);
    case 'docs': return JSON.stringify(['docs', locator.documentId, locator.tabId ?? '']);
    case 'pdf': return JSON.stringify(['pdf', locator.fingerprint, locator.pageIndex, locator.namedDestination ?? '', locator.point ?? null]);
    case 'web': return JSON.stringify(['web', locator.url]);
  }
}
export function destinationUrl(locator: Locator): string | undefined {
  switch (locator.kind) {
    case 'web': return webUrlSchema.parse(locator.url);
    case 'drive': return `https://drive.google.com/open?id=${encodeURIComponent(locator.fileId)}`;
    case 'docs': return `https://docs.google.com/document/d/${encodeURIComponent(locator.documentId)}/edit${locator.tabId ? `?tab=${encodeURIComponent(locator.tabId)}` : ''}`;
    case 'pdf': return undefined; // Resolved by the reader UI or extension worker.
  }
}

/** Base membership stays stable; presentation direction belongs to the personal overlay. */
export function effectiveConnection(item: Relationship, edits: ItemEdit[]): ConnectionValues {
  const edit = edits.find((value) => value.itemType === 'relationship' && value.itemId === item.id);
  return { label: effectiveLabel(item, edits), relationshipKind: edit?.relationshipKind ?? (item.kind === 'reference' ? 'references' : 'custom'), direction: edit?.direction ?? (item.members.every((member) => member.role === 'peer') ? 'none' : 'forward') };
}
export function directedMembers(item: Relationship, edits: ItemEdit[]): Members {
  const { direction } = effectiveConnection(item, edits);
  return item.members.map((member, index) => ({ nodeId: member.nodeId, role: direction === 'none' ? 'peer' : member.role === 'peer' ? ((index === 0) !== (direction === 'reverse') ? 'from' : 'to') : direction === 'reverse' ? member.role === 'from' ? 'to' : 'from' : member.role }));
}
