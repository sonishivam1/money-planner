# Architecture decision records

An ADR captures one significant decision: the context, what we chose, and what it costs. ADRs are never edited after they're accepted, except to change their status. A new ADR supersedes an old one.

## Index

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-nextjs-server-rendering-and-actions.md) | Server-rendered Next.js with Server Actions, no separate API | Accepted |
| [0002](0002-plan-as-one-versioned-document.md) | The plan is one versioned JSON document | Accepted |
| [0003](0003-pure-deterministic-engine.md) | A pure, deterministic money engine | Accepted |
| [0004](0004-google-auth-database-sessions.md) | Google sign-in, database sessions, allow-list that fails closed | Accepted |
| [0005](0005-money-representation.md) | Rupees as numbers, rounded only at display | Accepted |
| [0006](0006-scenarios-as-levers.md) | Scenarios store levers, not plan copies | Accepted |
| [0007](0007-plan-revisions-and-frozen-baseline.md) | Plan revisions and a frozen baseline for tracking | Accepted |
| [0008](0008-carry-shortfall-forward.md) | Carry shortfalls forward instead of writing them off | Accepted |
| [0009](0009-user-timezone-for-current-month.md) | Decide "this month" in the user's timezone | Accepted |
| [0010](0010-no-orphan-goals.md) | Goals funded only by fixed investments are real goals | Accepted |
| [0011](0011-zero-setup-local-dev.md) | Zero-setup local development: embedded Postgres and a dev-only sign-in | Accepted |
| [0012](0012-engine-in-the-browser-for-live-previews.md) | Run the engine in the browser for live previews | Accepted |

All decisions were accepted on 13 Oct 2026 (see [open questions](../../08-delivery/open-questions.md)).

## Template

```markdown
# NNNN: Title

Status: Proposed | Accepted | Superseded by NNNN · Date: YYYY-MM-DD

## Context
What forces are at play? What problem are we solving?

## Decision
What we will do.

## Consequences
What gets easier, what gets harder, what we must now do.

## Alternatives considered
What else we looked at and why we didn't choose it.
```
