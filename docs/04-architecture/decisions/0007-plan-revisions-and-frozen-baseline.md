# 0007: Plan revisions and a frozen baseline for tracking

Status: Accepted · Date: 2026-10-09

## Context

Track shows each balance log as "ahead" or "behind" the original plan. Today, "the original plan" is the **current** plan projected from its base month. So when the user edits the plan (raises the equity return assumption, adds an expense), every past comparison silently changes. A month that was "behind" can become "ahead" without any money moving. Saving also overwrites the previous plan, so there's no history and no undo.

## Decision

1. Every save appends a row to `plan_revision` with the full document, a version number and a reason (`PLN-11`).
2. `plan.baselineRevisionId` points at the revision Track compares against. It defaults to the first revision. The user can choose "Use the current plan as my new baseline", for example after the yearly review.
3. Track's history uses the baseline revision's projection. This month, Year by year and What if keep using the current plan.
4. Revisions can be viewed and restored. A restore is a new save, so history is never rewritten.
5. Saves use optimistic concurrency: `UPDATE … WHERE version = expected`. A stale save is rejected (`PLN-10`).

## Consequences

- "Behind plan" means behind the plan the user actually committed to (`TRK-3`).
- Undo and audit come for free.
- Storage grows by about 20 KB per save. That's negligible.
- Revisions must stay readable forever, so old `schemaVersion`s are migrated on read ([ADR-0002](0002-plan-as-one-versioned-document.md)).
- One extra insert per save, in the same transaction.

## Alternatives considered

- **Snapshot only the baseline projection** (numbers, not the plan): smaller, but no undo, and it can't be recomputed if the engine is fixed.
- **Event sourcing** (store every edit): powerful but heavy for a form-based editor that saves whole documents.
