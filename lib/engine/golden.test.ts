/**
 * Golden values from docs/03-domain/worked-examples.md, asserted to within ₹1.
 * If an engine change moves one of these, explain why in the PR and update the doc.
 * Example 7 (shortfall) and the Example 4 per-fund display table are covered elsewhere.
 */
import { describe, expect, it } from "vitest";
import { Plan } from "./schema";
import { samplePlan } from "./sample-plan";
import { project, salaryAt, expenseAt, commitmentAt } from "./project";
import { houseOutlook } from "./house";
import { toIndex } from "./months";

const plan = Plan.parse(samplePlan);
const rows = project(plan, toIndex(plan.baseMonth), plan.start);
const at = (m: string) => {
  const row = rows.find((r) => r.i === toIndex(m));
  if (!row) throw new Error(`no projected row for ${m}`);
  return row;
};
const expense = (id: string) => plan.expenses.find((e) => e.id === id)!;
const commitment = (id: string) => plan.commitments.find((c) => c.id === id)!;
const m = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

/** Within ₹1 of the documented figure. */
function expectRupee(actual: number, expected: number) {
  expect(Math.abs(actual - expected), `expected ₹${expected}, got ₹${actual}`).toBeLessThanOrEqual(1);
}

describe("golden: worked examples", () => {
  it("Example 1: the first month (Oct 2026)", () => {
    const oct = at("2026-10");
    expectRupee(oct.income, 110000);
    expectRupee(oct.expenses, 76700);
    expectRupee(oct.commitments, 18000);
    expectRupee(oct.buffer, 7000);
    expectRupee(oct.free, 8300);
    expectRupee(oct.toEmergency, 8300);
    expectRupee(oct.alloc.house ?? 0, 0);
    expectRupee(oct.alloc.ret ?? 0, 0);
    expectRupee(oct.ef, 8300);
    // Fixed investments grow on their opening value: 10,000 × (1 + m(6)) + 5,000.
    expectRupee(plan.start.commit.child, 10000);
    expectRupee(oct.commit.child, 15048.68);
  });

  it("Example 2: the first raise month (Apr 2027)", () => {
    const i = toIndex("2027-04");
    const apr = at("2027-04");
    expectRupee(salaryAt(plan, i), 118800);
    expectRupee(apr.income, 118800);

    const lines: Record<string, number> = {
      rent: 19080,
      utilities: 3710,
      living: 16960,
      health: 2120,
      net: 2650,
      family: 10000,
      term: 2200,
      car: 11000,
      loan: 4000,
      cc: 0,
    };
    for (const [id, amount] of Object.entries(lines)) expectRupee(expenseAt(plan, expense(id), i), amount);
    expectRupee(apr.expenses, 71720);

    expectRupee(commitmentAt(plan, commitment("ppf"), i), 5500);
    expectRupee(commitmentAt(plan, commitment("child"), i), 5000);
    expectRupee(commitmentAt(plan, commitment("ulip"), i), 8000);
    expectRupee(apr.commitments, 18500);
    expectRupee(apr.buffer, 7420);
    expectRupee(apr.free, 21160);
    expectRupee(apr.toEmergency, 21160);
  });

  it("Example 3: a one-time payment (Sep 2027)", () => {
    const sep = at("2027-09");
    expectRupee(expenseAt(plan, expense("loan"), toIndex("2027-08")), 4000);
    expectRupee(expenseAt(plan, expense("loan"), toIndex("2027-09")), 0);
    expectRupee(sep.expenses, 67720);
    expectRupee(sep.free, 25160);
    expectRupee(sep.oneTime, 40000);
    expectRupee(sep.fromEmergency, 40000);
    expectRupee(sep.deficit, 0);
    expectRupee(sep.toEmergency, 25160);
    expectRupee(sep.ef, 152285.88);
  });

  it("Example 4: the emergency fund fills and goals start (Jun 2028)", () => {
    const jun = at("2028-06");
    expectRupee(jun.free, 41397.6);
    expectRupee(jun.toEmergency, 3597.9);
    expectRupee(jun.free - jun.toEmergency, 37799.7);
    expectRupee(jun.alloc.house, 22679.82);
    expectRupee(jun.alloc.ret, 15119.88);
    expectRupee(jun.ef, 402085.75);

    // "Full in Jun 2028": the first month whose closing EF is within ₹1 of the target.
    const full = rows.find((r) => r.ef >= plan.emergency.target - 1)!;
    expect(full.i).toBe(toIndex("2028-06"));

    const jul = at("2028-07");
    expectRupee(jul.free, 41397.6);
    expectRupee(jul.toEmergency, 0);
    expectRupee(jul.alloc.house, 24838.56);
    expectRupee(jul.alloc.ret, 16559.04);
  });

  it("Example 5: the move to debt (Sep → Oct 2033)", () => {
    const aug = at("2033-08");
    const sep = at("2033-09");
    const oct = at("2033-10");
    // Sep 2033 still earns equity (11%); Oct 2033 is the first month on debt (7%).
    expectRupee(sep.goals.house, aug.goals.house * (1 + m(11)) + sep.alloc.house);
    expectRupee(sep.goals.house, 2794485.36);
    expectRupee(oct.alloc.house, 45428.41);
    expectRupee(oct.goals.house, 2794485.36 * (1 + m(7)) + 45428.41);
    expectRupee(oct.goals.house, 2855714.19);
  });

  it("Example 6: the house outlook (Sep 2036)", () => {
    const goal = plan.goals.find((g) => g.kind === "house")!;
    const h = houseOutlook(plan, goal, rows)!;
    const costs = (h.price * goal.house!.costsPct) / 100;
    const minDown = (h.price * goal.house!.downPct) / 100;
    expect(h.buyIndex - toIndex(plan.baseMonth)).toBe(119);
    expectRupee(h.price, 14257383);
    expectRupee(costs, 1425738);
    expectRupee(minDown, 2851477);
    expectRupee(h.upfrontNeeded, 4277215);
    expectRupee(h.fund, 5561219);
    expectRupee(h.shortfall, 0);
    expectRupee(h.fund - costs, 4135481); // down payment
    expectRupee(h.price - (h.fund - costs), 10121902);
    expectRupee(h.loan, 10121902);
    expectRupee(h.emi, 81504);
    expectRupee(h.incomeThen, 237482);
    expect(h.emiShare).toBeCloseTo(34.3, 1);
    expect(h.verdict).toBe("comfortable");

    const end = at("2036-09");
    expectRupee(end.goals.ret, 4049991);
    expectRupee(end.ef, 676010);
  });

  it("Example 8: PPF step-up to its cap", () => {
    const ppf = commitment("ppf");
    expectRupee(commitmentAt(plan, ppf, toIndex("2026-10")), 5000);
    expectRupee(commitmentAt(plan, ppf, toIndex("2027-04")), 5500);
    expectRupee(commitmentAt(plan, ppf, toIndex("2028-04")), 6050);
    expectRupee(5000 * Math.pow(1.1, 10), 12968.71);
    expectRupee(commitmentAt(plan, ppf, toIndex("2036-04")), 12500);
  });
});
