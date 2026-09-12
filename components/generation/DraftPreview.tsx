import { useEffect, useRef, useState } from 'react';
import type { GenerationInput, GraphDraft, SourcePassage } from '../../lib/generation/types';
import type { Locator } from '../../lib/graph/types';

export function DraftPreview({ draft, input, onNavigate }: { draft: GraphDraft; input: GenerationInput; onNavigate: (locator: Locator) => Promise<void> }) {
  const [error, setError] = useState('');
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current, container = element?.closest('.sidebar');
    if (element && container) container.scrollTop += element.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
  }, [draft]);
  const passages = new Map(input.passages.map((passage) => [passage.passageId, passage]));
  const labels = new Map(draft.nodes.map((node) => [node.tempId, node.label]));
  const endpoint = (ref: GraphDraft['relationships'][number]['from']) => ref.kind === 'draft' ? labels.get(ref.tempId) : 'Existing map node';
  function evidence(ids: string[]) {
    return <details className="draft-evidence"><summary>See supporting text ({ids.length})</summary>{ids.map((id) => passages.get(id)).filter((passage): passage is SourcePassage => !!passage).map((passage) => <article key={passage.passageId}>
      <strong>{passage.heading ?? (passage.locator.kind === 'pdf' ? `Page ${passage.locator.pageIndex + 1}` : 'Document passage')}</strong><blockquote>{passage.text}</blockquote>
      <button className="text-button" onClick={() => { setError(''); void onNavigate(passage.locator).catch(() => setError('This source could not be opened. Check that the original is available.')); }}>Open evidence source</button>
    </article>)}</details>;
  }
  return <section ref={root} className="draft-preview" aria-label="AI draft">
    <div className="generation-heading"><h3>Suggested map additions</h3><span className="generation-badge">Unsaved draft</span></div>
    <p>{draft.nodes.length} {draft.nodes.length === 1 ? 'idea' : 'ideas'} · {draft.relationships.length} {draft.relationships.length === 1 ? 'connection' : 'connections'}</p>
    <p className="local-note">Review the suggestions against their supporting text. Your map has not changed. Saving review decisions is the next integration step.</p>
    {error && <p role="alert" className="source-notice">{error}</p>}
    {draft.nodes.map((node) => <article className="draft-card" key={`node:${node.tempId}`}><span className="draft-kind">Suggested {node.kind}</span><h4>{node.label}</h4><p>{node.rationale}</p>{evidence(node.evidencePassageIds)}</article>)}
    {draft.relationships.map((edge) => <article className="draft-card" key={`edge:${edge.tempId}`}><span className="draft-kind">Suggested connection</span><h4>{endpoint(edge.from)} <span className="draft-arrow" aria-hidden="true">→</span> {endpoint(edge.to)}</h4><strong className="draft-relation">{edge.label}</strong><p>{edge.rationale}</p>{evidence(edge.evidencePassageIds)}</article>)}
  </section>;
}
