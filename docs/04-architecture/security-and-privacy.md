# Security and privacy

Money Planner holds a person's complete financial picture. A leak would be personally harmful even though the app holds no credentials that could move money. Security is designed in, not bolted on.

## What we protect

| Asset | Sensitivity | Where it lives |
| --- | --- | --- |
| Plan, revisions, logs, scenarios | High: salary, debts, family support, goals | Postgres |
| Session tokens | High: they grant access to the above | Cookie (browser) + `session` table |
| OAuth client secret, `AUTH_SECRET`, `DATABASE_URL` | Critical | Vercel environment variables, `.env.local` (git-ignored) |
| Name, email, picture | Medium | `user` table |
| Phase 2: fund units | High | `holding` table |

What we deliberately **don't** hold: bank or broker credentials, account numbers, PAN, Aadhaar, card details, statements. CAS PDFs are parsed in memory and never stored (`AUT-4`).

## Threats and controls

| Threat | Example | Controls |
| --- | --- | --- |
| Someone else signs in | A stranger with a Google account | `ALLOWED_EMAILS` allow-list checked in the Auth.js `signIn` callback. **Fails closed in production**: an empty list blocks everyone (`ACC-2`) |
| One user sees another's data | Changing an id in a request | Every query filters by the session's `userId`, including by-id deletes (`AND userId = ?`). No query takes a user id from the client |
| Calling a Server Action directly | A script posts to the action endpoint | Server Actions are public HTTP endpoints. Each one calls `requireUserId()` first and validates input with Zod (`NFR-SEC-1`, `NFR-SEC-3`). Next.js rejects cross-origin action calls |
| Cross-site request forgery | A malicious page posts a form | Next.js Server Action origin check; `SameSite=Lax` session cookie |
| Cross-site scripting | A plan name containing `<script>` | React escapes output; no `dangerouslySetInnerHTML`; a Content Security Policy that blocks inline scripts other than Next.js's own (nonce-based) |
| Clickjacking | The app framed by another site | `frame-ancestors 'none'` |
| Session theft | A stolen cookie | `HttpOnly`, `Secure`, `SameSite=Lax` cookies; database sessions revocable by deleting the row; 30-day expiry |
| Leaked secrets | A secret committed to the public repo | `.env*` git-ignored; GitHub secret scanning and push protection on; rotate on any suspicion (see [operations](../07-operations/environments-and-deployment.md)) |
| Personal data in a public repo | Real numbers in a fixture or docs | Rule: fictional data only (see the [docs index](../README.md#a-rule-about-data)); reviewed in every PR |
| Data in logs | An error log containing the plan | Log ids and error types only; never `JSON.stringify` a plan in a log (`NFR-PRV-1`) |
| Vulnerable dependency | A compromised npm package | Exact versions pinned in `package.json` and the lockfile; Dependabot alerts; review before upgrading Auth.js betas |
| Data loss | Accidental delete, bad migration | Point-in-time restore on the database; additive migrations; plan revisions |
| Denial of wallet | A bot hammering the app | Sign-in required for every page except login; Vercel's default protections. Phase 3 AI routes get per-user rate limits |

## Authentication

- Google OAuth through Auth.js v5, using the database session strategy. Sessions are rows that can be revoked, not stateless JWTs.
- The allow-list is read from the environment at start-up. Matching is case-insensitive.
- **Phase 1.1 change:** when `NODE_ENV=production` and `ALLOWED_EMAILS` is empty, sign-in is refused and the server logs a configuration error. Opening the app to invited users later means replacing the allow-list with an invitations table, not emptying the variable.

## Authorisation

There's one role: owner of their own data. The rules:

1. Resolve `userId` from the session on the server. Never accept it from the client.
2. Every function in `lib/db/queries.ts` takes `userId` as its first argument and filters on it.
3. Operations on a specific row (delete a log, delete a scenario, restore a revision) match **both** the row id and `userId`.
4. A test lists the exported actions and fails if any of them doesn't call `requireUserId()` (`NFR-SEC-1`).

## Security headers

Set in `next.config.ts` for every response:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline'; img-src 'self' https://lh3.googleusercontent.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

## Privacy

- **Data minimisation:** in-hand amounts and balances only. No transactions, no account numbers.
- **Export and delete** (`ACC-4`, `ACC-5`): one JSON file of everything the user owns; one confirmed action deletes the user row, which cascades to everything else.
- **No trackers:** no analytics, ads or third-party scripts.
- **Before inviting anyone else** (`NFR-PRV-4`): publish a privacy notice that meets India's Digital Personal Data Protection Act 2023. It must state the purpose, data held, retention, who processes it (Vercel, Neon/Supabase, Google, and later Resend and Anthropic) and a grievance contact, and record consent at first sign-in.
- **Phase 3:** sending plan data to the Claude API is disclosed in the UI, and the assistant is opt-in. Plan data is sent only for the user's own questions, never for training or analytics.

## Phase 2 and 3 specifics

- **Cron routes** require `Authorization: Bearer ${CRON_SECRET}` and do nothing user-specific without it.
- **CAS import:** the PDF password is used once in memory and never stored or logged. The file is discarded after parsing.
- **AI assistant:** tool results are data, not instructions. The assistant can only call our tools. Write tools need explicit user confirmation in the UI (`AI-2`). Per-user rate limits.
- **MCP server:** per-user tokens, hashed at rest, revocable from Settings, read-only scope by default.

## Security checklist for every PR

- [ ] New action calls `requireUserId()` first and validates with Zod
- [ ] New query takes `userId` and filters on it
- [ ] No plan or log contents in logs or error messages
- [ ] No real personal data in code, fixtures or docs
- [ ] No new third-party script or domain without updating the CSP
