import { createRelayServer, EXTENSION_ORIGIN } from './app.ts';
import type { ProviderName } from './providers.ts';

const provider = process.env.PROVIDER ?? 'openai';
if (!['openai', 'gemini'].includes(provider)) throw new Error('PROVIDER must be openai or gemini.');
const token = process.env.RELAY_TOKEN ?? '';
if (!/^[A-Za-z0-9_-]{32,128}$/.test(token) || token.startsWith('sk-')) throw new Error('Set a separate random RELAY_TOKEN in the private configuration.');
const config = {
  token,
  apiKey: process.env.PROVIDER_API_KEY || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY) || '',
  provider: provider as ProviderName,
  model: process.env.PROVIDER_MODEL || (provider === 'openai' ? 'gpt-5-mini' : 'gemini-3.6-flash'),
  projectId: process.env.OPENAI_PROJECT_ID,
  organizationId: process.env.OPENAI_ORG_ID,
  maxRequests: Number(process.env.RELAY_MAX_REQUESTS ?? 20),
};
if (!Number.isInteger(config.maxRequests) || config.maxRequests < 1 || config.maxRequests > 100) throw new Error('RELAY_MAX_REQUESTS must be an integer from 1 to 100.');
// A project-scoped OpenAI key already selects its project. Explicit overrides
// are optional for legacy account setups and are never sent to the extension.
const server = createRelayServer(config);
server.listen(8787, '127.0.0.1', () => {
  console.log('[relay] listening on http://127.0.0.1:8787');
  console.log(`[relay] provider: ${config.provider}; model: ${config.model}`);
  console.log(`[relay] allowed origin: ${EXTENSION_ORIGIN}`);
  console.log(`[relay] limit: ${config.maxRequests} provider attempts per launch, 5 per minute`);
  if (!config.apiKey) console.warn('[relay] model key is not configured; generation is unavailable.');
});
server.on('error', (error: NodeJS.ErrnoException) => { console.error(error.code === 'EADDRINUSE' ? '[relay] Port 8787 is already in use. Stop the other GraphNav relay first.' : '[relay] Server could not start.'); process.exitCode = 1; });
