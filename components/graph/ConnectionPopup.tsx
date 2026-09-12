import { useEffect, useRef, useState } from 'react';
import type { ConnectionValues } from '../../lib/graph/types';

const presets = [
  { label: 'Supports', kind: 'supports' }, { label: 'References', kind: 'references' },
  { label: 'Depends on', kind: 'depends-on' }, { label: 'Related to', kind: 'related-to' },
] as const;
export type ConnectionEditor = { id: string; busy: boolean; onSave: (value: ConnectionValues) => Promise<boolean>; onCancel: () => void; onRemove: () => Promise<boolean>; draft: ConnectionValues; onChange: (draft: ConnectionValues) => void };
export function ConnectionPopup({ from, to, editor }: { from: string; to: string; editor: ConnectionEditor }) {
  const draft = editor.draft;
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // A connection with no label yet was just drawn, so put the cursor where the
  // name goes. An existing one was selected to look at or act on: taking focus
  // into a text field there would quietly disable Delete, which everywhere else
  // removes what is selected.
  useEffect(() => { if (!editor.draft.label) input.current?.focus(); }, []);
  function change(next: ConnectionValues) { editor.onChange(next); }
  async function save() {
    if (saving || editor.busy) return;
    setSaving(true);
    try { if (await editor.onSave(draft)) editor.onCancel(); }
    finally { setSaving(false); }
  }
  const blocked = saving || editor.busy;
  return <form role="dialog" aria-label="Connection" className="connection-popup nodrag nopan nowheel" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
    event.stopPropagation();
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); if (!blocked) void save(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!blocked) editor.onCancel(); }
  }} onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="connection-popup-heading"><strong>Connection</strong><button type="button" aria-label="Cancel connection changes" disabled={blocked} onClick={editor.onCancel}>×</button></div>
    <p className="connection-endpoints">{draft.direction === 'reverse' ? to : from} <span aria-label={draft.direction === 'none' ? 'undirected' : 'to'}>{draft.direction === 'none' ? '↔' : '→'}</span> {draft.direction === 'reverse' ? from : to}</p>
    <label>Label<input ref={input} aria-label="Connection label" value={draft.label} maxLength={200} placeholder="Add label (optional)" disabled={blocked} onChange={(event) => change({ ...draft, label: event.target.value, relationshipKind: presets.find((preset) => preset.label.toLowerCase() === event.target.value.trim().toLowerCase())?.kind ?? 'custom' })} /></label>
    <div className="connection-presets">{presets.map((preset) => <button key={preset.kind} type="button" disabled={blocked} aria-pressed={draft.relationshipKind === preset.kind} onClick={() => change({ ...draft, label: preset.label, relationshipKind: preset.kind })}>{preset.label}</button>)}</div>
    <div className="connection-directions"><button type="button" disabled={blocked} onClick={() => change({ ...draft, direction: draft.direction === 'reverse' ? 'forward' : 'reverse' })}>Reverse direction</button><button type="button" disabled={blocked} aria-pressed={draft.direction === 'none'} onClick={() => change({ ...draft, direction: draft.direction === 'none' ? 'forward' : 'none' })}>{draft.direction === 'none' ? 'Show arrow' : 'No arrow'}</button></div>
    <details className="connection-more"><summary>More</summary><button type="button" className="danger" disabled={blocked} onClick={() => { void editor.onRemove().then((okay) => { if (okay) editor.onCancel(); }); }}>Remove connection</button></details><div className="connection-popup-footer"><button type="button" className="text-button" disabled={blocked} onClick={() => change({ ...draft, label: '', relationshipKind: 'custom' })}>Remove label</button><button className="primary" disabled={blocked}>{blocked ? 'Saving…' : 'Done'}</button></div>
  </form>;
}
