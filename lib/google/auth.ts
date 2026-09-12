/**
 * Chrome Identity token handling.
 *
 * Tokens stay in this module and the background worker. They are never placed in
 * a message payload, in storage, or in page context. Chrome owns the token
 * cache, so nothing here keeps state across service-worker restarts.
 */

import { browser } from 'wxt/browser';

/** Resolves undefined instead of throwing when a non-interactive call finds no token. */
async function getToken(interactive: boolean): Promise<string | undefined> {
  try {
    const result = await browser.identity.getAuthToken({ interactive });
    return result?.token;
  } catch (error) {
    // A non-interactive miss is a normal "not connected", not a failure.
    if (!interactive) return undefined;
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function isConnected(): Promise<boolean> {
  return (await getToken(false)) !== undefined;
}

/** Prompts the user, so only call this from an explicit user action. */
export async function connect(): Promise<void> {
  const token = await getToken(true);
  if (!token) throw new Error('Google did not return a token.');
}

export async function disconnect(): Promise<void> {
  const token = await getToken(false);
  if (token) await browser.identity.removeCachedAuthToken({ token });
}

/** Carries the status so a caller can tell a missing target from a transient failure. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Not connected to Google.');
    this.name = 'AuthRequiredError';
  }
}

/**
 * Authorized GET returning parsed JSON.
 *
 * A cached token can expire or be revoked server-side, which surfaces as 401.
 * Drop it from Chrome's cache and retry once before giving up.
 */
export async function authorizedGet<T>(url: string): Promise<T> {
  let token = await getToken(false);
  if (!token) throw new AuthRequiredError();

  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (response.status === 401) {
    await browser.identity.removeCachedAuthToken({ token });
    token = await getToken(false);
    if (!token) throw new AuthRequiredError();
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new HttpError(
      response.status,
      `${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}
