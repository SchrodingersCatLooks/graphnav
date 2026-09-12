/**
 * Stable per-account key for scoping saved graphs.
 *
 * The same folder ID under a different Google account is a different graph, so
 * every stored graph is scoped by this value. `permissionId` is Drive's stable
 * per-account identifier and needs no extra Chrome permission beyond the scopes
 * already granted. It is an opaque ID, not an email address.
 */

import { authorizedGet } from './auth';

type AboutResponse = { user?: { permissionId?: string } };

export async function getAccountKey(): Promise<string> {
  const url = 'https://www.googleapis.com/drive/v3/about?fields=user(permissionId)';
  const about = await authorizedGet<AboutResponse>(url);
  const permissionId = about.user?.permissionId;
  if (!permissionId) throw new Error('Drive did not return an account identifier.');
  return permissionId;
}
