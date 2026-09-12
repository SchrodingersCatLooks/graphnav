/**
 * Checks whether stored destinations still resolve.
 *
 * A file absent from a folder listing may simply have moved, so only a direct
 * lookup may declare a target unavailable. A network or auth failure is not
 * evidence of deletion and leaves the target's state untouched.
 */

import { AuthRequiredError, HttpError, authorizedGet } from './auth';

export type TargetState = 'available' | 'unavailable' | 'unknown';

export type TargetCheck = { sourceKey: string; resourceId: string; state: TargetState };

/** Google returns these when a target is gone or no longer shared with us. */
const GONE = new Set([403, 404]);

/** Bounded so checking a large map cannot flood the API. */
const CONCURRENCY = 5;

async function checkOne(resourceId: string): Promise<TargetState> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resourceId)}`);
  url.searchParams.set('fields', 'id');
  try {
    await authorizedGet<{ id: string }>(url.toString());
    return 'available';
  } catch (error) {
    if (error instanceof AuthRequiredError) throw error;
    if (error instanceof HttpError && GONE.has(error.status)) return 'unavailable';
    // Anything else is a transient failure, not evidence about the target.
    return 'unknown';
  }
}

export async function checkTargets(
  targets: Array<{ sourceKey: string; resourceId: string }>,
): Promise<TargetCheck[]> {
  const results: TargetCheck[] = [];
  for (let start = 0; start < targets.length; start += CONCURRENCY) {
    const batch = targets.slice(start, start + CONCURRENCY);
    const states = await Promise.all(batch.map((target) => checkOne(target.resourceId)));
    batch.forEach((target, index) => results.push({ ...target, state: states[index]! }));
  }
  return results;
}
