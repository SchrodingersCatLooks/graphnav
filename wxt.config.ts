import { defineConfig } from 'wxt';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:publicAssets': async (_wxt, files) => {
      const root = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
      for (const directory of ['standard_fonts', 'cmaps', 'wasm']) {
        for (const name of await readdir(join(root, directory))) files.push({ absoluteSrc: join(root, directory, name), relativeDest: `pdf-assets/${directory}/${name}` });
      }
    },
  },
  vite: () => ({ plugins: [tailwindcss()] }),
  // Load unpacked in the teammate's Chrome profile; no automated profile launch.
  webExt: { disabled: true },
  manifest: {
    name: 'GraphNav',
    minimum_chrome_version: '114',
    description: 'Create editable maps beside Google Drive, Google Docs, and local PDFs.',
    // M1-B owns the block below: Identity, OAuth, and Google API access.
    // Public key only. It pins the extension ID so the OAuth client registered
    // for that ID works on both laptops. The private key is not in this repo.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0YD9FY1HWmLrcjucefItnzQgPAWkSHbntf/k26IqmkzhDFnBOVh7iZXPwlTv0S889ls4JJhcdOkqCyogQX6KtBCVSX4jTdWmkywXeG/powRNgmC+DydHzBktV2i4ehoxmFewPKIx19RjyQPH6luM+Z2VypqnL/WGeyplM6f0A9Vx3fdR4H5o4l1KrrmJ5xpEByiWbKJ/c/FF7TIfes5XL02thDm3+ct4u8MCOgavpFLYVed72lwIeORlWp/0KVyQAd9hS/YtNb0VfkhkhFGLFGUKHtO+Xh6I5gES8N93NuwEQckIYO8g1H9O/gxYZGH3AzlrhNRk3bWKyrrgkb0pQIDAQAB',
    // Storage keeps transient panel state in the extension, never on Google pages.
    permissions: ['identity', 'storage'],
    // PDF.js uses bundled WebAssembly decoders; no remote scripts or eval.
    content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" },
    // Drive API is on www.googleapis.com; the Docs API is on docs.googleapis.com.
    host_permissions: ['https://www.googleapis.com/*', 'https://docs.googleapis.com/*', 'http://127.0.0.1:8787/*'],
    oauth2: {
      client_id: '138105039840-5394rj79mfeq3jtipsg9g8fi5bneub02.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
      ],
    },
  },
});
