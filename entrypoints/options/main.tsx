import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GraphMark } from '../../components/GraphMark';
import { sendToBackground, type Request } from '../../lib/messages';
import { pairingCodeSchema, type RelayStatus } from '../../lib/generation/relay';
import './style.css';

function Settings() {
  const [status, setStatus] = useState<RelayStatus>({ configured: false, ready: false });
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function check(request: Request = { type: 'AI_STATUS' }) {
    setBusy(true); setError('');
    try {
      const result = await sendToBackground<RelayStatus>(request);
      if (!result.ok) throw new Error(result.error);
      setStatus(result.data); if (request.type === 'PAIR_RELAY') setCode('');
    } catch { setError('The AI connection could not be verified. Check that the local relay is running and its pairing code is current.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void check(); }, []);
  return <main>
    <header><GraphMark size={38} /><strong>GraphNav</strong><span>AI connection</span></header>
    <section className="connection-card">
      <p className="eyebrow">YOUR CONTENT, YOUR CHOICE</p><h1>Connect your AI assistant.</h1>
      <p>Generate suggested ideas and connections from the document tabs or PDF pages you select. Your existing maps remain available at any time.</p>
      <div className={`connection-state ${status.ready ? 'ready' : ''}`} role="status"><span aria-hidden="true" />{busy ? 'Checking connection…' : status.ready ? 'Ready to generate' : status.configured ? 'Paired, waiting for the relay' : 'Not connected'}</div>
      {status.model && <p className="detail">Model: {status.model}</p>}
      {status.error && <p className="notice">{status.error}</p>}
      <ol><li>Start the GraphNav AI relay on this laptop.</li><li>Copy the pairing code it displays.</li><li>Pair here, then return to your Doc or PDF and check the AI connection.</li></ol>
      <form onSubmit={(event) => { event.preventDefault(); if (pairingCodeSchema.safeParse(code.trim()).success) void check({ type: 'PAIR_RELAY', code: code.trim() }); }}>
        <label htmlFor="pair-code">Relay pairing code</label>
        <input id="pair-code" type="password" autoComplete="off" spellCheck={false} value={code} disabled={busy} onChange={(event) => setCode(event.target.value)} aria-describedby="pair-help" placeholder="Paste the code from your local relay" />
        <p id="pair-help" className="detail">Use the relay code here. Your OpenAI secret key belongs in the private server configuration and must never be entered into the extension.</p>
        {code.trim().startsWith('sk-') && <p className="notice" role="alert">That looks like a model API key. Remove it and use the relay pairing code instead.</p>}
        <div className="actions"><button className="primary" disabled={busy || !pairingCodeSchema.safeParse(code.trim()).success}>Pair AI connection</button><button type="button" disabled={busy} onClick={() => void check()}>Check connection</button></div>
      </form>
      {error && <p className="notice" role="alert">{error}</p>}
      {status.configured && <button className="text-button" disabled={busy} onClick={() => {
        setBusy(true); setError('');
        void sendToBackground({ type: 'FORGET_RELAY' }).then((result) => { if (!result.ok) throw new Error(result.error); setStatus({ configured: false, ready: false }); }).catch(() => setError('The connection could not be removed. Try again.')).finally(() => setBusy(false));
      }}>Forget this connection</button>}
      <p className="detail">Pairing lasts for this Chrome session. Restarting Chrome or reloading the extension may require pairing again. No document text is sent by pairing or checking the connection.</p>
    </section>
    <footer><a href="workspace.html">Open my maps</a><a href="reader.html">Open a PDF</a></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Settings />);
