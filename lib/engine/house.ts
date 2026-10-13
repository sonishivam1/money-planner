import type { Goal, Plan } from "./schema";
import type { MonthRow } from "./project";
import { toIndex } from "./months";

export function emi(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 1200;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export type HouseVerdict = "comfortable" | "stretched" | "too-high" | "short";

export type HouseOutlook = {
  buyIndex: number;
  price: number;
  costs: number;
  upfrontNeeded: number;
  fund: number;
  shortfall: number;
  down: number;
  loan: number;
  emi: number;
  incomeThen: number;
  emiShare: number;
  verdict: HouseVerdict;
};

/** EMI share bands (glossary, "EMI share"). */
export const EMI_COMFORTABLE = 36;
export const EMI_STRETCHED = 45;

/**
 * Engine spec §5. Prices the house at month `t` and works out the loan if the
 * whole fund goes into it: costs are paid first, the rest is down payment,
 * never less than the minimum down payment.
 */
export function houseOutlookFrom(plan: Plan, goal: Goal, fund: number, incomeThen: number, t: number): HouseOutlook | null {
  const h = goal.house;
  if (!h) return null;
  const years = (t - toIndex(plan.baseMonth)) / 12;
  const price = h.priceToday * Math.pow(1 + h.growth / 100, years);
  const costs = (price * h.costsPct) / 100;
  const minDown = (price * h.downPct) / 100;
  const upfrontNeeded = costs + minDown;
  const shortfall = Math.max(upfrontNeeded - fund, 0);
  const down = shortfall > 0 ? minDown : Math.min(fund - costs, price);
  const loan = Math.max(price - down, 0);
  const monthly = emi(loan, h.loanRate, h.loanYears);
  const emiShare = incomeThen ? (monthly / incomeThen) * 100 : 0;
  const verdict: HouseVerdict =
    shortfall > 0 ? "short" : emiShare <= EMI_COMFORTABLE ? "comfortable" : emiShare <= EMI_STRETCHED ? "stretched" : "too-high";
  return { buyIndex: t, price, costs, upfrontNeeded, fund, shortfall, down, loan, emi: monthly, incomeThen, emiShare, verdict };
}

/** The house outlook at the goal's target date, read from a projection (or its last row if the plan ends first). */
export function houseOutlook(plan: Plan, goal: Goal, rows: MonthRow[]): HouseOutlook | null {
  if (!goal.house || !goal.targetDate || rows.length === 0) return null;
  const t = toIndex(goal.targetDate);
  const bought = rows.flatMap((r) => r.purchases).find((p) => p.goalId === goal.id);
  if (bought) return bought.outlook;
  const row = rows.find((r) => r.i === t) ?? rows[rows.length - 1];
  return houseOutlookFrom(plan, goal, row.goals[goal.id] ?? 0, row.income, t);
}
