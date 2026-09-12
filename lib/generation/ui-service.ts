import type { GraphRepository } from '../storage/repository';
import { getAccountKey } from '../google/account';
import { extractSelectedTabs } from '../google/docs-content';
import { generationInputSchema, hashGenerationInput, type GenerationInput } from './types';
import { requestDraft, REQUEST_TIMEOUT_MS, type GenerationOutcome } from './request';
import type { RelayClient } from './relay';

export type GenerationRequest = { requestId: string; input: GenerationInput; graphId?: string; revision?: number };
type Job = { owner: string; controller: AbortController; timedOut: boolean };

/** Owns one UI request; stores no proposals or accepted graph records. */
export class GenerationUiService {
  private readonly jobs = new Map<string, Job>();
  constructor(private readonly repository: GraphRepository, private readonly relay: RelayClient, private readonly account = getAccountKey, private readonly extract = extractSelectedTabs) {}
  cancel(requestId: string, owner: string) {
    const job = this.jobs.get(requestId);
    if (job && job.owner !== owner) throw new Error('This request belongs to another tab.');
    job?.controller.abort();
  }
  async generate(request: GenerationRequest, owner: string, ownPage: boolean): Promise<GenerationOutcome> {
    if (this.jobs.size) return { status: 'busy' };
    const input = generationInputSchema.safeParse(request.input);
    if (!input.success) return { status: 'invalid', error: 'The selected content is invalid. Preview it again.' };
    request = { ...request, input: input.data };
    const job: Job = { owner, controller: new AbortController(), timedOut: false };
    this.jobs.set(request.requestId, job);
    const timer = setTimeout(() => { job.timedOut = true; job.controller.abort(); }, REQUEST_TIMEOUT_MS);
    const signal = job.controller.signal;
    try {
      return await Promise.race([
        new Promise<GenerationOutcome>((resolve) => signal.addEventListener('abort', () => resolve({ status: job.timedOut ? 'timeout' : 'cancelled' }), { once: true })),
        this.run(request, signal, ownPage),
      ]);
    } catch (reason) {
      if (signal.aborted) return { status: job.timedOut ? 'timeout' : 'cancelled' };
      return { status: 'unavailable', error: reason instanceof Error ? reason.message : 'The draft could not be generated.' };
    } finally { clearTimeout(timer); this.jobs.delete(request.requestId); }
  }
  private async verifyMap(request: GenerationRequest) {
    if (!request.graphId) {
      if (request.input.existingNodeIds.length) throw new Error('Select a map before referencing existing nodes.');
      return;
    }
    const data = await this.repository.readGraph(request.graphId);
    if (data.graph.contentRevision !== request.revision) throw new Error('Your map changed. Preview the selection again before generating.');
    if (request.input.existingNodeIds.some((id) => !data.nodes.some((node) => node.id === id))) throw new Error('A referenced node is no longer in this map.');
    const account = request.input.passages[0]!.accountKey;
    if (account !== 'local' && data.graph.accountScope && data.graph.accountScope !== account) throw new Error('The selected content belongs to a different Google account.');
  }
  private async run(request: GenerationRequest, signal: AbortSignal, ownPage: boolean): Promise<GenerationOutcome> {
    await this.verifyMap(request); signal.throwIfAborted();
    const input = request.input, first = input.passages[0]!;
    if (first.locator.kind === 'docs') {
      const account = await this.account(); signal.throwIfAborted();
      if (account !== first.accountKey) throw new Error('Your Google account changed. Preview the selection again.');
      const tabs = [...new Set(input.passages.flatMap((passage) => passage.locator.kind === 'docs' && passage.locator.tabId ? [passage.locator.tabId] : []))];
      const fresh = await this.extract(input.documentId, tabs, account); signal.throwIfAborted();
      if (await this.account() !== account) throw new Error('Your Google account changed. Preview the selection again.');
      const freshInput = { ...input, passages: fresh.tabs.flatMap((tab) => tab.passages), totalCharacters: fresh.totalCharacters, truncated: fresh.truncated };
      if (await hashGenerationInput(freshInput) !== await hashGenerationInput(input)) throw new Error('The document changed or the selection was truncated differently. Preview the selected text again.');
    } else {
      if (!ownPage) throw new Error('Generate PDF drafts from the GraphNav reader.');
      if (!await this.repository.db.blobs.get(`pdf:${input.documentId}`)) throw new Error('Reattach the original PDF before generating.');
    }
    signal.throwIfAborted();
    const outcome = await requestDraft(input, this.relay.provider(input), REQUEST_TIMEOUT_MS, signal);
    signal.throwIfAborted();
    await this.verifyMap(request);
    if (first.locator.kind === 'docs' && await this.account() !== first.accountKey) throw new Error('Your Google account changed during generation. Reconnect and preview again.');
    return outcome;
  }
}
