import { GraphMark } from './GraphMark';
import './graph-entry.css';

export type EntryScreen = 'home' | 'account' | 'new' | 'manual' | 'automated' | 'existing' | 'graph';
type Props = { title: string; description: string; icon: 'graph' | 'folder' | 'pencil'; accent?: boolean; disabled?: boolean; onClick: () => void };
export function EntryChoice({ title, description, icon, accent, disabled, onClick }: Props) {
  return <button type="button" className={`graph-entry-choice${accent ? ' accent' : ''}`} aria-label={title} disabled={disabled} onClick={onClick}>
    <span className="entry-icon" aria-hidden="true">{icon === 'graph' ? <GraphMark size={30} /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon === 'folder' ? <path d="M3 7V5h6l2 2h10v13H3V7Zm0 2h18" /> : <><path d="m15 4 5 5M4 16l12-12a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3L8 20l-5 1 1-5Z" /></>}</svg>}</span>
    <span className="entry-copy"><strong>{title}</strong><small>{description}</small></span>
    <svg className="entry-chevron" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button>;
}
