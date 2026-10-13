# Current state and gaps

An honest assessment of the code at commit `26c783f` against these docs. It's the input to the [roadmap](roadmap.md).

## What's solid

Keep these and build on them.

- **A pure engine with tests.** Money logic is isolated in `lib/engine`, has no I/O, and has 14 passing tests. That's the right foundation.
- **User scoping.** Every query takes `userId`; every action calls `requireUserId()` first.
- **Zod at every boundary.** The plan is validated on read and write; the schema produces both the input and output types.
- **Lazy database connection.** Builds and tests never need a database.
- **A simple stack.** One deployable, server-rendered, no client-side data caching.
- **Typecheck and production build pass.**

## Gaps

Severity: **High** means wrong numbers, a security risk, or a blocker for other work. **Medium** means a missing capability users will hit. **Low** means polish.

| ID | Area | Finding | Impact | Severity | Fix | Size |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | Security | An empty `ALLOWED_EMAILS` lets **any** Google account sign in (`auth.ts`) | A misconfigured deploy exposes the app to the world | High | ACC-2, ADR-0004 | S |
| G-02 | Tracking | "Ahead/behind plan" compares against the **current** plan, so editing the plan rewrites history (`track/page.tsx` uses `f.baseline` from the current plan) | Tracking can't be trusted | High | TRK-3, ADR-0007 | M |
| G-03 | Engine | A shortfall bigger than the emergency fund is silently written off (`project.ts`, the `free < 0` branch) | Unaffordable plans look fine | High | ENG-2, ADR-0008 | S |
| G-04 | What if | Scenarios are frozen plan copies; later plan edits don't reach them | Comparisons drift and mislead | High | WIF-3, ADR-0006 | M |
| G-05 | Data | The plan document has no `schemaVersion` | The first shape change will break or misread stored plans | High | ENG-7, ADR-0002 | S |
| G-06 | Process | No CI, linter, import-boundary checks, data-access tests or end-to-end tests | Regressions reach `main` unseen | High | NFR-MNT-1, NFR-MNT-3 | M |
| G-07 | Data | Saving the plan is last-write-wins | Two tabs silently overwrite each other | Medium | PLN-10 | S |
| G-08 | Data | No plan history or undo | A bad edit can't be reverted | Medium | PLN-11 | M |
| G-09 | Engine | "This month" uses the server clock (UTC on Vercel) | Wrong month for the first 5½ hours of each month in IST | Medium | ENG-8, ADR-0009 | S |
| G-10 | Engine | Step-ups and inflation count from the plan's base month, not the item's start | Future-starting items begin already stepped up | Medium | ENG-3 | S |
| G-11 | Engine | Goals never complete: no withdrawal at the target date, and the house purchase never starts an EMI or ends rent | Any plan whose horizon passes the house date is wrong after it | Medium | ENG-4 | L |
| G-12 | Engine/UI | The `"kids"` goal id and its "Kids' education" / "Guaranteed" labels are hardcoded (`plan-editor.tsx`, `dashboard/page.tsx`) | Breaks for other users; one person's situation is baked into the product | Medium | ENG-9, ADR-0010 | M |
| G-13 | Engine | The emergency fund target is a fixed amount for ten years | Inflation erodes it; by year 10 it covers far fewer months | Low | ENG-5 | S |
| G-14 | Editor | No start month for expenses or fixed investments; only the first step change of an expense is editable; no goal return override or protected flag | The engine supports more than the UI exposes | Medium | PLN-3, PLN-4, PLN-7 | M |
| G-15 | Editor | Only the first validation error is shown, as one line | Fixing several mistakes takes several save attempts | Medium | PLN-8 | M |
| G-16 | Editor | A one-time payment row with no month blocks the whole save (`tidy()` doesn't drop it) | Confusing error | Low | PLN-5 | S |
| G-17 | Editor | No warning when leaving with unsaved edits | Lost edits | Low | PLN-9 | S |
| G-18 | Editor | List rows are keyed by array index (expenses, one-times, salary changes) | Focus can jump when a row is removed | Low | Use item ids as keys | S |
| G-19 | Tracking | Only the current month can be logged | No backfill after missing a month | Medium | TRK-2 | S |
| G-20 | Tracking | The logged salary is stored but never used | Salary drift goes unnoticed | Low | TRK-5 | S |
| G-21 | Dashboard | Hardcoded guidance copy ("keep insurance premiums paid", "Direct plan, Growth option") | Advice-like text that isn't from the user's plan | Low | DSH-3, UI guidelines | S |
| G-22 | Dashboard | "Coming up" shows an ended expense's original amount, not its amount at the end | Understates the money freed | Low | DSH-4 | S |
| G-23 | Dashboard | Per-fund SIP amounts are rounded separately and can miss the goal total by ₹100 | Small mismatch on the key screen | Low | DSH-2, engine spec §9 | S |
| G-24 | Privacy | No data export or account deletion | Required before inviting anyone | Medium | ACC-4, ACC-5 | S |
| G-25 | Security | No security headers or CSP | Weaker defence in depth | Medium | NFR-SEC-5 | S |
| G-26 | Setup | The empty state tells the user to run a CLI seed command | Not usable without a terminal | Low | SET-2 | S |
| G-27 | Sample data | The fictional one-time "Prepay personal loan" falls in Sep 2027, after that loan ends in Aug 2027 | Odd example; tests unaffected | Low | Rename it or move it to Jul 2027 when the golden tests are written | S |
| G-28 | Dependencies | Auth.js v5 is a pinned beta, which needs `legacy-peer-deps` | Upgrade risk | Low | Track releases; upgrade deliberately | — |

Sizes: **S** under a day, **M** 1–3 days, **L** 3–5 days, for one developer.

## Resolved

| ID | Finding | Fixed in |
| --- | --- | --- |
| R-01 | What if: empty raise %, house price and house share were saved as 0 | `26c783f` |
| R-02 | Real personal financial data in the public repo's sample plan | `954108d` (replaced with fictional data before the first push) |
