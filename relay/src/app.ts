import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { generationInputSchema, hashGenerationInput, validateDraft } from '../../lib/generation/types.ts';
import { buildInstructions, buildInputPayload, type ProviderReply } from '../../lib/generation/request.ts';
import { draftJsonSchema } from '../../lib/generation/relay-provider.ts';
import { callProvider, type ProviderCall, type ProviderName } from './providers.ts';

export const MAX_BODY_BYTES = 512 * 1024;
export const EXTENSION_ORIGIN = 'chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk';
export type RelayConfig = { token: string; apiKey: string; provider: ProviderName; model: string; projectId?: string; organizationId?: string; maxRequests?: number; timeoutMs?: number };
type Provider = (name: ProviderName, call: ProviderCall) => Promise<ProviderReply>;

function equalToken(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
function send(response: ServerResponse, status: number, body: unknown, origin?: string) {
  if (response.destroyed) return;
  const payload = JSON.stringify(body);
  if (Buffer.byteLength(payload) > MAX_BODY_BYTES) { send(response, 502, { error: 'The model response exceeds the relay limit.' }, origin); return; }
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...(origin ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS', vary: 'origin' } : {}) });
  response.end(status === 204 ? undefined : payload);
}
async function readBody(request: IncomingMessage) {
  if (Number(request.headers['content-length'] ?? 0) > MAX_BODY_BYTES) throw new Error('oversize');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of request) { size += chunk.length; if (size > MAX_BODY_BYTES) throw new Error('oversize'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

/** Same selected-input contract as the extension; the server never holds graph state. */
export function createRelayServer(config: RelayConfig, provider: Provider = callProvider) {
  let active = false, requests = 0;
  const recent: number[] = [];
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    // Chrome may omit Origin on an authenticated extension GET. POST always
    // requires the pinned extension origin; arbitrary browser origins are refused.
    if (origin && origin !== EXTENSION_ORIGIN) return send(response, 403, { error: 'Origin not allowed.' });
    if (request.method === 'OPTIONS') return origin === EXTENSION_ORIGIN ? send(response, 204, null, origin) : send(response, 403, { error: 'Origin not allowed.' });
    if (!((request.method === 'GET' && request.url === '/health') || (request.method === 'POST' && request.url === '/draft'))) return send(response, 404, { error: 'Not found.' }, origin);
    if (request.method === 'POST' && origin !== EXTENSION_ORIGIN) return send(response, 403, { error: 'Origin not allowed.' });
    const authorization = request.headers.authorization ?? '', token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!config.token || !equalToken(token, config.token)) return send(response, 401, { error: 'Pairing refused.' }, origin);
    const ready = !!config.apiKey && !!config.model;
    if (request.url === '/health') return send(response, 200, { protocol: 1, ready, ...(config.model ? { model: config.model } : {}) }, origin);
    if (!ready) return send(response, 503, { error: 'The relay has no model key or model configured.' }, origin);
    if (active) return send(response, 409, { error: 'Another generation is running.' }, origin);
    while (recent.length && recent[0]! < Date.now() - 60_000) recent.shift();
    if (requests >= (config.maxRequests ?? 20) || recent.length >= 5) return send(response, 429, { error: 'The local generation limit has been reached.' }, origin);
    if (!request.headers['content-type']?.startsWith('application/json')) return send(response, 415, { error: 'Send JSON content.' }, origin);
    active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(config.timeoutMs ?? 60_000, 60_000));
    const closed = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close', closed);
    try {
      const parsed = generationInputSchema.safeParse(await readBody(request));
      if (!parsed.success) return send(response, 400, { error: 'Invalid selected content.' }, origin);
      controller.signal.throwIfAborted();
      const input = parsed.data, hash = await hashGenerationInput(input);
      const aborted = new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      controller.signal.throwIfAborted();
      requests++; recent.push(Date.now());
      const reply = await Promise.race([provider(config.provider, {
        apiKey: config.apiKey, model: config.model, projectId: config.projectId, organizationId: config.organizationId,
        instructions: buildInstructions(input).replace('${inputHash}', hash), input: buildInputPayload(input, hash),
        schema: draftJsonSchema(), schemaName: 'graph_draft', signal: controller.signal,
      }), aborted]);
      controller.signal.throwIfAborted();
      if (reply.kind === 'json') {
        let draft: unknown; try { draft = JSON.parse(reply.text); } catch { return send(response, 502, { error: 'The model returned unusable JSON.' }, origin); }
        const checked = validateDraft(draft, input, hash);
        if (!checked.ok) return send(response, 502, { error: 'The model draft failed evidence or identity validation.' }, origin);
      } else if (typeof reply.reason !== 'string' || reply.reason.length > 6000) return send(response, 502, { error: 'Invalid refusal response.' }, origin);
      return send(response, 200, reply, origin);
    } catch (error) {
      const oversize = error instanceof Error && error.message === 'oversize';
      const syntax = error instanceof SyntaxError;
      // Never echo provider errors, credentials, request bodies or source text.
      return send(response, controller.signal.aborted ? 504 : oversize ? 413 : syntax ? 400 : 502, { error: controller.signal.aborted ? 'Generation ended before a response arrived.' : oversize ? 'Request too large.' : syntax ? 'Malformed JSON.' : 'The provider could not complete the request. Check the private server configuration and API account.' }, origin);
    } finally { clearTimeout(timer); response.off('close', closed); active = false; }
  });
  server.requestTimeout = 60_000;
  server.headersTimeout = 10_000;
  return server;
}
