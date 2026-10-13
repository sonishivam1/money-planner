import { describe, expect, it } from "vitest";
import { Plan, planWarnings, type PlanInput } from "./schema";
import { samplePlan } from "./sample-plan";
import { balancesAt, commitmentAt, emergencyFullRow, expenseAt, forecast, project, salaryAt } from "./project";
import { houseOutlook } from "./house";
import { currentMonth, raisesBetween, toIndex } from "./months";
import { migratePlan, parsePlan } from "./migrate";
import { applyLevers } from "./levers";
import { splitFunds } from "./display";
import { upcomingEvents } from "./events";
import { summarize } from "./summary";

const sample = Plan.parse(samplePlan);
const withPlan = (patch: (p: PlanInput) => void) => {
  const p = structuredClone(samplePlan);
  patch(p);
  return Plan.parse(p);
};
const run = (p: Plan) => project(p, toIndex(p.baseMonth), p.start);

describe("months", () => {
  it("counts raise months in (from, to] in constant time, matching a month-by-month count", () => {
    const slow = (from: number, to: number, rm: number) => {
      let n = 0;
      for (let i = from + 1; i <= to; i++) if (i % 12 === rm - 1) n++;
      return n;
    };
    for (const rm of [1, 4, 12]) for (let from = 24300; from < 24330; from += 7) for (let to = from - 2; to < from + 40; to += 5) expect(raisesBetween(from, to, rm)).toBe(slow(from, to, rm));
  });

  it("decides this month in the user's timezone, not UTC (ENG-8)", () => {
    const utcLate = new Date(Date.UTC(2027, 2, 31, 20, 0)); // 31 Mar 20:00 UTC = 1 Apr 01:30 IST
    expect(currentMonth(utcLate, "Asia/Kolkata")).toBe(toIndex("2027-04"));
    expect(currentMonth(utcLate, "UTC")).toBe(toIndex("2027-03"));
  });

  it("falls back to IST for an unknown timezone", () => {
    expect(currentMonth(new Date(Date.UTC(2027, 2, 31, 20, 0)), "Not/AZone")).toBe(toIndex("2027-04"));
  });
});

describe("own-start step-ups and inflation (ENG-3)", () => {
  it("starts a future fixed investment at its entered amount", () => {
    const p = withPlan((x) => {
      x.commitments!.push({ id: "nps", name: "NPS", amount: 4000, start: "2030-06", stepUp: 10, cap: 0, rate: 9, goal: "ret", note: "" });
    });
    const nps = p.commitments.find((c) => c.id === "nps")!;
    expect(commitmentAt(p, nps, toIndex("2030-05"))).toBe(0);
    expect(commitmentAt(p, nps, toIndex("2030-06"))).toBe(4000);
    expect(commitmentAt(p, nps, toIndex("2031-03"))).toBe(4000);
    expect(commitmentAt(p, nps, toIndex("2031-04"))).toBeCloseTo(4400);
  });

  it("starts a future inflating expense at its entered amount", () => {
    const p = withPlan((x) => {
      x.expenses!.push({ id: "school", name: "School fees", amount: 8000, start: "2031-06", inflate: true, changes: [] });
    });
    const school = p.expenses.find((e) => e.id === "school")!;
    expect(expenseAt(p, school, toIndex("2031-06"))).toBe(8000);
    expect(expenseAt(p, school, toIndex("2032-04"))).toBeCloseTo(8480);
  });

  it("applies a salary change dated before the plan from the plan's start, without earlier raises", () => {
    const p = withPlan((x) => {
      x.income!.events = [{ id: "old", month: "2025-01", inHand: 100000, note: "" }];
    });
    expect(salaryAt(p, toIndex("2026-10"))).toBe(100000);
    expect(salaryAt(p, toIndex("2027-04"))).toBeCloseTo(108000);
  });
});

describe("shortfall carry (ENG-2)", () => {
  const p = withPlan((x) => {
    x.income!.inHand = 70000;
    x.income!.events = [{ id: "up", month: "2026-12", inHand: 140000, note: "new job" }];
  });
  const rows = run(p);

  it("carries what the emergency fund can't cover", () => {
    expect(rows[0].carried).toBeCloseTo(31700);
    expect(rows[1].carried).toBeCloseTo(63400);
  });

  it("repays the carried shortfall before the emergency fund", () => {
    const dec = rows[2];
    // Dec 2026: 1,40,000 − 76,700 − 18,000 − 7,000 = 38,300 free; repays first.
    expect(dec.repaid).toBeCloseTo(38300);
    expect(dec.toEmergency).toBe(0);
    expect(dec.carried).toBeCloseTo(63400 - 38300);
    const jan = rows[3];
    expect(jan.repaid).toBeCloseTo(25100);
    expect(jan.carried).toBeCloseTo(0);
    expect(jan.toEmergency).toBeGreaterThan(0);
  });

  it("shows when the shortfall is repaid in Coming up", () => {
    const f = forecast(p, [], { now: new Date(2026, 10, 15) });
    expect(upcomingEvents(p, f, 20).some((e) => e.kind === "repaid" && e.i === toIndex("2027-01"))).toBe(true);
  });

  it("restarts from a log's recorded shortfall", () => {
    const f = forecast(sample, [{ month: "2027-01", salary: 110000, ef: 0, goals: {}, commit: {}, shortfall: 50000, note: "" }], { now: new Date(2027, 0, 10) });
    expect(f.current.repaid).toBeCloseTo(f.current.free);
    expect(f.current.carried).toBeCloseTo(50000 - f.current.free);
  });
});

describe("goal completion and the house purchase (ENG-4)", () => {
  // Extend the sample past the house date so the purchase is visible.
  const p = withPlan((x) => {
    x.horizon = "2040-12";
  });
  const rows = run(p);
  const at = (m: string) => rows.find((r) => r.i === toIndex(m))!;

  it("buys the house at its target date and spends costs plus down payment", () => {
    const sep = at("2036-09");
    expect(sep.purchases).toHaveLength(1);
    const o = sep.purchases[0].outlook;
    expect(o.verdict).toBe("comfortable");
    expect(sep.withdrawn.house).toBeCloseTo(o.costs + o.down);
    expect(sep.goals.house).toBeGreaterThan(50e5); // closing balance shown before the purchase
    expect(balancesAt(p, rows, toIndex("2036-10"))!.goals.house).toBeCloseTo(0, 0);
  });

  it("starts the home loan EMI the next month and ends the rent it replaces", () => {
    const sep = at("2036-09");
    const oct = at("2036-10");
    const emiAmount = sep.purchases[0].emi;
    expect(sep.extraExpenses).toHaveLength(0);
    expect(oct.extraExpenses[0].amount).toBeCloseTo(emiAmount);
    const rentIdx = p.expenses.findIndex((e) => e.id === "rent");
    expect(sep.expenseItems[rentIdx]).toBeGreaterThan(0);
    expect(oct.expenseItems[rentIdx]).toBe(0);
  });

  it("moves the house share to the other goals after the purchase", () => {
    const oct = at("2036-10");
    expect(oct.alloc.house ?? 0).toBe(0);
    expect(oct.alloc.ret).toBeGreaterThan(0);
  });

  it("keeps paying the EMI when the projection restarts from a later log", () => {
    const f = forecast(p, [{ month: "2037-02", salary: 0, ef: 500000, goals: { ret: 5e6 }, commit: {}, shortfall: 0, note: "" }], { now: new Date(2037, 1, 5) });
    expect(f.current.extraExpenses[0].amount).toBeCloseTo(at("2036-10").extraExpenses[0].amount);
  });

  it("doesn't buy when the fund is short; the goal holds", () => {
    const q = withPlan((x) => {
      x.horizon = "2038-12";
      x.goals![0].house!.priceToday = 3e7;
    });
    const r = run(q);
    const sep = r.find((row) => row.i === toIndex("2036-09"))!;
    expect(sep.purchases).toHaveLength(0);
    expect(sep.withdrawn.house).toBeUndefined();
    expect(houseOutlook(q, q.goals[0], r)!.verdict).toBe("short");
    expect(r[r.length - 1].goals.house).toBeGreaterThan(sep.goals.house);
  });

  it("withdraws an invest goal at its date when asked, and holds it otherwise", () => {
    const q = withPlan((x) => {
      x.goals!.push({ id: "car", name: "Car", kind: "invest", share: 10, targetDate: "2030-03", onTarget: "withdraw", funds: [] });
    });
    const r = run(q);
    const mar = r.find((row) => row.i === toIndex("2030-03"))!;
    expect(mar.withdrawn.car).toBeGreaterThan(0);
    expect(r.find((row) => row.i === toIndex("2030-04"))!.goals.car).toBe(0);
  });
});

describe("emergency fund target in months (ENG-5)", () => {
  it("is months × that month's expenses and moves with them", () => {
    const p = withPlan((x) => {
      x.emergency = { target: 0, mode: "months", months: 6, funds: "" };
    });
    const rows = run(p);
    expect(rows[0].target).toBeCloseTo(6 * 76700);
    const apr = rows.find((r) => r.i === toIndex("2027-04"))!;
    expect(apr.target).toBeCloseTo(6 * 71720);
    expect(emergencyFullRow(rows)!.ef).toBeGreaterThanOrEqual(emergencyFullRow(rows)!.target - 1);
  });
});

describe("migration (ENG-7, ENG-9)", () => {
  const v1 = {
    baseMonth: "2026-10",
    horizon: "2036-09",
    income: { inHand: 110000, raisePct: 8, raiseMonth: 4, events: [] },
    expenses: [],
    commitments: [{ id: "child", name: "Child plan", amount: 5000, goal: "kids" }],
    oneTimes: [],
    emergency: { target: 400000, funds: "" },
    goals: [{ id: "house", name: "House", kind: "house", share: 100, targetDate: "2036-09", house: { priceToday: 8e6, growth: 6, downPct: 20, costsPct: 10, loanRate: 8.5, loanYears: 25 } }],
    assume: { inflation: 6, equityRet: 11, debtRet: 7, liquidRet: 6.5, buffer: 7000 },
  };

  it("upgrades a v1 document: real goals for orphan ids, explicit defaults, version 2", () => {
    const p = parsePlan(v1);
    expect(p.schemaVersion).toBe(2);
    const kids = p.goals.find((g) => g.id === "kids")!;
    expect(kids.share).toBe(0);
    expect(kids.onTarget).toBe("hold");
    expect(p.goals.find((g) => g.id === "house")!.onTarget).toBe("withdraw");
    expect(p.emergency.mode).toBe("amount");
  });

  it("doesn't change the input object and is idempotent", () => {
    const copy = structuredClone(v1);
    const once = migratePlan(v1);
    expect(v1).toEqual(copy);
    expect(migratePlan(once)).toEqual(once);
  });

  it("refuses a document from a newer app version", () => {
    expect(() => migratePlan({ ...v1, schemaVersion: 99 })).toThrow(/newer/);
  });

  it("rejects a v1 orphan goal id without migrating", () => {
    expect(Plan.safeParse(v1).success).toBe(false);
  });
});

describe("plan validation", () => {
  const issues = (patch: (p: PlanInput) => void) => {
    const p = structuredClone(samplePlan);
    patch(p);
    const r = Plan.safeParse(p);
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  };

  it("accepts the sample plan", () => expect(issues(() => {})).toEqual([]));
  it("rejects an end before the start", () => expect(issues((p) => (p.horizon = "2020-01"))).toContain("horizon: Plan end must be on or after the start"));
  it("rejects plans over 40 years", () => expect(issues((p) => (p.horizon = "2070-01"))[0]).toMatch(/40 years/));
  it("rejects duplicate ids", () => expect(issues((p) => p.expenses!.push({ ...p.expenses![0] }))[0]).toMatch(/Duplicate id/));
  it("rejects a link to a goal that doesn't exist", () => expect(issues((p) => (p.commitments![0].goal = "nope"))).toContain("commitments.0.goal: Pick one of your goals"));
  it("rejects an expense ending before it starts", () =>
    expect(issues((p) => p.expenses!.push({ id: "x", name: "X", amount: 1, start: "2030-01", end: "2029-01" }))[0]).toMatch(/Ends before it starts/));
  it("requires a buying date on a house goal", () => expect(issues((p) => (p.goals![0].targetDate = ""))).toContain("goals.0.targetDate: House goals need a buying date"));

  it("warns, without blocking, when shares or fund splits don't add up to 100", () => {
    const p = withPlan((x) => {
      x.goals![0].share = 50;
      x.goals![0].funds![0].pct = 10;
    });
    const w = planWarnings(p).map((x) => x.message);
    expect(w.some((m) => m.includes("Goal shares add up to 90%"))).toBe(true);
    expect(w.some((m) => m.includes("fund split adds up to 60%"))).toBe(true);
    expect(planWarnings(sample)).toEqual([]);
  });
});

describe("levers (ADR-0006)", () => {
  it("applies each lever without touching the original plan", () => {
    const before = structuredClone(sample);
    const { plan, skipped } = applyLevers(sample, [
      { type: "salary", month: "2027-06", inHand: 150000 },
      { type: "raise", pct: 10 },
      { type: "housePrice", priceToday: 1e7 },
      { type: "houseDate", month: "2035-03" },
      { type: "houseShare", pct: 80 },
      { type: "expense", expenseId: "living", month: "2028-01", amount: 20000 },
      { type: "oneTime", name: "Wedding", month: "2029-02", amount: 600000 },
    ]);
    expect(skipped).toEqual([]);
    expect(sample).toEqual(before);
    expect(salaryAt(plan, toIndex("2027-06"))).toBe(150000);
    expect(plan.income.raisePct).toBe(10);
    const house = plan.goals.find((g) => g.kind === "house")!;
    expect(house.house!.priceToday).toBe(1e7);
    expect(house.targetDate).toBe("2035-03");
    expect(house.share).toBe(80);
    expect(plan.goals.find((g) => g.id === "ret")!.share).toBeCloseTo(20);
    expect(plan.goals.find((g) => g.id === "kids")!.share).toBe(0);
    expect(plan.expenses.find((e) => e.id === "living")!.changes).toEqual([{ month: "2028-01", amount: 20000 }]);
    expect(plan.oneTimes.some((o) => o.name === "Wedding")).toBe(true);
    expect(Plan.safeParse(plan).success).toBe(true);
  });

  it("skips levers that no longer apply", () => {
    const noHouse = withPlan((x) => {
      x.goals = x.goals!.filter((g) => g.kind !== "house");
    });
    const { skipped } = applyLevers(noHouse, [{ type: "housePrice", priceToday: 1 }, { type: "expense", expenseId: "gone", month: "2028-01", amount: 1 }]);
    expect(skipped).toHaveLength(2);
  });

  it("stays in sync with plan edits: a scenario sees expenses added after it was made", () => {
    const levers = [{ type: "raise" as const, pct: 8 }];
    const edited = withPlan((x) => {
      x.expenses!.push({ id: "gym", name: "Gym", amount: 3000 });
    });
    const a = summarize(applyLevers(edited, levers).plan, [], { now: new Date(2026, 9, 5) });
    const b = summarize(edited, [], { now: new Date(2026, 9, 5) });
    expect(a.goalsAtHorizon.ret).toBeCloseTo(b.goalsAtHorizon.ret);
  });
});

describe("display", () => {
  it("splits fund amounts so they add up to the goal rounded to ₹100 (worked example 4)", () => {
    const parts = splitFunds(22679.82, [{ name: "A", pct: 50 }, { name: "B", pct: 35 }, { name: "C", pct: 15 }]);
    expect(parts.map((x) => x.amount)).toEqual([11400, 7900, 3400]);
  });

  it("handles splits that don't add up to 100 and empty fund lists", () => {
    expect(splitFunds(10000, [{ name: "A", pct: 30 }, { name: "B", pct: 30 }]).reduce((s, x) => s + x.amount, 0)).toBe(10000);
    expect(splitFunds(5000, [])).toEqual([]);
  });
});

describe("Coming up", () => {
  it("shows an ended expense's amount at its end, with house purchase and EF events", () => {
    const p = withPlan((x) => {
      x.expenses!.push({ id: "tv", name: "TV EMI", amount: 2000, inflate: true, end: "2028-06" });
    });
    const f = forecast(p, [], { now: new Date(2026, 9, 5) });
    const all = upcomingEvents(p, f, 50);
    expect(all.find((e) => e.text.startsWith("TV EMI: done"))!.text).toContain("₹2,247"); // 2,000 × 1.06²
    expect(all.some((e) => e.kind === "emergency-full")).toBe(true);
    expect(all.some((e) => e.kind === "house")).toBe(true);
  });
});
