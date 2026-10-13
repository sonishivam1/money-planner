# Testing strategy

The numbers are the product, so most of the testing effort goes into the engine, where it's also cheapest.

## Layers

| Layer | What it proves | Tools | Where | Runs |
| --- | --- | --- | --- | --- |
| **Engine unit** | Each rule in the [engine spec](../03-domain/engine-spec.md) | Vitest | `lib/engine/*.test.ts` | Every push, < 2 s |
| **Engine golden** | The [worked examples](../03-domain/worked-examples.md) hold to ₹1 | Vitest | `lib/engine/golden.test.ts` | Every push |
| **Engine property** | The invariants hold for thousands of random plans | Vitest + fast-check | `lib/engine/invariants.test.ts` | Every push |
| **Schema and migration** | Old documents load; validation catches bad input | Vitest | `lib/engine/schema.test.ts`, `migrate.test.ts` | Every push |
| **Data access** | Queries are scoped by user; save conflicts are detected; revisions are written | Vitest + PGlite (in-process Postgres) | `lib/db/*.test.ts` | Every push |
| **Actions** | Each action authenticates, validates and returns field errors | Vitest with the session mocked | `lib/actions.test.ts` | Every push |
| **End to end** | Key journeys work in a real browser | Playwright | `e2e/` | Every push, in CI |

All layers exist: engine unit, golden and property tests; schema and migration tests; database tests on PGlite; security tests on the actions and allow-list; and Playwright journeys.

## Engine unit tests

At least one test per rule (`ENG-10`), named after the behaviour:

- Raises: in the raise month; not when a salary change falls in the raise month; restarting from a salary change.
- Expenses: start and end inclusive; step changes; inflation from the item's own start.
- Fixed investments: step-ups, cap, own start.
- Allocation: emergency fund first; shares normalised over active goals; a goal stops after its target.
- One-time payments: from the emergency fund first, then from free money.
- Shortfall: drawn from the emergency fund, carried, repaid first.
- Glide path: the exact month the rate switches.
- House outlook: shortfall, verdict boundaries (36%, 45%), zero interest rate.
- Goal completion: hold, withdraw, house purchase starting the EMI and ending rent.
- Forecast: latest log used; logs outside the plan ignored; timezone at month boundaries (31 Mar 23:00 IST vs UTC).
- Levers: each lever type; a lever that no longer applies is skipped.

## Property tests

A fast-check generator produces random valid plans: 1–15 expenses, 0–5 fixed investments, 0–4 goals, random dates within a 1–40 year horizon, returns from 0 to 15%, and in-hand from ₹10k to ₹10L. For each plan, every month must satisfy the invariants in [engine spec §4](../03-domain/engine-spec.md#4-invariants):

1. Allocation adds up.
2. Shortfall adds up.
3. No overdraft; balances ≥ 0.
4. Only active goals receive money, in share proportions.
5. Conservation with zero returns.
6. Monotone in salary.

Failures shrink to a minimal plan, which is then added as a named regression test.

## Golden tests

`golden.test.ts` asserts every figure in the worked examples to within ₹1. If an engine change moves a golden number, the PR must:

1. Explain why the new number is right.
2. Update the worked examples doc in the same PR.

## Data access tests

Run against [PGlite](https://pglite.dev) with the real Drizzle migrations applied, so there's no external database in CI.

- With two users, every query returns only the caller's rows, including delete-by-id with another user's id.
- A save with a stale version is rejected and writes nothing.
- A successful save writes exactly one revision with the right version.
- Deleting a user cascades to every table.

## End-to-end tests

Playwright runs `next dev` on a fresh embedded database (`pglite:./.data/e2e`) with the **dev-only sign-in** ([ADR-0011](../04-architecture/decisions/0011-zero-setup-local-dev.md)), which can't run in production builds. `MP_FAKE_NOW` pins the server clock to 15 Oct 2026 so the numbers are stable. It's also ignored in production. Tests load the fictional example plan. Locally they use the installed Chrome; CI installs Playwright's Chromium. Each journey runs at desktop and phone sizes.

Journeys:

1. J1: start a blank plan, add an expense, save, see it on This month.
2. J2: log balances; history shows the row; This month projects from it.
3. J3: record a salary change; Coming up and the goal cards update.
4. J4: create a scenario with blank optional fields; its raise % equals the plan's.
5. Pages agree: the free amount on This month equals the timeline's value for the current month.
6. Accessibility: axe-core finds no serious issues on each page.

## CI pipeline

GitHub Actions on every push and PR:

```
install → typecheck → lint (incl. import boundaries) → unit + property + db + security tests → build → e2e
```

`main` is protected: CI must pass before merging.

## Coverage targets

| Area | Target |
| --- | --- |
| `lib/engine` | ≥ 95% lines, 100% of spec rules |
| `lib/db/queries.ts` | Every exported function |
| `lib/actions.ts` | Every exported action, for authentication and validation |
| UI | Covered by the e2e journeys; no snapshot tests |

## Manual checks before a release

- This month at 360 px and 1280 px, in light and dark mode.
- Keyboard-only pass through Edit plan.
- Read through every number on This month against the worked examples (sample plan).
