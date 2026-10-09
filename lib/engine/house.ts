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
  upfrontNeeded: number;
  fund: number;
  shortfall: number;
  loan: number;
  emi: number;
  incomeThen: number;
  emiShare: number;
  verdict: HouseVerdict;
};

/**
 * Prices the house at its target date and works out the loan if the whole
 * goal fund goes into it: costs (stamp duty, registration, interiors) are paid
 * first, the rest is down payment, never less than the minimum down payment.
 */
export function houseOutlook(plan: Plan, goal: Goal, rows: MonthRow[]): HouseOutlook | null {
  const h = goal.house;
  if (!h || !goal.targetDate || rows.length === 0) return null;
  const t = toIndex(goal.targetDate);
  const row = rows.find((r) => r.i === t) ?? rows[rows.length - 1];
  const years = (t - toIndex(plan.baseMonth)) / 12;
  const price = h.priceToday * Math.pow(1 + h.growth / 100, years);
  const costs = (price * h.costsPct) / 100;
  const minDown = (price * h.downPct) / 100;
  const upfrontNeeded = costs + minDown;
  const fund = row.goals[goal.id] ?? 0;
  const shortfall = Math.max(upfrontNeeded - fund, 0);
  const down = shortfall > 0 ? minDown : Math.min(fund - costs, price);
  const loan = Math.max(price - down, 0);
  const monthly = emi(loan, h.loanRate, h.loanYears);
  const emiShare = row.income ? (monthly / row.income) * 100 : 0;
  const verdict: HouseVerdict = shortfall > 0 ? "short" : emiShare <= 36 ? "comfortable" : emiShare <= 45 ? "stretched" : "too-high";
  return { buyIndex: t, price, upfrontNeeded, fund, shortfall, loan, emi: monthly, incomeThen: row.income, emiShare, verdict };
}
