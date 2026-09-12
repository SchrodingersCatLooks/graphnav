/**
 * Turning selected content into a reviewed draft (G2-B).
 *
 * The provider sits behind one small interface so the vendor choice is a single
 * swap rather than a rewrite, and so this whole path can be exercised without a
 * key. Nothing here applies anything: it returns a proposal or an explained
 * failure, and a refusal, an empty answer and a malformed answer stay distinct
 * because they need different responses from the person reviewing.
 */

import {
  GENERATION_LIMITS,
  generationInputSchema,
  hashGenerationInput,
  validateDraft,
  type GenerationInput,
  type GraphDraft,
} from './types.ts';

/** One request at a time, and never longer than this. */
export const REQUEST_TIMEOUT_MS = 60_000;

export type ProviderRequest = {
  instructions: string;
  input: string;
  timeoutMs: number;
  signal: AbortSignal;
};

/** A provider either returns JSON text or declines. It never applies anything. */
export type ProviderReply =
  | { kind: 'json'; text: string }
  | { kind: 'refusal'; reason: string };

export interface DraftProvider {
  propose(request: ProviderRequest): Promise<ProviderReply>;
}

export type GenerationOutcome =
  | { status: 'draft'; draft: GraphDraft; inputHash: string }
  /** The model declined. Shown as its own state, not as an error. */
  | { status: 'refused'; reason: string }
  /** A valid answer proposing nothing. Not a failure. */
  | { status: 'empty' }
  /** Well-formed transport, unusable content. Never repaired. */
  | { status: 'invalid'; error: string }
  | { status: 'timeout' }
  | { status: 'cancelled' }
  /** The relay or network failed. Manual maps keep working. */
  | { status: 'unavailable'; error: string }
  | { status: 'busy' };

const PURPOSE_GUIDANCE = {
  'navigation-overview':
    'Propose a small set of orienting ideas that help someone find their way around this material.',
  'concept-connections':
    'Propose connections between ideas that the text actually supports, favouring relationships a reader would otherwise miss.',
} as const;

/**
 * The rules a draft must follow, stated to the model as well as enforced after.
 * Enforcement is what matters; this only reduces the number of refusals.
 */
export function buildInstructions(input: GenerationInput): string {
  return [
    'You propose additions to a personal knowledge graph. You never modify the user\'s documents.',
    PURPOSE_GUIDANCE[input.purpose],
    '',
    'Rules:',
    `- Propose at most ${GENERATION_LIMITS.maxProposedNodes} nodes and ${GENERATION_LIMITS.maxProposedRelationships} connections.`,
    '- Every proposal must cite the passageId values it came from. Do not cite anything not provided.',
    '- Node kind must be "idea" or "note". Never propose folders, files, tabs or sections; those come from the source.',
    '- Connection kind must be "reference" or "personal". Never propose "contains"; containment comes from the source.',
    '- A connection endpoint is either a node you propose in this draft or one of the listed existing node IDs.',
    '- Do not invent URLs, file names or destinations.',
    '- If the content does not support a useful graph, return empty lists rather than guessing.',
    '',
    `Return JSON matching the draft schema, with inputHash set to exactly: ${'${inputHash}'}`,
  ].join('\n');
}

/** Only the selected passages and the IDs a proposal may attach to. */
export function buildInputPayload(input: GenerationInput, inputHash: string): string {
  return JSON.stringify({
    inputHash,
    purpose: input.purpose,
    existingNodeIds: input.existingNodeIds,
    passages: input.passages.map((passage) => ({
      passageId: passage.passageId,
      heading: passage.heading,
      text: passage.text,
    })),
    truncated: input.truncated,
  });
}

/** Guards the "one active request" rule across service-worker message handling. */
let active = false;

export async function requestDraft(
  input: GenerationInput,
  provider: DraftProvider,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<GenerationOutcome> {
  if (active) return { status: 'busy' };
  const checked = generationInputSchema.safeParse(input);
  if (!checked.success) return { status: 'invalid', error: checked.error.issues[0]?.message ?? 'The selected content is invalid.' };
  input = checked.data;
  if (signal?.aborted) return { status: 'cancelled' };
  active = true;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, Math.max(1, timeoutMs)));

  try {
    const inputHash = await hashGenerationInput(input);
    const instructions = buildInstructions(input).replace('${inputHash}', inputHash);

    if (controller.signal.aborted) return { status: signal?.aborted ? 'cancelled' : 'timeout' };
    const aborted = new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Request ended.')), { once: true }));
    const reply = await Promise.race([
      provider.propose({ instructions, input: buildInputPayload(input, inputHash), timeoutMs, signal: controller.signal }),
      aborted,
    ]);
    if (controller.signal.aborted) return { status: signal?.aborted ? 'cancelled' : 'timeout' };

    if (reply.kind === 'refusal') return { status: 'refused', reason: reply.reason };

    let parsed: unknown;
    try {
      parsed = JSON.parse(reply.text);
    } catch {
      return { status: 'invalid', error: 'The model did not return usable JSON.' };
    }

    const validated = validateDraft(parsed, input, inputHash);
    if (!validated.ok) return { status: 'invalid', error: validated.error };
    if (!validated.draft.nodes.length && !validated.draft.relationships.length) return { status: 'empty' };

    return { status: 'draft', draft: validated.draft, inputHash };
  } catch (error) {
    if (controller.signal.aborted) return { status: signal?.aborted ? 'cancelled' : 'timeout' };
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'The AI relay could not be reached.',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    active = false;
  }
}
