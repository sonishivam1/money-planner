# 0006: Scenarios store levers, not plan copies

Status: Accepted · Date: 2026-10-09

## Context

Today a scenario is a full copy of the plan, taken when it's created, with a few fields changed. When the user later edits the real plan (adds an expense, changes a goal), the scenario doesn't change. The side-by-side comparison then mixes two differences: the scenario's levers, and every plan edit since it was created. That makes the comparison misleading, and it gets worse over time.

## Decision

A scenario stores a **name and a list of levers** (see the [plan model](../../03-domain/plan-model.md#scenario-levers-v2)). Its plan is computed on every view:

```
scenarioPlan = applyLevers(currentPlan, scenario.levers)
```

`applyLevers` is a pure engine function with tests. If a lever no longer applies (for example the house goal was deleted), it's skipped and the scenario card says so.

Existing scenarios are converted once (see the [data model](../data-model.md#scenario)).

## Consequences

- Comparisons always isolate the effect of the levers (`WIF-3`).
- Scenarios become editable (`WIF-4`) and can be applied to the plan (`WIF-5`) as "apply these levers".
- The AI assistant can create scenarios by emitting levers, a small typed vocabulary.
- Only changes that have a lever type can be expressed. New lever types need code. We accept that; the lever list is meant to grow slowly.

## Alternatives considered

- **Keep snapshots and show a "plan changed since" warning:** honest, but the user still can't trust the comparison.
- **Store a JSON patch against the plan:** flexible, but patches break when list indexes shift and are opaque to show in the UI.
