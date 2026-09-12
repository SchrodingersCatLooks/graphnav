import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, BaseEdge, EdgeLabelRenderer, EdgeToolbar, NodeResizer, Handle, useConnection, useReactFlow, useViewport, useStore, ConnectionMode, getBezierPath, MarkerType, Position, applyNodeChanges, type EdgeProps, type NodeProps, type Node, type Edge, type Connection, type NodeChange, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { directedMembers, effectiveConnection, effectiveLabel, LIMITS, type ConnectionValues, type GraphSnapshot, type ItemKey } from '../../lib/graph/types';
import { projectGraph } from '../../lib/graph/view';
import { ConnectionPopup, type ConnectionEditor } from './ConnectionPopup';

export type Selection = Pick<ItemKey, 'itemType' | 'itemId'>;
export type Geometry = { x: number; y: number; width?: number; height?: number };
type ConnectionEdgeData = { itemId: string; offset: number; busy: boolean; from: string; to: string; value: ConnectionValues; editor?: ConnectionEditor; select: Props['onSelect'] };
function ConnectionControls({ id, x, y, data }: { id: string; x: number; y: number; data: ConnectionEdgeData }) {
  const view = useViewport(), width = useStore((state) => state.width), height = useStore((state) => state.height);
  const container = useRef<HTMLDivElement>(null), [size, setSize] = useState({ width: 320, height: 350 });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.offsetWidth, height: element.offsetHeight }));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const px = Math.max(8, Math.min(width - size.width - 8, x * view.zoom + view.x - size.width / 2));
  const py = Math.max(8, Math.min(height - size.height - 8, y * view.zoom + view.y - size.height - 18));
  return <EdgeToolbar edgeId={id} x={(px - view.x) / view.zoom} y={(py - view.y) / view.zoom} alignX="left" alignY="top" isVisible>
    <div ref={container} style={{ maxHeight: Math.max(80, height - 16), maxWidth: Math.max(120, width - 16), overflow: 'auto', borderRadius: 13 }}><ConnectionPopup from={data.from} to={data.to} editor={data.editor!} /></div>
  </EdgeToolbar>;
}
function ConnectionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data }: EdgeProps<Edge<ConnectionEdgeData>>) {
  let [path, x, y] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  if (data?.offset) {
    const middleY = (sourceY + targetY) / 2;
    path = `M ${sourceX},${sourceY} C ${sourceX + data.offset},${middleY} ${targetX + data.offset},${middleY} ${targetX},${targetY}`;
    x = (sourceX + targetX) / 2 + data.offset * .75; y = middleY;
  }
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={32} />
    {label !== undefined && <EdgeLabelRenderer><button className="graph-edge-label react-flow__edge-text nodrag nopan" style={{ pointerEvents: 'all', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }} disabled={data?.busy} aria-label={label ? `Edit connection: ${label}` : `Add label: ${data?.from} to ${data?.to}`} onClick={(event) => { event.stopPropagation(); data?.select({ itemType: 'relationship', itemId: data.itemId }); }}>{label || 'Add label'}</button></EdgeLabelRenderer>}
    {data?.editor && <ConnectionControls key={id} id={id} x={x} y={y} data={data} />}
  </>;
}
type CardData = { label: string; kind?: string; itemType: 'node' | 'relationship'; itemId: string; editable?: boolean; busy?: boolean; dense?: boolean; unavailable?: boolean; onResize?: (point: Geometry) => void; onOpen?: () => void; onEdit?: () => void; onConnect?: () => void; connectingFrom?: string | null };
type FlowNode = Node<CardData>;
function GraphCard({ id, data, selected }: NodeProps<FlowNode>) {
  const connection = useConnection(), clickStart = useStore((state) => state.connectionClickStartHandle?.nodeId);
  const start = connection.inProgress ? connection.fromNode.id : clickStart ?? data.connectingFrom;
  const eligible = !!start && start !== id && !data.busy;
  return <div className={`graph-card${data.dense ? ' dense-card' : ''}${eligible ? ' connection-target' : ''}`}>
    <NodeResizer isVisible={selected && !!data.editable && !data.busy} minWidth={120} minHeight={64} maxWidth={1000} maxHeight={800} handleClassName="card-resize-handle" lineClassName="card-resize-line" onResizeEnd={(_, point) => data.onResize?.({ x: point.x, y: point.y, width: point.width, height: point.height })} />
    {[Position.Left, Position.Top, Position.Right, Position.Bottom].map((position) => <Handle key={position} id={position} type="source" position={position} className="card-handle" isConnectable={!!data.editable && !data.busy} />)}
    <div className="card-copy"><span className="node-kind">{data.kind}</span><span className="card-title" title={data.label}>{data.label}</span>{data.unavailable && <span className="source-warning">Unavailable</span>}</div>
    {data.onOpen && <button className="card-open nodrag nopan" aria-label={`Open ${data.label}`} title="Open original source" disabled={data.busy} onClick={(event) => { event.stopPropagation(); data.onOpen?.(); }}>↗</button>}
    {data.editable && <div className="node-actions"><button className="nodrag nopan" disabled={data.busy} aria-label={`Edit ${data.label}`} onClick={(event) => { event.stopPropagation(); data.onEdit?.(); }}>Edit</button><button className="nodrag nopan" disabled={data.busy} aria-label={`Connect ${data.label}`} onClick={(event) => { event.stopPropagation(); data.onConnect?.(); }}>Connect</button></div>}
  </div>;
}
function FocusNode({ request }: { request?: { id: string; nonce: number } }) {
  const flow = useReactFlow();
  useEffect(() => { if (request) { const frame = requestAnimationFrame(() => void flow.fitView({ nodes: [{ id: request.id }], padding: .8, minZoom: .5, maxZoom: 1, duration: 200 })); return () => cancelAnimationFrame(frame); } }, [request, flow]);
  return null;
}
const edgeTypes = { connection: ConnectionEdge }, nodeTypes = { card: GraphCard };
type Props = {
  fit?: boolean; editable?: boolean; activeTabId?: string;
  focusRequest?: { id: string; nonce: number }; connectionEditor?: ConnectionEditor;
  focusId?: string | null; collapsedIds?: string[]; page?: number;
  snapshot: GraphSnapshot; query: string; busy: boolean;
  onSelect: (selection: Selection) => void; onOpen?: (nodeId: string) => void;
  onChooseConnection?: (nodeId: string) => void; connectingFrom?: string | null;
  onConnect: (connection: Connection) => void;
  onPosition: (selection: Selection, point: Geometry) => void;
  onView: (view: Viewport) => void;
};
export function GraphCanvas({ snapshot, query, busy, onSelect, onOpen, onChooseConnection, connectingFrom, onConnect, onPosition, onView, connectionEditor, focusRequest, fit = false, editable = true, activeTabId, focusId = null, collapsedIds = [], page = 0 }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const resizing = useRef(false);
  const { initialNodes, edges, total, shown } = useMemo(() => {
    const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
    const projection = projectGraph(snapshot, query, focusId, collapsedIds, page), visible = projection.nodes;
    const visibleIds = new Set(visible.map((node) => node.id));
    const labels = new Map(visible.map((node) => [node.id, effectiveLabel(node, snapshot.itemEdits)]));
    const savedItems = new Map(snapshot.layoutItems.map((item) => [item.itemId, item]));
    const position = (itemId: string, fallback: { x: number; y: number }) => {
      if (focusId) return fallback;
      const saved = savedItems.get(itemId); return saved ? { x: saved.x, y: saved.y } : fallback;
    };
    const dense = projection.total >= 20;
    const initialNodes: FlowNode[] = visible.map((node, index) => ({
      id: node.id, type: 'card', position: position(node.id, { x: 80 + (index % 4) * 240, y: 80 + Math.floor(index / 4) * 150 }),
      style: { width: savedItems.get(node.id)?.width ?? (dense ? 150 : 190), height: savedItems.get(node.id)?.height ?? (dense ? 72 : 96) },
      data: { label: effectiveLabel(node, snapshot.itemEdits), kind: node.locator?.kind === 'docs' ? node.locator.tabId ? 'Tab' : 'Document' : snapshot.sources.find((source) => source.id === node.sourceId)?.kind ?? 'Idea', itemType: 'node', itemId: node.id, editable: editable && !focusId, busy, dense, connectingFrom,
        unavailable: snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable'),
        onResize: (point) => { resizing.current = false; onPosition({ itemType: 'node', itemId: node.id }, point); },
        onOpen: onOpen && node.locator ? () => onOpen(node.id) : undefined,
        onEdit: () => onSelect({ itemType: 'node', itemId: node.id }), onConnect: () => onChooseConnection?.(node.id),
      },
      className: `${node.origin === 'imported' ? 'source-node' : 'personal-node'}${connectingFrom === node.id ? ' connecting-node' : ''}${snapshot.sources.some((source) => source.id === node.sourceId && source.availability === 'unavailable') ? ' unavailable-node' : ''}${node.locator?.kind === 'docs' && node.locator.tabId && node.locator.tabId === activeTabId ? ' current-node' : ''}`,
      ariaLabel: `Node: ${effectiveLabel(node, snapshot.itemEdits)}`,
    }));
    const edges: Edge[] = [], pairCounts = new Map<string, number>();
    for (const relation of snapshot.relationships) {
      if (hidden.has(relation.id) || relation.members.some((member) => !visibleIds.has(member.nodeId))) continue;
      const value = effectiveConnection(relation, snapshot.itemEdits), members = directedMembers(relation, snapshot.itemEdits);
      if (members.length === 2) {
        const from = members.find((member) => member.role === 'from') ?? members[0]!, to = members.find((member) => member.role === 'to') ?? members[1]!;
        const baseFrom = relation.members.find((member) => member.role === 'from') ?? relation.members[0]!, baseTo = relation.members.find((member) => member.role === 'to') ?? relation.members[1]!;
        const pair = [from.nodeId, to.nodeId].sort().join(':'), count = pairCounts.get(pair) ?? 0;
        pairCounts.set(pair, count + 1);
        const offset = count === 0 ? 0 : Math.ceil(count / 2) * 100 * (count % 2 ? 1 : -1);
        const source = initialNodes.find((node) => node.id === from.nodeId)!, target = initialNodes.find((node) => node.id === to.nodeId)!;
        const dx = target.position.x + Number(target.style?.width) / 2 - source.position.x - Number(source.style?.width) / 2;
        const dy = target.position.y + Number(target.style?.height) / 2 - source.position.y - Number(source.style?.height) / 2;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const sourceHandle = vertical ? dy >= 0 ? 'bottom' : 'top' : dx >= 0 ? 'right' : 'left';
        const targetHandle = vertical ? dy >= 0 ? 'top' : 'bottom' : dx >= 0 ? 'left' : 'right';
        edges.push({ id: relation.id, type: 'connection', source: from.nodeId, target: to.nodeId, sourceHandle, targetHandle, label: relation.kind === 'contains' && value.label === 'contains' ? undefined : value.label, ariaLabel: `${value.label || 'Connection'}: ${labels.get(from.nodeId)} to ${labels.get(to.nodeId)}`, className: relation.kind === 'contains' ? 'contains-edge' : 'personal-edge', data: { itemId: relation.id, offset, busy, select: onSelect, from: labels.get(baseFrom.nodeId), to: labels.get(baseTo.nodeId), value, editor: connectionEditor?.id === relation.id ? connectionEditor : undefined }, markerEnd: to.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      } else {
        const id = `relationship:${relation.id}`;
        initialNodes.push({ id, type: 'default', sourcePosition: Position.Right, targetPosition: Position.Left, position: position(relation.id, { x: 340, y: 270 }), data: { label: value.label, itemType: 'relationship', itemId: relation.id }, className: 'relationship-junction', connectable: false, ariaLabel: `Group connection: ${value.label}` });
        for (const member of members) edges.push({ id: `${relation.id}:${member.nodeId}`, source: member.role === 'to' ? id : member.nodeId, target: member.role === 'to' ? member.nodeId : id, sourceHandle: member.role === 'to' ? undefined : 'right', targetHandle: member.role === 'to' ? 'left' : undefined, data: { itemId: relation.id }, markerEnd: member.role === 'to' ? { type: MarkerType.ArrowClosed } : undefined });
      }
    }
    return { initialNodes, edges, total: projection.total, shown: visible.length };
  }, [snapshot, query, activeTabId, focusId, collapsedIds, page, onOpen, onChooseConnection, onSelect, onPosition, busy, editable, connectingFrom, connectionEditor]);
  useEffect(() => {
    setNodes((previous) => initialNodes.map((node) => {
      const old = previous.find((value) => value.id === node.id);
      return { ...old, ...node, selected: old?.selected ?? false };
    }));
  }, [initialNodes]);
  useEffect(() => { if (focusRequest) setNodes((previous) => previous.map((node) => ({ ...node, selected: node.id === focusRequest.id }))); }, [focusRequest]);
  function changeNodes(changes: NodeChange<FlowNode>[]) {
    if (changes.some((change) => change.type === 'dimensions' && change.resizing)) resizing.current = true;
    setNodes((previous) => applyNodeChanges(changes, previous));
    for (const change of changes) if (!resizing.current && change.type === 'position' && change.position && change.dragging === false) {
      const node = nodes.find((n) => n.id === change.id);
      if (node) onPosition({ itemType: node.data.itemType, itemId: node.data.itemId }, change.position);
    }
  }
  return <div className="canvas" aria-label="Graph canvas">
    <ReactFlow<FlowNode>
      fitViewOptions={{ padding: .15, minZoom: .1, maxZoom: 1 }} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={changeNodes}
      onNodeClick={(_, node) => { if (node.data.itemType === 'relationship') onSelect({ itemType: 'relationship', itemId: node.data.itemId }); else if (connectingFrom) onChooseConnection?.(node.id); }}
      onEdgeClick={(_, edge) => onSelect({ itemType: 'relationship', itemId: String(edge.data?.itemId) })}
      onConnect={onConnect} connectionMode={ConnectionMode.Loose} connectOnClick connectionRadius={40} isValidConnection={(connection) => connection.source !== connection.target}
      nodesDraggable={editable && !busy && !focusId} nodesConnectable={editable && !busy}
      defaultViewport={snapshot.graph.view} minZoom={0.1} maxZoom={4}
      fitView={fit || (snapshot.graph.createdVia === 'import' && !snapshot.layoutItems.some((item) => item.pinned) && snapshot.graph.view.zoom === 1 && snapshot.graph.view.x === 0 && snapshot.graph.view.y === 0)}
      onMoveEnd={(_, view) => onView(view)} deleteKeyCode={null} multiSelectionKeyCode={null} selectionOnDrag={false}
    >
      <FocusNode request={focusRequest} /><Background color="#cfddd8" gap={24} /><Controls showInteractive={false} fitViewOptions={{ padding: .15, minZoom: .1, maxZoom: 1 }} />
    </ReactFlow>
    {total === 0 && <div className="canvas-empty"><strong>{query ? 'No matching nodes' : 'Give your ideas a place.'}</strong><p>{query ? 'Try a different search.' : 'Use Add to choose source items or create an idea.'}</p></div>}
    <div className="canvas-caption">{shown} of {total} matching nodes · {focusId ? 'Focus preview; saved positions unchanged' : editable ? 'Drag to arrange' : 'Select a node; use ↗ to open'} · Scroll to zoom{total > LIMITS.visibleNodes ? ' · Use page controls or search' : ''}</div>
  </div>;
}
