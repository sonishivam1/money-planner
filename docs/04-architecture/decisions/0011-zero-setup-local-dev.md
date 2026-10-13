# 0011: Zero-setup local development with embedded Postgres and a dev-only sign-in

Status: Accepted · Date: 2026-10-13

## Context

Running the app locally needs a Postgres server and a Google OAuth client. That's a lot of setup before a contributor (or an agent, or CI's end-to-end tests) can see a single page. Docker isn't always available.

## Decision

1. **Embedded Postgres in development and tests.** When `DATABASE_URL` starts with `pglite:` (for example `pglite:./.data/dev`), `lib/db/index.ts` uses [PGlite](https://pglite.dev), which is real Postgres compiled to WebAssembly, running in-process and stored in a folder, through `drizzle-orm/pglite`. Migrations are applied automatically on first connection. Any other URL uses `postgres.js`, which production uses with Neon.
2. **Dev-only sign-in.** When `AUTH_DEV_LOGIN=1` **and** `NODE_ENV` is not `production`, the login page shows "Continue as dev user". It upserts a user with `DEV_LOGIN_EMAIL` (default `dev@example.com`), creates a normal database session row and sets the standard Auth.js session cookie. Everything after that (`auth()`, `requireUserId()`) is the real code path.
3. The dev sign-in action **refuses to run** in production builds, whatever the environment says. This is tested.

## Consequences

- `cp .env.example .env.local && npm install && npm run dev` gives a working app with no external services (`NFR-OPS-3`).
- End-to-end tests run against `next dev` with PGlite and the dev sign-in, with no secrets in CI.
- PGlite is single-connection and in-process. That's fine for one developer, never used in production.
- Two database drivers to keep working. Both go through Drizzle, so queries are identical.

## Alternatives considered

- **Docker Postgres:** heavier, and not available everywhere.
- **Auth.js Credentials provider:** needs JWT sessions, which would change the production auth model just for tests.
