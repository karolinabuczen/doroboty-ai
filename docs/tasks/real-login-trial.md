# Real login for the trial group

## Intent

Replace the persona picker with a real server-side login (Vercel functions) for the existing fictional personas, for a trial with candidates and recruiters. Data storage is not migrated.

## Acceptance criteria

- Polish login page with generic error, keyboard access and lockout message; logout; protected routes redirect to login; role decides visible areas.
- Passwords exist only as salted scrypt hashes on the server side; signed HttpOnly, SameSite session cookie (Secure on HTTPS) with a secret from `SESSION_SECRET`; rate limiting on failed attempts.
- Readable test passwords only in gitignored `TEST-CREDENTIALS.local.md`; secrets only in gitignored `.env.local`; `.env.example` committed.
- Local dev serves the same API; unit and browser tests cover success, failure, role protection, lockout and logout.
- FEATURES.md (AUTH-01..03) and docs/release.md updated. Nothing is deployed or pushed.

## Implementation notes

- Server: `api/_lib/*` (passwords, session, rate limit, handlers), `api/auth/*` entry points, `vite.config.ts` plugin for local use, `scripts/auth-seed.mjs`.
- Client: `auth.ts`, `login.tsx`, session-aware store and `RequireRole`; logout in the shell.
- Tests: `api/_lib/auth.test.ts`, `tests/e2e/login.spec.ts`; existing journeys sign in through the API.
- Register reviewed: AUTH-01..03 and the scope paragraph updated.
