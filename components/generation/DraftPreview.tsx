import { useEffect, useMemo, useRef, useState } from 'react';
import type { GenerationInput, GraphDraft, ProposedRef, SourcePassage } from '../../lib/generation/types';
import type { Locator, ProposalDecision } from '../../lib/graph/types';
import type { ApplyResult } from '../../lib/storage/proposals';
import { sendToBackground } from '../../lib/messages';

type Verdict = 'undecided' | 'accept' | 'reject';
type PriorMap = { nodes: Record<string, ProposalDecision>; relationships: Record<string, ProposalDecision> };

export function DraftPreview({
  draft, input, sourceTitle, graphId, revision, onNavigate, onApplied,
}: {
  draft: GraphDraft;
  input: GenerationInput;
  sourceTitle: string;
  graphId?: string;
  revision?: number;
  onNavigate: (locator: Locator) => Promise<void>;
  onApplied?: (result: ApplyResult) => void;
}) {
  const [error, setError] = useState('');
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [prior, setPrior] = useState<PriorMap>({ nodes: {}, relationships: {} });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = root.current, container = element?.closest('.sidebar');
    if (element && container) container.scrollTop += element.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
  }, [draft]);

  // Start clean for each new draft, then ask what was already decided so a
  // regenerated suggestion is not presented as if it were new.
  useEffect(() => {
    setVerdicts({}); setLabels({}); setApplied(null); setError('');
    setPrior({ nodes: {}, relationships: {} });
    if (!graphId) return;
    let current = true;
    void sendToBackground<PriorMap>({ type: 'RECALL_DECISIONS', graphId, draft })
      .then((result) => { if (current && result.ok) setPrior(result.data); })
      .catch(() => {});
    return () => { current = false; };
  }, [draft, graphId]);

  const passages = useMemo(() => new Map(input.passages.map((p) => [p.passageId, p])), [input]);
  const nodeLabels = useMemo(() => new Map(draft.nodes.map((n) => [n.tempId, n.label])), [draft]);
  const endpoint = (ref: ProposedRef) => ref.kind === 'draft' ? nodeLabels.get(ref.tempId) ?? 'Suggested idea' : 'Existing map node';

  const verdictOf = (key: string): Verdict => verdicts[key] ?? 'undecided';
  const setVerdict = (key: string, verdict: Verdict) =>
    setVerdicts((previous) => ({ ...previous, [key]: previous[key] === verdict ? 'undecided' : verdict }));

  const acceptedNodes = draft.nodes.filter((n) => verdictOf(`node:${n.tempId}`) === 'accept');
  const acceptedEdges = draft.relationships.filter((r) => verdictOf(`edge:${r.tempId}`) === 'accept');
  const rejectedNodes = draft.nodes.filter((n) => verdictOf(`node:${n.tempId}`) === 'reject');
  const rejectedEdges = draft.relationships.filter((r) => verdictOf(`edge:${r.tempId}`) === 'reject');
  const decidedCount = acceptedNodes.length + acceptedEdges.length + rejectedNodes.length + rejectedEdges.length;

  /**
   * A connection can only be stored if both its ends exist. Saying so before
   * the attempt is kinder than letting the worker refuse it.
   */
  const unmetEndpoints = acceptedEdges.filter((edge) => [edge.from, edge.to].some((ref) =>
    ref.kind === 'draft' && verdictOf(`node:${ref.tempId}`) !== 'accept'));

  async function apply() {
    if (!graphId || revision === undefined || applying || decidedCount === 0) return;
    setApplying(true); setError('');
    try {
      const result = await sendToBackground<ApplyResult>({
        type: 'APPLY_PROPOSALS',
        graphId, revision, draft, inputHash: draft.inputHash,
        passages: input.passages, sourceTitle,
        acceptNodes: acceptedNodes.map((n) => {
          const edited = labels[`node:${n.tempId}`]?.trim();
          return { tempId: n.tempId, ...(edited && edited !== n.label ? { label: edited } : {}) };
        }),
        acceptRelationships: acceptedEdges.map((r) => {
          const edited = labels[`edge:${r.tempId}`]?.trim();
          return { tempId: r.tempId, ...(edited && edited !== r.label ? { label: edited } : {}) };
        }),
        rejectNodeTempIds: rejectedNodes.map((n) => n.tempId),
        rejectRelationshipTempIds: rejectedEdges.map((r) => r.tempId),
      });
      if (!result.ok) throw new Error(result.error);
      setApplied(result.data);
      onApplied?.(result.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'These decisions could not be saved.');
    } finally {
      setApplying(false);
    }
  }

  function evidence(ids: string[]) {
    return <details className="draft-evidence">
      <summary>See supporting text ({ids.length})</summary>
      {ids.map((id) => passages.get(id)).filter((p): p is SourcePassage => !!p).map((passage) => <article key={passage.passageId}>
        <strong>{passage.heading ?? (passage.locator.kind === 'pdf' ? `Page ${passage.locator.pageIndex + 1}` : 'Document passage')}</strong>
        <blockquote>{passage.text}</blockquote>
        <button className="text-button" onClick={() => { setError(''); void onNavigate(passage.locator).catch(() => setError('This source could not be opened. Check that the original is available.')); }}>Open evidence source</button>
      </article>)}
    </details>;
  }

  function controls(key: string, proposedLabel: string, decision?: ProposalDecision) {
    const verdict = verdictOf(key);
    if (decision) {
      // Already decided in an earlier draft: state it rather than re-asking.
      return <p className="draft-decided" role="note">
        You already {decision.decision === 'accepted' ? 'added this to the map' : 'dismissed this'}
        {decision.acceptedLabel && decision.acceptedLabel !== proposedLabel ? ` as "${decision.acceptedLabel}"` : ''}.
      </p>;
    }
    return <div className="draft-controls">
      <button type="button" className={`draft-verdict${verdict === 'accept' ? ' is-chosen' : ''}`}
        aria-pressed={verdict === 'accept'} disabled={applying || !graphId}
        onClick={() => setVerdict(key, 'accept')}>Add to map</button>
      <button type="button" className={`draft-verdict${verdict === 'reject' ? ' is-chosen' : ''}`}
        aria-pressed={verdict === 'reject'} disabled={applying || !graphId}
        onClick={() => setVerdict(key, 'reject')}>Dismiss</button>
      {verdict === 'accept' && <label className="draft-rename">
        <span>Label</span>
        <input value={labels[key] ?? proposedLabel} disabled={applying}
          onChange={(event) => setLabels((previous) => ({ ...previous, [key]: event.target.value }))} />
      </label>}
    </div>;
  }

  return <section ref={root} className="draft-preview" aria-label="AI draft">
    <div className="generation-heading">
      <h3>Suggested map additions</h3>
      <span className="generation-badge">{applied ? 'Reviewed' : 'Unsaved draft'}</span>
    </div>
    <p>{draft.nodes.length} {draft.nodes.length === 1 ? 'idea' : 'ideas'} · {draft.relationships.length} {draft.relationships.length === 1 ? 'connection' : 'connections'}</p>

    {applied
      ? <p className="local-note" role="status">
          Added {applied.acceptedNodeIds.length} {applied.acceptedNodeIds.length === 1 ? 'idea' : 'ideas'} and {applied.acceptedRelationshipIds.length} {applied.acceptedRelationshipIds.length === 1 ? 'connection' : 'connections'} to your map.
          {applied.rejected > 0 ? ` Dismissed ${applied.rejected}; they will not be suggested again.` : ''}
          {applied.alreadyAccepted > 0 ? ` ${applied.alreadyAccepted} were already in your map.` : ''}
        </p>
      : <p className="local-note">Review each suggestion against its supporting text. Nothing changes your map until you save.</p>}

    {!graphId && <p className="source-notice">Open or create a map before saving suggestions.</p>}
    {error && <p role="alert" className="source-notice">{error}</p>}

    {draft.nodes.map((node) => {
      const key = `node:${node.tempId}`;
      return <article className={`draft-card${verdictOf(key) === 'reject' ? ' is-dismissed' : ''}`} key={key}>
        <span className="draft-kind">Suggested {node.kind}</span>
        <h4>{node.label}</h4>
        <p>{node.rationale}</p>
        {evidence(node.evidencePassageIds)}
        {!applied && controls(key, node.label, prior.nodes[node.tempId])}
      </article>;
    })}

    {draft.relationships.map((edge) => {
      const key = `edge:${edge.tempId}`;
      return <article className={`draft-card${verdictOf(key) === 'reject' ? ' is-dismissed' : ''}`} key={key}>
        <span className="draft-kind">Suggested connection</span>
        <h4>{endpoint(edge.from)} <span className="draft-arrow" aria-hidden="true">→</span> {endpoint(edge.to)}</h4>
        <strong className="draft-relation">{edge.label}</strong>
        <p>{edge.rationale}</p>
        {evidence(edge.evidencePassageIds)}
        {!applied && controls(key, edge.label, prior.relationships[edge.tempId])}
      </article>;
    })}

    {!applied && graphId && <div className="draft-apply">
      {unmetEndpoints.length > 0 && <p role="alert" className="source-notice">
        Also add the suggested ideas a connection joins, or dismiss the connection.
      </p>}
      <button type="button" className="primary-button" disabled={applying || decidedCount === 0 || unmetEndpoints.length > 0} onClick={() => void apply()}>
        {applying ? 'Saving…' : `Save ${decidedCount} decision${decidedCount === 1 ? '' : 's'}`}
      </button>
      <p className="local-note">Added items are marked as AI suggestions and keep the passage they came from.</p>
    </div>}
  </section>;
}
