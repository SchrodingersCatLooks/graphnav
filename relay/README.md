# GraphNav local AI relay

The relay keeps the provider secret on your laptop and returns suggestions from selected Doc/PDF content.
Manual maps, source imports, navigation and saving continue with the relay stopped.
The extension uses a separate pairing code and never receives the provider secret.

## Start the current build

Use the pinned Node 22 environment and run npm ci at the repository root first.
The relay reuses the shared Zod/input/draft code and does not require a second npm install.

From the repository root:

```bash
npm --prefix relay start
```

Startup loads the ignored root .env.relay.local file, followed by an optional relay/.env file.
An absent optional .env notice is harmless when the root configuration is present.
Keep the terminal running while generating; Control+C stops the relay.

For a new laptop, create private configuration using relay/.env.example as a guide.
Existing private configuration must be edited rather than overwritten.
Set these values privately:

```dotenv
OPENAI_API_KEY=your_actual_secret_key
PROVIDER=openai
PROVIDER_MODEL=gpt-5-mini
RELAY_TOKEN=your_separate_random_pairing_code
RELAY_MAX_REQUESTS=20
```

Generate the separate pairing code locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Copy that generated value into RELAY_TOKEN and the extension’s AI connection settings.
Use at least 32 characters; a provider key beginning with sk- is refused as a pairing code.
Optional OPENAI_PROJECT_ID and OPENAI_ORG_ID select an explicit API project/account.
The OpenAI base URL is fixed to https://api.openai.com/v1.
The existing PROVIDER_API_KEY variable is also accepted, but do not maintain conflicting keys in multiple files.

## Give another teammate local API access

The repository has an encrypted GitHub Actions secret named OPENAI_API_KEY.
Workflows can use it, but GitHub does not reveal its value through the secret settings page or include it in a clone.
It does not automatically configure Eddy's local relay.

For a separate local relay, the account owner can share a credential privately through a secure password-manager share, or grant Eddy access to the OpenAI project so he can create his own key.
Project members can manage their own project API keys, as described in [OpenAI permissions](https://developers.openai.com/api/docs/guides/rbac).
Eddy then creates an ignored .env.relay.local at his clone's root with OPENAI_API_KEY and the settings above, generates his own RELAY_TOKEN, starts the relay and pairs his extension.
Never write an actual key into this guide, an issue, a workflow log or a committed configuration file.

## Pair the extension

1. Build GraphNav, reload it in chrome://extensions, and refresh any open Drive/Docs tabs.
2. Open GraphNav’s toolbar popup, then AI connection.
3. Paste the RELAY_TOKEN value into Relay pairing code and click Pair AI connection.
   Never enter OPENAI_API_KEY into the extension.
4. In a Doc or the PDF reader, select content, preview its text, then check the AI connection and click Generate with AI.
5. Read the suggestions and open their supporting sources.
   Persistent accept/edit/reject is still the next G3 integration step.

Pairing lasts for the Chrome session and may need repeating after Chrome or the extension restarts.
The current user key has been tested successfully; because it was posted in chat, the account owner should revoke it and save a replacement privately before final use.

## Protocol and limits

The server binds 127.0.0.1:8787 and is intended only for local development/demo use.
Do not expose it through a tunnel or public proxy.

- Health and draft requests require the pairing bearer token.
- POST requires the exact chrome-extension://pidejkbkldalibjaehjfpjkcpjpcenpk Origin.
  An authenticated GET may omit Origin because Chrome can omit it on extension health requests.
  Other browser origins are refused.
- GET /health returns protocol 1, readiness and the configured model, never a credential.
  Readiness means configuration is present; a successful model request is a separate check.
- POST /draft takes the validated GenerationInput, not caller-provided instructions or arbitrary schemas.
  Both ends use the shared full-input hash, draft schema and evidence validation.
- Transport is bounded to 512 KiB, content to 20,000 characters and 200 passages, and output to 8,000 tokens.
- One provider request is active at a time, with a 60-second deadline, abort on client disconnect, five attempts per minute and 20 per launch by default.
  Launch limits reset when the relay restarts and are not an account-wide monetary budget.
- OpenAI response storage is disabled with store:false.
  No source text, provider secret, or pairing code is logged by this server.

Gpt-5-mini is the tested default for OpenAI.
The existing Gemini adapter is preserved but has not been verified against a live Gemini account.

## Verified checkpoint

PR #13 combines extension/relay typechecks, production build, all 116 tests, and 14 affected tests after the final recovery-message refinement.
A real installed-extension request on selected pages 2 and 3 of the authored PDF returned eight ideas and eight connections in 24,973 ms.
The actual model was gpt-5-mini-2025-08-07 with 757 input tokens and 1,552 output tokens.
Evidence navigation opened the correct PDF page and the saved baseline stayed unchanged.
Startup through npm --prefix relay start and authenticated health also passed.
This is a real provider check on authored content, not acceptance on an independent publication or completion of saved review decisions.
