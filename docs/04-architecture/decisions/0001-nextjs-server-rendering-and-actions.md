# 0001: Server-rendered Next.js with Server Actions, no separate API

Status: Accepted · Date: 2026-10-09

## Context

The app has a handful of pages, all behind sign-in, all showing numbers calculated from one user's plan. One developer builds and runs it. We want the fewest moving parts that are still secure and typed end to end.

## Decision

Use Next.js (App Router) with React Server Components. Pages load data and run the engine on the server, and send finished HTML. Writes go through Server Actions. There's no REST or GraphQL API, apart from the Auth.js route and, later, cron and AI routes.

## Consequences

- One deployable on Vercel. Types flow from the Zod schema to the database layer to the page without an API contract to maintain.
- The browser never receives raw plan data it doesn't display, and never caches computed numbers.
- Server Actions are still public HTTP endpoints, so each one must authenticate and validate on its own (see [security and privacy](../security-and-privacy.md)).
- A native mobile app would later need an API. We accept that; the PWA route (`AUT-5`) avoids it.
- We're tied to Next.js conventions and its upgrade cadence.

## Alternatives considered

- **SPA + separate API (Express or Fastify):** two deployables, an API to secure and version, client-side data caching. More work for no benefit at this scale.
- **Remix or another full-stack framework:** comparable, but the team knows Next.js and Vercel deploys it with zero configuration.
