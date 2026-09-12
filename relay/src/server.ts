/**
 * GraphNav AI relay (G0-B).
 *
 * The model key lives here and nowhere else. An extension bundle is readable by
 * anyone who installs it, so a key shipped inside one is a published key.
 *
 * Implements the server half of GENERATION_HANDOFF.md. The extension sends a
 * complete GenerationInput; this builds the instructions, payload and schema
 * with the shared helpers so the prompt and the validated contract cannot drift
 * apart, and so a caller cannot smuggle its own instructions past them.
 *
 * Start it with `npm start` from the relay directory. See relay/README.md.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { callProvider, type ProviderName } from './providers.ts';
import { generationInputSchema } from '../../lib/generation/types.ts';
import { buildInputPayload, buildInstructions } from '../../lib/generation/request.ts';
import { graphDraftSchema } from '../../lib/generation/types.ts';

const PORT = Number(process.env.RELAY_PORT ?? 8787);
/** Loopback only. This is never a public service. */
const HOST = '127.0.0.1';
/** Shared transport bound from the handoff. */
const MAX_BODY_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;
const PROTOCOL = 1;

const PAIRING_CODE = process.env.RELAY_TOKEN ?? '';
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
const PROVIDER = (process.env.PROVIDER ?? 'openai') as ProviderName;
const MODEL = process.env.PROVIDER_MODEL ?? '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN
  ?? 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';

/** Compares digests so neither length nor content leaks through timing. */
function matchesPairingCode(presented: string): boolean {
  if (!PAIRING_CODE) return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(PAIRING_CODE).digest();
  return timingSafeEqual(a, b);
}

function send(response: ServerResponse, status: number, body: unknown, origin?: string): void {
  response.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...(origin ? {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      vary: 'origin',
    } : {}),
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    // Refuse oversized bodies while reading, not after buffering them.
    if (size > MAX_BODY_BYTES) throw new Error('too_large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** One active request, matching the limit the extension already enforces. */
let inFlight = false;

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const originAllowed = origin === ALLOWED_ORIGIN;

  if (request.method === 'OPTIONS') {
    if (!originAllowed) return send(response, 403, { error: 'Origin not allowed.' });
    return send(response, 204, {}, origin);
  }
  if (!originAllowed) return send(response, 403, { error: 'Origin not allowed.' });

  const authorization = request.headers.authorization ?? '';
  const presented = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  // Health is authenticated too: an unpaired caller learns nothing about this host.
  if (!matchesPairingCode(presented)) return send(response, 401, { error: 'Unauthorized.' }, origin);

  if (request.method === 'GET' && request.url === '/health') {
    // Ready means a provider is configured, not that a model call has succeeded.
    return send(response, 200, {
      protocol: PROTOCOL,
      ready: Boolean(PROVIDER_API_KEY),
      ...(MODEL ? { model: MODEL } : {}),
    }, origin);
  }

  if (request.method !== 'POST' || request.url !== '/draft') {
    return send(response, 404, { error: 'Not found.' }, origin);
  }

  if (!PROVIDER_API_KEY) {
    return send(response, 503, { error: 'The relay has no model key configured.' }, origin);
  }
  if (inFlight) return send(response, 429, { error: 'A draft is already in progress.' }, origin);

  let raw: string;
  try {
    raw = await readBody(request);
  } catch {
    return send(response, 413, { error: 'Request too large.' }, origin);
  }

  // The body is a complete GenerationInput, revalidated here against the shared
  // schema. The caller does not get to supply instructions or a schema.
  let input: z.infer<typeof generationInputSchema>;
  try {
    input = generationInputSchema.parse(JSON.parse(raw));
  } catch {
    return send(response, 400, { error: 'Malformed selected content.' }, origin);
  }

  inFlight = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Same hash the extension computes, so the draft it receives is checkable.
    const canonical = JSON.stringify({
      purpose: input.purpose,
      documentId: input.documentId,
      passages: input.passages.map((p) => [p.passageId, p.version, p.text]),
    });
    const inputHash = createHash('sha256').update(canonical).digest('hex');

    const reply = await callProvider(PROVIDER, {
      apiKey: PROVIDER_API_KEY,
      model: MODEL,
      instructions: buildInstructions(input).replace('${inputHash}', inputHash),
      input: buildInputPayload(input, inputHash),
      schema: z.toJSONSchema(graphDraftSchema, { io: 'output' }) as Record<string, unknown>,
      schemaName: 'graph_draft',
      signal: controller.signal,
    });

    if (reply.kind === 'json' && reply.text.length > MAX_BODY_BYTES) {
      return send(response, 502, { error: 'The model response exceeds the size limit.' }, origin);
    }
    return send(response, 200, reply, origin);
  } catch (error) {
    const aborted = controller.signal.aborted;
    // Log the error name only: the raw error can contain selected source text.
    console.error('[relay] provider call failed:', error instanceof Error ? error.name : 'unknown');
    return send(response, aborted ? 504 : 502, {
      error: aborted ? 'The model did not respond in time.' : 'The model could not be reached.',
    }, origin);
  } finally {
    clearTimeout(timer);
    inFlight = false;
  }
});

server.listen(PORT, HOST, () => {
  // Never log the pairing code, the key, or any selected text.
  console.log(`[relay] listening on http://${HOST}:${PORT} (protocol ${PROTOCOL})`);
  console.log(`[relay] provider: ${PROVIDER}${MODEL ? ` (${MODEL})` : ''}`);
  console.log(`[relay] allowed origin: ${ALLOWED_ORIGIN}`);
  if (!PAIRING_CODE) console.warn('[relay] RELAY_TOKEN is not set; every request will be rejected.');
  if (!PROVIDER_API_KEY) console.warn('[relay] no model key set; /draft returns 503 and health reports not ready.');
});
