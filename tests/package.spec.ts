import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * M6-B: the packaged extension, not the development output.
 *
 * `npm run zip` is what would actually be handed to someone, and nothing
 * checked that the archive loads or that it carries the pinned identity. A
 * package that installs under a different ID cannot authenticate with Google
 * at all, which is the kind of failure that only appears on someone else's
 * machine.
 *
 * Requires `npm run zip` to have been run first.
 */

const run = promisify(execFile);
const EXPECTED_ID = 'pidejkbkldalibjaehjfpjkcpjpcenpk';
const archive = resolve('.output/graphnav-0.1.0-chrome.zip');

test('the packaged archive installs, keeps the pinned extension identity, and opens its pages', async () => {
  test.setTimeout(90_000);
  await access(archive); // Fails loudly if the package was never built.

  const unpacked = await mkdtemp(join(tmpdir(), 'graphnav-package-'));
  const profile = await mkdtemp(join(tmpdir(), 'graphnav-package-profile-'));

  try {
    await run('unzip', ['-q', archive, '-d', unpacked]);

    // The identity travels in the package, not just in the dev build.
    const manifest = JSON.parse(await readFile(join(unpacked, 'manifest.json'), 'utf8')) as {
      key?: string; permissions?: string[]; host_permissions?: string[]; oauth2?: { client_id?: string; scopes?: string[] };
    };
    expect(manifest.key).toBeTruthy();
    expect(manifest.permissions).toContain('identity');
    expect(manifest.oauth2?.client_id).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(manifest.oauth2?.scopes).toEqual([
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
    ]);
    // No secret should ever be packaged.
    const packagedManifest = JSON.stringify(manifest);
    expect(packagedManifest).not.toMatch(/sk-[A-Za-z0-9_-]{20}/);

    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
      args: [`--disable-extensions-except=${unpacked}`, `--load-extension=${unpacked}`],
    });

    try {
      // Chrome derives the ID from the packaged key. A mismatch here means
      // OAuth would fail for whoever installed this archive.
      const page = await context.newPage();
      await page.goto(`chrome-extension://${EXPECTED_ID}/workspace.html`);
      await expect(page).toHaveTitle(/GraphNav/);
      // The app mounted, rather than serving an empty shell.
      await expect(page.locator('#root')).not.toBeEmpty();

      // The other extension-owned pages load from the package too.
      for (const path of ['options.html', 'reader.html', 'popup.html']) {
        const response = await page.goto(`chrome-extension://${EXPECTED_ID}/${path}`);
        expect(response?.status(), `${path} should load from the package`).toBeLessThan(400);
      }

      // No page error should greet a fresh install.
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`chrome-extension://${EXPECTED_ID}/workspace.html`);
      await expect(page.locator('#root')).not.toBeEmpty();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  } finally {
    await rm(unpacked, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
});
