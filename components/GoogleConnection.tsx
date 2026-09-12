import { useEffect, useRef, useState } from 'react';
import { sendToBackground, type AuthStatus } from '../lib/messages';

export function GoogleConnection({ onConnected, onInitialCheckComplete, disabled = false, expanded = false }: { expanded?: boolean; onConnected?: (connected: boolean) => void; onInitialCheckComplete?: () => void; disabled?: boolean }) {
  const [state, setState] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const requestId = useRef(0);
  const connecting = useRef(false);
  const [settings, setSettings] = useState(false);
  const [accountLabel, setAccountLabel] = useState<string>();

  async function changeConnection(reconnect: boolean) {
    if (disabled || connecting.current) return;
    connecting.current = true; ++requestId.current;
    setState('checking'); setError('');
    try {
      const result = await sendToBackground<AuthStatus>({ type: 'DISCONNECT' });
      if (!mounted.current) return;
      if (!result.ok) throw new Error(result.error);
      onConnected?.(false); setState('disconnected'); setAccountLabel(undefined);
      connecting.current = false;
      if (reconnect) await check(true);
    } catch (reason) { if (mounted.current) { setState('error'); setError(reason instanceof Error ? reason.message : 'Google could not be disconnected.'); } }
    finally { connecting.current = false; }
  }

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
      setAccountLabel(response.data.accountLabel);
      onConnected?.(response.data.connected);
    } catch (reason) {
      if (!mounted.current || requestId.current !== id) return;
      setState('error'); setError(reason instanceof Error ? reason.message : 'Google sign-in did not complete.');
    } finally { if (interactive) connecting.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    void check().finally(() => { if (mounted.current) onInitialCheckComplete?.(); });
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
      <button type="button" hidden={expanded} disabled={disabled || state === 'checking'} className="auth-refresh" aria-expanded={settings} onClick={() => setSettings(!settings)}>Google account</button>
    </div>
    {(expanded || settings) && <div className="account-settings">{accountLabel && state === 'connected' && <strong>Connected as {accountLabel}</strong>}<p>Use Google sign-in to reconnect. Chrome may use its signed-in profile account; choose another Chrome profile if the account you need is not offered.</p><div className="connection-actions"><button disabled={disabled || state === 'checking'} className="auth-refresh" onClick={() => void changeConnection(true)}>Change Google account</button><button disabled={disabled || state === 'checking'} className="auth-refresh" onClick={() => void changeConnection(false)}>Disconnect Google</button><button disabled={state === 'checking'} className="auth-refresh" onClick={() => void check()}>Check connection</button></div><p>Your saved maps stay on this laptop.</p></div>}
  </div>;
}
