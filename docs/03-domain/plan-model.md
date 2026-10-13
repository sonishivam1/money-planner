# Plan model

The plan is the user's complete set of inputs. It's one JSON document per user, validated by Zod (`lib/engine/schema.ts`) on every read and write. Why it's one document rather than many tables is explained in [ADR-0002](../04-architecture/decisions/0002-plan-as-one-versioned-document.md).

This page defines every field. **v2** marks fields and rules to add in Phase 1.1; everything else exists today (schema v1).

## Conventions

- **Month:** string `"YYYY-MM"`. Internally converted to an integer index `year × 12 + (month − 1)`.
- **Money:** rupees as a number ≥ 0, entered as whole rupees. The engine keeps full precision; see [ADR-0005](../04-architecture/decisions/0005-money-representation.md).
- **Percent:** a number from −100 to 100, such as `8` for 8%.
- **Ids:** short strings, unique within their list, stable for the life of the item. Logs and starting balances refer to goals and fixed investments by id, so an id never changes after creation.
- **Optional months:** an empty string in a form becomes "not set".

## Top level

| Field | Type | Rules | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` **v2** | integer | Current version; set by migrations | Lets old documents be upgraded on read ([ADR-0002](../04-architecture/decisions/0002-plan-as-one-versioned-document.md)) |
| `baseMonth` | Month | | First month of the plan. Starting balances are as of its start |
| `horizon` | Month | ≥ `baseMonth`; at most 480 months after it **v2** | Last month projected |
| `income` | object | | See below |
| `expenses` | Expense[] | ids unique **v2** | Monthly outflows that aren't investments |
| `commitments` | FixedInvestment[] | ids unique **v2** | Policies, PPF and other fixed monthly investments |
| `oneTimes` | OneTime[] | | Single payments |
| `emergency` | object | | Emergency fund settings |
| `goals` | Goal[] | ids unique **v2** | What money is saved for |
| `assume` | object | | Inflation, returns and buffer |
| `start` | object | | Balances at the start of `baseMonth` |

## Income

| Field | Type | Meaning |
| --- | --- | --- |
| `inHand` | Money | In-hand salary per month at `baseMonth` |
| `raisePct` | Percent | Yearly raise, applied every raise month |
| `raiseMonth` | 1–12 | Calendar month when raises, inflation and step-ups apply |
| `events[]` | `{ id, month, inHand, note }` | Salary changes: from `month`, in-hand becomes `inHand`; raises continue from there |

## Expense

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | string | |
| `amount` | Money | Monthly amount at its start (at `baseMonth` if it started earlier) |
| `start`, `end` | Month? | First and last month it's paid, both inclusive. Empty means open-ended |
| `inflate` | boolean | Grows with inflation every raise month. EMIs and term premiums are usually `false` |
| `changes[]` | `{ month, amount }` | Step changes: from `month`, the amount becomes `amount` and inflation restarts from there. Any number allowed **v2 in the editor** |

## Fixed investment (`commitments`)

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | string | |
| `amount` | Money | Monthly amount at its start |
| `start`, `end` | Month? | Inclusive |
| `stepUp` | Percent | Yearly increase, applied every raise month, counted from its own start **v2** |
| `cap` | Money | Monthly maximum after step-ups; `0` means no cap |
| `rate` | Percent | Expected yearly return, used to estimate its value |
| `goal` | string | Id of the goal this counts toward, or empty. Must be a real goal id **v2** |
| `protected` **v2** | boolean | Must never be stopped (such as policy premiums). Named in shortfall warnings |
| `note` | string | |

## One-time payment

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | string | |
| `month` | Month | When it's paid |
| `amount` | Money | Paid from the emergency fund first |

## Emergency fund

| Field | Type | Meaning |
| --- | --- | --- |
| `target` | Money | Target amount when `mode` is `amount` |
| `mode` **v2** | `"amount"` \| `"months"` | Fixed rupee target, or a number of months of expenses (default `amount`) |
| `months` **v2** | number 1–24 | Months of expenses when `mode` is `months` |
| `funds` | string | Where it's kept, shown on This month |

## Goal

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `name` | string | |
| `kind` | `"invest"` \| `"house"` | House goals get the house outlook |
| `share` | Percent ≥ 0 | Share of free money once the emergency fund is full. `0` for goals funded only by fixed investments **v2** |
| `targetDate` | Month? | When the money is needed. Empty means no date (such as retirement inside the horizon) |
| `debtYears` | 0–20 | Years before `targetDate` to move into debt |
| `rate` | Percent? | Overrides the equity return for this goal |
| `funds[]` | `{ name, pct }` | Split of this goal's SIP across funds; should add up to 100 |
| `onTarget` **v2** | `"hold"` \| `"withdraw"` | At the target date, keep the money invested or spend it. Default: `withdraw` for house, `hold` otherwise |
| `house` | object? | Only for `kind: "house"`. See below |

### House details

| Field | Type | Meaning |
| --- | --- | --- |
| `priceToday` | Money | Price at `baseMonth` |
| `growth` | Percent | Yearly price growth |
| `downPct` | Percent | Minimum down payment as % of price |
| `costsPct` | Percent | Stamp duty, registration and interiors as % of price |
| `loanRate` | Percent | Home loan interest |
| `loanYears` | 1–40 | Loan tenure |
| `replacesExpenseId` **v2** | string? | An expense (such as rent) that ends when the house is bought |

## Assumptions

| Field | Meaning |
| --- | --- |
| `inflation` | Yearly inflation applied to inflating expenses and the buffer |
| `equityRet` | Yearly return on equity goals |
| `debtRet` | Yearly return once a goal moves to debt |
| `liquidRet` | Yearly return on the emergency fund |
| `buffer` | Monthly spending buffer at `baseMonth` |

## Starting balances (`start`)

| Field | Meaning |
| --- | --- |
| `ef` | Emergency fund at the start of `baseMonth` |
| `goals` | Map of goal id → value |
| `commit` | Map of fixed investment id → value |

## Balance log (separate table, same conventions)

| Field | Meaning |
| --- | --- |
| `month` | Month logged; balances are as of its start, before its SIPs |
| `salary` | In-hand credited that month (used by `TRK-5`) |
| `ef`, `goals`, `commit` | Real balances, keyed like `start` |
| `shortfall` **v2** | Carried shortfall still owed, if any (default 0) |
| `note` | Free text |

## Scenario levers v2

Scenarios store levers, not plan copies ([ADR-0006](../04-architecture/decisions/0006-scenarios-as-levers.md)). Each lever is a tagged object:

| `type` | Fields | Effect on the plan |
| --- | --- | --- |
| `salary` | `month`, `inHand` | Adds or replaces a salary change at `month` |
| `raise` | `pct` | Sets `income.raisePct` |
| `housePrice` | `priceToday` | Sets the house goal's price today |
| `houseDate` | `month` | Sets the house goal's target date |
| `houseShare` | `pct` | Sets the house share; other goals rescale to fill the rest, keeping their ratios |
| `expense` (Could) | `expenseId`, `month`, `amount` | Adds a step change to an expense |
| `oneTime` (Could) | `name`, `month`, `amount` | Adds a one-time payment |

## Validation

**Errors** block saving and are shown next to the field:

- Every Zod type and range rule above.
- `horizon` before `baseMonth`, or more than 480 months after it.
- Duplicate ids in any list.
- A fixed investment's `goal` that isn't a goal id.
- `start` after `end` on an expense or fixed investment.
- A house goal without `house` details or without a `targetDate`.

**Warnings** are shown but don't block:

- Goal shares don't add up to 100% (the engine normalises them, so this is informational).
- A goal's fund split doesn't add up to 100%.
- A target date before `baseMonth`.
- A salary change or expense change outside the plan's months.

## Migrations

| From | To | What changes |
| --- | --- | --- |
| 1 (no `schemaVersion`) | 2 | Add `schemaVersion: 2`. For each fixed investment pointing at a goal id that doesn't exist (such as `"kids"`), create a goal with that id, `share: 0`, `kind: "invest"`, and the id as its name. Set `emergency.mode: "amount"`. Set `onTarget` by kind. All other new fields take their defaults |

Migration functions live in `lib/engine/migrate.ts`. They're pure, and each one has a test with a stored v1 document.
