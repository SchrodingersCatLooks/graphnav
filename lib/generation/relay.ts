import { z } from 'zod';
import type { GenerationInput } from './types';
import type { DraftProvider } from './request';

export const RELAY_BASE = 'http://127.0.0.1:8787';
export const RELAY_BYTES = 512 * 1024;
export const pairingCodeSchema = z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/).refine((value) => !value.startsWith('sk-'), 'Enter the relay pairing code. Keep the model API key on the server.');
const healthSchema = z.object({ protocol: z.literal(1), ready: z.boolean(), model: z.string().max(200).optional() }).strict();
const replySchema = z.discriminatedUnion('kind', [z.object({ kind: z.literal('json'), text: z.string().max(RELAY_BYTES) }).strict(), z.object({ kind: z.literal('refusal'), reason: z.string().max(6000) }).strict()]);
export type RelayStatus = { configured: boolean; ready: boolean; model?: string; error?: string };

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('The relay pairing code was refused. Pair this Chrome session again.');
    if (response.status === 409) throw new Error('Another AI request is running. Wait for it to finish or cancel it in its tab.');
    if (response.status === 429) throw new Error('The local generation limit has been reached. Wait a minute before retrying. If the launch limit is reached, review usage before restarting the relay.');
    if (response.status === 413) throw new Error('The selected content is too large. Preview fewer tabs or pages and retry.');
    if (response.status === 504) throw new Error('Generation took too long. Retry with fewer tabs or pages.');
    throw new Error(`The AI relay could not complete the request (${response.status}). Check that its provider is configured.`);
  }
  if (Number(response.headers.get('content-length') ?? 0) > RELAY_BYTES) { await response.body?.cancel(); throw new Error('The relay response exceeds the size limit.'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The relay returned an empty response.');
  let size = 0, text = ''; const decoder = new TextDecoder();
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > RELAY_BYTES) { await reader.cancel(); throw new Error('The relay response exceeds the size limit.'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (reason) {
    if (reason instanceof SyntaxError) throw new Error('The relay returned an invalid response.');
    throw reason;
  } finally { reader.releaseLock(); }
}

/** Credentials stay in extension-owned session storage; callers receive status only. */
export class RelayClient {
  constructor(private readonly readCode: () => Promise<string | undefined>, private readonly writeCode: (code: string | undefined) => Promise<void>, private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}
  private async health(code: string) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await this.fetcher(`${RELAY_BASE}/health`, { headers: { Authorization: `Bearer ${code}` }, signal: controller.signal, cache: 'no-store', redirect: 'error' });
      return healthSchema.parse(await boundedJson(response));
    } finally { clearTimeout(timer); }
  }
  async status(): Promise<RelayStatus> {
    const code = await this.readCode();
    if (!code) return { configured: false, ready: false };
    try { const result = await this.health(code); return { configured: true, ready: result.ready, ...(result.model ? { model: result.model } : {}) }; }
    catch { return { configured: true, ready: false, error: 'The local AI relay is unavailable or this pairing has expired. Check the relay, then retry the connection.' }; }
  }
  async pair(code: string): Promise<RelayStatus> {
    const checked = pairingCodeSchema.parse(code);
    const health = await this.health(checked);
    await this.writeCode(checked);
    return { configured: true, ready: health.ready, ...(health.model ? { model: health.model } : {}) };
  }
  async forget() { await this.writeCode(undefined); }
  provider(input: GenerationInput): DraftProvider {
    return { propose: async ({ signal }) => {
      const code = await this.readCode();
      if (!code) throw new Error('Pair the local AI relay before generating a draft.');
      const body = JSON.stringify(input);
      if (new TextEncoder().encode(body).length > RELAY_BYTES) throw new Error('The selected content exceeds the relay request limit.');
      signal.throwIfAborted();
      const response = await this.fetcher(`${RELAY_BASE}/draft`, { method: 'POST', headers: { Authorization: `Bearer ${code}`, 'Content-Type': 'application/json' }, body, signal, cache: 'no-store', redirect: 'error' });
      return replySchema.parse(await boundedJson(response));
    } };
  }
}
