# Users and journeys

## Personas

### P1: The owner (primary)

- Salaried, in India, paid monthly in hand (after tax and PF).
- Has a mix of commitments: rent, EMIs that end on known dates, family support, insurance premiums, insurance-linked savings policies and PPF.
- Invests through monthly SIPs in a few mutual funds, set up manually with a broker.
- Goals: an emergency fund, a house in about ten years, retirement, children's education.
- Comfortable with a spreadsheet, short on time. Wants the answer on salary day in under five minutes.
- Uses a laptop for planning and a phone for the monthly check.

### P2: Invited user (secondary, later)

- Same profile as P1, with their own numbers.
- Never sees anyone else's data and isn't affected by P1's settings.
- May be less familiar with terms like glide path or step-up, so needs the glossary and plain copy.

### Out of scope

Financial advisors managing clients, couples sharing one plan, freelancers with irregular income. See the non-goals in the [vision](vision.md#non-goals).

## Journeys

Each journey lists the requirements it depends on (see [functional requirements](../02-requirements/functional-requirements.md)).

### J1: First-time setup

1. Sign in with Google. → `ACC-1`, `ACC-2`
2. No plan yet: choose "Start a blank plan", or "Load the example" to explore. → `SET-1`, `SET-2`
3. Fill in Edit plan section by section: income, expenses and EMIs, fixed investments, one-time payments, emergency fund, goals, assumptions. → `PLN-1`…`PLN-7`
4. Save. Any problem is shown next to the field that caused it. → `PLN-8`
5. Open This month and see where this month's money goes. → `DSH-1`, `DSH-2`

**Done when:** a new user goes from sign-in to a believable This month page in under 20 minutes.

### J2: Salary day (monthly)

1. Open the app on salary day. A banner says this month isn't logged yet. → `TRK-7`
2. Go to Track; the form is pre-filled with the balances the plan expected. Overwrite with real values from the broker and bank apps. Save. → `TRK-1`
3. Projections restart from those real numbers. → `TRK-4`
4. If the salary credited differs from the plan, the app offers to record a salary change. → `TRK-5`
5. Open This month and read the exact amount for each SIP. Check them against the broker's auto-debits. → `DSH-2`

**Done when:** the whole routine takes under 5 minutes.

### J3: Life changes (raise, new job, EMI ends)

1. Get a raise or an offer. On This month, enter the month and the new in-hand amount. → `DSH-5`
2. The emergency fund date, every SIP amount and the house EMI share recalculate. → `ENG-*`
3. A loan ending needs no action: its end month is already in the plan, and the freed money flows into goals automatically. "Coming up" shows it in advance. → `DSH-4`

### J4: Decide with a what-if

1. Before accepting an offer or committing to a bigger house, open What if.
2. Create a scenario: a new salary from a month, a different raise, a house price, buying date or house share. → `WIF-1`
3. Compare it side by side with the plan: emergency fund date, house fund, EMI share, retirement value. → `WIF-2`
4. Later plan edits still apply to the scenario, so the comparison stays fair. → `WIF-3`
5. If the scenario becomes reality, apply it to the plan. → `WIF-5`

### J5: Yearly review (April)

1. A reminder arrives in April. → `AUT-2` (Phase 2)
2. Check the step-ups that just applied (SIPs, PPF), review assumptions (inflation, returns), and compare a year of logs with the original plan. → `TRK-3`
3. Adjust the plan. A revision is saved, so last year's version stays available for comparison. → `PLN-11`

### J6: A big one-time expense

1. Add a one-time payment (a wedding, a car down payment) in its month. → `PLN-5`
2. This month and Coming up show it being paid from the emergency fund. If the fund can't cover it, the shortfall is shown and carried forward until it's repaid. → `DSH-3`, `ENG-2`

### J7: Buying the house

1. As the target date nears, the house goal moves into debt funds `debtYears` early, and Coming up says so. → `ENG-*`, `DSH-4`
2. On the target date the house fund pays the upfront costs and down payment, the home loan EMI starts as an expense, and rent can end. → `ENG-4`
3. After that the plan keeps running, with the EMI in place of rent and the house share moving to the other goals.
