import { describe, expect, it } from "vitest";
import { Plan, type MonthlyLog } from "./schema";
import { samplePlan } from "./sample-plan";
import { project, salaryAt, expenseAt, commitmentAt, forecast } from "./project";
import { houseOutlook, emi } from "./house";
import { toIndex } from "./months";
import { inrShort } from "./format";

const plan = Plan.parse(samplePlan);
const rows = project(plan, toIndex(plan.baseMonth), plan.start);
const at = (m: string) => rows.find((r) => r.i === toIndex(m))!;

describe("income and expenses", () => {
  it("applies the yearly raise each April", () => {
    expect(salaryAt(plan, toIndex("2027-03"))).toBe(110000);
    expect(salaryAt(plan, toIndex("2027-04"))).toBeCloseTo(118800);
    expect(salaryAt(plan, toIndex("2028-04"))).toBeCloseTo(128304);
  });

  it("restarts raises from a recorded salary change", () => {
    const p = Plan.parse({ ...samplePlan, income: { ...samplePlan.income, events: [{ id: "sw", month: "2027-06", inHand: 150000, note: "switch" }] } });
    expect(salaryAt(p, toIndex("2027-06"))).toBe(150000);
    expect(salaryAt(p, toIndex("2028-03"))).toBe(150000);
    expect(salaryAt(p, toIndex("2028-04"))).toBeCloseTo(162000);
  });

  it("reduces family support from April 2027, then inflates it", () => {
    const family = plan.expenses.find((e) => e.id === "family")!;
    expect(expenseAt(plan, family, toIndex("2027-03"))).toBe(15000);
    expect(expenseAt(plan, family, toIndex("2027-04"))).toBe(10000);
    expect(expenseAt(plan, family, toIndex("2028-04"))).toBeCloseTo(10600);
  });

  it("ends loans after their last month", () => {
    const car = plan.expenses.find((e) => e.id === "car")!;
    expect(expenseAt(plan, car, toIndex("2028-03"))).toBe(11000);
    expect(expenseAt(plan, car, toIndex("2028-04"))).toBe(0);
  });

  it("steps PPF up 10% a year up to its cap", () => {
    const ppf = plan.commitments.find((c) => c.id === "ppf")!;
    expect(commitmentAt(plan, ppf, toIndex("2027-04"))).toBeCloseTo(5500);
    expect(commitmentAt(plan, ppf, toIndex("2036-04"))).toBe(12500);
  });
});

describe("projection", () => {
  it("starts with ₹8,300 free after the buffer and sends it to the emergency fund", () => {
    const oct = at("2026-10");
    expect(oct.free).toBeCloseTo(8300);
    expect(oct.toEmergency).toBeCloseTo(8300);
    expect(oct.alloc.house ?? 0).toBe(0);
  });

  it("pays the loan prepayment from the emergency fund in September 2027", () => {
    expect(at("2027-09").fromEmergency).toBe(40000);
  });

  it("fills the ₹4L emergency fund in mid 2028, then funds goals 60/40", () => {
    const full = rows.find((r) => r.ef >= 400000 - 1)!;
    expect(full.i).toBeGreaterThanOrEqual(toIndex("2028-05"));
    expect(full.i).toBeLessThanOrEqual(toIndex("2028-07"));
    const aug = at("2028-08");
    expect(aug.toEmergency).toBe(0);
    expect(aug.alloc.house / (aug.alloc.house + aug.alloc.ret)).toBeCloseTo(0.6);
  });

  it("reaches about ₹56L for the house and ₹40L in retirement SIPs by Sep 2036", () => {
    const end = rows[rows.length - 1];
    expect(end.goals.house / 1e5).toBeGreaterThan(53);
    expect(end.goals.house / 1e5).toBeLessThan(58);
    expect(end.goals.ret / 1e5).toBeGreaterThan(38);
    expect(end.goals.ret / 1e5).toBeLessThan(43);
  });

  it("never invents money: a deficit drains the emergency fund and the rest is carried (ENG-2)", () => {
    const p = Plan.parse({ ...samplePlan, income: { ...samplePlan.income, inHand: 70000 } });
    const [oct, nov] = project(p, toIndex(p.baseMonth), p.start);
    expect(oct.deficit).toBeCloseTo(31700);
    expect(oct.ef).toBe(0);
    expect(oct.carried).toBeCloseTo(31700);
    expect(nov.carried).toBeCloseTo(63400);
  });
});

describe("forecast from logged balances", () => {
  it("re-runs the plan from the latest log", () => {
    const log: MonthlyLog = { month: "2027-01", salary: 110000, ef: 200000, goals: {}, commit: {}, shortfall: 0, note: "" };
    const f = forecast(plan, [log], { now: new Date(2027, 0, 15) });
    expect(f.latestLog?.month).toBe("2027-01");
    expect(f.live[0].i).toBe(toIndex("2027-01"));
    expect(f.current.ef).toBeGreaterThan(at("2027-01").ef);
  });
});

describe("house", () => {
  it("prices an ₹80L flat at about ₹1.4 Cr in 2036 with an EMI near a third of pay", () => {
    const goal = plan.goals.find((g) => g.kind === "house")!;
    const h = houseOutlook(plan, goal, rows)!;
    expect(h.price / 1e7).toBeGreaterThan(1.35);
    expect(h.price / 1e7).toBeLessThan(1.5);
    expect(h.shortfall).toBe(0);
    expect(h.emiShare).toBeGreaterThan(28);
    expect(h.emiShare).toBeLessThan(40);
  });

  it("computes a standard EMI", () => {
    expect(Math.round(emi(1e7, 8.5, 25))).toBe(80523);
  });
});

describe("format", () => {
  it("formats lakh and crore", () => {
    expect(inrShort(7140000)).toBe("₹71.4L");
    expect(inrShort(17900000)).toBe("₹1.79 Cr");
    expect(inrShort(32000)).toBe("₹32k");
  });
});
