import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType, Position, applyNodeChanges, type Node, type Edge, type Connection, type NodeChange, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { effectiveLabel, LIMITS, type GraphSnapshot, type ItemKey } from '../../lib/graph/types';

export type Selection = Pick<ItemKey, 'itemType' | 'itemId'>;
type FlowNode = Node<{ label: string; itemType: 'node' | 'relationship'; itemId: string }>;
type Props = {
  fit?: boolean;
  activeTabId?: string;
  snapshot: GraphSnapshot; query: string; busy: boolean;
  onSelect: (selection: Selection) => void;
  onConnect: (connection: Connection) => void;
  onPosition: (selection: Selection, point: { x: number; y: number }) => void;
  onView: (view: Viewport) => void;
};
export function GraphCanvas({ snapshot, query, busy, onSelect, onConnect, onPosition, onView, fit = false, activeTabId }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const { initialNodes, edges, total } = useMemo(() => {
    const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
    const available = snapshot.nodes.filter((node) => !hidden.has(node.id) && effectiveLabel(node, snapshot.itemEdits).toLowerCase().includes(query.toLowerCase()));
    const visible = available.slice(0, LIMITS.visibleNodes);
    const visibleIds = new Set(visible.map((node) => node.id));
    const position = (itemId: string, fallback: { x: number; y: number }) => {
      const saved = snapshot.layoutItems.find((item) => item.itemId === itemId);
      return saved ? { x: saved.x, y: saved.y } : fallback;
    };
    const initialNodes: FlowNode[] = visible.map((node, index) => ({
      id: node.id, sourcePosition: Position.Bottom, targetPosition: Position.Top, position: position(node.id, { x: 80 + (index % 4) * 240, y: 80 + Math.floor(index / 4) * 150 }),
      data: { label: effectiveLabel(node, snapshot.itemEdits), itemType: 'node', itemId: node.id },
      className: `${node.origin === 'imported' ? 'source-node' : 'personal-node'}${node.locator?.kind === 'docs' && node.locator.tabId && node.locator.tabId === activeTabId ? ' current-node' : ''}`,
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
    return { initialNodes, edges, total: available.length };
  }, [snapshot, query, activeTabId]);
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
      nodes={nodes} edges={edges} onNodesChange={changeNodes}
      onNodeClick={(_, node) => onSelect({ itemType: node.data.itemType, itemId: node.data.itemId })}
      onEdgeClick={(_, edge) => onSelect({ itemType: 'relationship', itemId: String(edge.data?.itemId) })}
      onConnect={onConnect} nodesDraggable={!busy} nodesConnectable={!busy}
      defaultViewport={snapshot.graph.view} minZoom={0.1} maxZoom={4}
      fitView={fit || (snapshot.graph.createdVia === 'import' && !snapshot.layoutItems.some((item) => item.pinned) && snapshot.graph.view.zoom === 1 && snapshot.graph.view.x === 0 && snapshot.graph.view.y === 0)}
      onMoveEnd={(_, view) => onView(view)}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionOnDrag={false}
    >
      <Background color="#cfddd8" gap={24} />
      <Controls showInteractive={false} />
    </ReactFlow>
    {total === 0 && <div className="canvas-empty"><strong>{query ? 'No matching nodes' : 'Give your ideas a place.'}</strong><p>{query ? 'Try a different search.' : 'Add your first node, then connect it to another.'}</p></div>}
    <div className="canvas-caption">{Math.min(total, LIMITS.visibleNodes)} of {total} matching nodes · Drag to arrange · Scroll to zoom{total > LIMITS.visibleNodes ? ' · Search to focus' : ''}</div>
  </div>;
}
