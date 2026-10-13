# 0010: Goals funded only by fixed investments are real goals

Status: Accepted · Date: 2026-10-09

## Context

A fixed investment (such as a child education plan) can count toward a goal. Today, the editor offers a hardcoded extra option, `"kids"` ("Kids' education"), that isn't in the goal list. The dashboard then has special code that finds these "orphan" goal ids and renders a card with a hardcoded title and a "Guaranteed" label. This breaks for any other user or goal, and it hardcodes one person's situation into the product.

## Decision

- A fixed investment's `goal` must be the id of a real goal, or empty. This is enforced by validation (`ENG-9`).
- A goal can have `share: 0`, meaning it receives no free money and is funded only by its linked fixed investments.
- The v1 → v2 migration creates a real goal for every orphan id it finds (see the [plan model](../../03-domain/plan-model.md#migrations)). The user can rename it afterwards.
- The dashboard renders every goal the same way. A goal with share 0 shows "Funded by fixed investments" instead of a share.
- No goal ids, names or labels are hardcoded anywhere in the UI.

## Consequences

- The editor, dashboard, charts and scenarios treat all goals uniformly, which deletes special cases.
- Goals funded only by fixed investments can have target dates and fund names like any other goal.
- A one-time migration renames nothing silently: migrated goals take their id as their name, and the user can rename them.

## Alternatives considered

- **Keep orphan ids and make the hardcoded labels configurable:** keeps the special case alive in every view.
