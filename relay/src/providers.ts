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

export type ProviderName = 'openai' | 'gemini';

export type ProviderCall = {
  apiKey: string;
  model: string;
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
  gemini: 'gemini-3-flash',
};

async function callOpenAi(call: ProviderCall): Promise<ProviderReply> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: call.signal,
    headers: {
      authorization: `Bearer ${call.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
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
  const body = await response.json() as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  };

  // A refusal is a first-class outcome, not an error to be retried.
  for (const item of body.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.refusal) return { kind: 'refusal', reason: part.refusal };
    }
  }

  const text = body.output_text
    ?? body.output?.flatMap((item) => item.content ?? []).find((part) => part.type === 'output_text')?.text;
  if (!text) throw new Error('openai_empty_response');
  return { kind: 'json', text };
}

async function callGemini(call: ProviderCall): Promise<ProviderReply> {
  const model = call.model || DEFAULT_MODEL.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    signal: call.signal,
    headers: { 'x-goog-api-key': call.apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: call.instructions }] },
      contents: [{ role: 'user', parts: [{ text: call.input }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: call.schema,
      },
    }),
  });

  if (!response.ok) throw new Error(`gemini_${response.status}`);
  const body = await response.json() as {
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  };

  const candidate = body.candidates?.[0];
  // Gemini reports a blocked answer through finishReason rather than a field.
  if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
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
