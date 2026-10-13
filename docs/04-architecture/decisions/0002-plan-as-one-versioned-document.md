# 0002: The plan is one versioned JSON document

Status: Accepted · Date: 2026-10-09

## Context

A plan has about ten kinds of items (income, salary changes, expenses with step changes, fixed investments, one-time payments, goals with fund splits and house details, assumptions, starting balances). It's always loaded whole, validated whole, calculated whole and saved whole from one editor. The shape will keep evolving as features are added.

## Decision

1. Store each user's plan as **one JSONB document** in the `plan` table, validated by the Zod `Plan` schema on every read and write.
2. **(Proposed)** Add a `schemaVersion` field. `lib/engine/migrate.ts` holds pure functions that upgrade each version to the next. They run on every read, before validation. Upgraded documents are persisted on the next save.
3. Balance logs and scenarios stay as separate rows, because each is created and deleted independently.

## Consequences

- Saving is one write; there are no partial-update bugs across child tables.
- Zod is the single source of truth for shape and defaults, shared by the editor, server and engine.
- No SQL queries into plan fields. Nothing needs them.
- Adding an optional field with a default needs no migration. A structural change needs a `schemaVersion` bump and a migration function with a test.
- Old documents (in revisions and scenarios) must always remain readable, so migrations are append-only and never deleted.

## Alternatives considered

- **Normalised tables** (`expense`, `goal`, `goal_fund`…): referential integrity in SQL, but a dozen tables, joins on every page, and multi-row saves for one form. The database can't enforce the rules that matter (shares, dates, plan-level consistency) any better than Zod.
- **Unversioned JSON (today):** works until a field is renamed or restructured. Then old documents either fail validation or are misread silently.
