/** URL-only context for the shell, not an adapter or an authenticated account. */
export type PageContext = {
  kind: 'drive' | 'docs';
  label: 'Drive folder' | 'My Drive' | 'Drive Home' | 'Google Docs';
  sourceId: string;
  tabId?: string;
};

export function getPageContext(href: string): PageContext | null {
  const url = new URL(href);
  if (url.protocol !== 'https:') return null;

  if (url.hostname === 'drive.google.com') {
    const folder = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([^/]+)\/?$/);
    if (folder?.[1]) return { kind: 'drive', label: 'Drive folder', sourceId: folder[1] };
    if (/^\/drive\/(?:u\/\d+\/)?my-drive\/?$/.test(url.pathname)) {
      return { kind: 'drive', label: 'My Drive', sourceId: 'root' };
    }
    if (/^\/drive(?:\/(?:u\/\d+\/)?(?:home)?)?\/?$/.test(url.pathname)) {
      return { kind: 'drive', label: 'Drive Home', sourceId: 'root' };
    }
  }

  if (url.hostname === 'docs.google.com') {
    const doc = url.pathname.match(/^\/document\/(?:u\/\d+\/)?d\/([^/]+)(?:\/|$)/);
    // Published documents are a different surface from the normal editor.
    if (doc?.[1] && doc[1] !== 'e') return { kind: 'docs', label: 'Google Docs', sourceId: doc[1], ...(url.searchParams.get('tab') ? { tabId: url.searchParams.get('tab')! } : {}) };
  }

  return null;
}
