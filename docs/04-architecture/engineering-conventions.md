# Engineering conventions

How we write code here, so the codebase stays consistent as it grows.

## The three rules

1. **Money logic lives only in `lib/engine`.** Pages and components display engine output. They may sum or format it, but never calculate it.
2. **Database access lives only in `lib/db/queries.ts`.** Every function takes `userId` first.
3. **Every write goes through a Server Action** that authenticates, validates with Zod, writes, then revalidates.

## TypeScript

- `strict` mode, no `any` in `lib/`. Prefer types inferred from Zod (`z.output<typeof Plan>`) over hand-written duplicates.
- `PlanInput` is the type forms and storage use (before defaults); `Plan` is what the engine uses (after parsing). Convert with `Plan.parse`, never with a cast.
- No default exports except Next.js pages and layouts.

## Engine code

- Pure functions only: no `Date.now()`, no `new Date()` without an argument, no I/O, no globals. "Now" is a parameter.
- One rule per function where practical (`salaryAt`, `expenseAt`, `commitmentAt`), named after the [engine specification](../03-domain/engine-spec.md) section it implements.
- A comment cites the spec section or requirement ID when the reason isn't obvious: `// ENG-2: repay carried shortfall before the EF`.
- Full precision. Rounding belongs in `format.ts` and `display.ts` only.
- Every behaviour change comes with a test written first, and an update to the spec and worked examples.

## Server Actions

Shape every action like this:

```ts
export async function doThingAction(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();          // 1. authenticate
  const parsed = Schema.safeParse(input);        // 2. validate
  if (!parsed.success) return fieldErrors(parsed.error);
  await q.writeThing(userId, parsed.data);       // 3. write, scoped by user
  refreshAll();                                  // 4. revalidate
  return { ok: true };
}
```

`ActionResult` grows to `{ ok: false; formError?: string; fieldErrors?: Record<string, string>; conflict?: boolean }` in Phase 1.1 (`PLN-8`, `PLN-10`).

## Forms

- An empty optional field means "not set", never 0. Map `""` to `undefined` **before** coercing to a number (the What-if bug fixed in `26c783f`).
- Server-side Zod is the authority. Client-side checks are only for faster feedback.
- On error, keep the user's input and show each message next to its field.

## Ids and dates

- New list items get `crypto.randomUUID()`. Existing short ids stay valid; ids never change once created.
- Months are `"YYYY-MM"` strings at the edges and integer indexes inside the engine.
- "This month" comes from `currentMonth(now, timezone)` with the user's timezone (`ENG-8`). Nothing else may decide it.

## Formatting and copy

- Money: `inr()` for exact amounts (`₹1,25,000`), `inrShort()` for summaries (`₹71.4L`, `₹1.79 Cr`). Never `toFixed` in a component.
- No personal or product-specific text in the UI (no policy names, people or places). Text comes from the plan.
- Follow the [UI guidelines](../05-ux/ui-guidelines.md) for wording.

## Tests

- Tests sit next to the code: `lib/engine/*.test.ts`.
- Fixtures use the fictional sample plan or small purpose-built plans. **Never real data.**
- See the [testing strategy](../06-quality/testing-strategy.md) for what each layer tests.

## Git and pull requests

- `main` is always deployable and protected: changes go through a PR with passing CI.
- Branches: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Commit messages: imperative subject under 72 characters, with a body explaining why.
- One concern per PR. Behaviour changes update the docs in the same PR.

### PR checklist

- [ ] Requirement IDs referenced in the description
- [ ] Tests added or updated; `npm test`, `npm run typecheck` and `npm run build` pass
- [ ] Spec, plan model and worked examples updated if engine behaviour changed
- [ ] Security checklist (in [security and privacy](security-and-privacy.md)) done for actions and queries
- [ ] No real personal data

## Definition of done

A requirement is `Built` when:

1. It works as its row in the requirements describes, on desktop and at 360 px.
2. It has tests at the right layer.
3. CI is green and it's deployed.
4. The docs say what it does.

## Checklist: adding a field to the plan

Adding a field touches several layers. Do them in this order:

1. **Spec:** add it to the [plan model](../03-domain/plan-model.md), and to the [engine spec](../03-domain/engine-spec.md) if it changes a calculation.
2. **Schema:** add it to `lib/engine/schema.ts` with a default, so old documents still parse.
3. **Migration:** if the default isn't enough, bump `schemaVersion` and add a step to `migrate.ts` with a test using a stored old document.
4. **Engine:** implement it, with tests first.
5. **Editor:** add the input to `components/plan-editor.tsx`.
6. **Display:** show its effect where relevant (This month, Coming up, Year by year).
7. **Scenarios:** decide whether it should be a lever.
8. **Sample plan:** add a fictional value if it helps the tests.
