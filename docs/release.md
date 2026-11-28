# Releasing the trial on Vercel

The trial build is a static Vite app plus three Vercel serverless functions (`api/auth/login`, `api/auth/logout`, `api/auth/session`). Sign-in is real and server-side. Nothing is deployed from this repository automatically.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name             | Value                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET` | Random string of at least 32 characters. Signs the session cookie. Never reuse the local one.                  |
| `AUTH_USERS`     | JSON array of `{ "id", "login", "role", "hash" }`, one entry per account. `hash` is a salted scrypt hash only. |

| `VITE_POSTHOG_KEY` | Public PostHog project key (EU). Optional: when empty or missing, analytics is off. Baked in at build time, so changing it needs a redeploy. |

Set both for Production (and Preview if you test there). Never commit real values; `.env.example` shows the shape only.

## Analytics (PostHog, EU)

Page views only, sent to `https://eu.i.posthog.com`: page path plus role (candidate / recruiter / instructor). No session replay, no autocapture, no names, logins or content. Add `VITE_POSTHOG_KEY` in Vercel, then redeploy. Tests and automated browsers never send events.

## Generating accounts

1. Run `npm run auth:seed` once. It writes `.env.local` (secret + hashed users) and `TEST-CREDENTIALS.local.md` (readable passwords). Both are gitignored. Use `-- --force` to regenerate and rotate every password.
2. Copy the `SESSION_SECRET` and `AUTH_USERS` values from `.env.local` into Vercel. The readable passwords never go to Vercel; give them to testers through a private channel.
3. To change a password or secret: regenerate, update the Vercel variables and redeploy. Changing `SESSION_SECRET` signs everyone out.

## Deploy steps

1. Run `./scripts/verify` locally (lint, types, unit tests, build, browser journeys).
2. Import the repository into Vercel (framework preset: Vite, output `dist`); the `api/` folder is picked up automatically.
3. Add the two variables above, then deploy. Use HTTPS only: the session cookie is `Secure` outside localhost.
4. Smoke test: open the site, confirm `/#/app` redirects to the login page, sign in with a test account, sign out.

## Local development

`npm run dev` and `npm run preview` serve the same `/api/auth/*` handlers through a Vite plugin and read `.env.local`. No `vercel dev` is needed.

## Known limits of this trial

- Portfolio and application data stay in each browser's local storage, not on a server.
- No password reset or change, no MFA, no email verification.
- Login lockout counters live in memory of each serverless instance (best effort).
- Sessions are stateless and last 8 hours; signing out clears the cookie but cannot revoke a stolen token.
- Accounts live in an environment variable, not a database.
