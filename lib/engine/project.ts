import type { Commitment, Expense, Goal, MonthlyLog, Plan } from "./schema";
import { currentIndex, raisesBetween, toIndex } from "./months";

export type Balances = {
  ef: number;
  goals: Record<string, number>;
  commit: Record<string, number>;
};

export type MonthRow = {
  i: number;
  income: number;
  expenses: number;
  expenseItems: number[];
  commitments: number;
  commitmentItems: number[];
  buffer: number;
  free: number;
  oneTime: number;
  oneTimeNames: string[];
  deficit: number;
  toEmergency: number;
  fromEmergency: number;
  unallocated: number;
  alloc: Record<string, number>;
  /** Balances at the end of this month, after contributions. */
  ef: number;
  goals: Record<string, number>;
  commit: Record<string, number>;
};

const monthlyRate = (annualPct: number) => Math.pow(1 + (annualPct || 0) / 100, 1 / 12) - 1;

export function salaryAt(plan: Plan, i: number): number {
  let base = plan.income.inHand;
  let from = toIndex(plan.baseMonth);
  const events = [...plan.income.events].sort((a, b) => toIndex(a.month) - toIndex(b.month));
  for (const e of events) {
    if (toIndex(e.month) <= i) {
      base = e.inHand;
      from = toIndex(e.month);
    }
  }
  return base * Math.pow(1 + plan.income.raisePct / 100, raisesBetween(from, i, plan.income.raiseMonth));
}

export function expenseAt(plan: Plan, item: Expense, i: number): number {
  const start = item.start ? toIndex(item.start) : -Infinity;
  const end = item.end ? toIndex(item.end) : Infinity;
  if (i < start || i > end) return 0;
  let base = item.amount;
  let from = toIndex(plan.baseMonth);
  const changes = [...item.changes].sort((a, b) => toIndex(a.month) - toIndex(b.month));
  for (const c of changes) {
    if (toIndex(c.month) <= i) {
      base = c.amount;
      from = toIndex(c.month);
    }
  }
  if (!item.inflate) return base;
  return base * Math.pow(1 + plan.assume.inflation / 100, raisesBetween(from, i, plan.income.raiseMonth));
}

export function commitmentAt(plan: Plan, item: Commitment, i: number): number {
  const start = item.start ? toIndex(item.start) : -Infinity;
  const end = item.end ? toIndex(item.end) : Infinity;
  if (i < start || i > end) return 0;
  let amount = item.amount * Math.pow(1 + item.stepUp / 100, raisesBetween(toIndex(plan.baseMonth), i, plan.income.raiseMonth));
  if (item.cap > 0) amount = Math.min(amount, item.cap);
  return amount;
}

function goalRate(plan: Plan, goal: Goal, i: number): number {
  const t = goal.targetDate ? toIndex(goal.targetDate) : null;
  const inDebt = t !== null && ((goal.debtYears > 0 && i > t - 12 * goal.debtYears) || i > t);
  if (inDebt) return plan.assume.debtRet;
  return goal.rate ?? plan.assume.equityRet;
}

/**
 * Simulates the plan month by month from `fromIndex` to the horizon.
 * `start` holds balances at the start of `fromIndex`, before that month's SIPs.
 *
 * Each month: free = income − expenses − fixed investments − buffer.
 * One-time payments come out of the emergency fund first. Free money fills the
 * emergency fund up to its target, then splits across active goals by share.
 */
export function project(plan: Plan, fromIndex: number, start: Balances): MonthRow[] {
  const end = toIndex(plan.horizon);
  const rows: MonthRow[] = [];
  let ef = start.ef || 0;
  const goals: Record<string, number> = {};
  const commit: Record<string, number> = {};
  for (const g of plan.goals) goals[g.id] = start.goals[g.id] || 0;
  for (const c of plan.commitments) commit[c.id] = start.commit[c.id] || 0;
  const target = plan.emergency.target;
  const base = toIndex(plan.baseMonth);

  for (let i = fromIndex; i <= end; i++) {
    const income = salaryAt(plan, i);
    const expenseItems = plan.expenses.map((e) => expenseAt(plan, e, i));
    const expenses = expenseItems.reduce((s, v) => s + v, 0);
    const commitmentItems = plan.commitments.map((c) => commitmentAt(plan, c, i));
    const commitments = commitmentItems.reduce((s, v) => s + v, 0);
    const buffer = plan.assume.buffer * Math.pow(1 + plan.assume.inflation / 100, raisesBetween(base, i, plan.income.raiseMonth));
    let free = income - expenses - commitments - buffer;

    const ones = plan.oneTimes.filter((o) => toIndex(o.month) === i);
    const oneTime = ones.reduce((s, o) => s + o.amount, 0);
    let deficit = 0;
    let toEmergency = 0;
    let fromEmergency = 0;
    let unallocated = 0;
    const alloc: Record<string, number> = {};

    if (oneTime > 0) {
      const used = Math.min(ef, oneTime);
      ef -= used;
      fromEmergency += used;
      free -= oneTime - used;
    }
    if (free < 0) {
      deficit = -free;
      const used = Math.min(ef, deficit);
      ef -= used;
      fromEmergency += used;
    } else {
      toEmergency = Math.min(free, Math.max(0, target - ef));
      const rest = free - toEmergency;
      const active = plan.goals.filter((g) => !g.targetDate || toIndex(g.targetDate) >= i);
      const totalShare = active.reduce((s, g) => s + g.share, 0);
      if (totalShare > 0) for (const g of active) alloc[g.id] = (rest * g.share) / totalShare;
      else unallocated = rest;
    }

    ef = ef * (1 + monthlyRate(plan.assume.liquidRet)) + toEmergency;
    for (const g of plan.goals) goals[g.id] = goals[g.id] * (1 + monthlyRate(goalRate(plan, g, i))) + (alloc[g.id] || 0);
    plan.commitments.forEach((c, k) => {
      commit[c.id] = commit[c.id] * (1 + monthlyRate(c.rate)) + commitmentItems[k];
    });

    rows.push({
      i, income, expenses, expenseItems, commitments, commitmentItems, buffer, free, oneTime,
      oneTimeNames: ones.map((o) => o.name), deficit, toEmergency, fromEmergency, unallocated,
      alloc, ef, goals: { ...goals }, commit: { ...commit },
    });
  }
  return rows;
}

/** Balances at the start of month `i`, read from a projection or the plan's start values. */
export function balancesAt(plan: Plan, rows: MonthRow[], i: number): Balances | null {
  const prev = rows.find((r) => r.i === i - 1);
  if (prev) return { ef: prev.ef, goals: prev.goals, commit: prev.commit };
  if (i === toIndex(plan.baseMonth)) return plan.start;
  return null;
}

export type Forecast = {
  /** The original plan from its start month. */
  baseline: MonthRow[];
  /** The plan re-run from the latest logged balances. */
  live: MonthRow[];
  current: MonthRow;
  currentIndex: number;
  latestLog: MonthlyLog | null;
};

export function forecast(plan: Plan, logs: MonthlyLog[], now = new Date()): Forecast {
  const base = toIndex(plan.baseMonth);
  const baseline = project(plan, base, plan.start);
  const cur = Math.min(Math.max(currentIndex(now), base), toIndex(plan.horizon));
  const latestLog =
    [...logs].filter((l) => toIndex(l.month) <= cur && toIndex(l.month) >= base).sort((a, b) => toIndex(b.month) - toIndex(a.month))[0] ?? null;
  const live = latestLog ? project(plan, toIndex(latestLog.month), latestLog) : baseline;
  const current = live.find((r) => r.i === cur) ?? live[0];
  return { baseline, live, current, currentIndex: cur, latestLog };
}
