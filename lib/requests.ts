/**
 * Request validation for the background dispatcher.
 *
 * Messages arrive from content scripts running on Google pages and from
 * extension-owned pages. The dispatcher must not act on a request until its
 * shape is known and its sender is trusted, so parsing happens here rather than
 * being asserted with a cast.
 */

import { z } from 'zod';
import { locatorSchema } from './graph/types';
import { generationInputSchema, graphDraftSchema, sourcePassageSchema } from './generation/types';
import { pairingCodeSchema } from './generation/relay';
import { panelPlacementSchema } from './panel-placement';

const id = z.string().min(1).max(300);
export const panelPreferencesSchema = z.object({ width: z.union([z.literal(420), z.literal(580), z.literal(780)]), dock: z.enum(['left', 'right']) }).strict();

export const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('AI_STATUS') }).strict(),
  z.object({ type: z.literal('OPEN_AI_SETTINGS') }).strict(),
  z.object({ type: z.literal('PAIR_RELAY'), code: pairingCodeSchema }).strict(),
  z.object({ type: z.literal('FORGET_RELAY') }).strict(),
  z.object({ type: z.literal('GENERATE_DRAFT'), requestId: z.string().uuid(), input: generationInputSchema, graphId: id.optional(), revision: z.number().int().nonnegative().optional() }).strict().refine((value) => (value.graphId === undefined) === (value.revision === undefined)),
  z.object({ type: z.literal('CANCEL_DRAFT'), requestId: z.string().uuid() }).strict(),
  z.object({ type: z.literal('AUTH_STATUS') }).strict(),
  z.object({ type: z.literal('CONNECT') }).strict(),
  z.object({ type: z.literal('DISCONNECT') }).strict(),
  z.object({ type: z.literal('ACCOUNT_KEY') }).strict(),
  z.object({ type: z.literal('LIST_FOLDER'), folderId: id }).strict(),
  z.object({ type: z.literal('GET_DOC_TABS'), documentId: id }).strict(),
  z.object({ type: z.literal('DOC_TEXT_PREVIEW'), documentId: id, tabIds: z.array(id).min(1).max(200).refine((ids) => new Set(ids).size === ids.length) }).strict(),
  z.object({ type: z.literal('PANEL_STATE'), source: z.string().regex(/^(drive|docs):[A-Za-z0-9_-]{1,200}$/), open: z.boolean().optional(), graphId: id.optional() }).strict(),
  z.object({ type: z.literal('PANEL_PREFERENCES'), kind: z.enum(['drive', 'docs']), preferences: panelPreferencesSchema.optional() }).strict(),
  z.object({ type: z.literal('PANEL_PLACEMENT'), kind: z.enum(['drive', 'docs']), placement: panelPlacementSchema.optional() }).strict(),
  z.object({ type: z.literal('IMPORT_DRIVE_FOLDER'), folderId: id, intoGraphId: id.optional() }).strict(),
  z.object({ type: z.literal('IMPORT_DOC_TABS'), documentId: id, intoGraphId: id.optional() }).strict(),
  z.object({ type: z.literal('LIST_GRAPHS') }).strict(),
  z.object({ type: z.literal('READ_GRAPH'), graphId: id }).strict(),
  z.object({ type: z.literal('OPEN_PDF_READER'), graphId: id.optional() }).strict(),
  z.object({ type: z.literal('NAVIGATE'), locator: locatorSchema, graphId: id.optional() }).strict(),
  z.object({ type: z.literal('CHECK_TARGETS'), graphId: id }).strict(),
  // G3-B: review outcomes. The draft and its passages travel with the request
  // so acceptance is checked against the exact content it was based on.
  z.object({
    type: z.literal('RECALL_DECISIONS'), graphId: id, draft: graphDraftSchema,
  }).strict(),
  z.object({
    type: z.literal('APPLY_PROPOSALS'),
    graphId: id,
    revision: z.number().int().nonnegative(),
    draft: graphDraftSchema,
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    passages: z.array(sourcePassageSchema).min(1).max(200),
    sourceTitle: z.string().trim().min(1).max(200),
    acceptNodes: z.array(z.object({ tempId: id, label: z.string().trim().min(1).max(200).optional() }).strict()).max(40),
    acceptRelationships: z.array(z.object({ tempId: id, label: z.string().trim().min(1).max(200).optional() }).strict()).max(80),
    rejectNodeTempIds: z.array(id).max(40),
    rejectRelationshipTempIds: z.array(id).max(80),
  }).strict(),
  z.object({ type: z.literal('LIST_DECISIONS'), graphId: id }).strict(),
]);

/** Content scripts are declared for these origins only. */
const ALLOWED_PAGE_ORIGINS = ['https://drive.google.com', 'https://docs.google.com'];

/**
 * Accepts our own extension pages and our content scripts, and nothing else.
 * `externally_connectable` is not declared, so a web page cannot reach this
 * listener directly; this rejects anything that still arrives unexpected.
 */
export function isTrustedSender(sender: unknown, extensionId: string): boolean {
  const from = sender as { id?: string; url?: string; origin?: string } | undefined;
  if (!from || from.id !== extensionId) return false;

  // An extension page has no tab and an extension-scheme URL.
  const source = from.origin ?? from.url;
  if (!source) return false;
  try {
    const url = new URL(source);
    if (url.protocol === 'chrome-extension:') return url.hostname === extensionId;
    return ALLOWED_PAGE_ORIGINS.includes(url.origin);
  } catch { return false; }
}
