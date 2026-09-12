import { useEffect, useRef, useState } from 'react';
import { sendToBackground, type AuthStatus } from '../lib/messages';

export function GoogleConnection({ onConnected }: { onConnected?: (connected: boolean) => void }) {
  const [state, setState] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const requestId = useRef(0);
  const connecting = useRef(false);

  async function check(interactive = false) {
    if (connecting.current && !interactive) return;
    if (interactive) connecting.current = true;
    const id = ++requestId.current;
    setState('checking'); setError('');
    try {
      const response = await sendToBackground<AuthStatus>({ type: interactive ? 'CONNECT' : 'AUTH_STATUS' });
      if (!mounted.current || requestId.current !== id) return;
      if (!response || !response.ok) throw new Error(response && !response.ok ? response.error : 'The Google connection could not be checked.');
      if (typeof response.data?.connected !== 'boolean') throw new Error('The Google connection returned an unexpected response.');
      setState(response.data.connected ? 'connected' : 'disconnected');
      onConnected?.(response.data.connected);
    } catch (reason) {
      if (!mounted.current || requestId.current !== id) return;
      setState('error'); setError(reason instanceof Error ? reason.message : 'Google sign-in did not complete.');
    } finally { if (interactive) connecting.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    void check();
    // Returning from another extension window can change the shared auth state.
    const refresh = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', refresh);
    return () => { mounted.current = false; document.removeEventListener('visibilitychange', refresh); };
  }, []);

  return <div className="google-connection">
    <div className="connection-notice" role="status">
      <span className={`status-dot${state === 'connected' ? ' connected' : ''}`} aria-hidden="true" />
      {state === 'checking' ? 'Checking Google connection…' : state === 'connected' ? 'Google connected' : state === 'disconnected' ? 'Google data is not connected yet' : 'Google connection needs attention'}
    </div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="connection-actions">
      {state !== 'connected' && <button type="button" disabled={state === 'checking'} className="connect-button" onClick={() => void check(true)}>Connect Google</button>}
      <button type="button" disabled={state === 'checking'} className="auth-refresh" onClick={() => void check()}>Check connection</button>
    </div>
  </div>;
}
