# 0005: Rupees as numbers, rounded only at display

Status: Accepted · Date: 2026-10-09

## Context

Money is often stored as integer minor units (paise) to avoid floating-point error. Money Planner, though, doesn't keep a ledger: it projects estimates ten years forward with assumed returns and inflation. The inputs are whole rupees, and the outputs are shown to the rupee or in lakhs.

## Decision

- **Inputs** are whole rupees (validated as numbers ≥ 0; the editor uses whole-rupee steps).
- **The engine** calculates with JavaScript numbers (IEEE 754 doubles) in rupees, at full precision.
- **Rounding happens only at display**, in `format.ts` and `display.ts`.
- Comparisons that mean "reached" use a ₹1 tolerance (for example, the emergency fund is full when `ef ≥ target − 1`).
- Tests compare with tolerances (`toBeCloseTo`, or ₹0.01 for invariants), not exact equality.
- Phase 2 fund **units** and **NAVs** are stored as `numeric` in Postgres, because they're real recorded quantities.

## Consequences

- Simple code, and the maths reads like the spec.
- Floating-point error over 480 months is far below ₹1, and well under the uncertainty of the assumptions.
- Display code must avoid rounding before summing, or totals won't match. The fund split rule in the [engine spec](../../03-domain/engine-spec.md#9-display-rules-the-engine-supports) handles the main case.

## Alternatives considered

- **Integer paise everywhere:** exact for ledgers, but growth rates produce fractions every month, so we'd round at every step and accumulate rounding bias. That adds complexity without improving a projection.
- **A decimal library:** exact, but slower and noisier to write, with no practical benefit for estimates.
