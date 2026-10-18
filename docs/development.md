# Development guide

## Requirements

- Node 24 and pnpm 9 (`corepack enable` picks up the version pinned in `package.json`)
- Docker, for Postgres
- A key for at least one language model (Anthropic, OpenAI or Gemini) to run calls
- For voice calls: a Sarvam or ElevenLabs key. For phone calls: a Twilio, Exotel or Vobiz account, and a public URL for the API

## First run

```sh
pnpm install
cp .env.example .env
pnpm db:up        # Postgres 17 on localhost:5434 (user, password and database: callflow)
pnpm dev          # API :4000, app :3100, site :3000, and flow-core in watch mode
```

Then open <http://localhost:3100>, create an account and a project. Provider keys are added per project under **Integrations**; keys in `.env` are only a fallback for projects without their own.

`pnpm dev` builds `packages/flow-core` first and keeps rebuilding it on change, so the API and the app always use the current flow engine.

## Environment

The API reads the repo-level `.env` at startup, so restart it after a change. The two Next.js apps do **not** read this file; see below.

| Variable | Needed | Meaning |
|---|---|---|
| `DATABASE_URL` | Yes | Defaults to the Docker database: `postgres://callflow:callflow@localhost:5434/callflow` |
| `CREDENTIALS_KEY` | In production | Encrypts saved provider keys (`openssl rand -base64 32`). In development a key is generated into `.dev-credentials.key`. Losing it makes saved keys unreadable |
| `WEB_ORIGIN` | Yes | The app's origin (`http://localhost:3100`). CORS allows it, it receives the session cookie, and email links point to it |
| `API_PORT` | No | Default `4000` |
| `PUBLIC_URL` | For phone calls | The API's address on the internet, which telephony providers connect back to |
| `ADMIN_EMAILS` | No | Comma-separated. These accounts become admins at API start and at signup |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | No | Server-wide fallback model keys |
| `LLM_MODEL` | No | Overrides the default model, as `<provider>:<model>` |
| `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_HOST` | No | Server-wide fallback speech keys. `api.in.residency.elevenlabs.io` keeps audio in India |
| `NODE_ENV` | In production | `production` turns on secure cookies and turns off automatic schema changes |
| `COOKIE_DOMAIN` | Sometimes | Set it (e.g. `.example.com`) when the app and API are on sibling subdomains |
| `TRUST_PROXY` | Sometimes | `1` behind a load balancer, so client addresses come from `X-Forwarded-For` |

The Next.js apps read these at build time (or in `next dev`) from the shell, the host's settings or `apps/<app>/.env.local`:

| Variable | Used by | Default in development |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | app, site | `http://localhost:4000` |
| `NEXT_PUBLIC_SITE_URL` | app (links to home, docs, terms), site (link previews) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | site (Sign in, Get started) | `http://localhost:3100` |

## Models

[`models.config.json`](../models.config.json) lists the language-model providers, the models each offers (a fixed list, or `"auto"` to ask the provider) and the server default. An agent can pick its own model under **Configuration**; otherwise it uses the default.

For voice calls, choose for speed: the time to the first spoken word is what callers notice. Claude Sonnet 5.5 is the default and runs voice turns without extended thinking. Opus is noticeably slower to start replying.

## Phone calls in development

Telephony providers have to reach the API from the internet, both for the call's audio stream and for status updates. Run a tunnel to port 4000 (not the app on 3100):

```sh
ngrok http 4000
# or, with no account:
cloudflared tunnel --url http://localhost:4000
```

Put the https address in `.env` as `PUBLIC_URL` and restart the API. Free tunnels change address on every restart; a free ngrok account gives one fixed domain (`ngrok http 4000 --url=<name>.ngrok-free.app`).

Then connect a telephony provider and a speech provider under **Integrations**, and use **Call a phone** in an agent's test console. Phone calls cost money on your provider account and ring a real number.

## Test calls

Every agent has a **Test** tab:

- **Text call**: type the caller's side. Needs only a language model.
- **Voice call**: talk through the browser's microphone. Needs a speech provider.
- **Call a phone**: rings a real number.

Each call is saved with its transcript, collected fields, outcome and per-turn latency under **Calls**.

## Admin console

Accounts in `ADMIN_EMAILS` (or promoted by another admin) see **Admin console** in the account menu, at `/admin`. It lists every account with its projects, calls, voice minutes and API usage, and lists every project across accounts. An admin can **sign in as** a non-admin user for up to an hour to see exactly what they see; a bar at the bottom of the screen shows it and returns to the admin account. Password, email and account deletion stay blocked in that mode, and each sign-in is logged.

## Tests and checks

```sh
pnpm typecheck    # whole workspace
pnpm test         # apps/api and packages/flow-core (node:test)
pnpm --filter @oxumi/api test
pnpm --filter @oxumi/flow-core test
```

The API tests drive the call runtime with a scripted model and an in-memory transport, so they need no keys or network.

## Email

No email provider is connected yet. In development, password-reset and invitation emails are appended to `.dev-outbox.log` at the repo root; in production they are only logged. Connect a provider in `apps/api/src/auth/mail.service.ts` before launch.

## Deploying

- **Database:** with `NODE_ENV=production` the schema is never changed automatically. Run migrations for every entity change.
- **Secrets:** set `CREDENTIALS_KEY` and keep it safe; rotating it means re-saving every provider key.
- **Cookies:** serve the app and API over HTTPS. If they are on different subdomains, set `COOKIE_DOMAIN`.
- **Phone calls:** set `PUBLIC_URL` to the API's public address.
- **Next.js apps:** set the `NEXT_PUBLIC_*` variables at build time. Without `NEXT_PUBLIC_SITE_URL`, the app's links to the home page and docs stay on the app, which has no such pages.

## Repository conventions

- Comments explain *why*, not what, and sit above the code they describe.
- Colours, type, spacing and radii come from `packages/ui/design/tokens.ts`; components never hard-code them.
