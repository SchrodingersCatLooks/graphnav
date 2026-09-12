import { useEffect, useRef, useState } from 'react';
import { GENERATION_LIMITS, generationInputSchema, hashGenerationInput, type GenerationInput } from '../../lib/generation/types';
import type { GenerationSource, TextChoice } from '../../lib/generation/selection';
import './generation.css';

type Preview = { input: GenerationInput; hash: string; notices: string[]; names: string[] };
export function GenerationPanel({ source, graphKey, busy }: { source: GenerationSource; graphKey: string; busy: boolean }) {
  const [open, setOpen] = useState(false), [choices, setChoices] = useState<TextChoice[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<GenerationInput['purpose']>('concept-connections');
  const [query, setQuery] = useState(''), [limit, setLimit] = useState(20);
  const [listing, setListing] = useState(false), [reading, setReading] = useState(false), [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewElement = useRef<HTMLDivElement>(null);
  const operation = useRef(0), pending = useRef<AbortController | null>(null), sourceRef = useRef(source);
  function invalidate() { operation.current++; pending.current?.abort(); pending.current = null; setReading(false); setListing(false); setPreview(null); setError(''); }
  useEffect(() => { invalidate(); }, [graphKey]);
  useEffect(() => {
    if (sourceRef.current !== source) { invalidate(); setOpen(false); setSelected([]); setChoices([]); sourceRef.current = source; }
    return () => { operation.current++; pending.current?.abort(); };
  }, [source]);
  useEffect(() => {
    const element = previewElement.current, container = element?.closest('.sidebar');
    if (preview && element && container) container.scrollTop += element.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
  }, [preview]);
  async function list() {
    invalidate(); setListing(true);
    const current = operation.current;
    try { const values = await source.choices(); if (current === operation.current) { setChoices(values); setSelected((ids) => ids.filter((id) => values.some((item) => item.id === id))); } }
    catch (reason) { if (current === operation.current) setError(reason instanceof Error ? reason.message : 'The source list could not be loaded.'); }
    finally { if (current === operation.current) setListing(false); }
  }
  async function read() {
    invalidate(); setReading(true);
    const current = operation.current, controller = new AbortController(); pending.current = controller;
    try {
      const result = await source.read(selected, controller.signal);
      if (current !== operation.current) return;
      if (!result.passages.length) { setError(result.notices.join(' ') || 'No readable text was found in this selection. Choose another tab or page.'); return; }
      // Existing map labels/notes are not implicitly submitted with source text.
      // G3 can offer a separate explicit selection of allowed existing nodes.
      const input = generationInputSchema.parse({ purpose, documentId: result.documentId, passages: result.passages, totalCharacters: result.totalCharacters, truncated: result.truncated, existingNodeIds: [] });
      const hash = await hashGenerationInput(input);
      if (current === operation.current) setPreview({ input, hash, notices: result.notices, names: choices.filter((choice) => selected.includes(choice.id)).map((choice) => choice.title) });
    } catch (reason) { if (current === operation.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The selected text could not be read.'); }
    finally { if (current === operation.current) { setReading(false); pending.current = null; } }
  }
  const filtered = choices.filter((choice) => `${choice.title} ${choice.detail ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="generation-panel" aria-label="AI assistance">
    <div className="generation-heading"><h2>Connect ideas with AI</h2><span className="generation-badge">Preview</span></div>
    <p className="muted">Choose the material first. Review its text before generating suggestions.</p>
    <button className="generation-toggle" aria-expanded={open} disabled={busy} onClick={() => { if (open) { invalidate(); setOpen(false); } else { setOpen(true); void list(); } }}>{open ? 'Close AI tools' : 'Select content for AI'}</button>
    {open && <div className="generation-content">
      <p className="local-note">{source.disclosure}</p>
      <label>What should the graph help with?<select aria-label="AI purpose" disabled={busy} value={purpose} onChange={(event) => { invalidate(); setPurpose(event.target.value as GenerationInput['purpose']); }}><option value="concept-connections">Find meaningful connections</option><option value="navigation-overview">Understand the big picture</option></select></label>
      <div className="generation-choice-heading"><strong>{source.kind === 'docs' ? 'Choose document tabs' : 'Choose PDF pages'}</strong><button className="text-button" disabled={busy || listing} onClick={() => void list()}>Reload choices</button></div>
      <label>Find content<input type="search" aria-label="Find content for AI" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(20); }} placeholder={source.kind === 'docs' ? 'Tab name' : 'Page or section'} /></label>
      {listing ? <p className="local-note" role="status">Loading source choices…</p> : <>
        <div className="generation-choices">{filtered.slice(0, limit).map((choice) => <label className="generation-choice" key={choice.id}><input type="checkbox" aria-label={`Analyze ${choice.title}`} checked={selected.includes(choice.id)} disabled={busy || (selected.length >= GENERATION_LIMITS.maxPassages && !selected.includes(choice.id))} onChange={(event) => { invalidate(); setSelected(event.target.checked ? [...selected, choice.id] : selected.filter((id) => id !== choice.id)); }} /><span><strong>{choice.title}</strong>{choice.detail && <small>{choice.detail}</small>}</span></label>)}</div>
        {!filtered.length && <p className="local-note">No matching content.</p>}
        {filtered.length > limit && <button onClick={() => setLimit(limit + 20)}>Show more choices ({filtered.length - limit})</button>}
      </>}
      <p className="local-note">{selected.length} selected · Up to 20,000 characters and 200 passages per preview.{source.kind === 'docs' ? ' Nested tabs are included only when selected.' : ''}</p>
      <div className="generation-actions"><button className="primary" disabled={busy || listing || reading || !selected.length} onClick={() => void read()}>Preview selected text</button>{reading && <button onClick={invalidate}>Cancel preview</button>}</div>
      {reading && <p role="status" className="local-note">Reading only the selected content…</p>}
      {error && <p className="source-notice" role="alert">{error}</p>}
      {preview && <div ref={previewElement} className="generation-preview" aria-label="Selected text preview" data-input-hash={preview.hash}>
        <h3>Text ready to review</h3><p>{preview.input.totalCharacters.toLocaleString()} characters · {preview.input.passages.length} passages</p>
        <p className="local-note">Selected: {preview.names.join(', ')}</p>
        {preview.input.truncated && <p className="source-notice">This selection exceeds the preview limit. Only the text shown below would be analyzed. Select fewer tabs or pages to include more of each.</p>}
        {preview.notices.map((notice) => <p className="source-notice" key={notice}>{notice}</p>)}
        <div className="generation-passages">{preview.input.passages.map((passage) => <article key={passage.passageId}><h4>{passage.heading ?? 'Selected passage'}</h4><p>{passage.text}</p></article>)}</div>
        <p className="local-note">These are the complete passages for a future request. Personal map notes are not included. Nothing has been sent to AI.</p>
        <button disabled title="AI generation is not connected yet">Generate with AI</button>
        <p className="local-note">AI generation is not connected yet. You can keep building and editing your map.</p>
      </div>}
    </div>}
  </section>;
}
