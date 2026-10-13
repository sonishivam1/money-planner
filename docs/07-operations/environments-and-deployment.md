# Environments and deployment

## Environments

| Environment | Runs on | Database | Sign-in | Purpose |
| --- | --- | --- | --- | --- |
| **Local** | `npm run dev` | Embedded Postgres (`pglite:./.data/dev`), or a Neon branch | Dev-only sign-in, or Google | Development |
| **Preview** | Vercel preview per PR | A Neon branch per preview (or one shared dev branch) | Google (preview callback URL), or test sign-in when `E2E=1` | Review and e2e tests |
| **Production** | Vercel production (`main`) | Neon main branch | Google, allow-list required | Real use |

**Production data never leaves production.** Local and preview use the fictional sample plan.

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Use the pooled URL on Vercel |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32`. Different per environment |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Yes | OAuth client. Separate clients for dev and prod are recommended |
| `ALLOWED_EMAILS` | Yes in production | Comma-separated. Empty blocks everyone in production (ADR-0004) |
| `AUTH_URL` | Previews only | Lets Auth.js build callback URLs for preview domains |
| `CRON_SECRET` | Phase 2 | Protects `/api/cron/*` |
| `RESEND_API_KEY` | Phase 2 | Email |
| `ANTHROPIC_API_KEY` | Phase 3 | Assistant |
| `AUTH_DEV_LOGIN`, `DEV_LOGIN_EMAIL` | Local and CI only | Shows the dev-only sign-in. Ignored by production builds (ADR-0011) |
| `MP_FAKE_NOW` | Tests only | Pins the server clock (ISO date). Ignored by production builds |
| `NEXT_DIST_DIR` | Tests only | A separate build folder, so e2e can run beside a dev server |

Secrets live in Vercel's environment settings and in `.env.local` locally (git-ignored). `.env.example` lists the names with no values.

## First-time setup

1. **Database:** create a Neon project (region: Singapore or Mumbai, near users). Turn on point-in-time restore.
2. **OAuth:** in Google Cloud Console, create an OAuth client with redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<production-domain>/api/auth/callback/google`
3. **Vercel:** import `sonishivam1/money-planner`, set the variables above for Production and Preview, and set the region to `bom1` (Mumbai) to sit near the database.
4. **Migrate:** `DATABASE_URL=<prod> npm run db:migrate`.
5. **Deploy:** push to `main`.
6. Sign in once, then enter the real plan through Edit plan. **Don't run the seed script against production.** It loads the fictional sample.

## Releasing a change

1. Open a PR. CI must pass. Check the Vercel preview.
2. **If the PR has a SQL migration:** confirm it's additive, then run `npm run db:migrate` against production **before** merging.
3. Merge to `main`, and Vercel deploys production.
4. Smoke test: sign in, open This month, open Edit plan.
5. Roll back with Vercel's "Instant rollback" to the previous deployment if anything is wrong. Additive migrations mean the old code still works against the new schema.

## Backups and restore

| What | How | Target |
| --- | --- | --- |
| Continuous backup | Neon point-in-time restore (or daily backups on Supabase) | RPO ≤ 24 h (Neon free tier gives a short history window; a paid tier gives longer) |
| Monthly export | The owner downloads Export my data (`ACC-4`) and keeps it privately | Independent copy |
| Plan history | `plan_revision` rows | Undo for plan edits |

**Restore runbook:**
1. In Neon, create a branch from a point in time before the incident.
2. Check the data on that branch (`npm run db:studio` with the branch URL).
3. Either promote that branch, or copy the specific rows back.
4. Write down what happened and why in `docs/07-operations/incidents/` (no personal data).

## Monitoring

- **Errors:** Vercel function logs. Optionally Sentry, with request bodies off and data scrubbing on (`NFR-PRV-1`).
- **Uptime:** a free uptime check on `/login` every 5 minutes.
- **Phase 2:** cron job results are logged with counts only, and a failed NAV import emails the owner.

## Rotating secrets

| Secret | When | How |
| --- | --- | --- |
| `AUTH_SECRET` | On suspicion, or yearly | Generate a new one and update Vercel. Everyone is signed out |
| Google client secret | On suspicion | Create a new secret in Google Cloud, update Vercel, delete the old one |
| `DATABASE_URL` password | On suspicion, or yearly | Reset in Neon, update Vercel and `.env.local` |

## Cost

| Service | Phase 1 | Notes |
| --- | --- | --- |
| Vercel Hobby | ₹0 | Personal, non-commercial use. Commercial use or invited paying users need Pro |
| Neon free tier | ₹0 | Enough for one user for years |
| Google OAuth | ₹0 | |
| Resend (Phase 2) | ₹0 | Free tier covers reminders |
| Claude API (Phase 3) | Pay per use | Capped by per-user rate limits |
