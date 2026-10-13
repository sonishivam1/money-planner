# Money Planner: guide for Claude and other agents

A private personal-finance planner for salaried people in India. Next.js 16 (App Router), React 19, TypeScript, Zod 4, Drizzle (Postgres in production, PGlite locally), Auth.js v5 with Google, Tailwind 4, Recharts, Vitest.

**The design lives in [`docs/`](docs/README.md). Read it before changing behaviour.** The most important documents:

- [Functional requirements](docs/02-requirements/functional-requirements.md): IDs such as `PLN-3`, with status
- [Engine specification](docs/03-domain/engine-spec.md): the exact money rules
- [Plan model](docs/03-domain/plan-model.md): every field
- [Engineering conventions](docs/04-architecture/engineering-conventions.md): how code is written here
- [Roadmap](docs/08-delivery/roadmap.md) and [current state and gaps](docs/08-delivery/current-state-and-gaps.md)

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000. With `.env.local` copied from `.env.example`, it uses embedded Postgres and dev sign-in, so no setup is needed |
| `npm test` | Vitest: engine, property, database and action tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including import-boundary rules |
| `npm run build` | Production build |
| `npm run e2e` | Playwright end-to-end tests (starts the dev server) |
| `npm run db:generate` | Create a SQL migration after editing `lib/db/schema.ts` |

Before saying any change is done, run `npm run typecheck && npm run lint && npm test`, and `npm run build` for anything touching pages or config.

## Hard rules

1. **No real personal data anywhere in the repo.** It's public. Use the fictional sample plan (`lib/engine/sample-plan.ts`).
2. **Money logic only in `lib/engine`.** It's pure: no I/O, no `Date.now()`, no Next.js or React imports. Pages and components only display engine output.
3. **Database access only in `lib/db/queries.ts`.** Every function takes `userId` first and filters on it.
4. **Every Server Action** calls `requireUserId()` first, validates with Zod, writes, then revalidates.
5. **Engine changes need tests first**, plus updates to the engine spec and worked examples in the same change.
6. **Empty form fields mean "not set", never 0.** Map `""` to `undefined` before coercing.
7. **No hardcoded personal or product text in the UI** (no policy names, people or places). Copy comes from the plan.
8. Keep docs in step: if behaviour changes, update the doc and the requirement status in the same change.

## Project agents

These live in `.claude/agents/`:

- `mp-builder`: implements roadmap items end to end (engine, database, actions, UI, tests, docs).
- `mp-ui`: builds and polishes interface work against the [UI guidelines](docs/05-ux/ui-guidelines.md).
- `mp-reviewer`: reviews a change against the spec, the security checklist and the conventions. Read-only.

## Repo map

```
app/            Next.js routes: (app)/* signed-in pages, login, landing page, api/auth
components/     UI components (client components marked "use client")
lib/engine/     Pure money engine, Zod schemas, migrations, tests
lib/db/         Drizzle schema, client (postgres.js or PGlite), queries
lib/actions.ts  Server Actions
docs/           Product, requirements, domain, architecture, UX, quality, ops, delivery
e2e/            Playwright tests
```
