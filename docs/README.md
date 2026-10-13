# Money Planner documentation

This folder is the design of Money Planner. We write and agree on it **before** building, and we keep it in step with the code afterwards: a pull request that changes behaviour updates the matching doc in the same PR.

Status: **Draft for review** · Last updated 9 Oct 2026

## Reading order

New to the project? Read these five first, in order:

1. [Vision](01-product/vision.md): what we're building and why
2. [Functional requirements](02-requirements/functional-requirements.md): what the app must do, with status
3. [Engine specification](03-domain/engine-spec.md): exactly how every number is calculated
4. [System architecture](04-architecture/system-architecture.md): how the pieces fit
5. [Roadmap](08-delivery/roadmap.md): what we build next, in what order

## Map

| Folder | Holds | Documents |
| --- | --- | --- |
| [01-product](01-product/) | The idea | [Vision](01-product/vision.md) · [Users and journeys](01-product/users-and-journeys.md) · [Glossary](01-product/glossary.md) |
| [02-requirements](02-requirements/) | What it must do | [Functional](02-requirements/functional-requirements.md) · [Non-functional](02-requirements/non-functional-requirements.md) |
| [03-domain](03-domain/) | The money model | [Plan model](03-domain/plan-model.md) · [Engine specification](03-domain/engine-spec.md) · [Worked examples](03-domain/worked-examples.md) |
| [04-architecture](04-architecture/) | How it's built | [System architecture](04-architecture/system-architecture.md) · [Data model](04-architecture/data-model.md) · [Security and privacy](04-architecture/security-and-privacy.md) · [Engineering conventions](04-architecture/engineering-conventions.md) · [Decisions (ADRs)](04-architecture/decisions/README.md) |
| [05-ux](05-ux/) | What people see | [Information architecture](05-ux/information-architecture.md) · [UI guidelines](05-ux/ui-guidelines.md) |
| [06-quality](06-quality/) | How we know it's right | [Testing strategy](06-quality/testing-strategy.md) |
| [07-operations](07-operations/) | How it runs | [Environments and deployment](07-operations/environments-and-deployment.md) |
| [08-delivery](08-delivery/) | What happens next | [Current state and gaps](08-delivery/current-state-and-gaps.md) · [Roadmap](08-delivery/roadmap.md) · [Open questions](08-delivery/open-questions.md) |

## Conventions

- **Requirement IDs** such as `PLN-3` or `ENG-2` are stable. Code comments, tests, ADRs and PRs refer to them.
- **Status** of a requirement: `Built` (works as specified), `Partial` (exists, falls short of the spec), `Gap` (missing), `Planned` (later phase).
- **Priority**: `Must` for the phase to be done, `Should` strongly wanted, `Could` if time allows.
- **Decisions** are recorded as ADRs in [04-architecture/decisions](04-architecture/decisions/README.md) with status `Proposed`, `Accepted` or `Superseded`.
- **Engine v1** means the engine as built today (commit `26c783f`). **Engine v2** means the target described in the [engine specification](03-domain/engine-spec.md).

## A rule about data

The GitHub repository is public. Every example in these docs, the tests and the seed script uses the **fictional sample plan** (`lib/engine/sample-plan.ts`). Never put real salaries, balances, policy names or addresses in the repository.

## Not financial advice

Money Planner projects the user's own assumptions forward. It doesn't recommend products, and nothing in it or in these docs is financial advice.
