# Vision

## The problem

A salaried person in India who is serious about money usually juggles three things:

- **A spreadsheet** of expenses, EMIs and policies that goes stale the month something changes.
- **Mental arithmetic** on salary day about how much can go into SIPs this month.
- **Guesswork** about whether the house, retirement and children's goals will actually be reached.

Each of these breaks the moment life changes: a raise, a new job, a loan that ends, parents' support that drops, a house that costs more than expected. Nobody re-does a ten-year spreadsheet every time that happens, so the plan quietly stops being true.

## What Money Planner is

A private web app that turns salary, expenses and goals into an **exact monthly plan**, and **keeps that plan correct as life changes**.

On salary day it answers, in rupees: how much goes into each fund this month, whether each goal is on track, and what happens to everything when the salary, an EMI or a goal changes.

## Who it's for

1. **First user: the author.** A salaried professional in India with SIPs, insurance-linked policies, PPF, EMIs, an emergency fund and a house goal. The product must fully serve this person before anyone else.
2. **Next: other salaried people in India**, invited one by one, each with their own plan. The design has to keep this possible (strict per-user data isolation, no hardcoded personal details), but we don't build for it ahead of need.

See [Users and journeys](users-and-journeys.md).

## What makes it different

- **One engine, every number.** Every figure on every page comes from one tested calculation engine. Change one input and the whole plan recalculates month by month.
- **Projects from reality.** Once a month you log real balances, and the plan re-projects from them instead of from the original guess.
- **Explains itself.** Every number can be traced to a rule in the [engine specification](../03-domain/engine-spec.md). No black boxes.
- **What-ifs are free.** Try a job switch or a bigger house without touching the real plan.

## Product principles

These settle arguments when requirements conflict.

1. **Correct before clever.** A wrong number is worse than a missing feature. Engine changes need tests first.
2. **Plain words.** "Free to allocate", not "discretionary surplus". Jargon gets a glossary entry and a tooltip.
3. **The user's assumptions, not ours.** The app projects what the user tells it. It doesn't recommend funds, policies or products, and it labels projections as estimates.
4. **Private by default.** Financial data is visible only to its owner. No bank credentials, ever.
5. **Nothing stale.** If an input changes, every page that depends on it changes on the next load.
6. **One plan, many views.** Pages are views over the same plan and projection. No page keeps its own copy of the maths.

## Non-goals

What we deliberately won't build, at least through Phase 3:

- **Transaction-level expense tracking.** This is a planner, not a budgeting app. Expenses are monthly amounts, not categorised transactions.
- **Bank or broker linking.** No credentials, no screen scraping, no account aggregator. Balances are typed in or imported from statements.
- **Executing transactions.** The app tells you the SIP amount; you set it up with your broker.
- **Investment recommendations.** Fund names are whatever the user types.
- **Tax filing or tax optimisation.** Amounts are in-hand (after tax).
- **Irregular income.** Freelancers and business owners need a different income model. Out of scope for now.
- **Multiple currencies.** Rupees only.

## Success measures

| Measure | Target |
| --- | --- |
| Months with a balance log | At least 11 of every 12 |
| Time from "I got a raise" to updated plan | Under 1 minute |
| Engine bugs found after release | Zero that change a displayed number by more than ₹1 |
| Pages showing a number that disagrees with another page | Zero |
| Projection error vs reality after 12 months of logging | Visible on Track, so the user can judge the assumptions |

## Phases

| Phase | Theme | Summary |
| --- | --- | --- |
| 1 | Core app | Sign-in, plan editor, engine, This month, Year by year, Track, What if. Built; being hardened (Phase 1.1) |
| 2 | Automation | Reminders, automatic fund values from AMFI NAVs, statement import, installable on a phone |
| 3 | AI assistant | Ask questions in plain language; the assistant runs the engine as tools. An MCP server over the plan |

Details are in the [roadmap](../08-delivery/roadmap.md).
