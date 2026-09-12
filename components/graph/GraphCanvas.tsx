import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType, Position, applyNodeChanges, type EdgeProps, type Node, type Edge, type Connection, type NodeChange, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { effectiveLabel, LIMITS, type GraphSnapshot, type ItemKey } from '../../lib/graph/types';
import { projectGraph } from '../../lib/graph/view';
import type { ReactNode } from 'react';

export type Selection = Pick<ItemKey, 'itemType' | 'itemId'>;
type ConnectionEdgeData = { itemId: string; offset: number; busy: boolean; select: Props['onSelect'] };
function ConnectionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data }: EdgeProps<Edge<ConnectionEdgeData>>) {
  let [path, x, y] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  if (data?.offset) {
    const middleY = (sourceY + targetY) / 2;
    path = `M ${sourceX},${sourceY} C ${sourceX + data.offset},${middleY} ${targetX + data.offset},${middleY} ${targetX},${targetY}`;
    x = (sourceX + targetX) / 2 + data.offset * .75;
    y = middleY;
  }
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} />
    {label && <EdgeLabelRenderer><button className="graph-edge-label react-flow__edge-text nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }} disabled={data?.busy} aria-label={`Edit connection: ${label}`} onClick={(event) => { event.stopPropagation(); data?.select({ itemType: 'relationship', itemId: data.itemId }); }}>{label}</button></EdgeLabelRenderer>}</>;
}
const edgeTypes = { connection: ConnectionEdge };
type FlowNode = Node<{ label: ReactNode; itemType: 'node' | 'relationship'; itemId: string }>;
type Props = {
  fit?: boolean;
  editable?: boolean;
  activeTabId?: string;
  focusId?: string | null; collapsedIds?: string[]; page?: number;
  snapshot: GraphSnapshot; query: string; busy: boolean;
  onSelect: (selection: Selection) => void;
  onOpen?: (nodeId: string) => void;
  onChooseConnection?: (nodeId: string) => void;
  connectingFrom?: string | null;
  onConnect: (connection: Connection) => void;
  onPosition: (selection: Selection, point: { x: number; y: number }) => void;
  onView: (view: Viewport) => void;
};
export function GraphCanvas({ snapshot, query, busy, onSelect, onOpen, onChooseConnection, connectingFrom, onConnect, onPosition, onView, fit = false, editable = true, activeTabId, focusId = null, collapsedIds = [], page = 0 }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const { initialNodes, edges, total, shown } = useMemo(() => {
    const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
    const projection = projectGraph(snapshot, query, focusId, collapsedIds, page);
    const visible = projection.nodes;
    const visibleIds = new Set(visible.map((node) => node.id));
    const labels = new Map(visible.map((node) => [node.id, effectiveLabel(node, snapshot.itemEdits)]));
    const position = (itemId: string, fallback: { x: number; y: number }) => {
      if (focusId) return fallback;
      const saved = snapshot.layoutItems.find((item) => item.itemId === itemId);
      return saved ? { x: saved.x, y: saved.y } : fallback;
    };
    const initialNodes: FlowNode[] = visible.map((node, index) => ({
      id: node.id, sourcePosition: Position.Bottom, targetPosition: Position.Top, position: position(node.id, { x: 80 + (index % 4) * 240, y: 80 + Math.floor(index / 4) * 150 }),
      data: { label: <><span className="node-kind">{node.locator?.kind === 'docs' ? node.locator.tabId ? 'Tab' : 'Document' : snapshot.sources.find((source) => source.id === node.sourceId)?.kind ?? 'Idea'}</span>{onOpen && node.locator ? <button className="node-title nodrag nopan" disabled={busy} aria-label={`Open ${effectiveLabel(node, snapshot.itemEdits)}`} onClick={(event) => { event.stopPropagation(); onOpen(node.id); }}>{effectiveLabel(node, snapshot.itemEdits)} <span aria-hidden="true">↗</span></button> : <span>{effectiveLabel(node, snapshot.itemEdits)}</span>}{snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable') && <span className="source-warning">Unavailable</span>}{onChooseConnection && <div className="node-actions"><button className="nodrag nopan" disabled={busy} aria-label={`Edit ${effectiveLabel(node, snapshot.itemEdits)}`} onClick={(event) => { event.stopPropagation(); onSelect({ itemType: 'node', itemId: node.id }); }}>Edit</button><button className="nodrag nopan" disabled={busy} aria-label={`Connect ${effectiveLabel(node, snapshot.itemEdits)}`} onClick={(event) => { event.stopPropagation(); onChooseConnection(node.id); }}>Connect</button></div>}</>, itemType: 'node', itemId: node.id },
      className: `${node.origin === 'imported' ? 'source-node' : 'personal-node'}${connectingFrom === node.id ? ' connecting-node' : ''}${snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable') ? ' unavailable-node' : ''}${node.locator?.kind === 'docs' && node.locator.tabId && node.locator.tabId === activeTabId ? ' current-node' : ''}`,
      ariaLabel: `Node: ${effectiveLabel(node, snapshot.itemEdits)}`,
    }));
    const edges: Edge[] = [];
    const pairCounts = new Map<string, number>();
    for (const relation of snapshot.relationships) {
      if (hidden.has(relation.id) || relation.members.some((member) => !visibleIds.has(member.nodeId))) continue;
      const label = effectiveLabel(relation, snapshot.itemEdits);
      if (relation.members.length === 2) {
        const from = relation.members.find((m) => m.role === 'from') ?? relation.members[0]!;
        const to = relation.members.find((m) => m.role === 'to') ?? relation.members[1]!;
        const pair = [from.nodeId, to.nodeId].sort().join(':');
        const count = pairCounts.get(pair) ?? 0;
        pairCounts.set(pair, count + 1);
        const offset = count === 0 ? 0 : Math.ceil(count / 2) * 100 * (count % 2 ? 1 : -1);
        edges.push({ id: relation.id, type: 'connection', source: from.nodeId, target: to.nodeId, label: relation.kind === 'contains' && label === 'contains' ? undefined : label, ariaLabel: `${label}: ${labels.get(from.nodeId)} to ${labels.get(to.nodeId)}`, className: relation.kind === 'contains' ? 'contains-edge' : 'personal-edge', data: { itemId: relation.id, offset, busy, select: onSelect }, markerEnd: to.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      } else {
        const id = `relationship:${relation.id}`;
        initialNodes.push({ id, sourcePosition: Position.Right, targetPosition: Position.Left, position: position(relation.id, { x: 340, y: 270 }), data: { label, itemType: 'relationship', itemId: relation.id }, className: 'relationship-junction', connectable: false, ariaLabel: `Group connection: ${label}` });
        for (const member of relation.members) edges.push({ id: `${relation.id}:${member.nodeId}`, source: member.role === 'to' ? id : member.nodeId, target: member.role === 'to' ? member.nodeId : id, data: { itemId: relation.id }, markerEnd: member.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      }
    }
    return { initialNodes, edges, total: projection.total, shown: visible.length };
  }, [snapshot, query, activeTabId, focusId, collapsedIds, page, onOpen, onChooseConnection, onSelect, busy, connectingFrom]);
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
      nodes={nodes} edges={edges} edgeTypes={edgeTypes} onNodesChange={changeNodes}
      onNodeClick={(_, node) => node.data.itemType === 'node' && onOpen ? onOpen(node.data.itemId) : onSelect({ itemType: node.data.itemType, itemId: node.data.itemId })}
      onEdgeClick={(_, edge) => onSelect({ itemType: 'relationship', itemId: String(edge.data?.itemId) })}
      onConnect={onConnect} nodesDraggable={editable && !busy && !focusId} nodesConnectable={editable && !busy}
      defaultViewport={snapshot.graph.view} minZoom={0.1} maxZoom={4}
      fitView={fit || (snapshot.graph.createdVia === 'import' && !snapshot.layoutItems.some((item) => item.pinned) && snapshot.graph.view.zoom === 1 && snapshot.graph.view.x === 0 && snapshot.graph.view.y === 0)}
      onMoveEnd={(_, view) => onView(view)}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionOnDrag={false}
    >
      <Background color="#cfddd8" gap={24} />
      <Controls showInteractive={false} fitViewOptions={{ padding: .15, minZoom: .1, maxZoom: 1 }} />
    </ReactFlow>
    {total === 0 && <div className="canvas-empty"><strong>{query ? 'No matching nodes' : 'Give your ideas a place.'}</strong><p>{query ? 'Try a different search.' : editable ? 'Add your first node, then connect it to another.' : 'Choose Edit graph to add ideas or existing source items.'}</p></div>}
    <div className="canvas-caption">{shown} of {total} matching nodes · {focusId ? 'Focus preview; saved positions unchanged' : editable ? 'Drag to arrange' : 'Click a source to open'} · Scroll to zoom{total > LIMITS.visibleNodes ? ' · Use page controls or search' : ''}</div>
  </div>;
}
