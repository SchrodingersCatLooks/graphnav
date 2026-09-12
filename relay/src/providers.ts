/**
 * Provider adapters.
 *
 * Each one turns "instructions + input + JSON schema" into either the model's
 * JSON text or its refusal. Adding a provider means adding a case here and
 * nothing else: the server, the extension, and the draft contract are all
 * unaware of which vendor is in use.
 *
 * Plain fetch rather than a vendor SDK, deliberately. The schema arrives as
 * JSON Schema already, so an SDK would add a dependency and a lock-in without
 * removing any work. FEATURE_SPEC names the official openai SDK; swapping this
 * file for it changes nothing elsewhere.
 */

async function boundedBody(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('provider_empty_body');
  let size = 0, text = ''; const decoder = new TextDecoder();
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 512 * 1024) { await reader.cancel(); throw new Error('provider_response_too_large'); } text += decoder.decode(part.value, { stream: true }); }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

export type ProviderName = 'openai' | 'gemini';

export type ProviderCall = {
  apiKey: string;
  model: string;
  projectId?: string;
  organizationId?: string;
  onUsage?: (usage: { model: string; inputTokens: number; outputTokens: number; totalTokens: number }) => void;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  schemaName: string;
  signal: AbortSignal;
};

export type ProviderReply =
  | { kind: 'json'; text: string }
  | { kind: 'refusal'; reason: string };

const DEFAULT_MODEL: Record<ProviderName, string> = {
  openai: 'gpt-5-mini',
  gemini: 'gemini-3.6-flash',
};

async function callOpenAi(call: ProviderCall): Promise<ProviderReply> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: call.signal,
    headers: {
      authorization: `Bearer ${call.apiKey}`,
      'content-type': 'application/json',
      ...(call.projectId ? { 'OpenAI-Project': call.projectId } : {}),
      ...(call.organizationId ? { 'OpenAI-Organization': call.organizationId } : {}),
    },
    redirect: 'error',
    body: JSON.stringify({
      store: false,
      max_output_tokens: 8000,
      ...((call.model || DEFAULT_MODEL.openai).startsWith('gpt-5-mini') ? { reasoning: { effort: 'minimal' } } : {}),
      model: call.model || DEFAULT_MODEL.openai,
      instructions: call.instructions,
      input: call.input,
      text: {
        format: {
          type: 'json_schema',
          name: call.schemaName,
          // strict pairs with the schema the extension already validates against.
          strict: true,
          schema: call.schema,
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`openai_${response.status}`);
  const body = await boundedBody(response) as {
    status?: string; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  };

  if (body.status !== 'completed') throw new Error('openai_incomplete_response');
  if (body.usage) call.onUsage?.({ model: body.model ?? call.model, inputTokens: body.usage.input_tokens ?? 0, outputTokens: body.usage.output_tokens ?? 0, totalTokens: body.usage.total_tokens ?? 0 });

  // A refusal is a first-class outcome, not an error to be retried.
  for (const item of body.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.refusal) return { kind: 'refusal', reason: part.refusal };
    }
  }

  const text = body.output_text
    ?? body.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === 'output_text').map((part) => part.text ?? '').join('');
  if (!text) throw new Error('openai_empty_response');
  return { kind: 'json', text };
}

/**
 * Rewrites a JSON Schema into the subset Gemini's responseSchema accepts.
 *
 * Gemini takes an OpenAPI-flavoured subset, not full JSON Schema: it rejects
 * `$schema`, `const`, `additionalProperties` and `$ref`, all of which a normal
 * Zod export emits. OpenAI accepts them, so this translation is the only real
 * difference between the two providers.
 *
 * The schema only shapes the model's output. Correctness is still decided by
 * the extension revalidating the answer, so simplifying here loosens the hint,
 * never the check.
 */
export function toGeminiSchema(schema: Record<string, unknown>, defs?: Record<string, unknown>): unknown {
  const root = defs ?? (schema.$defs as Record<string, unknown> | undefined) ?? {};

  const convert = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(convert);
    if (!value || typeof value !== 'object') return value;
    const node = value as Record<string, unknown>;

    // Inline definitions: Gemini has no $ref.
    if (typeof node.$ref === 'string') {
      const name = node.$ref.replace('#/$defs/', '');
      const target = root[name];
      return target ? convert(target) : { type: 'string' };
    }

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      // Gemini has no `const`, and its `enum` accepts strings only. A fixed
      // string becomes a single-member enum; a fixed number or boolean can only
      // be stated in the description, and is enforced when we revalidate.
      if (key === 'const') {
        if (typeof child === 'string') { out.enum = [child]; out.type = 'string'; }
        else {
          out.type = typeof child === 'boolean' ? 'boolean' : 'number';
          out.description = `Must be exactly ${JSON.stringify(child)}.`;
        }
        continue;
      }
      // Keywords Gemini does not define.
      // minItems/maxItems are documented but rejected in practice, and sizes are
      // enforced when we revalidate, so they are dropped with the rest.
      if (['$schema', '$defs', '$id', 'additionalProperties', 'pattern', 'minLength', 'maxLength',
           'minItems', 'maxItems', 'exclusiveMinimum', 'exclusiveMaximum', 'minimum', 'maximum',
           'default'].includes(key)) continue;
      out[key] = convert(child);
    }
    // Gemini requires integers to be declared as numbers with a format.
    if (out.type === 'integer') { out.type = 'number'; delete out.format; }
    return out;
  };

  return convert({ ...schema, $defs: undefined });
}

async function callGemini(call: ProviderCall): Promise<ProviderReply> {
  const model = call.model || DEFAULT_MODEL.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    signal: call.signal,
    headers: { 'x-goog-api-key': call.apiKey, 'content-type': 'application/json' },
    redirect: 'error',
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: call.instructions }] },
      contents: [{ role: 'user', parts: [{ text: call.input }] }],
      generationConfig: {
        maxOutputTokens: 8000,
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(call.schema),
      },
    }),
  });

  if (!response.ok) throw new Error(`gemini_${response.status}`);
  const body = await boundedBody(response) as {
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  };

  const candidate = body.candidates?.[0];
  // Gemini reports a blocked answer through finishReason rather than a field.
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    return { kind: 'refusal', reason: `The model stopped: ${candidate.finishReason}.` };
  }

  const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!text) throw new Error('gemini_empty_response');
  return { kind: 'json', text };
}

export function callProvider(name: ProviderName, call: ProviderCall): Promise<ProviderReply> {
  switch (name) {
    case 'openai': return callOpenAi(call);
    case 'gemini': return callGemini(call);
    default: throw new Error(`Unknown provider: ${String(name)}`);
  }
}
