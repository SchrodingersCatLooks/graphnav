import { z } from 'zod';
import { editValuesSchema, itemKeySchema, newNodeSchema, newRelationshipSchema, pointSchema, viewSchema, LIMITS, type Locator } from '../graph/types';
import type { GraphRepository } from '../storage/repository';

export const sourceContextSchema = z.object({ kind: z.enum(['drive', 'docs']), sourceId: z.string().regex(/^[A-Za-z0-9_-]+$/).max(200) }).strict();
export type SourceContext = z.infer<typeof sourceContextSchema>;
export const scopeKey = (context: SourceContext) => `${context.kind}:${context.kind === 'drive' ? 'folder' : 'tabs'}:${context.sourceId}`;
export type Candidate = { key: string; title: string; kind: string; locator: Locator; parentKey?: string; path: string };
export type Catalog = { context: SourceContext; title: string; complete: boolean; items: Candidate[] };
type Methods = 'listGraphs' | 'readGraph' | 'createGraph' | 'addNode' | 'editNode' | 'connect' | 'setPersonalEdit' | 'removeItem' | 'savePosition' | 'saveView' | 'exportGraph' | 'importGraph';
export type EditorRepository = Pick<GraphRepository, Methods>;
const id = z.string().min(1).max(300), revision = z.number().int().nonnegative();
const request = <O extends string, S extends z.ZodType>(op: O, args: S) => z.object({ type: z.literal('EDITOR'), op: z.literal(op), args }).strict();
export const editorRequestSchema = z.discriminatedUnion('op', [
  request('listGraphs', z.tuple([])), request('readGraph', z.tuple([id])),
  request('createGraph', z.tuple([z.string().trim().min(1).max(200)])),
  request('createContextMap', z.tuple([z.string().trim().min(1).max(200), sourceContextSchema])),
  request('openPageMap', z.tuple([sourceContextSchema])),
  request('arrange', z.tuple([id, revision, z.array(z.object({ itemId: id, itemType: z.enum(['node', 'relationship']), ...pointSchema.shape }).strict()).max(LIMITS.nodes + LIMITS.relationships), z.boolean()])),
  request('attachSource', z.tuple([sourceContextSchema, id, revision, id, z.string().max(1500)])),
  request('addNode', z.tuple([id, revision, newNodeSchema])),
  request('editNode', z.tuple([id, revision, id, z.object({ label: z.string().trim().min(1).max(200), body: z.string().max(20_000), url: z.string().max(4000).optional() }).strict()])),
  request('connect', z.tuple([id, revision, newRelationshipSchema])),
  request('setPersonalEdit', z.tuple([itemKeySchema, revision, editValuesSchema])),
  request('removeItem', z.tuple([itemKeySchema, revision])),
  request('savePosition', z.tuple([itemKeySchema, pointSchema])),
  request('saveView', z.tuple([id, viewSchema])),
  request('exportGraph', z.tuple([id])), request('importGraph', z.tuple([z.string().max(LIMITS.exportBytes)])),
  request('catalog', z.tuple([sourceContextSchema, z.boolean()])),
  request('applySource', z.tuple([sourceContextSchema, id.nullable(), revision.nullable(), z.enum(['selected', 'baseline', 'refresh']), z.array(z.string().max(1500)).max(LIMITS.nodes)])),
]);
export type EditorRequest = z.infer<typeof editorRequestSchema>;
