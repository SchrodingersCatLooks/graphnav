import { effectiveLabel, LIMITS, type GraphSnapshot } from './types';

export function projectGraph(snapshot: GraphSnapshot, query: string, focusId: string | null, collapsedIds: string[], page: number) {
  const hidden = new Set(snapshot.itemEdits.filter((edit) => edit.hidden).map((edit) => edit.itemId));
  const children = new Map<string, string[]>();
  for (const edge of snapshot.relationships) if (edge.kind === 'contains' && !hidden.has(edge.id)) {
    const from = edge.members.find((member) => member.role === 'from')?.nodeId;
    if (from) children.set(from, [...(children.get(from) ?? []), ...edge.members.filter((member) => member.role === 'to').map((member) => member.nodeId)]);
  }
  const collapsed = new Set<string>();
  for (const id of collapsedIds) {
    const visited = new Set([id]), pending = [...(children.get(id) ?? [])];
    while (pending.length) {
      const next = pending.pop()!;
      if (visited.has(next)) continue;
      visited.add(next); collapsed.add(next); pending.push(...(children.get(next) ?? []));
    }
  }
  const focus = focusId && snapshot.nodes.some((node) => node.id === focusId && !hidden.has(node.id)) ? new Set([focusId]) : null;
  if (focus) for (const edge of snapshot.relationships) if (!hidden.has(edge.id) && edge.members.some((member) => member.nodeId === focusId)) for (const member of edge.members) focus.add(member.nodeId);
  const matching = snapshot.nodes.filter((node) => !hidden.has(node.id) && !collapsed.has(node.id) && (!focus || focus.has(node.id)) && effectiveLabel(node, snapshot.itemEdits).toLowerCase().includes(query.trim().toLowerCase()));
  matching.sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId) || effectiveLabel(a, snapshot.itemEdits).localeCompare(effectiveLabel(b, snapshot.itemEdits), undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id));
  const pages = Math.max(1, Math.ceil(matching.length / LIMITS.visibleNodes));
  const current = Math.max(0, Math.min(page, pages - 1));
  return { nodes: matching.slice(current * LIMITS.visibleNodes, (current + 1) * LIMITS.visibleNodes), total: matching.length, page: current, pages, collapsedCount: collapsed.size };
}
