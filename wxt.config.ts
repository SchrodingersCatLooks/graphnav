import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  // Load unpacked in the teammate's Chrome profile; no automated profile launch.
  webExt: { disabled: true },
  manifest: {
    name: 'GraphNav',
    minimum_chrome_version: '114',
    description: 'A graph navigation workspace for Google Drive, Google Docs, and papers. Interface preview.',
    // M1-B owns the block below: Identity, OAuth, and Google API access.
    // Public key only. It pins the extension ID so the OAuth client registered
    // for that ID works on both laptops. The private key is not in this repo.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0YD9FY1HWmLrcjucefItnzQgPAWkSHbntf/k26IqmkzhDFnBOVh7iZXPwlTv0S889ls4JJhcdOkqCyogQX6KtBCVSX4jTdWmkywXeG/powRNgmC+DydHzBktV2i4ehoxmFewPKIx19RjyQPH6luM+Z2VypqnL/WGeyplM6f0A9Vx3fdR4H5o4l1KrrmJ5xpEByiWbKJ/c/FF7TIfes5XL02thDm3+ct4u8MCOgavpFLYVed72lwIeORlWp/0KVyQAd9hS/YtNb0VfkhkhFGLFGUKHtO+Xh6I5gES8N93NuwEQckIYO8g1H9O/gxYZGH3AzlrhNRk3bWKyrrgkb0pQIDAQAB',
    // Storage keeps transient panel state in the extension, never on Google pages.
    permissions: ['identity', 'storage'],
    // Drive API is on www.googleapis.com; the Docs API is on docs.googleapis.com.
    // The loopback entry reaches the local AI relay, which holds the model key.
    host_permissions: [
      'https://www.googleapis.com/*',
      'https://docs.googleapis.com/*',
      'http://127.0.0.1/*',
    ],
    oauth2: {
      client_id: '138105039840-5394rj79mfeq3jtipsg9g8fi5bneub02.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
      ],
    },
  },
});
