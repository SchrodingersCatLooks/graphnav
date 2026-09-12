/**
 * Request validation for the background dispatcher.
 *
 * Messages arrive from content scripts running on Google pages and from
 * extension-owned pages. The dispatcher must not act on a request until its
 * shape is known and its sender is trusted, so parsing happens here rather than
 * being asserted with a cast.
 */

import { z } from 'zod';
import { browser } from 'wxt/browser';
import { locatorSchema } from './graph/types';

const id = z.string().min(1).max(300);

export const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('AUTH_STATUS') }).strict(),
  z.object({ type: z.literal('CONNECT') }).strict(),
  z.object({ type: z.literal('DISCONNECT') }).strict(),
  z.object({ type: z.literal('ACCOUNT_KEY') }).strict(),
  z.object({ type: z.literal('LIST_FOLDER'), folderId: id }).strict(),
  z.object({ type: z.literal('GET_DOC_TABS'), documentId: id }).strict(),
  z.object({ type: z.literal('IMPORT_DRIVE_FOLDER'), folderId: id, intoGraphId: id.optional() }).strict(),
  z.object({ type: z.literal('IMPORT_DOC_TABS'), documentId: id, intoGraphId: id.optional() }).strict(),
  z.object({ type: z.literal('LIST_GRAPHS') }).strict(),
  z.object({ type: z.literal('READ_GRAPH'), graphId: id }).strict(),
  z.object({ type: z.literal('NAVIGATE'), locator: locatorSchema }).strict(),
]);

/** Content scripts are declared for these origins only. */
const ALLOWED_PAGE_ORIGINS = ['https://drive.google.com', 'https://docs.google.com'];

/**
 * Accepts our own extension pages and our content scripts, and nothing else.
 * `externally_connectable` is not declared, so a web page cannot reach this
 * listener directly; this rejects anything that still arrives unexpected.
 */
export function isTrustedSender(sender: unknown): boolean {
  const from = sender as { id?: string; url?: string; origin?: string } | undefined;
  if (!from || from.id !== browser.runtime.id) return false;

  // An extension page has no tab and an extension-scheme URL.
  const source = from.origin ?? from.url;
  if (!source) return false;
  if (source.startsWith(`chrome-extension://${browser.runtime.id}`)) return true;

  return ALLOWED_PAGE_ORIGINS.some((origin) => source.startsWith(origin));
}
