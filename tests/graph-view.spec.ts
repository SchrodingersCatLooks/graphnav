import { test, expect } from '@playwright/test';
import { projectGraph } from '../lib/graph/view';
import type { GraphSnapshot, Members, Relationship } from '../lib/graph/types';

function snapshot(): GraphSnapshot {
  const stamps = { createdAt: 0, updatedAt: 0 };
  const edge = (id: string, kind: Relationship['kind'], members: Members): Relationship => ({ id, graphId: 'map', baseLabel: kind, kind, origin: 'manual', members, memberNodeIds: members.map((member) => member.nodeId), evidence: [], ...stamps });
  return {
    graph: { id: 'map', title: 'Cyclic relationships fixture', createdVia: 'manual', accountScope: null, contentRevision: 0, view: { x: 0, y: 0, zoom: 1 }, sourceBindings: [], ...stamps },
    nodes: ['root', 'child', 'grandchild', 'idea', 'remote'].map((id) => ({ id, graphId: 'map', kind: 'idea', origin: 'manual', baseLabel: id, body: '', evidence: [], ...stamps })),
    relationships: [
      edge('first', 'contains', [{ nodeId: 'root', role: 'from' }, { nodeId: 'child', role: 'to' }]),
      edge('second', 'contains', [{ nodeId: 'child', role: 'from' }, { nodeId: 'grandchild', role: 'to' }]),
      edge('cycle', 'contains', [{ nodeId: 'grandchild', role: 'from' }, { nodeId: 'root', role: 'to' }]),
      edge('personal', 'personal', [{ nodeId: 'root', role: 'peer' }, { nodeId: 'idea', role: 'peer' }]),
      edge('outside', 'personal', [{ nodeId: 'idea', role: 'peer' }, { nodeId: 'remote', role: 'peer' }]),
    ],
    sources: [], itemEdits: [], layoutItems: [],
  };
}

test('collapse follows containment cycles safely without deleting or following personal connections', () => {
  const graph = snapshot(), before = structuredClone(graph);
  expect(projectGraph(graph, '', null, ['root'], 0).nodes.map((node) => node.id)).toEqual(['idea', 'remote', 'root']);
  expect(projectGraph(graph, '', null, [], 0).nodes).toHaveLength(5);
  expect(graph).toEqual(before);
});

test('focus shows immediate neighbors, omits hidden relationships, and search uses personal labels', () => {
  const graph = snapshot();
  graph.itemEdits.push({ graphId: 'map', itemType: 'relationship', itemId: 'cycle', hidden: true, createdAt: 0, updatedAt: 0 });
  graph.itemEdits.push({ graphId: 'map', itemType: 'node', itemId: 'idea', displayLabel: 'My plan', createdAt: 0, updatedAt: 0 });
  expect(projectGraph(graph, '', 'root', [], 0).nodes.map((node) => node.id)).toEqual(['root', 'child', 'idea']);
  expect(projectGraph(graph, 'MY PLAN', null, [], 10).nodes.map((node) => node.id)).toEqual(['idea']);
  expect(projectGraph(graph, 'MY PLAN', null, [], 10).page).toBe(0);
});
