import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { graphDraftSchema } from '../lib/generation/types';
import { toGeminiSchema } from '../relay/src/providers';

/**
 * Gemini accepts an OpenAPI-flavoured subset of JSON Schema, not the whole
 * thing, and rejects the request outright when it meets a keyword it does not
 * define. Every rejection below was observed against the live API, so this
 * pins the translation rather than restating it.
 *
 * The schema only shapes the model's output; the extension revalidates the
 * answer, so dropping a constraint here loosens the hint and never the check.
 */

const converted = () => toGeminiSchema(z.toJSONSchema(graphDraftSchema, { io: 'output' }) as Record<string, unknown>);
const text = () => JSON.stringify(converted());

test('keywords Gemini rejects are removed from the whole tree', () => {
  // Each of these produced a 400 from the live API before being stripped.
  for (const keyword of ['"$schema"', '"$defs"', '"$ref"', '"const"', '"additionalProperties"', '"minItems"', '"maxItems"']) {
    expect(text(), `${keyword} must not survive translation`).not.toContain(keyword);
  }
});

test('a fixed string becomes a single-member enum, and a fixed number becomes a described number', () => {
  const schema = converted() as { properties: Record<string, { type?: string; enum?: unknown[]; description?: string }> };

  // Gemini's enum accepts strings only, so the numeric literal cannot use it.
  expect(schema.properties.draftVersion!.type).toBe('number');
  expect(schema.properties.draftVersion!.enum).toBeUndefined();
  expect(schema.properties.draftVersion!.description).toContain('exactly 1');
});

test('definitions are inlined, since Gemini cannot follow a reference', () => {
  const schema = converted() as {
    properties: { relationships: { items: { properties: { from: { anyOf?: unknown[] } } } } };
  };
  // The endpoint union survives as anyOf with its members expanded in place.
  const from = schema.properties.relationships.items.properties.from;
  expect(Array.isArray(from.anyOf)).toBe(true);
  expect(JSON.stringify(from)).not.toContain('$ref');
});

test('the shape a draft must take is still described', () => {
  const schema = converted() as {
    type: string;
    required: string[];
    properties: { nodes: { type: string; items: { required: string[] } } };
  };

  expect(schema.type).toBe('object');
  expect(schema.required.sort()).toEqual(['draftVersion', 'inputHash', 'nodes', 'relationships']);
  expect(schema.properties.nodes.type).toBe('array');
  // Evidence stays mandatory: a proposal with no citation is not wanted even as a draft.
  expect(schema.properties.nodes.items.required).toContain('evidencePassageIds');
});
