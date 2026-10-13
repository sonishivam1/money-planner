# 0004: Google sign-in, database sessions, allow-list that fails closed

Status: Accepted · Date: 2026-10-09

## Context

The app holds sensitive financial data for one person now, and possibly a few invited people later. We don't want to store passwords, and we need to be able to revoke access.

## Decision

- Sign in with Google through Auth.js v5 and the Drizzle adapter.
- **Database sessions** (rows in `session`) rather than JWTs, so a session can be revoked by deleting it.
- Restrict sign-in to `ALLOWED_EMAILS`.
- **(Proposed)** In production, an empty or missing `ALLOWED_EMAILS` blocks all sign-ins instead of allowing everyone. Inviting users later is done with an invitations table, not by emptying the list.

## Consequences

- No password storage, resets or brute-force protection to build.
- One database read per request to check the session. That's negligible at this scale.
- Auth.js v5 is still beta (`5.0.0-beta.32`), so `.npmrc` sets `legacy-peer-deps`. Upgrades need care and a changelog review.
- A misconfigured deployment locks everyone out, which is safe and visible, rather than opening the app to the world.
- Users without a Google account can't sign in. That's acceptable for the target users.

## Alternatives considered

- **Email magic links:** need an email provider from day one, and can be intercepted.
- **Passwords:** more to build and secure, worse for users.
- **JWT sessions:** no database read, but they can't be revoked before expiry.
