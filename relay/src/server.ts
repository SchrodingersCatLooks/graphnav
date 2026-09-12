/**
 * GraphNav AI relay (G0-B).
 *
 * The model key lives here and nowhere else. The extension cannot hold it: an
 * extension bundle is readable by anyone who installs it.
 *
 * The relay is deliberately ignorant of graphs. It takes instructions, input,
 * and a JSON schema, and returns the model's text or its refusal. The schema is
 * supplied per request, so changing the draft contract never requires touching
 * or redeploying this. That also means this file has no opinion about the
 * product and cannot silently reshape a draft.
 *
 * Start it with `npm start` from the relay directory. See relay/README.md.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { callProvider, type ProviderName } from './providers.ts';

const PORT = Number(process.env.RELAY_PORT ?? 8787);
/** Loopback only. This is never a public service. */
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

const RELAY_TOKEN = process.env.RELAY_TOKEN ?? '';
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY ?? '';
const PROVIDER = (process.env.PROVIDER ?? 'openai') as ProviderName;
const MODEL = process.env.PROVIDER_MODEL ?? '';
/** Exact origin allowlist: only our extension may call this. */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN
  ?? 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // Compare against a fixed-length digest so length alone leaks nothing.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function send(response: ServerResponse, status: number, body: unknown, origin?: string): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...(origin ? {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
      'vary': 'origin',
    } : {}),
  });
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    // Refuse oversized bodies while reading, not after buffering them.
    if (size > MAX_BODY_BYTES) throw new Error('Request too large.');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const originAllowed = origin === ALLOWED_ORIGIN;

  if (request.method === 'OPTIONS') {
    if (!originAllowed) return send(response, 403, { error: 'Origin not allowed.' });
    return send(response, 204, {}, origin);
  }

  if (request.url === '/health' && request.method === 'GET') {
    // Deliberately says nothing about whether a key is configured.
    return send(response, 200, { ok: true });
  }

  if (request.method !== 'POST' || request.url !== '/draft') {
    return send(response, 404, { error: 'Not found.' });
  }

  if (!originAllowed) return send(response, 403, { error: 'Origin not allowed.' });

  const authorization = request.headers.authorization ?? '';
  const presented = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!RELAY_TOKEN || !constantTimeEquals(presented, RELAY_TOKEN)) {
    return send(response, 401, { error: 'Unauthorized.' }, origin);
  }

  if (!PROVIDER_API_KEY) {
    return send(response, 503, { error: 'The relay has no model key configured.' }, origin);
  }

  let payload: { instructions?: unknown; input?: unknown; schema?: unknown; schemaName?: unknown };
  try {
    payload = JSON.parse(await readBody(request)) as typeof payload;
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'Request too large.';
    return send(response, tooLarge ? 413 : 400, { error: tooLarge ? 'Request too large.' : 'Malformed request.' }, origin);
  }

  const { instructions, input, schema, schemaName } = payload;
  if (typeof instructions !== 'string' || typeof input !== 'string'
    || typeof schema !== 'object' || schema === null || typeof schemaName !== 'string') {
    return send(response, 400, { error: 'Malformed request.' }, origin);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const reply = await callProvider(PROVIDER, {
      apiKey: PROVIDER_API_KEY,
      model: MODEL,
      instructions,
      input,
      schema: schema as Record<string, unknown>,
      schemaName,
      signal: controller.signal,
    });
    return send(response, 200, reply, origin);
  } catch (error) {
    const aborted = controller.signal.aborted;
    // Never echo the provider's raw error: it can contain request content.
    console.error('[relay] provider call failed:', error instanceof Error ? error.name : 'unknown');
    return send(response, aborted ? 504 : 502, {
      error: aborted ? 'The model did not respond in time.' : 'The model could not be reached.',
    }, origin);
  } finally {
    clearTimeout(timer);
  }
});

server.listen(PORT, HOST, () => {
  // Never log the token or the key.
  console.log(`[relay] listening on http://${HOST}:${PORT}`);
  console.log(`[relay] provider: ${PROVIDER}${MODEL ? ` (${MODEL})` : ''}`);
  console.log(`[relay] allowed origin: ${ALLOWED_ORIGIN}`);
  if (!RELAY_TOKEN) console.warn('[relay] RELAY_TOKEN is not set; every request will be rejected.');
  if (!PROVIDER_API_KEY) console.warn('[relay] PROVIDER_API_KEY is not set; drafts will return 503.');
});
