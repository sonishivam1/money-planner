# Glossary

Terms as Money Planner uses them. When a term appears in the UI, its tooltip uses the "Meaning" column.

## Money and India-specific terms

| Term | Meaning |
| --- | --- |
| **In-hand salary** | What lands in the bank account each month, after tax, PF and other deductions. The plan uses only this. |
| **Lakh (L) / Crore (Cr)** | ₹1,00,000 and ₹1,00,00,000. Amounts use Indian grouping: ₹1,25,000. |
| **EMI** | Equated monthly instalment: the fixed monthly repayment on a loan. |
| **SIP** | Systematic investment plan: a fixed monthly investment into a mutual fund by auto-debit. |
| **Step-up** | A yearly percentage increase in a monthly payment, such as a SIP or PPF deposit. |
| **PPF** | Public Provident Fund: a government savings scheme with a yearly deposit limit (₹1.5L, so at most ₹12,500 a month). |
| **ULIP** | Unit-linked insurance plan: insurance combined with market-linked investment, usually with a lock-in. |
| **Endowment / guaranteed plan** | An insurance-linked policy that pays a fixed amount at maturity. |
| **Term insurance** | Pure life cover with no maturity value. Treated as an expense. |
| **FD** | Fixed deposit at a bank. |
| **Liquid fund** | A mutual fund holding very short-term debt. Used for the emergency fund. |
| **Debt fund** | A mutual fund holding bonds. Lower risk and return than equity. |
| **Index fund** | A fund that tracks an index such as the Nifty 50. |
| **FoF** | Fund of funds: a fund that invests in other funds (for example gold or international funds). |
| **NAV** | Net asset value: the price of one unit of a mutual fund, published daily. |
| **AMFI** | Association of Mutual Funds in India. Publishes every fund's daily NAV in one file. |
| **CAS / CAMS / KFintech** | Consolidated account statement, and the two registrars that issue it. It lists every mutual fund holding and its units. |
| **Stamp duty and registration** | One-time government charges when buying property, typically 6–8% of the price. Interiors are often budgeted on top. |

## Planner terms

| Term | Meaning |
| --- | --- |
| **Plan** | One user's full set of inputs: income, expenses, fixed investments, one-time payments, emergency fund, goals, assumptions and starting balances. |
| **Base month** | The month the plan starts. Starting balances are as of the start of this month. |
| **Horizon** | The last month the plan projects. |
| **Raise month** | The calendar month when the yearly raise, inflation and step-ups apply (April by default). |
| **Salary change** | A recorded new in-hand amount from a given month. Raises continue from the new amount. |
| **Expense** | A monthly outflow that isn't an investment: rent, living costs, EMIs, insurance premiums. May end, may grow with inflation, may change on a date. |
| **Fixed investment** | A monthly amount invested regardless of the plan's free money: policies and PPF. Has its own return, step-up and cap, and can count toward a goal. |
| **One-time payment** | A single outflow in a given month, paid from the emergency fund first. |
| **Spending buffer** | A monthly amount kept aside for irregular spending. It grows with inflation. |
| **Free money** | In-hand minus expenses, fixed investments and the spending buffer. The amount the plan allocates. |
| **Shortfall** | Free money below zero. Covered from the emergency fund; any part it can't cover is carried forward (engine v2). |
| **Emergency fund (EF)** | Cash and liquid funds for emergencies. Filled first, up to its target. |
| **Goal** | Something money is saved for. It receives a share of free money once the emergency fund is full. |
| **Share** | A goal's percentage of free money. Shares are normalised over the goals still active that month. |
| **Fund split** | How a goal's monthly SIP divides across its mutual funds. |
| **Target date** | The month a goal is needed. After it, the goal stops receiving money. |
| **Glide path / move to debt** | Switching a goal's money from equity to debt `debtYears` before its target date, to protect it from a late market fall. |
| **House outlook** | The calculation of house price, upfront cash, loan, EMI and EMI share of pay at the buying date. |
| **EMI share** | Home loan EMI as a percentage of in-hand pay at the time. Up to 36% is comfortable, 36–45% stretched, above 45% too high. |
| **Projection** | The month-by-month simulation of the plan from a starting point to the horizon. |
| **Baseline** | The projection from the plan's base month and starting balances. "Ahead" and "behind" on Track are measured against it. |
| **Live projection** | The projection re-run from the latest balance log. This month, Year by year and What if use it. |
| **Balance log** | Real balances recorded at the start of a month, before that month's SIPs. |
| **Scenario** | A named what-if: the plan with a few levers changed. |
| **Lever** | One change in a scenario, such as "salary ₹1,50,000 from June 2027" or "house price ₹1 Cr". |
| **Plan revision** | A saved version of the plan. Every save creates one (engine v2 / data model v2). |
