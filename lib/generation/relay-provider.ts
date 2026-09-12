import { z } from 'zod';
import { graphDraftSchema } from './types.ts';

/** Provider constraints and extension validation use the same draft contract. */
export function draftJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(graphDraftSchema, { io: 'output' }) as Record<string, unknown>;
}
