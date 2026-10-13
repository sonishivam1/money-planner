# Non-functional requirements

Qualities the app must have. Each has a measurable target so we can tell when it's met.

## Correctness (NFR-COR)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-COR-1 | Every displayed number traces to the engine. Pages never do money arithmetic beyond summing engine outputs for display. | Code review rule; see [engineering conventions](../04-architecture/engineering-conventions.md) |
| NFR-COR-2 | Engine rules have tests, including golden values from the [worked examples](../03-domain/worked-examples.md) and property tests for the invariants. | 100% of rules; ≥ 95% line coverage of `lib/engine` |
| NFR-COR-3 | Rounding happens only at display. The engine keeps full precision. | No `Math.round` in engine maths except in `format.ts` |
| NFR-COR-4 | Two pages showing the same quantity show the same value. | Checked by end-to-end tests on the sample plan |

## Security (NFR-SEC)

Detail in [security and privacy](../04-architecture/security-and-privacy.md).

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-SEC-1 | Every page and Server Action authenticates first. | 100%; enforced by a lint rule or test that scans actions |
| NFR-SEC-2 | Every database query filters by the signed-in user's id. | 100%; all access through `lib/db/queries.ts` |
| NFR-SEC-3 | All input is validated by Zod on the server, whatever the client did. | 100% of actions |
| NFR-SEC-4 | Secrets only in environment variables, never in the repo. | Secret scanning on GitHub enabled |
| NFR-SEC-5 | Security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`. | All responses |
| NFR-SEC-6 | Dependencies with known high or critical vulnerabilities aren't shipped. | Dependabot alerts on; `npm audit --omit=dev` clean of high or critical before release |

## Privacy (NFR-PRV)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-PRV-1 | Plan and log contents are never written to logs, error reports or analytics. | Logs contain ids and error types only |
| NFR-PRV-2 | A user can export and delete all their data (`ACC-4`, `ACC-5`). | Deletion removes every row within one request, by cascade |
| NFR-PRV-3 | No third-party trackers or analytics scripts. | None in the bundle |
| NFR-PRV-4 | Before inviting anyone other than the owner, publish a privacy notice that meets India's DPDP Act 2023 (purpose, consent, grievance contact). | Gate for inviting P2 users |

## Performance (NFR-PRF)

The engine simulates at most 480 months (40 years) per run. That costs microseconds, so performance is mostly about network and database.

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-PRF-1 | Server render time for any app page, including database reads. | p95 < 500 ms on Vercel + Neon free tiers, warm |
| NFR-PRF-2 | One full projection (120 months, 20 line items). | < 5 ms |
| NFR-PRF-3 | What if with 10 scenarios. | < 50 ms engine time |
| NFR-PRF-4 | JavaScript sent to the browser for This month. | < 200 KB gzipped |
| NFR-PRF-5 | Saving the plan and seeing the updated page. | < 1.5 s end to end |

## Reliability and data safety (NFR-REL)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-REL-1 | Database backups with point-in-time restore. | RPO ≤ 24 hours, RTO ≤ 4 hours (Neon or Supabase built-in) |
| NFR-REL-2 | No save loses data silently. A rejected save explains why and keeps the user's edits on screen. | All save paths |
| NFR-REL-3 | Schema migrations are additive and run before the code that needs them is deployed. | See [environments and deployment](../07-operations/environments-and-deployment.md) |
| NFR-REL-4 | Old plan documents always load (`ENG-7`). | Migration tests for every schema version |

## Usability and accessibility (NFR-UX)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-UX-1 | Accessible to keyboard and screen-reader users. | WCAG 2.2 AA |
| NFR-UX-2 | Works on a phone. | 360 px wide and up, no horizontal page scroll except inside data tables |
| NFR-UX-3 | Light and dark themes from one set of colour tokens. | Contrast ≥ 4.5:1 for text in both |
| NFR-UX-4 | Indian number formatting everywhere. | `₹1,25,000`; short forms `₹71.4L`, `₹1.79 Cr` |
| NFR-UX-5 | Plain-language copy; every finance term has a glossary tooltip. | See [UI guidelines](../05-ux/ui-guidelines.md) |
| NFR-UX-6 | Supported browsers. | Last 2 versions of Chrome, Edge, Safari and Firefox; iOS Safari 17+ |

## Maintainability (NFR-MNT)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-MNT-1 | Layering rules hold: engine imports nothing from the app, db or Next.js. | Enforced in CI (dependency-cruiser or an ESLint import rule) |
| NFR-MNT-2 | Strict TypeScript, no `any` in `lib/`. | `tsc --noEmit` clean; lint rule |
| NFR-MNT-3 | CI runs typecheck, lint, tests and build on every push and PR. | GitHub Actions; `main` is protected |
| NFR-MNT-4 | Docs updated in the same PR as behaviour changes. | PR checklist |

## Operations and cost (NFR-OPS)

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-OPS-1 | Runs on free tiers for a single user. | ₹0 / month for Phase 1; < ₹500 / month through Phase 3 excluding AI usage |
| NFR-OPS-2 | Server errors are visible to the owner. | Vercel logs, plus an optional error tracker with data scrubbing |
| NFR-OPS-3 | One-command local setup after `.env.local`. | `npm install && npm run db:migrate && npm run dev` |
