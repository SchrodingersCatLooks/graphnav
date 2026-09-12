# Google access setup (M1-B)

Owner: partner, on `partner-data`. This file records the stable extension identity and the
Google Cloud configuration M1-B depends on. It is operational reference, not a rule set;
workflow rules stay in [AGENTS.md](./AGENTS.md).

Console labels move around between Google UI revisions. The menu names below were accurate
when written; if a label differs, match the concept rather than the exact string.

## 1. Stable extension identity

Both laptops must install an extension with the **same ID**, because the OAuth client is
registered against one specific ID. Without this, sign-in works on one laptop and fails on
the other. The ID is derived from a public RSA key placed in the manifest.

| Field | Value |
| --- | --- |
| Extension ID | `pidejkbkldalibjaehjfpjkcpjpcenpk` |
| Manifest key | see `manifest.key` value below |
| OAuth client ID | `138105039840-5394rj79mfeq3jtipsg9g8fi5bneub02.apps.googleusercontent.com` |

The OAuth client ID is not a secret. It is designed to ship inside the extension manifest.
Access tokens are secret: they stay in the background worker and never reach page code or this repository.

```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0YD9FY1HWmLrcjucefItnzQgPAWkSHbntf/k26IqmkzhDFnBOVh7iZXPwlTv0S889ls4JJhcdOkqCyogQX6KtBCVSX4jTdWmkywXeG/powRNgmC+DydHzBktV2i4ehoxmFewPKIx19RjyQPH6luM+Z2VypqnL/WGeyplM6f0A9Vx3fdR4H5o4l1KrrmJ5xpEByiWbKJ/c/FF7TIfes5XL02thDm3+ct4u8MCOgavpFLYVed72lwIeORlWp/0KVyQAd9hS/YtNb0VfkhkhFGLFGUKHtO+Xh6I5gES8N93NuwEQckIYO8g1H9O/gxYZGH3AzlrhNRk3bWKyrrgkb0pQIDAQAB
```

This key is a **public** key. It is designed to ship inside the manifest and is safe to
commit. The matching private key was generated locally, is stored **outside this repository**
at `~/graphnav-local/graphnav-key.pem`, and is never committed. It is only needed to pack a
`.crx`; loading unpacked does not use it.

### Handoff to Rajvansh (M1-A owns the manifest)

Rajvansh's `wxt.config.ts` notes that "Google Identity, OAuth, and API access belong to M1-B",
so the partner lane applies this block once the M1-A scaffold is merged:

```ts
manifest: {
  key: '<the manifest key printed above>',
  permissions: ['identity'],
  oauth2: {
    client_id: '138105039840-5394rj79mfeq3jtipsg9g8fi5bneub02.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
    ],
  },
}
```

**Verify after loading unpacked:** open `chrome://extensions`, enable Developer mode, and
confirm the ID reads exactly `pidejkbkldalibjaehjfpjkcpjpcenpk` on **both** laptops. A
different ID means the key did not take effect, and OAuth will fail.

## 2. Create the project and enable APIs

Requires a Google account and a browser. Console: <https://console.cloud.google.com>

1. Create a new project, name it `graphnav`. Note the project name; you will reuse it.
2. Go to **APIs & Services → Library**.
3. Enable **Google Drive API**.
4. Enable **Google Docs API**.

Both must be enabled on the *same* project that issues the OAuth client.

## 3. Scopes

Chosen per BUILD_PLAN: metadata access for Drive hierarchy, document read access for Docs.

| Scope | Grants | Why this one |
| --- | --- | --- |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | File and folder metadata: IDs, names, MIME types, parents, `webViewLink` | Enough to build the graph and open destinations. Does not grant file content download. |
| `https://www.googleapis.com/auth/documents.readonly` | Document content including tabs | Required for tab structure and exact tab IDs |

`drive.file` is **not** usable here. It only covers files the app itself created or that the
user explicitly picked in a Google file dialog, so it cannot list an existing Drive folder.
Sign-in would appear to succeed and every read would return empty.

Both scopes are classed **sensitive**. In Testing mode with listed test users this needs no
Google verification. Publishing to production later would.

Source writes (M5: folder creation, Doc tab add/rename) need a write scope. Not requested now;
add when that task starts, and expect both accounts to re-consent.

## 4. Consent screen and OAuth client

In **APIs & Services → OAuth consent screen** (newer consoles: **Google Auth Platform**):

1. User type **External**. Publishing status stays **Testing**.
2. Fill app name and support email.
3. Add the two scopes from section 3.
4. Add **test users**: your own Google account and `pmrajvansh@gmail.com`. Only listed test
   users can complete sign-in while in Testing mode.

Then **APIs & Services → Credentials → Create credentials → OAuth client ID**:

5. Application type: **Chrome Extension**.
6. Item ID: `pidejkbkldalibjaehjfpjkcpjpcenpk`
7. Copy the generated client ID. It has no client secret, which is correct for this type.

Give the client ID to Rajvansh for the manifest. A client ID is not a secret credential, but
tokens are: tokens stay in the background worker and never reach page context or this repo.

## 5. Demo sources (M0)

| Source | ID |
| --- | --- |
| Drive folder `GraphNav demo drive` | `1lCy7TGKSvo5XjIKljT1rTqkDAU-NHRPD` |
| Doc `GraphNav demo paper` | `1rfb2-1rBQccYfo3y9marX-YiPAbuJno49VeUyT6Aj6I` |

The folder holds ten numbered subfolders, one of which (`04 Raw Data`) contains a nested
`Session Logs` folder so expand/collapse has a real second level. The Doc has three top-level
tabs (Overview, Methods, Findings) and one sub-tab (Scope and Definitions) nested under
Overview. Both are shared with the second test account as Editor.

Demo content was authored for this project. No personal documents are used.

## 5a. Verified reads

Performed in the installed extension on 2026-09-12, Chrome 152.0.7977.84 / macOS 26.5.2,
extension ID confirmed as `pidejkbkldalibjaehjfpjkcpjpcenpk`.

- `LIST_FOLDER` on the demo folder returned all ten subfolders as `type: 'folder'`, each with a
  `webViewLink` destination, and `truncated: false`.
- `GET_DOC_TABS` on the demo Doc returned the document title and four tab items. The sub-tab
  carried `parentId` referencing its parent tab, so nesting is preserved.

Both calls used real OAuth tokens through Chrome Identity. No token appears in any message
payload, in storage, or in page context.

## 6. Which steps need whom

| Step | Who | Status |
| --- | --- | --- |
| 1 Extension identity | Partner | DONE. Key generated locally, private key outside the repo |
| 2 Project and APIs | Partner, in browser | DONE. `graphnav` project created, Drive API and Docs API enabled |
| 3 Scope choice | From BUILD_PLAN | DONE. Recorded in section 3 |
| 4 Consent screen and client | Partner, in browser | DONE. External/Testing, both test users added, Chrome Extension client created |
| Manifest edit | Partner, handed over by M1-A | DONE. Key, identity, host access, OAuth client and scopes applied |
| Background auth handler | Partner, in code | DONE. Background worker, auth module, Drive and Docs adapters |
| 5 Demo sources | Both | DONE. Folder and Doc created, shared, and recorded above |
| First real Drive and Doc read | Partner | DONE. Both reads verified in the installed extension |

Console setup was performed in Google's newer **Google Auth Platform** layout, where Branding,
Audience, Data Access, and Clients are separate screens rather than one consent-screen wizard.
