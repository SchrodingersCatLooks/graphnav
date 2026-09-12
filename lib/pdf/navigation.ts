import type { Locator } from '../graph/types';
export type PdfLocator = Extract<Locator, { kind: 'pdf' }>;
export function pdfReaderPath(locator: PdfLocator, graphId?: string) {
  const params = new URLSearchParams({ fingerprint: locator.fingerprint, page: String(locator.pageIndex + 1) });
  if (graphId) params.set('map', graphId);
  if (locator.point) { params.set('x', String(locator.point.x)); params.set('y', String(locator.point.y)); }
  return `/reader.html?${params}`;
}
