# Selected-content and generation integration

Rajvansh claims G1-A on rajvansh-ui after PDF reader PR #10.
Latest observed Eddy checkpoint: 179d98f, with G1-B types/extraction, authored demo paper, provider-agnostic request path, and scale tests.
This checkpoint integrates those files with preservation, not a rewrite or a second generator.

## Ownership and API boundary

- Rajvansh owns the shared selection/preview UI in components/generation, its GraphEditor/reader hooks, a typed DOC_TEXT_PREVIEW background message, and the new lib/pdf/selected-text.ts adapter.
  PDF preview reads only user-selected pages through the already loaded PDF.js document and fills local SourcePassage identities and page locators.
  This explicitly moves that small new PDF text adapter to the UI integration lane; Eddy should not duplicate it.
- Eddy retains lib/google/docs-content.ts extraction, server relay/provider startup, and G3-B proposal persistence/migrations.
  Rajvansh's integration will apply the bounded review fixes below to the existing types/request files and global passage cap, with tests and a published checkpoint.
  Bring that checkpoint into partner-data before changing the same lines.
- DOC_TEXT_PREVIEW accepts a document ID and unique selected tab IDs, validates the sender and authenticated account in the background, and returns the existing DocsExtraction shape.
  The Google API currently returns the document body; only selected tabs are processed into the displayed/submitted preview.
  Do not claim that Google fetched only selected tabs.
- Preview is separate from Generate.
  It displays selected source names, purpose, character/page limits, complete submitted passage text and truncation before any model call.
  New selection or source changes invalidate the old preview; late preview responses cannot replace newer choices.
  Generation/review will reuse this panel inside Docs and the PDF reader.
  Drive folders support structural baselines now; semantic reading of arbitrary Drive file types is not implied.

## Review fixes to integrate before real requests

- The 200-passage limit is global across selected tabs, not per tab.
  Validate character totals against actual text, unique passage IDs and existing IDs, matching account/source/locator identity, and bounded selections.
- Hash the complete validated input, including account, locator, source version and allowed existing node IDs.
  A text-identical response must not apply to another account, destination or map context.
- Validate empty drafts against the full schema/input hash before returning empty.
  Timeout/cancel must settle promptly and ignore late output, even if a provider does not cooperate with abort.
  Keep refusal, invalid, empty, busy and unavailable outcomes distinct.
- No direct OpenAI credential in extension code/storage, tests, GitHub or chat.
  The API account/funding/private server key remains G0-A; preview and mocked request/review checks can proceed.

## Acceptance

Use the selected Docs fixture, authored PDF and isolated installed extension for exact selection, nested-tab exclusion, character/passages caps, stale response cancellation, text preview and preserved manual editing.
Real generation and evidence usefulness remain open until the server-held credential and a real provider run are configured.
A clean fixture test does not complete G2/G3/G4 or claim a model call.

## Merged preview and active G2-A boundary

PR #11 merged as 1453ec6, runtime 8f092f1.
G1-A is complete for selected Doc/PDF preview; Eddy code through 179d98f is included.
All five review fixes above were reproduced, corrected and regression-tested.
The combined suite passed 94 tests; the last preview layout refinement passed typecheck/build and all four affected browser cases.

Rajvansh now claims G2-A extension-side files: a loopback client in lib/generation/relay.ts, typed status/configure/generate/cancel messages, extension-owned pairing settings, and the existing GenerationPanel/DraftReview UI.
wxt.config.ts needs only an additional http://127.0.0.1:8787/* host permission for that client; preserve the Google OAuth block.
Eddy owns the separate relay package, actual provider adapter, startup docs and G3-B decision persistence.
The client, pairing settings, draft/evidence UI and tests are now merged in PR #12, runtime 148dfa4.

The client/server contract for the next bounded integration is:

- Base URL fixed to http://127.0.0.1:8787.
  Use an exact chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk origin allowlist and bind loopback only.
- A random relay pairing code is a local bearer credential distinct from the provider API key.
  The extension accepts it only on an extension-owned settings page and retains it in chrome.storage.session, never on a Google page or in graph backups.
  The server holds its matching value privately; all health/draft requests require Authorization: Bearer <pairing-code>.
- GET /health returns { protocol: 1, ready: boolean, model?: string } after authenticating.
  Ready means the provider is configured, not that a model request has been proved.
- POST /draft accepts a complete validated GenerationInput as its JSON body and returns the existing ProviderReply union: { kind: 'json', text: string } or { kind: 'refusal', reason: string }.
  JSON text must match graphDraftSchema and contain the hash of the complete validated input, even for an empty draft.
  Server builds instructions/input with the shared helpers; extension validates the response again with requestDraft.
- Enforce 512 KiB request/response transport bounds, the shared 20,000-character/200-passage/40-node/80-relationship limits, one active request and 60-second timeout.
  Do not log source text, pairing codes or provider credentials.
  A disconnected/unauthenticated/unconfigured relay must fail visibly and leave manual editing usable.
- The UI bridge owns request IDs and abort controllers; cancel is scoped to the requesting extension page/content-script sender.
  Cancellation/timeout discards late output and never mutates live graphs.
- G3-B persistence is a separate still-open boundary.
  Do not apply proposal nodes through ordinary manual-edit commands and lose provenance or rejection decisions.
  G2-A can display a validated draft without claiming accepted/rejected decisions survive until that store is integrated.

## Private configuration checkpoint

The user supplied OpenAI project, organization and key IDs.
A key ID is not a bearer credential.
Rajvansh prepared an ignored .env.relay.local file at the local clone root and asked the account owner to enter OPENAI_API_KEY privately.
The file and its values are not in GitHub and must not be imported into the WXT/browser build.
The planned server can read OPENAI_API_KEY plus optional OPENAI_PROJECT_ID, OPENAI_ORG_ID and OPENAI_BASE_URL from its own process environment.
A real model, billing/access and the demo spend cap remain unverified.
Eddy still owns the relay package, provider adapter and startup command; the extension uses only its separate session pairing code.

## PR #12 integration and explicit G3-B ownership

Rajvansh merged the client side in PR #12 as c947fa1 after typecheck/build/all 102 tests.
The installed loopback fixture verifies the extension’s real HTTP request, expected extension Origin on POST, selected-only text, pairing, cancellation, invalid/refused output, and source navigation.
No real model has been called.
The first private OpenAI GET /v1/models authentication check returned 401 invalid_api_key and the user is correcting the secret locally.

Eddy’s de16b0c relay is now available on partner-data.
Its port/routes/payload/auth/health contract must be reconciled with the client contract above before real integration can work.
Rajvansh owns that immediate integration review and will preserve Eddy’s server/provider code through normal commits.
Eddy should avoid concurrent changes to the relay/client bridge during that checkpoint.

G3-B is explicitly Eddy’s implementation lane, including lib/storage/database.ts additive migrations, a proposal store in lib/generation, graph/evidence types, atomic repository acceptance, backups, and storage tests.
There is no additional approval blocker merely because Rajvansh originally created those files.
Rajvansh will keep new UI work outside those persistence files while G3-B is active.
Eddy should publish the typed proposal-store API and request/reply handoff on main before Rajvansh connects accept/edit/reject controls.
Keep proposal text/evidence, accepted IDs, edited labels and rejection/removal decisions persistent; reusing the same proposal or regenerating must not duplicate accepted work.
