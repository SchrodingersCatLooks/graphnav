import { createRoot } from 'react-dom/client';
import { GraphMark } from '../../components/GraphMark';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <main>
    <header><GraphMark size={30} /><h1>GraphNav</h1></header>
    <span className="badge">Personal maps</span>
    <h2>Your workspace, connected.</h2>
    <p>Open a Drive folder, My Drive, or a Google Doc. Click the <strong>Graph</strong> button at the bottom right of the page.</p>
    <nav aria-label="Supported applications">
      <a href="workspace.html" target="_blank" rel="noreferrer">Open my maps <span aria-hidden="true">↗</span></a>
      <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Open Drive <span aria-hidden="true">↗</span></a>
      <a href="https://docs.google.com/document/" target="_blank" rel="noreferrer">Choose a Doc <span aria-hidden="true">↗</span></a>
    </nav>
    <p className="note">Create, connect, and save ideas in My maps. Google imports and PDF reading come next.</p>
  </main>,
);
