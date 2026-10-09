# Money Planner

A personal finance app that tells you where each rupee goes this month, tracks every goal, and recalculates the whole plan when your salary, expenses or goals change.

Built with Next.js (App Router), TypeScript, PostgreSQL + Drizzle, Auth.js (Google sign-in), Zod, Tailwind CSS and Recharts.

## What it does

| Page | What you see |
| --- | --- |
| **This month** | Income, commitments and free money; the exact amount for each fund; upcoming changes; goal cards; growth chart; a form to record a salary change |
| **Year by year** | Month-by-month plan sampled each December, to the plan's end |
| **Track** | Log real balances once a month; history compared with the original plan |
| **What if** | Copy the plan with a different salary, raise, house price or date, and compare side by side |
| **Edit plan** | Income, salary changes, expenses (with end dates and step changes), fixed investments, one-time payments, goals and fund splits, assumptions |

## How the numbers work

All money logic lives in `lib/engine/`. It's pure TypeScript with no I/O, and it's covered by tests.

Each month, the engine works out the free money:

```
free = in-hand − expenses − fixed investments − spending buffer
```

1. One-time payments (like a loan foreclosure) come out of the emergency fund first.
2. Free money fills the emergency fund up to its target.
3. After that, free money splits across active goals by their share.
4. A goal moves into debt funds `debtYears` before its target date, and stops receiving money after it.

How salary, expenses and investments change over time:

- **Salary** rises by the yearly raise % every raise month. A recorded salary change resets the base from that month.
- **Expenses** marked "grows with inflation" rise every raise month. A change (e.g. family support to ₹10,000 from April 2027) sets a new base.
- **Fixed investments** step up every raise month, up to their cap.

Tracking: a monthly log holds your balances at the **start** of that month, before its SIPs. The latest log becomes the starting point for every projection.

## Setup

1. **Install:** `npm install`. The repo's `.npmrc` sets `legacy-peer-deps`, because Auth.js v5 is still a beta.
2. **Create a Postgres database.** [Neon](https://neon.tech) and [Supabase](https://supabase.com) both have free tiers.
3. **Create a Google OAuth client** at <https://console.cloud.google.com/apis/credentials>, with this redirect URI:
   `http://localhost:3000/api/auth/callback/google`
4. **Configure:** `cp .env.example .env.local` and fill in:
   - `DATABASE_URL`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
   - `ALLOWED_EMAILS`, set to your email so nobody else can sign in
5. **Create the tables:** `npm run db:migrate`
6. **Run:** `npm run dev`, then open <http://localhost:3000> and sign in once.
7. **Load the sample plan (optional):** `npm run db:seed -- you@gmail.com`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Engine tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Create a migration after changing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:seed -- email` | Load the sample plan for a user |

## Project layout

```
app/
  login/                 Google sign-in
  (app)/dashboard/       This month
  (app)/timeline/        Year by year
  (app)/track/           Monthly balance logs
  (app)/scenarios/       What-if comparisons
  (app)/plan/            Plan editor
  api/auth/              Auth.js route
lib/
  engine/                Pure money engine + tests (schema, months, project, house, events, summary, format)
  db/                    Drizzle schema, lazy client, user-scoped queries
  actions.ts             Server Actions (every one checks the session)
  load.ts                Loads a plan + logs and runs the forecast
components/              UI: plan editor, forms, chart, cards
drizzle/                 SQL migrations
scripts/seed.ts          Loads the sample plan
```

## Security

- Every query filters on the signed-in user's id. Server Actions call `requireUserId()` before doing anything.
- `ALLOWED_EMAILS` restricts sign-in to your own accounts.
- No bank credentials are stored.
- Turn on daily backups in your database provider.

## Deploying

1. Push to GitHub and import the repo in Vercel.
2. Add the same environment variables in the Vercel project settings.
3. Add the production callback URL to your Google OAuth client:
   `https://<your-domain>/api/auth/callback/google`
4. Run `npm run db:migrate` against the production database once.

## Next steps

- Email reminders on salary day and every April (Vercel Cron + Resend).
- Value funds automatically from AMFI's daily NAV file, with units imported from your CAMS/KFintech statement.
- A Claude-powered assistant that calls the engine as tools, and an MCP server over your plan.

The projections are estimates based on your assumptions. They are not financial advice.
