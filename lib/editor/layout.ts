import ELK from 'elkjs/lib/elk.bundled.js';
const elk = new ELK();

/** Runs with the shared editor in an isolated script world. It computes geometry, never relationships. */
export async function sourceLayout(ids: string[], links: { from: string; to: string }[], sizes = new Map<string, { width: number; height: number }>()) {
  const available = new Set(ids);
  const result = await elk.layout({
    id: 'layout-root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.spacing.nodeNode': '44', 'elk.layered.spacing.nodeNodeBetweenLayers': '65', 'elk.padding': '[top=40,left=40,bottom=40,right=40]' },
    children: ids.map((id) => ({ id, width: sizes.get(id)?.width ?? 190, height: sizes.get(id)?.height ?? 96 })),
    edges: links.filter((edge) => edge.from !== edge.to && available.has(edge.from) && available.has(edge.to)).map((edge, index) => ({ id: `edge-${index}`, sources: [edge.from], targets: [edge.to] })),
  });
  const nodes = result.children ?? [];
  if (nodes.length && Math.max(...nodes.map((node) => node.x ?? 0)) > 1500) {
    // Wide sibling layers are unreadable in a docked panel. Keep ELK's layer
    // and sibling order, but wrap each band into rows of at most five cards.
    const layers = new Map<number, typeof nodes>();
    for (const node of nodes) {
      const y = Math.round(node.y ?? 0);
      layers.set(y, [...(layers.get(y) ?? []), node]);
    }
    const columns = Math.min(5, Math.max(...[...layers.values()].map((layer) => layer.length)));
    const columnWidth = Math.max(...nodes.map((node) => node.width ?? 190)) + 44;
    const rowHeight = Math.max(...nodes.map((node) => node.height ?? 96)) + 50;
    let top = 40;
    for (const [, layer] of [...layers].sort(([a], [b]) => a - b)) {
      layer.sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      layer.forEach((node, index) => {
        node.x = 40 + (index % columns) * columnWidth + (layer.length < columns ? (columns - layer.length) * columnWidth / 2 : 0);
        node.y = top + Math.floor(index / columns) * rowHeight;
      });
      top += Math.ceil(layer.length / columns) * rowHeight + 65;
    }
  }
  return new Map(nodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}
