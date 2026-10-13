# 0009: Decide "this month" in the user's timezone

Status: Accepted · Date: 2026-10-09

## Context

"This month" decides which row is shown on This month, which month Track logs, and where the live projection starts. Today it comes from `new Date()` on the server. Vercel runs in UTC, so between 00:00 and 05:30 IST on the 1st of a month, the app still thinks it's the previous month. Salary day is often the 1st, which is exactly when the user opens the app.

## Decision

- Store a timezone per user in `user_settings` (default `Asia/Kolkata`) (`ACC-6`).
- `currentMonth(now, timezone)` in `lib/engine/months.ts` computes the calendar month with `Intl.DateTimeFormat`. It's the only function allowed to decide "this month" (`ENG-8`).
- The loader passes the timezone into `forecast`.

## Consequences

- Correct month boundaries for Indian users, and for anyone else later.
- One more settings read per page. It can be loaded alongside the plan in the same round trip.
- Tests can pin both `now` and `timezone`.

## Alternatives considered

- **Hardcode IST:** works for the owner, but would be wrong for a user abroad and hides the dependency.
- **Use the browser's timezone:** pages render on the server, so the timezone would have to be sent with every request (a cookie). That's fragile, and stored settings are simpler.
