/**
 * The extension's side of the relay (G0-B).
 *
 * The model key never reaches here. This holds only a shared token proving the
 * request came from our extension rather than from anything else on the
 * machine, and the relay holds the key.
 *
 * The schema sent to the model is generated from the same Zod object used to
 * validate the answer, so the constraint and the check cannot drift apart.
 */

import { z } from 'zod';
import { graphDraftSchema } from './types';
import type { DraftProvider, ProviderRequest, ProviderReply } from './request';

export const DEFAULT_RELAY_URL = 'http://127.0.0.1:8787';

/** One source of truth: the model is constrained by what we validate against. */
export function draftJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(graphDraftSchema, { io: 'output' }) as Record<string, unknown>;
}

export type RelaySettings = { url: string; token: string };

export class RelayUnreachableError extends Error {
  constructor(cause: string) {
    super(`The AI relay is not running. Manual maps still work. (${cause})`);
    this.name = 'RelayUnreachableError';
  }
}

export class RelayRejectedError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'RelayRejectedError';
  }
}

/** Distinguishes "relay is down" from "relay said no", which need different fixes. */
function describe(status: number): string {
  switch (status) {
    case 401: return 'The relay rejected this extension\'s token. Check RELAY_TOKEN matches on both sides.';
    case 403: return 'The relay refused this origin. Check ALLOWED_ORIGIN matches the extension ID.';
    case 413: return 'That selection is too large for the relay.';
    case 503: return 'The relay has no model key configured.';
    case 504: return 'The model did not respond in time.';
    default: return `The relay returned ${status}.`;
  }
}

export function createRelayProvider(settings: RelaySettings): DraftProvider {
  return {
    async propose(request: ProviderRequest): Promise<ProviderReply> {
      let response: Response;
      try {
        response = await fetch(`${settings.url.replace(/\/$/, '')}/draft`, {
          method: 'POST',
          signal: request.signal,
          headers: {
            authorization: `Bearer ${settings.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            instructions: request.instructions,
            input: request.input,
            schema: draftJsonSchema(),
            schemaName: 'graph_draft',
          }),
        });
      } catch (error) {
        // A stopped relay must read as "AI is off", not as a broken extension.
        if (request.signal.aborted) throw error;
        throw new RelayUnreachableError(error instanceof Error ? error.message : 'connection failed');
      }

      if (!response.ok) {
        throw new RelayRejectedError(response.status, describe(response.status));
      }

      const body = await response.json() as ProviderReply;
      if (body && (body.kind === 'json' || body.kind === 'refusal')) return body;
      throw new RelayRejectedError(502, 'The relay returned an unexpected response.');
    },
  };
}

/** True when a relay is listening, used to show AI as available or off. */
export async function relayReachable(settings: RelaySettings, timeoutMs = 2_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${settings.url.replace(/\/$/, '')}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
