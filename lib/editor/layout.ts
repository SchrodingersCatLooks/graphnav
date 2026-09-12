import ELK from 'elkjs/lib/elk.bundled.js';
const elk = new ELK();

/** Runs with the shared editor in an isolated script world. It computes geometry, never relationships. */
export async function sourceLayout(ids: string[], links: { from: string; to: string }[]) {
  const available = new Set(ids);
  const result = await elk.layout({
    id: 'layout-root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.spacing.nodeNode': '44', 'elk.layered.spacing.nodeNodeBetweenLayers': '65', 'elk.padding': '[top=40,left=40,bottom=40,right=40]' },
    children: ids.map((id) => ({ id, width: 178, height: 72 })),
    edges: links.filter((edge) => edge.from !== edge.to && available.has(edge.from) && available.has(edge.to)).map((edge, index) => ({ id: `edge-${index}`, sources: [edge.from], targets: [edge.to] })),
  });
  return new Map((result.children ?? []).map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}
