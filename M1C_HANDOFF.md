# M1-C response and implementation handoff

Rajvansh's response to Eddy's `M1C_PROPOSAL.md` at `a83d545`, 2026-09-12.
The user approved IndexedDB/Dexie, excluded AWS for V1, and explicitly asked Rajvansh to begin the first storage implementation.
That rebalances the initial repository work to Rajvansh; Eddy keeps Google authentication, reads, and source adapters.
This response is a concrete implementation handoff for review, not a claim of Eddy's acceptance or second-laptop OAuth verification.

Later planning checkpoint: Eddy has now added the import/account/worker foundation on `partner-data` at `c6e6b5e`.
The implementation examples below remain the original contract handoff; do not rebuild work already present in that branch.
[BUILD_PLAN.md](./BUILD_PLAN.md) and [TASK_LIST.md](./TASK_LIST.md) now provide the complete V1 + V2 sequence, individual assignments, 6 AM code-freeze target, and 4 PM submission schedule.

## Sign-off and counterproposal

I agree with the SourceGraph/PersonalOverlay separation in meaning: refresh must never regenerate personal work.
I also agree with origin on nodes and connections, explicit account context, versioning, and preserving missing destinations.
Use the implemented record contract in [lib/graph/types.ts](https://github.com/SchrodingersCatLooks/graphnav/blob/88a4d00/lib/graph/types.ts) and [lib/storage/repository.ts](https://github.com/SchrodingersCatLooks/graphnav/blob/88a4d00/lib/storage/repository.ts) rather than introducing a second database or aggregate snapshot format.
The storage checkpoint is `c7f1226`; subsequent commits add the workspace and auth-state UI.

The differences from your proposed TypeScript are:

1. A graph has its own UUID, plus an optional verified account scope and source bindings.
   A source-derived `drive:<id>` graph key cannot represent an empty personal map or two maps of the same folder.
2. Each node has its own stable graph-item ID.
   Imported nodes are upserted by a canonical provider/account/resource/locator key; their item IDs survive rename and refresh.
   Provider IDs remain in source records and locators, never inferred from titles or browser account slots.
3. A relationship stores `members: [{nodeId, role}]` rather than only `from` and `to`.
   An ordinary directed edge is two members, one `from` and one `to`.
   The initial editor creates ordinary connections; group-member creation controls remain later work.
4. Imported base records and personal records are distinguished by `origin` and modified through different repository commands.
   Personal label/notes/visibility overrides and layout have separate stores.
   Raw extracted cache is disposable; stable target records referenced by personal links must remain until an explicit reconciliation/removal decision.
   Do not evict an entire graph's node records just because an API refresh failed.
5. Your Drive and Docs locator fields are preserved.
   PDF destinations use explicit zero-based `pageIndex`, `fingerprint`, and optional `namedDestination`/normalized point.
   The PDF reader remains M4.
   Personal `web` locators permit an explicitly entered HTTPS destination without claiming a source integration.

React Flow does not dictate the stored record shape.
[GraphCanvas](https://github.com/SchrodingersCatLooks/graphnav/blob/88a4d00/components/graph/GraphCanvas.tsx) converts our saved records to flat React Flow nodes and edges.
For a multi-member relationship it creates a display junction and spokes; it never turns the group into every possible pair.
The database stores graph coordinates separately from source destinations.

## What Eddy builds next

**M2-B still includes the Drive adapter.**
The V1/manual decision came from the user's explicit product direction; it does not move the Drive adapter out of M2.
V1 imports structural trees and lets people add meaningful connections.
V2 adds model-generated drafts and review, after the manual cycle works.

1. Bring the reviewed storage/editor checkpoint into `partner-data` using a normal merge, preserving local work.
   Do not create another `lib/graph/types.ts`, database, lockfile history, or background entrypoint.
2. Add a verified, stable account key to the authenticated adapter context.
   A candidate is Drive `about.get?fields=user(permissionId)`, which is allowed by the existing metadata-readonly scope.
   Verify it with the actual accounts; use the returned `user.permissionId` rather than an email or `/u/0` URL slot.
   [about.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get), [User.permissionId](https://developers.google.com/workspace/drive/api/reference/rest/v3/User).
3. Adapt a successful folder read into `refreshScope` items.
   Include the root folder when needed, retain real IDs/locators, and map parent links through `importedKey`.
   Set `complete: false` when pagination was truncated; only a complete successful scope may remove old containment relationships.
   A missing folder member may have moved, so retain its node and personal links.
   Explicit unavailable-target reporting still needs provider error interpretation in the adapter.
4. Wire graph commands into your background dispatcher for Drive/Docs content scripts.
   The current My maps page is extension-owned and already uses the repository directly.
   Content scripts must not open IndexedDB on Google's origin.
   Validate senders, request shapes, graph/account association, and current authorization before dispatching source operations.
   The existing generic unknown-request response must not race a separate storage listener; use one dispatcher.
5. Prove the real folder import, navigation, complete/partial refresh, and preservation of user edits through the installed extension.
   The repository tests use synthetic source records; they are not a substitute for this check.

Minimal adapter example, after obtaining `verifiedAccountKey` from the authorized API:

```ts
import { GraphRepository, importedKey } from './lib/storage/repository';

const repository = new GraphRepository(); // Extension origin only.
const root = {
  source: {
    provider: 'google-drive' as const,
    accountKey: verifiedAccountKey,
    resourceId: folderId,
    kind: 'folder' as const,
    title: folderTitle,
  },
  locator: { kind: 'drive' as const, fileId: folderId },
  title: folderTitle,
};
const items = result.items.map((item) => ({
  source: {
    provider: 'google-drive' as const,
    accountKey: verifiedAccountKey,
    resourceId: item.id,
    kind: item.type === 'folder' ? 'folder' as const : 'file' as const,
    title: item.title,
  },
  locator: item.locator,
  title: item.title,
  parentKey: importedKey(root),
}));
await repository.refreshScope(graphId, expectedContentRevision, {
  scopeKey: `drive-folder:${folderId}`,
  accountKey: verifiedAccountKey,
  complete: !result.truncated,
  items: [root, ...items],
});
```

The example illustrates the contract; it is not an implemented Drive adapter.
The adapter should narrow the current `SourceItem` locator union to the actual Drive response and validate provider responses.

## Who owns the visible Google connection

Rajvansh owns `components/GoogleConnection.tsx`, the panel's connection status, and its Connect/Check buttons.
They call Eddy's `AUTH_STATUS` and `CONNECT` messages; no token enters the panel.
Eddy owns the Identity flow, token handling, source reads, and background dispatcher.
The full M1-B checkpoint `a83d545` was integrated into `rajvansh-ui` as `b98100f` without changing those implementation files.
Main has not been updated by that integration; M1-B remains REVIEW pending the required acceptance/merge.

## Second-laptop acceptance

This step requires Rajvansh's Chrome profile and Google account.
Eddy reports both real reads passing; Rajvansh has not yet performed them.
Build the combined `rajvansh-ui` checkpoint, verify the installed ID is `pidejkbkldalibjaehjfpjkcpjpcenpk`, and complete Google consent personally.
Export any existing personal maps before uninstalling or replacing an extension installation.
Prefer reloading an existing same-ID installation; if an old differently identified shell remains, disable it so it cannot inject duplicate controls.
After a rebuild, reload the extension and refresh the Google tabs.

Open the demo [folder](https://drive.google.com/drive/folders/1lCy7TGKSvo5XjIKljT1rTqkDAU-NHRPD) or [Doc](https://docs.google.com/document/d/1rfb2-1rBQccYfo3y9marX-YiPAbuJno49VeUyT6Aj6I/edit), open Graph, and use Connect Google.
In the extension popup's inspection console, the existing M1-B requests verify the read path:

```js
console.log(JSON.stringify(await chrome.runtime.sendMessage({
  type: 'LIST_FOLDER', folderId: '1lCy7TGKSvo5XjIKljT1rTqkDAU-NHRPD'
}), null, 2));
console.log(JSON.stringify(await chrome.runtime.sendMessage({
  type: 'GET_DOC_TABS', documentId: '1rfb2-1rBQccYfo3y9marX-YiPAbuJno49VeUyT6Aj6I'
}), null, 2));
```

Record the commit, extension ID, and actual responses.
A 404 may mean an unavailable/inaccessible target; it is not evidence of successful access.
An empty successful folder response is not by itself proof of a sharing failure, but differs from the expected demo fixture and needs investigation.
Do not post access tokens or private document content in the PR.
