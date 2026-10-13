import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Plan, type PlanInput } from "./schema";
import { project, type MonthRow } from "./project";
import { toIndex, toMonth } from "./months";

// Engine spec §4: invariants that hold for every month of every valid plan (ENG-6).

const TOL = 0.01;
const month = (from: number, span: number) => fc.integer({ min: 0, max: span }).map((k) => toMonth(from + k));
const base = toIndex("2026-10");

const planArb = fc
  .record({
    years: fc.integer({ min: 1, max: 15 }),
    inHand: fc.integer({ min: 10000, max: 1000000 }),
    raisePct: fc.integer({ min: -5, max: 15 }),
    raiseMonth: fc.integer({ min: 1, max: 12 }),
    inflation: fc.integer({ min: 0, max: 10 }),
    buffer: fc.integer({ min: 0, max: 20000 }),
    efMode: fc.constantFrom("amount" as const, "months" as const),
    efTarget: fc.integer({ min: 0, max: 1000000 }),
    expenses: fc.array(
      fc.record({ amount: fc.integer({ min: 0, max: 150000 }), inflate: fc.boolean(), start: fc.option(month(base - 12, 120)), end: fc.option(month(base, 180)), change: fc.option(fc.record({ m: month(base, 120), a: fc.integer({ min: 0, max: 100000 }) })) }),
      { maxLength: 8 },
    ),
    commitments: fc.array(
      fc.record({ amount: fc.integer({ min: 0, max: 30000 }), stepUp: fc.integer({ min: 0, max: 15 }), cap: fc.integer({ min: 0, max: 40000 }), rate: fc.integer({ min: 0, max: 12 }), start: fc.option(month(base, 60)) }),
      { maxLength: 4 },
    ),
    oneTimes: fc.array(fc.record({ m: month(base, 120), a: fc.integer({ min: 0, max: 800000 }) }), { maxLength: 3 }),
    goals: fc.array(
      fc.record({ share: fc.integer({ min: 0, max: 100 }), target: fc.option(month(base, 150)), debtYears: fc.integer({ min: 0, max: 5 }), withdraw: fc.boolean() }),
      { maxLength: 4 },
    ),
    house: fc.option(fc.record({ share: fc.integer({ min: 1, max: 100 }), target: month(base + 12, 120), price: fc.integer({ min: 1e6, max: 3e7 }) })),
    returns: fc.record({ equity: fc.integer({ min: 0, max: 15 }), debt: fc.integer({ min: 0, max: 9 }), liquid: fc.integer({ min: 0, max: 8 }) }),
    startEf: fc.integer({ min: 0, max: 500000 }),
  })
  .map((r): PlanInput => {
    const expenses = r.expenses.map((e, k) => {
      const [s, en] = e.start && e.end && toIndex(e.start) > toIndex(e.end) ? [e.end, e.start] : [e.start, e.end];
      return { id: `e${k}`, name: `Expense ${k}`, amount: e.amount, inflate: e.inflate, start: s ?? undefined, end: en ?? undefined, changes: e.change ? [{ month: e.change.m, amount: e.change.a }] : [] };
    });
    const goals: PlanInput["goals"] = r.goals.map((g, k) => ({ id: `g${k}`, name: `Goal ${k}`, kind: "invest" as const, share: g.share, targetDate: g.target ?? undefined, debtYears: g.debtYears, onTarget: g.withdraw ? ("withdraw" as const) : ("hold" as const), funds: [] }));
    if (r.house) {
      goals.push({
        id: "house", name: "House", kind: "house", share: r.house.share, targetDate: r.house.target, debtYears: 2, onTarget: "withdraw", funds: [],
        house: { priceToday: r.house.price, growth: 6, downPct: 20, costsPct: 10, loanRate: 8.5, loanYears: 20, replacesExpenseId: expenses[0]?.id },
      });
    }
    return {
      baseMonth: toMonth(base),
      horizon: toMonth(base + r.years * 12 - 1),
      income: { inHand: r.inHand, raisePct: r.raisePct, raiseMonth: r.raiseMonth, events: [] },
      expenses,
      commitments: r.commitments.map((c, k) => ({ id: `c${k}`, name: `Fixed ${k}`, amount: c.amount, stepUp: c.stepUp, cap: c.cap, rate: c.rate, start: c.start ?? undefined, goal: goals[0]?.id ?? "" })),
      oneTimes: r.oneTimes.map((o, k) => ({ id: `o${k}`, name: `One-time ${k}`, month: o.m, amount: o.a })),
      emergency: { target: r.efTarget, mode: r.efMode, months: 6, funds: "" },
      goals,
      assume: { inflation: r.inflation, equityRet: r.returns.equity, debtRet: r.returns.debt, liquidRet: r.returns.liquid, buffer: r.buffer },
      start: { ef: r.startEf, goals: {}, commit: {} },
    };
  });

const runRows = (input: PlanInput) => {
  const plan = Plan.parse(input);
  return { plan, rows: project(plan, toIndex(plan.baseMonth), plan.start) };
};
const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe("engine invariants (property tests)", () => {
  it("1–4: allocation and shortfall add up, no overdraft, only active goals get money in share proportions", () => {
    fc.assert(
      fc.property(planArb, (input) => {
        const { plan, rows } = runRows(input);
        let prevEf = plan.start.ef;
        let prevCarried = 0;
        rows.forEach((r: MonthRow) => {
          if (r.free >= 0) {
            expect(Math.abs(r.free - (r.repaid + r.toEmergency + sum(r.alloc) + r.unallocated))).toBeLessThan(TOL);
            expect(r.deficit).toBe(0);
          } else {
            expect(Math.abs(r.deficit - (r.fromEmergency - Math.min(prevEf, r.oneTime) + (r.carried - prevCarried)))).toBeLessThan(TOL);
          }
          expect(r.fromEmergency).toBeLessThanOrEqual(prevEf + TOL);
          for (const v of [r.ef, r.carried, ...Object.values(r.goals), ...Object.values(r.commit)]) expect(v).toBeGreaterThanOrEqual(-TOL);
          const receiving = Object.entries(r.alloc).filter(([, v]) => v > TOL);
          for (const [id] of receiving) {
            const g = plan.goals.find((x) => x.id === id)!;
            expect(g.share).toBeGreaterThan(0);
            if (g.targetDate) expect(toIndex(g.targetDate)).toBeGreaterThanOrEqual(r.i);
          }
          if (receiving.length > 1) {
            const [a, b] = receiving;
            const ga = plan.goals.find((x) => x.id === a[0])!;
            const gb = plan.goals.find((x) => x.id === b[0])!;
            expect(Math.abs(a[1] / b[1] - ga.share / gb.share)).toBeLessThan(1e-6);
          }
          prevEf = r.ef;
          prevCarried = r.carried;
        });
      }),
      { numRuns: 300 },
    );
  });

  it("5: conservation — with zero returns, net worth changes by exactly the month's net flow", () => {
    fc.assert(
      fc.property(planArb, (input) => {
        input.assume = { ...input.assume, equityRet: 0, debtRet: 0, liquidRet: 0 };
        input.commitments = (input.commitments ?? []).map((c) => ({ ...c, rate: 0 }));
        input.goals = (input.goals ?? []).map((g) => ({ ...g, rate: undefined }));
        const { plan, rows } = runRows(input);
        let nw = plan.start.ef - 0;
        rows.forEach((r) => {
          const withdrawn = sum(r.withdrawn);
          const end = r.ef + sum(r.goals) - withdrawn + sum(r.commit) - r.carried;
          const flow = r.income - r.expenses - r.buffer - r.oneTime - r.unallocated - withdrawn;
          expect(Math.abs(end - nw - flow)).toBeLessThan(1e-4 * Math.max(1, Math.abs(nw)) + TOL);
          nw = end;
        });
      }),
      { numRuns: 300 },
    );
  });

  it("6: monotone in salary — more in-hand never lowers any closing balance or raises the carried shortfall", () => {
    fc.assert(
      fc.property(planArb, fc.integer({ min: 1, max: 200000 }), (input, extra) => {
        // Without house purchases, whose timing can legitimately change with more money.
        input.goals = (input.goals ?? []).filter((g) => g.kind !== "house").map((g) => ({ ...g, onTarget: "hold" as const }));
        input.commitments = (input.commitments ?? []).map((c) => ({ ...c, goal: input.goals?.[0]?.id ?? "" }));
        const a = runRows(input).rows;
        const b = runRows({ ...input, income: { ...input.income, inHand: Number(input.income.inHand) + extra } }).rows;
        a.forEach((r, k) => {
          const s = b[k];
          expect(s.carried).toBeLessThanOrEqual(r.carried + TOL);
          expect(s.ef).toBeGreaterThanOrEqual(r.ef - TOL);
          for (const id of Object.keys(r.goals)) expect(s.goals[id]).toBeGreaterThanOrEqual(r.goals[id] - TOL);
        });
      }),
      { numRuns: 200 },
    );
  });
});
