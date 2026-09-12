import { test, expect } from '@playwright/test';

import { requestSchema, isTrustedSender as validateSender } from '../lib/requests';
const EXTENSION_ID = 'pidejkbkldalibjaehjfpjkcpjpcenpk';
const isTrustedSender = (sender: unknown) => validateSender(sender, EXTENSION_ID);

const accepts = (value: unknown) => requestSchema.safeParse(value).success;

test('valid requests parse, including a locator-carrying navigate', () => {
  expect(accepts({ type: 'AUTH_STATUS' })).toBe(true);
  expect(accepts({ type: 'ACCOUNT_KEY' })).toBe(true);
  expect(accepts({ type: 'LIST_FOLDER', folderId: 'folder-1' })).toBe(true);
  expect(accepts({ type: 'IMPORT_DOC_TABS', documentId: 'doc-1' })).toBe(true);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'docs', documentId: 'doc-1', tabId: 't.nested' } })).toBe(true);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'drive', fileId: 'file-1' } })).toBe(true);
});

test('malformed requests are rejected before any handler runs', () => {
  expect(accepts({ type: 'DROP_EVERYTHING' })).toBe(false);
  expect(accepts({ type: 'LIST_FOLDER' })).toBe(false);
  expect(accepts({ type: 'LIST_FOLDER', folderId: '' })).toBe(false);
  expect(accepts({ type: 'LIST_FOLDER', folderId: 123 })).toBe(false);
  // Strict shapes, so a smuggled extra field does not ride along.
  expect(accepts({ type: 'AUTH_STATUS', extra: 'x' })).toBe(false);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'drive' } })).toBe(false);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'ftp', url: 'ftp://x' } })).toBe(false);
  expect(accepts(null)).toBe(false);
  expect(accepts('AUTH_STATUS')).toBe(false);
});

test('a personal web locator must be https', () => {
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'web', url: 'https://example.com/a' } })).toBe(true);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'web', url: 'http://example.com/a' } })).toBe(false);
  expect(accepts({ type: 'NAVIGATE', locator: { kind: 'web', url: 'javascript:alert(1)' } })).toBe(false);
});

test('only our own pages and our declared content scripts are trusted', () => {
  expect(isTrustedSender({ id: EXTENSION_ID, origin: `chrome-extension://${EXTENSION_ID}` })).toBe(true);
  expect(isTrustedSender({ id: EXTENSION_ID, url: `chrome-extension://${EXTENSION_ID}/workspace.html` })).toBe(true);
  expect(isTrustedSender({ id: EXTENSION_ID, origin: 'https://drive.google.com' })).toBe(true);
  expect(isTrustedSender({ id: EXTENSION_ID, origin: 'https://docs.google.com' })).toBe(true);
});

test('untrusted senders are refused', () => {
  expect(isTrustedSender({ id: EXTENSION_ID, origin: 'https://evil.example' })).toBe(false);
  expect(isTrustedSender({ id: EXTENSION_ID, origin: 'https://drive.google.com.evil.example' })).toBe(false);
  expect(isTrustedSender({ id: EXTENSION_ID, origin: `chrome-extension://${EXTENSION_ID}extra` })).toBe(false);
  // Another extension reusing our origin shape must not pass.
  expect(isTrustedSender({ id: 'some-other-extension', origin: 'https://drive.google.com' })).toBe(false);
  expect(isTrustedSender({ id: EXTENSION_ID, origin: 'chrome-extension://another-extension-id' })).toBe(false);
  expect(isTrustedSender({ id: EXTENSION_ID })).toBe(false);
  expect(isTrustedSender(undefined)).toBe(false);
});
