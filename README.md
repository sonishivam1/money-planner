# Money Planner

A private personal-finance planner for salaried people in India. It turns your salary, expenses and goals into an exact monthly plan (how much goes into each fund this month), tracks every goal, and recalculates the whole plan when your salary, an EMI or a goal changes.

Every number on every page comes from one tested calculation engine. Change one input and the whole plan recalculates month by month.

> Projections are estimates based on your own assumptions. They're not financial advice.

## Features

| Page | What it does |
| --- | --- |
| **This month** | In-hand, committed and free money; the exact amount for each fund; what's coming up; goal cards with the house verdict; an interactive growth chart; record a salary change |
| **Year by year** | The plan sampled each December, expandable to every month, downloadable as CSV |
| **Track** | Log real balances for any month; history against a frozen baseline (green ahead, red behind); projections restart from your real numbers |
| **What if** | A live sandbox with sliders for salary, raise, house price, date and share; save scenarios, compare side by side, apply one to your plan |
| **Edit plan** | Income, salary changes, expenses with step changes, fixed investments, one-time payments, goals, assumptions, with a live impact panel as you type |
| **Plan history** | Every saved version; restore any of them; choose the tracking baseline |
| **Settings** | Timezone, theme, export all your data, delete your account |

## Quick start (no setup needed)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>, choose **Continue as dev user**, then **Load the example plan**.

Locally the app uses **embedded Postgres** ([PGlite](https://pglite.dev), stored in `.data/`) and a **dev-only sign-in**, so you don't need a database or a Google app ([ADR-0011](docs/04-architecture/decisions/0011-zero-setup-local-dev.md)). The dev sign-in never works in production builds.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Engine, property, database and security tests (Vitest) |
| `npm run e2e` | End-to-end tests in a browser (Playwright) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint, including the layer import rules |
| `npm run build` | Production build |
| `npm run db:generate` | Create a SQL migration after changing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |

## Deploying to production

1. Create a Postgres database (Neon or Supabase, in or near Mumbai) and turn on point-in-time restore.
2. Create a Google OAuth client with the redirect URI `https://<your-domain>/api/auth/callback/google`.
3. Import the repo in Vercel and set these environment variables: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and `ALLOWED_EMAILS` (your Gmail). In production an empty `ALLOWED_EMAILS` blocks every sign-in.
4. Run `DATABASE_URL=<production url> npm run db:migrate` once, then deploy.
5. Sign in and enter your real plan in **Edit plan**. Never put real figures in the repository.

The full runbook is in [environments and deployment](docs/07-operations/environments-and-deployment.md).

## How it's built

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Zod 4, Drizzle with PostgreSQL (PGlite locally), Auth.js v5 (Google, database sessions), Tailwind CSS 4, Recharts, Vitest, fast-check and Playwright.

- `lib/engine/`: the pure money engine (no I/O). It runs on the server for saved data and in the browser for live previews.
- `lib/db/`: Drizzle schema and queries. Every query is scoped to the signed-in user.
- `lib/actions.ts`: Server Actions. Each one authenticates, validates, writes, then revalidates.
- `app/`, `components/`: pages and UI.

## Documentation

The design is in [`docs/`](docs/README.md): vision, requirements with status, the [engine specification](docs/03-domain/engine-spec.md) with [worked examples](docs/03-domain/worked-examples.md), architecture and decisions (ADRs), security, UX guidelines, testing, operations and the roadmap. [`CLAUDE.md`](CLAUDE.md) is the guide for AI agents working in this repo, and `.claude/agents/` defines the project's builder, UI and reviewer agents.
