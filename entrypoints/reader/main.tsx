import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GraphMark } from '../../components/GraphMark';
import { GraphEditor } from '../../components/editor/GraphEditor';
import { PdfSourcePicker } from '../../components/pdf/PdfSourcePicker';
import { PdfPage } from '../../components/pdf/PdfPage';
import { PdfLibrary, PDF_LIMITS } from '../../lib/pdf/library';
import { extractSections, fingerprintPdf, type PdfDocumentLike, type PdfExtraction } from '../../lib/pdf/extract';
import { pdfReaderPath, type PdfLocator } from '../../lib/pdf/navigation';
import { loadPdf } from '../../lib/pdf/runtime';
import { locatorSchema } from '../../lib/graph/types';
import { storageError } from '../../lib/storage/repository';
import { extractSelectedPages } from '../../lib/pdf/selected-text';
import type { GenerationSource } from '../../lib/generation/selection';
import './style.css';

const library = new PdfLibrary();
type Loaded = { key: number; document: PDFDocumentProxy; extraction: PdfExtraction; title: string; initialGraphId: string | null };
function Reader() {
  const input = useRef<HTMLInputElement>(null), loadSequence = useRef(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null), currentDocument = useRef<PDFDocumentProxy | null>(null);
  const [savedPdfs, setSavedPdfs] = useState<Awaited<ReturnType<PdfLibrary['list']>>>([]);
  const [loading, setLoading] = useState(false), [graphBusy, setGraphBusy] = useState(false), [error, setError] = useState('');
  const [missing, setMissing] = useState<string | null>(null), [target, setTarget] = useState<PdfLocator | null>(null), [zoom, setZoom] = useState(1);
  const targetRef = useRef<PdfLocator | null>(null), mapRef = useRef<string | undefined>(undefined);
  const params = useRef(new URLSearchParams(location.search));
  const generationSource = useMemo<GenerationSource | undefined>(() => loaded ? {
    id: `pdf:${loaded.extraction.fingerprint}`, kind: 'pdf',
    disclosure: 'Only the pages you choose are read for this preview. The PDF stays on this laptop; previewing sends nothing to AI.',
    choices: async () => Array.from({ length: loaded.document.numPages }, (_, pageIndex) => ({ id: String(pageIndex), title: `Page ${pageIndex + 1}`, detail: loaded.extraction.sections.filter((section) => section.pageIndex === pageIndex).map((section) => section.title).join(' · ') })),
    read: (ids, signal) => extractSelectedPages(loaded.document, loaded.extraction.fingerprint, ids.map(Number), signal),
  } : undefined, [loaded]);
  async function refreshLibrary() { setSavedPdfs(await library.list()); }
  function goTo(locator: PdfLocator, mapId = mapRef.current) {
    targetRef.current = locator; setTarget(locator); mapRef.current = mapId;
    history.replaceState(null, '', pdfReaderPath(locator, mapId));
  }
  async function prepare(bytes: Uint8Array, name: string, save: boolean, expected?: string, requested?: PdfLocator, mapId?: string) {
    if (!bytes.length || bytes.length > PDF_LIMITS.bytes) throw new Error('Choose a PDF up to 20 MiB.');
    const fingerprint = await fingerprintPdf(bytes);
    if (expected && fingerprint !== expected) throw new Error('This is a different PDF. Reattach the exact original file, or open a different PDF separately.');
    const task = loadPdf(bytes);
    let passwordRequired = false;
    task.onPassword = () => { passwordRequired = true; void task.destroy(); };
    let pdf: PDFDocumentProxy;
    try { pdf = await task.promise; }
    catch (reason) { throw new Error(passwordRequired ? 'Password-protected PDFs are not supported yet. Choose an unlocked copy.' : reason instanceof Error ? reason.message : 'This PDF could not be opened.'); }
    try {
      if (pdf.numPages > PDF_LIMITS.pages) throw new Error('This reader supports PDFs up to 300 pages. Choose a shorter PDF.');
      const extraction = await extractSections(pdf as unknown as PdfDocumentLike, fingerprint);
      extraction.sections = extraction.sections.filter((section) => section.pageIndex >= 0 && section.pageIndex < pdf.numPages).map((section) => ({ ...section, title: section.title.slice(0, 200) }));
      if (save) await library.save(bytes, name, expected);
      const initialGraphId = mapId ?? await library.findMap(fingerprint) ?? null;
      await refreshLibrary();
      const old = currentDocument.current; currentDocument.current = pdf;
      setLoaded({ key: ++loadSequence.current, document: pdf, extraction, title: name, initialGraphId }); setMissing(null); setZoom(1);
      goTo(requested && requested.pageIndex < pdf.numPages ? requested : { kind: 'pdf', fingerprint, pageIndex: 0 }, initialGraphId ?? undefined);
      if (requested && requested.pageIndex >= pdf.numPages) setError('That page is outside this PDF. Opened page 1 instead.');
      if (old) void old.loadingTask.destroy();
    } catch (reason) { await pdf.loadingTask.destroy(); throw reason; }
  }
  async function openSaved(fingerprint: string, requested?: PdfLocator, mapId?: string) {
    setLoading(true); setError('');
    try {
      const stored = await library.read(fingerprint);
      if (!stored) { setMissing(fingerprint); if (requested) goTo(requested, mapId); return; }
      await prepare(new Uint8Array(await stored.blob.arrayBuffer()), stored.name ?? 'Saved PDF', false, fingerprint, requested, mapId);
    } catch (reason) { setError(storageError(reason)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void refreshLibrary().catch((reason) => setError(storageError(reason)));
    const fingerprint = params.current.get('fingerprint');
    if (fingerprint) {
      const x = params.current.get('x'), y = params.current.get('y');
      const parsed = locatorSchema.safeParse({ kind: 'pdf', fingerprint, pageIndex: Number(params.current.get('page') ?? '1') - 1, ...(x !== null && y !== null ? { point: { x: Number(x), y: Number(y) } } : {}) });
      if (parsed.success && parsed.data.kind === 'pdf') void openSaved(fingerprint, parsed.data, params.current.get('map') ?? undefined);
      else setError('This PDF link is invalid. Choose a file from your library or open a PDF.');
    }
    return () => { void currentDocument.current?.loadingTask.destroy(); };
  }, []);
  async function choose(file: File) {
    setLoading(true); setError('');
    try {
      if (file.size > PDF_LIMITS.bytes) throw new Error('Choose a PDF up to 20 MiB.');
      const requested = missing ? targetRef.current ?? undefined : undefined;
      await prepare(new Uint8Array(await file.arrayBuffer()), file.name.slice(0, 200), true, missing ?? undefined, requested, missing ? mapRef.current : undefined);
    } catch (reason) { setError(storageError(reason)); }
    finally { setLoading(false); }
  }
  async function navigatePdf(locator: PdfLocator) {
    if (locator.fingerprint === loaded?.extraction.fingerprint) {
      if (locator.pageIndex >= loaded.document.numPages) throw new Error('This saved destination is outside the PDF.');
      goTo(locator);
    } else await browser.tabs.create({ url: new URL(pdfReaderPath(locator, mapRef.current), browser.runtime.getURL('/')).href });
  }
  return <div className="reader-app">
    <header className="reader-header"><a className="reader-brand" href="reader.html"><GraphMark size={28} />GraphNav<span>PDF reader</span></a>
      <span className="reader-title">{loaded?.title ?? 'Your papers, connected.'}</span>
      <label className="library-select">Saved PDFs<select aria-label="Saved PDFs" value={loaded?.extraction.fingerprint ?? ''} disabled={loading || graphBusy} onChange={(event) => { if (event.target.value) void openSaved(event.target.value); }}><option value="">Choose a PDF</option>{savedPdfs.map((pdf) => <option key={pdf.fingerprint} value={pdf.fingerprint}>{pdf.name}</option>)}</select></label>
      <button disabled={loading || graphBusy} onClick={() => input.current?.click()}>{missing ? 'Reattach original PDF' : 'Open a PDF'}</button>
      <input className="hidden-file" ref={input} type="file" accept="application/pdf,.pdf" aria-label="Choose PDF file" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void choose(file); }} />
      <a className="reader-map-link" href="workspace.html" target="_blank" rel="noreferrer">My maps ↗</a>
    </header>
    {error && <div className="reader-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {loading && <p className="reader-notice" role="status">Opening PDF and reading its outline…</p>}
    {loaded && target ? <main className="reader-body">
      <section className="paper-graph" aria-label="Paper graph"><GraphEditor generationSource={generationSource} key={loaded.key} initialGraphId={loaded.initialGraphId} onBusyChange={setGraphBusy} onGraphChange={(id) => { if (targetRef.current) { mapRef.current = id; history.replaceState(null, '', pdfReaderPath(targetRef.current, id)); } }} onNavigatePdf={navigatePdf} sourceTools={(props) => <PdfSourcePicker {...props} extraction={loaded.extraction} title={loaded.title} library={library} />} /></section>
      <section className="paper-reading" aria-label="Paper reader"><div className="page-toolbar"><button disabled={target.pageIndex === 0} onClick={() => goTo({ kind: 'pdf', fingerprint: target.fingerprint, pageIndex: target.pageIndex - 1 })}>Previous page</button><label>Page<input aria-label="PDF page number" type="number" min={1} max={loaded.document.numPages} value={target.pageIndex + 1} onChange={(event) => { const page = Number(event.target.value); if (Number.isInteger(page) && page >= 1 && page <= loaded.document.numPages) goTo({ kind: 'pdf', fingerprint: target.fingerprint, pageIndex: page - 1 }); }} /></label><span>of {loaded.document.numPages}</span><button disabled={target.pageIndex + 1 === loaded.document.numPages} onClick={() => goTo({ kind: 'pdf', fingerprint: target.fingerprint, pageIndex: target.pageIndex + 1 })}>Next page</button><label>Zoom<select aria-label="PDF zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={.75}>75%</option><option value={1}>Fit width</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div>
        <PdfPage document={loaded.document} target={target} zoom={zoom} />
        <footer className="reader-footer"><span>Original PDF saved in this Chrome profile. JSON graph backups exclude PDF bytes.</span><button disabled={loading || graphBusy} onClick={() => { if (confirm('Remove the saved PDF bytes from this Chrome profile? Your graph and notes will remain. You will need the original PDF to read it again.')) void library.remove(loaded.extraction.fingerprint).then(async () => { setLoaded(null); setTarget(null); setMissing(loaded.extraction.fingerprint); await loaded.document.loadingTask.destroy(); await refreshLibrary(); }).catch((reason) => setError(storageError(reason))); }}>Remove saved PDF</button></footer>
      </section>
    </main> : <main className="reader-welcome"><GraphMark size={62} /><h1>{missing ? 'Bring this paper back.' : 'Read the paper. Connect the ideas.'}</h1><p>{missing ? 'This graph has PDF destinations, but the original file is missing from this installation. Choose the exact original PDF to restore them.' : 'Open a local PDF, add bookmarked sections or pages to your graph, then connect your own ideas while you read.'}</p><button disabled={loading} onClick={() => input.current?.click()}>{missing ? 'Reattach original PDF' : 'Choose a PDF'}</button>{missing && <a href="reader.html">Open a different PDF instead</a>}<p className="reader-limits">Up to 20 MiB and 300 pages per PDF. Files stay in this Chrome profile; no AI request or upload is made by opening a paper.</p></main>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Reader />);
