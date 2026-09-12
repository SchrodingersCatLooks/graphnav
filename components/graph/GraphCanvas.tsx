import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType, Position, applyNodeChanges, type Node, type Edge, type Connection, type NodeChange, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { effectiveLabel, LIMITS, type GraphSnapshot, type ItemKey } from '../../lib/graph/types';
import { projectGraph } from '../../lib/graph/view';
import type { ReactNode } from 'react';

export type Selection = Pick<ItemKey, 'itemType' | 'itemId'>;
type FlowNode = Node<{ label: ReactNode; itemType: 'node' | 'relationship'; itemId: string }>;
type Props = {
  fit?: boolean;
  activeTabId?: string;
  focusId?: string | null; collapsedIds?: string[]; page?: number;
  snapshot: GraphSnapshot; query: string; busy: boolean;
  onSelect: (selection: Selection) => void;
  onConnect: (connection: Connection) => void;
  onPosition: (selection: Selection, point: { x: number; y: number }) => void;
  onView: (view: Viewport) => void;
};
export function GraphCanvas({ snapshot, query, busy, onSelect, onConnect, onPosition, onView, fit = false, activeTabId, focusId = null, collapsedIds = [], page = 0 }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const { initialNodes, edges, total, shown } = useMemo(() => {
    const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
    const projection = projectGraph(snapshot, query, focusId, collapsedIds, page);
    const visible = projection.nodes;
    const visibleIds = new Set(visible.map((node) => node.id));
    const position = (itemId: string, fallback: { x: number; y: number }) => {
      if (focusId) return fallback;
      const saved = snapshot.layoutItems.find((item) => item.itemId === itemId);
      return saved ? { x: saved.x, y: saved.y } : fallback;
    };
    const initialNodes: FlowNode[] = visible.map((node, index) => ({
      id: node.id, sourcePosition: Position.Bottom, targetPosition: Position.Top, position: position(node.id, { x: 80 + (index % 4) * 240, y: 80 + Math.floor(index / 4) * 150 }),
      data: { label: <><span className="node-kind">{node.locator?.kind === 'docs' ? node.locator.tabId ? 'Tab' : 'Document' : snapshot.sources.find((source) => source.id === node.sourceId)?.kind ?? 'Idea'}</span><span>{effectiveLabel(node, snapshot.itemEdits)}</span>{snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable') && <span className="source-warning">Unavailable</span>}</>, itemType: 'node', itemId: node.id },
      className: `${node.origin === 'imported' ? 'source-node' : 'personal-node'}${snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable') ? ' unavailable-node' : ''}${node.locator?.kind === 'docs' && node.locator.tabId && node.locator.tabId === activeTabId ? ' current-node' : ''}`,
      ariaLabel: `Node: ${effectiveLabel(node, snapshot.itemEdits)}`,
    }));
    const edges: Edge[] = [];
    for (const relation of snapshot.relationships) {
      if (hidden.has(relation.id) || relation.members.some((member) => !visibleIds.has(member.nodeId))) continue;
      const label = effectiveLabel(relation, snapshot.itemEdits);
      if (relation.members.length === 2) {
        const from = relation.members.find((m) => m.role === 'from') ?? relation.members[0]!;
        const to = relation.members.find((m) => m.role === 'to') ?? relation.members[1]!;
        edges.push({ id: relation.id, source: from.nodeId, target: to.nodeId, label, className: relation.kind === 'contains' ? 'contains-edge' : 'personal-edge', data: { itemId: relation.id }, markerEnd: to.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      } else {
        const id = `relationship:${relation.id}`;
        initialNodes.push({ id, sourcePosition: Position.Right, targetPosition: Position.Left, position: position(relation.id, { x: 340, y: 270 }), data: { label, itemType: 'relationship', itemId: relation.id }, className: 'relationship-junction', connectable: false, ariaLabel: `Group connection: ${label}` });
        for (const member of relation.members) edges.push({ id: `${relation.id}:${member.nodeId}`, source: member.role === 'to' ? id : member.nodeId, target: member.role === 'to' ? member.nodeId : id, data: { itemId: relation.id }, markerEnd: member.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      }
    }
    return { initialNodes, edges, total: projection.total, shown: visible.length };
  }, [snapshot, query, activeTabId, focusId, collapsedIds, page]);
  useEffect(() => {
    setNodes((previous) => initialNodes.map((node) => ({ ...node, selected: previous.find((old) => old.id === node.id)?.selected ?? false })));
  }, [initialNodes]);

  function changeNodes(changes: NodeChange<FlowNode>[]) {
    setNodes((previous) => applyNodeChanges(changes, previous));
    // The final pointer change and keyboard movements both set dragging:false.
    for (const change of changes) if (change.type === 'position' && change.position && change.dragging === false) {
      const node = nodes.find((n) => n.id === change.id);
      if (node) onPosition({ itemType: node.data.itemType, itemId: node.data.itemId }, change.position);
    }
  }
  return <div className="canvas" aria-label="Graph canvas">
    <ReactFlow<FlowNode>
      fitViewOptions={{ padding: .15, minZoom: .1, maxZoom: 1 }}
      nodes={nodes} edges={edges} onNodesChange={changeNodes}
      onNodeClick={(_, node) => onSelect({ itemType: node.data.itemType, itemId: node.data.itemId })}
      onEdgeClick={(_, edge) => onSelect({ itemType: 'relationship', itemId: String(edge.data?.itemId) })}
      onConnect={onConnect} nodesDraggable={!busy && !focusId} nodesConnectable={!busy}
      defaultViewport={snapshot.graph.view} minZoom={0.1} maxZoom={4}
      fitView={fit || (snapshot.graph.createdVia === 'import' && !snapshot.layoutItems.some((item) => item.pinned) && snapshot.graph.view.zoom === 1 && snapshot.graph.view.x === 0 && snapshot.graph.view.y === 0)}
      onMoveEnd={(_, view) => onView(view)}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionOnDrag={false}
    >
      <Background color="#cfddd8" gap={24} />
      <Controls showInteractive={false} fitViewOptions={{ padding: .15, minZoom: .1, maxZoom: 1 }} />
    </ReactFlow>
    {total === 0 && <div className="canvas-empty"><strong>{query ? 'No matching nodes' : 'Give your ideas a place.'}</strong><p>{query ? 'Try a different search.' : 'Add your first node, then connect it to another.'}</p></div>}
    <div className="canvas-caption">{shown} of {total} matching nodes · {focusId ? 'Focus preview; saved positions unchanged' : 'Drag to arrange'} · Scroll to zoom{total > LIMITS.visibleNodes ? ' · Use page controls or search' : ''}</div>
  </div>;
}
