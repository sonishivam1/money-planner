# Engine specification

The money engine turns a [plan](plan-model.md) into a month-by-month projection. Every number in the app comes from it. This document is the source of truth: when the code and this spec disagree, one of them is a bug.

It describes **engine v2**, the Phase 1.1 target. Where v1 (today's code) behaves differently, a **v1:** note says how.

## 1. Ground rules

1. **Pure and deterministic.** Inputs: plan, logs, current month. Output: projections. No database, network or clock access. The caller passes "now". (`ENG-1`)
2. **Months are integers.** `index = year × 12 + (month − 1)`. Start and end months are **inclusive**.
3. **Full precision.** Amounts are JavaScript numbers in rupees. Rounding happens only for display ([ADR-0005](../04-architecture/decisions/0005-money-representation.md)).
4. **Yearly rates become monthly rates by compounding:** `m(a) = (1 + a/100)^(1/12) − 1`. So 12 months at `m(11)` equals exactly 11% a year.
5. **Contributions arrive at the end of the month.** A balance grows on its opening value, then that month's contribution is added. A contribution earns nothing in its first month.
6. **Yearly changes happen in the raise month.** Raises, inflation and step-ups all apply in `raiseMonth`.

### Counting raises

`raises(from, to)` is the number of raise months `k` with `from < k ≤ to`. It's 0 when `to ≤ from`.

Because `from` is excluded, an amount that starts or changes **in** the raise month doesn't also get that month's raise. A salary change recorded in April replaces that April's raise; it doesn't stack with it.

## 2. Amounts that change over time

For month `i`, with `base` = `baseMonth`:

### Salary

Let `(m*, S*)` be the latest salary change with `m* ≤ i`, or `(base, income.inHand)` if there isn't one.

```
salary(i) = S* × (1 + raisePct/100) ^ raises(m*, i)
```

A salary change dated before `base` applies from `base`.

### Expense

`expense(i) = 0` if `i < start` or `i > end`. Otherwise let `(m*, A*)` be the latest step change with `m* ≤ i`, or `(from₀, amount)` where `from₀ = max(start, base)`.

```
expense(i) = A*                                         if not inflate
expense(i) = A* × (1 + inflation/100) ^ raises(m*, i)   if inflate
```

**v1:** inflation for an expense with no step change counts from `base`, even if the expense starts later. v2 counts from its own start, so a future expense is entered in the rupees of the month it starts.

### Fixed investment

`commitment(i) = 0` outside `[start, end]`. Otherwise, with `from₀ = max(start, base)`:

```
raw(i)        = amount × (1 + stepUp/100) ^ raises(from₀, i)
commitment(i) = cap > 0 ? min(raw(i), cap) : raw(i)
```

**v1:** step-ups count from `base`, so a fixed investment starting in 2030 would begin already stepped up four times. (`ENG-3`)

### Spending buffer

```
buffer(i) = assume.buffer × (1 + inflation/100) ^ raises(base, i)
```

### Emergency fund target

```
target(i) = emergency.target                    if mode = "amount"
target(i) = emergency.months × expenses(i)      if mode = "months"
```

`expenses(i)` is the sum of all expenses in month `i`, including a home loan EMI created by a house purchase. **v1:** amount mode only. (`ENG-5`)

## 3. One month, step by step

**State at the start of month `i`:** `ef`, `goal[g]` for each goal, `commit[c]` for each fixed investment, and `carried`, the shortfall still owed (≥ 0).

Steps run in this order:

**Step 1: free money**

```
income      = salary(i)
expenses    = Σ expense(i)  (+ home loan EMI after a house purchase)
commitments = Σ commitment(i)
free        = income − expenses − commitments − buffer(i)
```

**Step 2: one-time payments.** `O` = sum of one-time payments in month `i`.

```
fromEF₁ = min(ef, O)
ef      = ef − fromEF₁
free    = free − (O − fromEF₁)
```

**Step 3: shortfall or allocation**

If `free < 0`:

```
deficit  = −free
fromEF₂  = min(ef, deficit)
ef       = ef − fromEF₂
carried  = carried + (deficit − fromEF₂)        ← v2: never written off
```

**v1:** the part the emergency fund can't cover disappears. (`ENG-2`)

If `free ≥ 0`:

```
repaid      = min(free, carried)                 ← v2: repay first
carried     = carried − repaid
rest        = free − repaid
toEF        = min(rest, max(0, target(i) − ef))
rest        = rest − toEF
active      = goals with share > 0 and (no targetDate or targetDate ≥ i) and not completed
totalShare  = Σ share over active
alloc[g]    = rest × share[g] / totalShare       for g in active
unallocated = totalShare > 0 ? 0 : rest
```

Shares are normalised over the goals active **this month**, so when a goal reaches its date, the others absorb its share automatically.

**Step 4: growth, then contributions**

```
ef        = ef        × (1 + m(liquidRet))      + toEF
goal[g]   = goal[g]   × (1 + m(rate_g(i)))      + alloc[g]
commit[c] = commit[c] × (1 + m(c.rate))         + commitment_c(i)
```

The goal's return `rate_g(i)`, where `t` is its target month and `d` its `debtYears`:

```
in debt   = t is set and ( (d > 0 and i > t − 12d) or i > t )
rate_g(i) = in debt ? debtRet : (goal.rate ?? equityRet)
```

So the goal earns debt returns for its last `12 × d` months up to and including `t`, and in every month after `t`.

**Step 5: goal completion (v2, `ENG-4`).** At the end of each goal's target month `t`:

- `onTarget = "hold"`: nothing happens. The goal stops receiving money and keeps growing at the debt return.
- `onTarget = "withdraw"`, invest goal: `withdrawn[g] = goal[g]`, then `goal[g] = 0`. The goal is completed.
- `onTarget = "withdraw"`, house goal: compute the [house outlook](#5-house-outlook) from `goal[g]`.
  - **Affordable** (no shortfall): the fund is spent (`goal[g] = 0`). From month `t + 1`, a non-inflating expense "Home loan EMI" of `emi` runs for `loanYears × 12` months. If `replacesExpenseId` is set, that expense's last month becomes `t`.
  - **Short**: no purchase is simulated. The goal holds, and the outlook is flagged `short`.

**v1:** no completion. Goals just stop receiving money after `t` and keep growing.

**Step 6: record the row.** Every input, intermediate and closing balance above is stored for month `i` (`MonthRow`), so pages can show the working.

## 4. Invariants

These hold for every month and are checked by property tests (`ENG-6`), with a tolerance of ₹0.01:

1. **Allocation adds up.** If `free ≥ 0` after one-time payments: `free = repaid + toEF + Σ alloc + unallocated`.
2. **Shortfall adds up.** If `free < 0`: `deficit = fromEF₂ + (carried_end − carried_start)`.
3. **No overdraft.** `fromEF₁ + fromEF₂ ≤ ef` at the start of the month. All balances stay ≥ 0, and `carried` ≥ 0.
4. **Only active goals receive money**, in proportion to their shares.
5. **Conservation.** With every return set to 0, net worth `NW = ef + Σ goal + Σ commit − carried` changes each month by exactly `income − expenses − buffer − O − unallocated − Σ withdrawn`. The buffer counts as spent; fixed investments count as saved.
6. **Monotone in salary.** Raising `income.inHand`, with everything else fixed, never lowers any closing balance.

## 5. House outlook

For a house goal with target month `t`, using the closing balances of month `t` (or the last row if the horizon ends first):

```
years        = (t − base) / 12
price        = priceToday × (1 + growth/100) ^ years
costs        = price × costsPct / 100
minDown      = price × downPct / 100
upfront      = costs + minDown
fund         = goal[g] at the end of t
shortfall    = max(upfront − fund, 0)
down         = shortfall > 0 ? minDown : min(fund − costs, price)
loan         = max(price − down, 0)
emi          = standard EMI on loan at loanRate over loanYears
emiShare     = emi / salary(t) × 100
verdict      = short       if shortfall > 0
             = comfortable if emiShare ≤ 36
             = stretched   if emiShare ≤ 45
             = too-high    otherwise
```

Standard EMI with `r = loanRate / 1200` and `n = loanYears × 12`: `emi = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1)`, or `P / n` when `r = 0`.

House prices grow continuously by fractional years; salaries grow in yearly steps. That's intentional: prices move all year, pay changes once a year.

`fund` is the goal's own SIP balance only. Fixed investments linked to the house goal aren't counted toward the upfront cash, in v1 or v2 (open question [Q-6](../08-delivery/open-questions.md)).

## 6. Forecast: baseline and live

```
cur      = clamp(currentMonth(now, timezone), base, horizon)       ← v2: user's timezone (ENG-8)
baseline = project(baselinePlan, base, plan.start)
log      = latest log with base ≤ log.month ≤ cur, if any
live     = log ? project(plan, log.month, log balances) : project(plan, base, plan.start)
current  = the row of live for month cur
```

- **`baselinePlan`** is the plan revision marked as the tracking baseline ([ADR-0007](../04-architecture/decisions/0007-plan-revisions-and-frozen-baseline.md)). Track compares logs against it. **v1:** uses the current plan, so past comparisons shift when the plan is edited.
- A log is the **start** of its month, so the live projection begins at `log.month` with the log's balances as opening state, and `carried = log.shortfall`.
- Goals or fixed investments missing from a log open at 0.
- Before `base`, "now" is clamped to `base`. After the horizon, it's clamped to the horizon and the UI suggests extending the plan.

## 7. Coming up (events)

From month `cur` onwards, the first 6 by month (`DSH-4`):

| Event | Month shown | Text |
| --- | --- | --- |
| Expense ends | `end + 1` | "{name}: done, freeing {expense(end)} a month" (v1 uses the original amount) |
| Expense step change | change month | "{name} changes to {amount} a month" |
| One-time payment | its month | "{name}: {amount} from the emergency fund" |
| Salary change | its month | "Salary becomes {inHand} in hand" |
| Next raise | next raise month after `cur` | "Yearly raise of {raisePct}% assumed; step-ups apply" |
| Emergency fund full | first live row with `ef ≥ target − 1` | "Emergency fund reaches {target}; goal SIPs start next month" |
| Move to debt | `t − 12d + 1` | "Move the {goal} fund into debt" |
| Target date | `t` | "{goal}: target date" |
| House bought v2 | `t` | "House bought; home loan EMI {emi} starts next month" |
| Shortfall repaid v2 | first month `carried` returns to 0 | "Carried shortfall repaid" |

## 8. Scenario summary

For the plan and each scenario, run the live forecast and report (`WIF-2`):

- **Emergency fund full:** first live month with `ef ≥ target(i) − 1`, or none.
- **House outlook** for the first house goal.
- **Goals at horizon:** each goal's closing balance plus the closing balances of fixed investments linked to it.
- **In-hand at horizon.**

A scenario is `applyLevers(currentPlan, levers)`, a pure function ([ADR-0006](../04-architecture/decisions/0006-scenarios-as-levers.md)).

## 9. Display rules the engine supports

- **Per-fund SIP amounts:** round the goal's amount to the nearest ₹100, round each fund's share to ₹100, then add any rounding difference to the largest fund, so the funds add up to the goal's rounded amount. **v1:** rounds each fund on its own, so the funds can be ₹100 off the goal.
- **"Full" means within ₹1** of the target, so floating-point noise never reads as "not quite full".

## 10. Edge cases

| Case | Behaviour |
| --- | --- |
| No goals, or every active share is 0, once the EF is full | `unallocated` gets the rest; This month shows it as "Not assigned to a goal" and links to Edit plan |
| EF already above target | `toEF = 0`; the extra stays and earns the liquid return |
| Several one-time payments in a month | Summed |
| Target date before `base` | The goal is never active; a validation warning is shown |
| A step change dated before an expense's start | Takes effect at the start |
| Log dated after `cur` or outside the plan | Ignored |
| Every return 0% | Allowed; the monthly rate is 0 |
| Negative raise or inflation | Allowed down to −100%; amounts never go below 0 |

## 11. v1 → v2 changes

| # | Change | Requirement | Breaks existing tests? |
| --- | --- | --- | --- |
| 1 | Carry uncovered shortfall forward; repay before the EF | ENG-2 | Updates "never invents money" (expects `carried`) |
| 2 | Step-ups and inflation count from the item's own start | ENG-3 | No (the sample has no future-starting items) |
| 3 | Goal completion and house purchase | ENG-4 | Only if the horizon passes a target date |
| 4 | EF target in months of expenses | ENG-5 | No (the default stays amount) |
| 5 | Timezone-aware current month | ENG-8 | No |
| 6 | Real goals instead of orphan goal ids | ENG-9 | No (the dashboard changes, not the engine) |
| 7 | Fund rounding remainder goes to the largest fund | DSH-2 | No (display only) |
