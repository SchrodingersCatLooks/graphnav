import { useEffect, useMemo, useState } from 'react';
import { readCatalog } from '../../lib/editor/client';
import type { SourceContext } from '../../lib/editor/protocol';
import type { Locator } from '../../lib/graph/types';
import { docsGenerationSource } from '../../lib/generation/selection';
import { getPageContext } from '../../lib/page-context';
import { GenerationPanel } from './GenerationPanel';

type DocumentChoice = { id: string; title: string };
export function DriveGenerationPanel({ context, graphId, revision, busy, onNavigate }: { context: SourceContext; graphId?: string; revision?: number; busy: boolean; onNavigate: (locator: Locator) => Promise<void> }) {
  const [documents, setDocuments] = useState<DocumentChoice[]>([]), [documentId, setDocumentId] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const source = useMemo(() => documentId ? docsGenerationSource(documentId) : null, [documentId]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDocumentId(''); setDocuments([]);
    void readCatalog(context).then((catalog) => {
      const choices = catalog.items.flatMap((item) => {
        if (item.locator.kind !== 'drive' || !item.locator.webViewLink) return [];
        const linked = getPageContext(item.locator.webViewLink);
        return linked?.kind === 'docs' && linked.sourceId === item.locator.fileId ? [{ id: linked.sourceId, title: item.title }] : [];
      });
      if (active) setDocuments(choices);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'The document choices could not be loaded.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [context.kind, context.sourceId]);
  return <div className="drive-ai-picker">
    <h2>Generate from a document</h2>
    <p>Choose a Google Doc from this folder, then select the tabs to analyze. AI uses their text to suggest connections. Your saved graph stays unchanged while you review the draft.</p>
    {loading && <p role="status">Finding documents in this folder…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !documents.length && <p>No Google Docs were found at this folder level. Open a folder containing a Doc, open a Doc directly, or use Open a PDF from the GraphNav toolbar popup. Folder names alone are not enough to infer meaningful connections.</p>}
    {documents.length > 0 && <label>Document to analyze<select aria-label="Document to analyze" value={documentId} disabled={busy} onChange={(event) => setDocumentId(event.target.value)}><option value="">Choose a document</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label>}
    {source && <GenerationPanel key={documentId} expanded source={source} graphKey={`${graphId ?? 'new'}:${revision ?? 0}`} graphId={graphId} revision={revision} busy={busy} onNavigate={onNavigate} />}
  </div>;
}
