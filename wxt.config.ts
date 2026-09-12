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
    // Google Identity, OAuth, and API access belong to M1-B.
  },
});
