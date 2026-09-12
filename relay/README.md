# GraphNav AI relay

A small local service that holds the model key so the extension does not.

An extension bundle is readable by anyone who installs it, so a key shipped
inside one is a published key. The relay keeps it on the machine instead, and
the extension holds only a shared token proving a request came from it.

It implements the server half of [GENERATION_HANDOFF.md](../GENERATION_HANDOFF.md).
The extension posts a complete `GenerationInput`; the relay revalidates it
against the shared schema and builds the instructions, payload and JSON schema
with the same helpers the extension uses. A caller cannot supply its own
instructions or schema, and the prompt cannot drift from the contract the
answer is checked against.

**GraphNav works without it.** Manual maps, imports, navigation and saving all
run with the relay stopped. Only AI drafting needs it.

## Start it

Requires Node 22.12 or newer, the same version the extension uses.

```bash
cd relay
cp .env.example .env
```

Fill in `.env`:

- **`RELAY_TOKEN`** — a shared secret. Generate one:
  ```bash
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
  ```
  The same value goes into the extension's relay settings. Each teammate uses
  their own; it is not shared through GitHub.
- **`PROVIDER_API_KEY`** — the model key. This is the only place it exists.
- **`PROVIDER`** — `openai` or `gemini`.
- **`ALLOWED_ORIGIN`** — must match the installed extension ID exactly.

Then:

```bash
npm start
```

It prints the port, provider and allowed origin. It never prints the token or
the key.

## What it refuses

| Condition | Response |
| --- | --- |
| Origin is not the allowed extension | 403 |
| Pairing code missing or wrong, including on `/health` | 401 |
| No model key configured | 503 |
| Another draft already running | 429 |
| Body over 512 KiB | 413, refused while reading rather than after buffering |
| Body is not a valid `GenerationInput` | 400 |
| Model takes over 60 seconds | 504 |
| Provider unreachable, errors, or over-long response | 502 |

`GET /health` requires the pairing code too, so an unpaired caller learns
nothing about this host. It returns `{ protocol: 1, ready, model? }`, where
`ready` means a provider key is configured, not that a model call has succeeded.

Pairing-code comparison is constant-time over digests, so neither length nor
content leaks through timing. Provider errors are logged by name only: the raw
error can contain selected source text, so it is never echoed to the caller or
written to the log.

## Security boundary

- Binds `127.0.0.1` only. This is never a public service, and must not be put
  behind a tunnel or reverse proxy.
- The key is read from the environment and never logged, returned, or written
  to disk by this service.
- `.env` is gitignored. Do not paste a key into chat, a commit, or an issue.
- The relay cannot write to Google, to the database, or to the graph. It
  returns text. Everything that decides what to do with that text runs in the
  extension, where the user reviews it.

## Swapping providers

`src/providers.ts` holds one function per vendor. Adding another means adding a
case there; the server, the extension and the draft contract are all unaware of
which one is in use.

This uses plain `fetch` rather than a vendor SDK, and has no dependencies of its
own: it imports the shared generation helpers directly from `lib/`. FEATURE_SPEC
names the official `openai` SDK — swapping this one file for it changes nothing
elsewhere.

`PROVIDER_API_KEY` is read first, falling back to `OPENAI_API_KEY`.
