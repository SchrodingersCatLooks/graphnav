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

```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0YD9FY1HWmLrcjucefItnzQgPAWkSHbntf/k26IqmkzhDFnBOVh7iZXPwlTv0S889ls4JJhcdOkqCyogQX6KtBCVSX4jTdWmkywXeG/powRNgmC+DydHzBktV2i4ehoxmFewPKIx19RjyQPH6luM+Z2VypqnL/WGeyplM6f0A9Vx3fdR4H5o4l1KrrmJ5xpEByiWbKJ/c/FF7TIfes5XL02thDm3+ct4u8MCOgavpFLYVed72lwIeORlWp/0KVyQAd9hS/YtNb0VfkhkhFGLFGUKHtO+Xh6I5gES8N93NuwEQckIYO8g1H9O/gxYZGH3AzlrhNRk3bWKyrrgkb0pQIDAQAB
```

This key is a **public** key. It is designed to ship inside the manifest and is safe to
commit. The matching private key was generated locally, is stored **outside this repository**
at `~/graphnav-local/graphnav-key.pem`, and is never committed. It is only needed to pack a
`.crx`; loading unpacked does not use it.

### Handoff to Rajvansh (M1-A owns the manifest)

The partner lane does not edit WXT configuration. Rajvansh adds to the WXT manifest config:

- `key`: the string above
- `oauth2.client_id`: the Chrome Extension client ID from section 4
- `oauth2.scopes`: the two scopes from section 3
- `permissions`: include `identity`

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

## 5. Demo sources (M0, still unresolved)

M1-B is only complete when a real folder and a real Doc are read through the installed
extension. That needs agreed sources, accessible to both test accounts:

- one Drive folder with a few files
- one Google Doc using tabs, including at least one nested tab

Record the chosen IDs here once picked. Use authorized demo content, never personal documents.

## 6. Which steps need whom

| Step | Who | Why |
| --- | --- | --- |
| 1 Extension identity | Partner (done) | Key generated locally |
| Manifest edit | Rajvansh | Owns WXT configuration under M1-A |
| 2 Project and APIs | Partner, in browser | Needs a Google account |
| 3 Scope choice | Decided above | From BUILD_PLAN |
| 4 Consent screen and client | Partner, in browser | Needs a Google account |
| 5 Demo sources | Both | M0 |
| Background auth handler | Partner, in code | Blocked until the scaffold merges |
