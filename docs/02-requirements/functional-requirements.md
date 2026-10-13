# Functional requirements

What the app must do. Each requirement has a stable ID, a priority (`Must` / `Should` / `Could`) and a status against the code at commit `26c783f` (`Built` / `Partial` / `Gap` / `Planned`). The reasons behind each `Partial` and `Gap` are in [current state and gaps](../08-delivery/current-state-and-gaps.md).

Phase 1.1 is done when every `Must` and `Should` in sections 1–9 is `Built`.

## 1. Account and access (ACC)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| ACC-1 | Sign in with Google. Signed-out visitors to any app page go to the login page. | Must | Built |
| ACC-2 | Only allow-listed emails can sign in. In production, an empty allow-list blocks everyone (fails closed); it doesn't let everyone in. | Must | Partial: fails open |
| ACC-3 | Sign out from any page. | Must | Built |
| ACC-4 | Export all my data (plan, revisions, logs, scenarios) as one JSON file. | Should | Gap |
| ACC-5 | Delete my account and all its data, after typing a confirmation. | Should | Gap |
| ACC-6 | Settings page: timezone (default Asia/Kolkata), used to decide "this month". | Should | Gap |

## 2. Plan setup (SET)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| SET-1 | With no plan, offer "Start a blank plan" with sensible defaults (10-year horizon from this month, 8% raise in April, ₹3L emergency target, one long-term goal). | Must | Built |
| SET-2 | Offer "Load the example plan" (the fictional sample) from the UI, so a new user can explore before entering their own numbers. | Could | Partial: CLI seed only |

## 3. Plan editing (PLN)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| PLN-1 | Edit income: in-hand at plan start, yearly raise %, raise month, plan start and end months. | Must | Built |
| PLN-2 | Add, edit and remove salary changes (month, new in-hand, note). | Must | Built |
| PLN-3 | Expenses: name, monthly amount, optional start and end month, grows with inflation (yes/no), and **any number** of step changes (month, new amount). | Must | Partial: no start month; only one step change editable |
| PLN-4 | Fixed investments: name, monthly amount, optional start and end, yearly step-up %, monthly cap, expected return, linked goal, note, and a "protected" flag for payments that must never stop (such as policy premiums). | Must | Partial: no start month, no protected flag |
| PLN-5 | One-time payments: name, month, amount. A half-filled row never blocks saving the rest of the plan. | Must | Partial: a row with no month blocks the save |
| PLN-6 | Emergency fund: target as a fixed amount **or** as N months of expenses; where it's kept; value at plan start. | Should | Partial: fixed amount only |
| PLN-7 | Goals: name, kind (invest or house), share of free money, optional target date, years before target to move to debt, return override, fund split, value at plan start, and what happens at the target date (see `ENG-4`). House goals add price today, price growth, down payment %, costs %, loan rate and years, and optionally an expense the house replaces (rent). | Must | Partial: no return override or completion settings in the editor |
| PLN-8 | Validation shows **every** problem next to its field, not only the first. Warns, without blocking, when goal shares or a goal's fund split don't add up to 100%. | Must | Partial: first problem only, as one message |
| PLN-9 | Unsaved changes: a visible indicator, Discard, and a browser warning when leaving the page with unsaved edits. | Should | Partial: no leave-page warning |
| PLN-10 | Saving a plan that changed since it was loaded (another tab or device) is rejected with "The plan changed elsewhere. Reload to see it." | Should | Gap |
| PLN-11 | Every save creates a plan revision. The user can list revisions, view one, and restore one (which itself saves a new revision). | Should | Gap |

## 4. This month: dashboard (DSH)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| DSH-1 | Summary strip: this month's in-hand, committed (expenses + fixed investments), free to allocate, and a status (short / building emergency fund / investing for goals). | Must | Built |
| DSH-2 | "Where this month's money goes": expenses, each fixed investment, emergency fund top-up, each goal with its per-fund SIP amounts (rounded to ₹100), spending buffer. Totals add up to in-hand. | Must | Built |
| DSH-3 | Warnings for a shortfall and for one-time payments this month. Copy is generated from the plan (for example, it names the protected fixed investments), with no hardcoded personal text. | Must | Partial: hardcoded policy text |
| DSH-4 | "Coming up": the next 6 plan events (EMI ends, expense changes, one-time payments, salary changes, next raise, emergency fund full, move to debt, target dates, house purchase). Amounts shown are the values at that month. | Must | Partial: "freeing ₹X" uses the original amount |
| DSH-5 | Record a salary change (month, amount, note) without opening Edit plan. | Must | Built |
| DSH-6 | Goal cards: emergency fund progress and full-by date; each goal's value now and at target or horizon including linked fixed investments; house card with price then, upfront needed, loan, EMI, EMI share and verdict. Goals funded only by fixed investments appear as normal goals. | Must | Partial: hardcoded "kids" card |
| DSH-7 | Growth chart: emergency fund and each goal (including linked fixed investments), sampled each December, with a line for the house upfront cash. | Must | Built |
| DSH-8 | When a shortfall is being carried, show how much and when it's expected to be repaid. | Should | Gap (needs `ENG-2`) |
| DSH-9 | Banner when the current month has no balance log, linking to Track. | Should | Gap |

## 5. Year by year: timeline (TML)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TML-1 | Table of the first month, each December and the last month: in-hand, expenses, fixed investments, free, to emergency, to each goal, and each balance. The current month is highlighted. | Must | Built |
| TML-2 | Expand any year to show its 12 months. | Could | Gap |
| TML-3 | Download the full monthly projection as CSV. | Could | Gap |

## 6. Track (TRK)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| TRK-1 | Log this month's balances (emergency fund, each goal, each fixed investment, salary credited, note), pre-filled with what the plan expected. | Must | Built |
| TRK-2 | Log or edit a past month (backfill), picking the month. | Should | Gap |
| TRK-3 | History table: each log against the **frozen baseline** (the plan revision the user chose as baseline, by default the first). Green ahead, red behind. Editing the plan doesn't move past comparisons. | Must | Partial: compares against the current plan, so history shifts when the plan is edited |
| TRK-4 | The latest log on or before this month becomes the starting point of the live projection. | Must | Built |
| TRK-5 | If the logged salary differs from the plan's salary for that month by more than 1%, offer to record a salary change. | Should | Gap |
| TRK-6 | Delete a log after confirming. | Must | Built |

## 7. What if (WIF)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| WIF-1 | Create a named scenario from levers: new salary from a month, raise %, house price, buying date, house share. An empty field keeps the plan's value. | Must | Built (empty-field bug fixed in `26c783f`) |
| WIF-2 | Side-by-side comparison of the plan and each scenario: emergency fund full date, house fund, house price, EMI, EMI share, each other goal at horizon, in-hand at horizon. | Must | Built |
| WIF-3 | Scenarios store levers, not copies, and apply them to the **current** plan. Editing the plan updates every scenario. | Must | Gap: scenarios are frozen copies |
| WIF-4 | Rename a scenario and edit its levers. | Should | Gap |
| WIF-5 | Apply a scenario to the plan (creates a plan revision). | Could | Gap |
| WIF-6 | More levers: change an expense from a month, add a one-time payment, add a goal. | Could | Gap |

## 8. Engine (ENG)

These are behaviours of the calculation engine. The exact rules are in the [engine specification](../03-domain/engine-spec.md).

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| ENG-1 | The engine is pure and deterministic: same plan, logs and "now" give the same result. No I/O, no clock reads inside. | Must | Built |
| ENG-2 | A shortfall the emergency fund can't cover is carried forward and repaid from later free money before anything else. Money is never silently written off. | Must | Gap |
| ENG-3 | Step-ups on a fixed investment, and inflation on an expense, count from the item's own start month (or the plan's base month, if later), not always from the plan's base month. | Must | Gap |
| ENG-4 | Goal completion: at its target date, a goal can be held (keeps growing) or withdrawn (spent). A house goal pays its upfront costs and down payment, starts the home loan EMI as an expense from the next month, and can end a linked expense (rent). | Should | Gap |
| ENG-5 | An emergency fund target expressed in months of expenses is recalculated every month. | Should | Gap |
| ENG-6 | Every month conserves money: allocations plus outflows equal inflows (see the invariants in the spec). Tested as a property. | Must | Partial: holds today but untested |
| ENG-7 | The plan document has a `schemaVersion`. Older documents are upgraded on read by pure, tested migration functions. | Must | Gap |
| ENG-8 | "This month" is decided in the user's timezone, not the server's. | Must | Gap: uses the server clock (UTC on Vercel) |
| ENG-9 | Goals funded only by fixed investments are ordinary goals with share 0. No goal ids are hardcoded anywhere. | Must | Gap: `"kids"` is hardcoded |
| ENG-10 | Every rule in the engine specification has at least one test. | Must | Partial |

## 9. Experience and interactivity (EXP)

Added on 13 Oct 2026: the app should feel alive, not like a static report. Previews run the engine in the browser ([ADR-0012](../04-architecture/decisions/0012-engine-in-the-browser-for-live-previews.md)).

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| EXP-1 | Public landing page at `/` for signed-out visitors: what the app does, plus an **interactive demo** on the fictional sample plan (sliders for salary, raise and house price that instantly update the growth chart, the emergency fund date and the house verdict). Signed-in visitors go straight to This month. | Must | Gap |
| EXP-2 | What-if **sandbox**: sliders and inputs for each lever recalculate a live comparison against the plan as you drag, then "Save as scenario". | Must | Gap |
| EXP-3 | Plan editor **impact panel**: as you edit, a sticky panel shows this month's free money, the emergency fund full date, the house verdict and each goal at horizon, with the change from the saved plan. | Must | Gap |
| EXP-4 | Interactive charts: hover or tap for exact values; toggle series; a "Show as table" alternative. | Must | Partial: hover only |
| EXP-5 | Theme: light, dark or system, chosen in the header and remembered. | Should | Gap |
| EXP-6 | Responsive app shell: top navigation on desktop, bottom tab bar on phones, header menu for Settings, History, Export and Sign out. | Must | Partial |
| EXP-7 | Feedback for every action: pending states, toasts for saved or failed, and gentle number transitions that respect reduced-motion settings. | Should | Partial |
| EXP-8 | Zero-setup local run: embedded Postgres and a dev-only sign-in ([ADR-0011](../04-architecture/decisions/0011-zero-setup-local-dev.md)). | Must | Gap |

## 10. Phase 2: Automation (AUT)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| AUT-1 | Email on salary day (user-set day of month) linking to Track. | Must | Planned |
| AUT-2 | Email each raise month to review step-ups and assumptions. | Should | Planned |
| AUT-3 | Holdings: record units per mutual fund scheme. Fund values are calculated daily from AMFI's NAV file and pre-fill the balance log. | Must | Planned |
| AUT-4 | Import units from a CAMS / KFintech CAS PDF, parsed on the server and never stored as a file. | Should | Planned |
| AUT-5 | Installable on a phone (PWA) with a home-screen icon. Read-only offline view of the last loaded This month page. | Could | Planned |

## 11. Phase 3: AI assistant (AI)

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| AI-1 | Chat assistant that answers questions ("Can I afford a ₹20L car next year?") by calling the engine as tools: read the plan, run a scenario, compare. Every number it states comes from a tool result. | Must | Planned |
| AI-2 | The assistant never changes the plan without showing the change and getting explicit confirmation. | Must | Planned |
| AI-3 | An MCP server exposes the user's plan and the engine (read-only tools first) to the user's own Claude client, authenticated per user. | Should | Planned |
