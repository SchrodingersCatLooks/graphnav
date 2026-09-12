import { useEffect, useRef, useState } from 'react';
import { TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PdfLocator } from '../../lib/pdf/navigation';
import './text-layer.css';

export function PdfPage({ document: pdf, target, zoom }: { document: PDFDocumentProxy; target: PdfLocator; zoom: number }) {
  const scroll = useRef<HTMLDivElement>(null), paper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700), [loading, setLoading] = useState(true), [error, setError] = useState(''), [empty, setEmpty] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => { if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width); });
    observer.observe(scroll.current!); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true, render: RenderTask | undefined, textLayer: TextLayer | undefined;
    setLoading(true); setError(''); setEmpty(false);
    const host = paper.current!;
    host.removeAttribute('data-page');
    void (async () => {
      try {
        const page = await pdf.getPage(target.pageIndex + 1);
        if (!active) return;
        const original = page.getViewport({ scale: 1 });
        const scale = Math.max(.1, (width - 48) / original.width) * zoom;
        const viewport = page.getViewport({ scale });
        const density = Math.min(devicePixelRatio || 1, 2, Math.sqrt(16_000_000 / (viewport.width * viewport.height)));
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width * density); canvas.height = Math.ceil(viewport.height * density);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute('aria-hidden', 'true');
        const text = document.createElement('div'); text.className = 'textLayer';
        host.style.width = `${viewport.width}px`; host.style.height = `${viewport.height}px`;
        host.style.setProperty('--total-scale-factor', String(scale));
        host.replaceChildren(canvas, text);
        render = page.render({ canvas, viewport, transform: [density, 0, 0, density, 0, 0] });
        const [, content] = await Promise.all([render.promise, page.getTextContent()]);
        if (!active) return;
        textLayer = new TextLayer({ textContentSource: content, container: text, viewport });
        await textLayer.render();
        if (!active) return;
        setEmpty(!content.items.some((item) => 'str' in item && item.str.trim()));
        host.dataset.page = String(target.pageIndex + 1);
        host.setAttribute('aria-label', `PDF page ${target.pageIndex + 1}`);
        if (target.point) {
          const [x0, y0, x1, y1] = page.view;
          const [x, y] = viewport.convertToViewportPoint(target.point.x * Math.abs(x1! - x0!), (1 - target.point.y) * Math.abs(y1! - y0!));
          const anchor = document.createElement('div'); anchor.className = 'pdf-anchor'; anchor.setAttribute('aria-label', 'Section destination');
          anchor.style.left = `${Math.max(0, Math.min(viewport.width - 12, x))}px`;
          anchor.style.top = `${Math.max(0, Math.min(viewport.height - 12, y))}px`;
          host.append(anchor);
          scroll.current!.scrollTo({ top: Math.max(0, y - 80), left: Math.max(0, x - 80) });
        } else scroll.current!.scrollTo({ top: 0, left: 0 });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'This page could not be rendered.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; render?.cancel(); textLayer?.cancel(); };
  }, [pdf, target, width, zoom]);
  return <div className="pdf-viewer">
    {loading && <p className="reader-notice" role="status">Rendering page {target.pageIndex + 1}…</p>}
    {error && <p className="reader-error" role="alert">{error}</p>}
    {empty && !loading && <p className="reader-notice">This page has no selectable text. Page navigation works; OCR is not available.</p>}
    <div className="pdf-scroll" ref={scroll}><div className="pdf-paper" role="region" aria-label="PDF page" ref={paper} /></div>
  </div>;
}
