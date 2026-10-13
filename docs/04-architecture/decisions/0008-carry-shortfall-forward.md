# 0008: Carry shortfalls forward instead of writing them off

Status: Accepted · Date: 2026-10-09

## Context

When a month's outflows exceed income, engine v1 draws the gap from the emergency fund. If the fund can't cover it, the rest simply vanishes. The next month starts as if the money had been found somewhere. In real life it's on a credit card or borrowed from family, and it has to be repaid. A plan that's unaffordable for six months in a row looks only mildly stressed. See [Example 7](../../03-domain/worked-examples.md#example-7-a-shortfall-in-hand-70000).

## Decision

- The engine keeps `carried`, the shortfall still owed (`ENG-2`).
- Any part of a month's shortfall the emergency fund can't cover is added to `carried`.
- When free money is positive, it repays `carried` **first**, before the emergency fund and goals.
- `carried` doesn't accrue interest in v2. (Whether it should, at a credit-card-like rate, is open question [Q-3](../../08-delivery/open-questions.md).)
- A balance log can record an outstanding `shortfall`, so live projections start from the real amount owed.
- This month shows the carried amount and when it's expected to be repaid (`DSH-8`).

## Consequences

- Unaffordable plans look unaffordable, which is the honest answer.
- The conservation invariant holds with net worth defined as assets minus `carried`.
- One more state variable, row field and log field.
- An existing test changes: "never invents money" now also asserts `carried`.

## Alternatives considered

- **Keep writing it off and only show a warning:** that's today's behaviour, and the projections downstream are wrong.
- **Stop the projection at the first uncovered shortfall:** too blunt. A short dip followed by recovery is a real, useful scenario.
