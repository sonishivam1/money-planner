# 0012: Run the engine in the browser for live previews

Status: Accepted · Date: 2026-10-13

## Context

The product should feel alive: drag a salary slider and watch the house EMI share move; edit an expense and see when the emergency fund fills, before saving. Round-tripping to the server on every keystroke would be slow and wasteful. The engine is pure TypeScript with Zod as its only dependency ([ADR-0003](0003-pure-deterministic-engine.md)), so it can run anywhere.

## Decision

- Client components may import the engine (`lib/engine`) to compute **previews**: the What-if sandbox, the plan editor's impact panel and the public landing-page demo.
- The **server stays the source of truth** for anything saved or shown as "your plan": pages render from server-side engine runs on stored data, and every save is re-validated on the server.
- The engine bundle must stay small. It must not import Node APIs or `server-only` modules (enforced by the import-boundary rule).

## Consequences

- Instant, interactive what-ifs with no extra API.
- The same code computes previews and the real numbers, so a preview always matches what saving produces.
- The engine adds a few tens of KB of JavaScript to interactive pages. That's within the `NFR-PRF-4` budget.

## Alternatives considered

- **Server Actions per change:** simpler, but laggy, and costs a database round trip per keystroke.
- **A separate WASM or worker engine:** unnecessary at this size.
