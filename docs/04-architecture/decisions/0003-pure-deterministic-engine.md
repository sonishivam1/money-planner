# 0003: A pure, deterministic money engine

Status: Accepted · Date: 2026-10-09

## Context

The product's value is the correctness of its numbers. The same calculations are needed by the dashboard, timeline, tracking, scenarios, and later the AI assistant and MCP server.

## Decision

All money logic lives in `lib/engine`: pure TypeScript functions with no I/O, no clock reads and no framework imports. Inputs are the plan, logs and the current month; outputs are plain data. The rules are specified in the [engine specification](../../03-domain/engine-spec.md) and tested against [worked examples](../../03-domain/worked-examples.md) and invariants.

## Consequences

- Tests run in milliseconds with no database or browser.
- Every page shows numbers from the same functions, so pages can't disagree.
- The AI assistant (Phase 3) can call the engine as tools, so it states real numbers instead of estimating them.
- "Now" and the timezone must be passed in, which is slightly more plumbing.
- Developers must resist putting quick calculations in components. This is enforced by import rules and review.

## Alternatives considered

- **Calculations in SQL or in the pages:** duplicated logic, hard to test, and pages that drift apart.
- **A spreadsheet-like reactive model:** flexible, but much harder to specify and test exactly.
