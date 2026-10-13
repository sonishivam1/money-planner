import { onTargetOf, type Commitment, type Expense, type Goal, type MonthlyLog, type Plan } from "./schema";
import { currentMonth, DEFAULT_TIMEZONE, raisesBetween, toIndex } from "./months";
import { houseOutlookFrom, type HouseOutlook } from "./house";

/** Balances at the start of a month, before that month's SIPs. */
export type Balances = {
  ef: number;
  goals: Record<string, number>;
  commit: Record<string, number>;
  /** Carried shortfall still owed (ENG-2). */
  shortfall?: number;
};

/** A simulated house purchase at a goal's target date (ENG-4). */
export type Purchase = {
  goalId: string;
  i: number;
  emi: number;
  /** Last month of the home loan EMI. */
  loanEnd: number;
  replacesExpenseId?: string;
  outlook: HouseOutlook;
};

export type MonthRow = {
  i: number;
  income: number;
  /** All expenses this month, including a home loan EMI after a purchase. */
  expenses: number;
  /** Per plan expense, in plan order. */
  expenseItems: number[];
  /** Expenses the engine adds, such as a home loan EMI. */
  extraExpenses: { name: string; amount: number }[];
  commitments: number;
  commitmentItems: number[];
  buffer: number;
  /** Emergency fund target this month (engine spec §2). */
  target: number;
  /** Free money after one-time payments the emergency fund couldn't cover. */
  free: number;
  oneTime: number;
  oneTimeNames: string[];
  deficit: number;
  toEmergency: number;
  fromEmergency: number;
  /** Carried shortfall repaid this month. */
  repaid: number;
  /** Carried shortfall still owed at the end of this month. */
  carried: number;
  unallocated: number;
  alloc: Record<string, number>;
  /** Balances at the end of this month, after contributions and before any goal completion. */
  ef: number;
  goals: Record<string, number>;
  commit: Record<string, number>;
  /** Goal money spent at its target date this month. */
  withdrawn: Record<string, number>;
  purchases: Purchase[];
};

const monthlyRate = (annualPct: number) => Math.pow(1 + (annualPct || 0) / 100, 1 / 12) - 1;
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

/** Engine spec §2, "Salary". */
export function salaryAt(plan: Plan, i: number): number {
  let base = plan.income.inHand;
  let from = toIndex(plan.baseMonth);
  const events = [...plan.income.events].sort((a, b) => toIndex(a.month) - toIndex(b.month));
  for (const e of events) {
    if (toIndex(e.month) <= i) {
      base = e.inHand;
      from = Math.max(toIndex(e.month), toIndex(plan.baseMonth));
    }
  }
  return base * Math.pow(1 + plan.income.raisePct / 100, raisesBetween(from, i, plan.income.raiseMonth));
}

/** Engine spec §2, "Expense". Inflation counts from the item's own start (ENG-3). */
export function expenseAt(plan: Plan, item: Expense, i: number): number {
  const start = item.start ? toIndex(item.start) : -Infinity;
  const end = item.end ? toIndex(item.end) : Infinity;
  if (i < start || i > end) return 0;
  let base = item.amount;
  const base0 = toIndex(plan.baseMonth);
  let from = Math.max(start, base0);
  const changes = [...item.changes].sort((a, b) => toIndex(a.month) - toIndex(b.month));
  for (const c of changes) {
    if (toIndex(c.month) <= i) {
      base = c.amount;
      from = Math.max(toIndex(c.month), start, base0);
    }
  }
  if (!item.inflate) return base;
  return base * Math.pow(1 + plan.assume.inflation / 100, raisesBetween(from, i, plan.income.raiseMonth));
}

/** Engine spec §2, "Fixed investment". Step-ups count from the item's own start (ENG-3). */
export function commitmentAt(plan: Plan, item: Commitment, i: number): number {
  const start = item.start ? toIndex(item.start) : -Infinity;
  const end = item.end ? toIndex(item.end) : Infinity;
  if (i < start || i > end) return 0;
  const from = Math.max(start, toIndex(plan.baseMonth));
  let amount = item.amount * Math.pow(1 + item.stepUp / 100, raisesBetween(from, i, plan.income.raiseMonth));
  if (item.cap > 0) amount = Math.min(amount, item.cap);
  return amount;
}

/** Engine spec §2, "Spending buffer". */
export function bufferAt(plan: Plan, i: number): number {
  return plan.assume.buffer * Math.pow(1 + plan.assume.inflation / 100, raisesBetween(toIndex(plan.baseMonth), i, plan.income.raiseMonth));
}

/** Engine spec §2, "Emergency fund target", given that month's total expenses (ENG-5). */
export function emergencyTarget(plan: Plan, expenses: number): number {
  return plan.emergency.mode === "months" ? plan.emergency.months * expenses : plan.emergency.target;
}

/** Engine spec §3, step 4: debt for the last 12·d months up to the target, and after it. */
export function goalRate(plan: Plan, goal: Goal, i: number): number {
  const t = goal.targetDate ? toIndex(goal.targetDate) : null;
  const inDebt = t !== null && ((goal.debtYears > 0 && i > t - 12 * goal.debtYears) || i > t);
  if (inDebt) return plan.assume.debtRet;
  return goal.rate ?? plan.assume.equityRet;
}

/**
 * Simulates the plan month by month from `fromIndex` to the horizon (engine spec §3).
 * `start` holds balances at the start of `fromIndex`, before that month's SIPs.
 * `seed` carries house purchases that happened before `fromIndex`, so a projection
 * restarted from a later log still pays the home loan EMI.
 */
export function project(plan: Plan, fromIndex: number, start: Balances, seed: Purchase[] = []): MonthRow[] {
  const end = toIndex(plan.horizon);
  const rows: MonthRow[] = [];
  let ef = start.ef || 0;
  let carried = start.shortfall || 0;
  const goals: Record<string, number> = {};
  const commit: Record<string, number> = {};
  for (const g of plan.goals) goals[g.id] = start.goals[g.id] || 0;
  for (const c of plan.commitments) commit[c.id] = start.commit[c.id] || 0;

  const loans: { name: string; amount: number; from: number; to: number }[] = [];
  const endOverride: Record<string, number> = {};
  const completed = new Set<string>();
  const applyPurchase = (p: Purchase) => {
    const goal = plan.goals.find((g) => g.id === p.goalId);
    loans.push({ name: `Home loan EMI${goal ? ` (${goal.name.split(":")[0]})` : ""}`, amount: p.emi, from: p.i + 1, to: p.loanEnd });
    if (p.replacesExpenseId) endOverride[p.replacesExpenseId] = Math.min(endOverride[p.replacesExpenseId] ?? Infinity, p.i);
    completed.add(p.goalId);
  };
  for (const p of seed) if (p.i < fromIndex) applyPurchase(p);
  for (const g of plan.goals) {
    // A goal withdrawn before this projection starts stays completed.
    if (g.targetDate && toIndex(g.targetDate) < fromIndex && onTargetOf(g) === "withdraw" && g.kind !== "house") completed.add(g.id);
  }

  for (let i = fromIndex; i <= end; i++) {
    // Step 1: free money.
    const income = salaryAt(plan, i);
    const expenseItems = plan.expenses.map((e) => (i > (endOverride[e.id] ?? Infinity) ? 0 : expenseAt(plan, e, i)));
    const extraExpenses = loans.filter((l) => i >= l.from && i <= l.to).map((l) => ({ name: l.name, amount: l.amount }));
    const expenses = sum(expenseItems) + sum(extraExpenses.map((x) => x.amount));
    const commitmentItems = plan.commitments.map((c) => commitmentAt(plan, c, i));
    const commitments = sum(commitmentItems);
    const buffer = bufferAt(plan, i);
    const target = emergencyTarget(plan, expenses);
    let free = income - expenses - commitments - buffer;

    // Step 2: one-time payments, from the emergency fund first.
    const ones = plan.oneTimes.filter((o) => toIndex(o.month) === i);
    const oneTime = sum(ones.map((o) => o.amount));
    let fromEmergency = 0;
    if (oneTime > 0) {
      const used = Math.min(ef, oneTime);
      ef -= used;
      fromEmergency += used;
      free -= oneTime - used;
    }

    // Step 3: shortfall or allocation.
    let deficit = 0;
    let toEmergency = 0;
    let repaid = 0;
    let unallocated = 0;
    const alloc: Record<string, number> = {};
    if (free < 0) {
      deficit = -free;
      const used = Math.min(ef, deficit);
      ef -= used;
      fromEmergency += used;
      carried += deficit - used; // ENG-2: never written off
    } else {
      repaid = Math.min(free, carried); // ENG-2: repay first
      carried -= repaid;
      let rest = free - repaid;
      toEmergency = Math.min(rest, Math.max(0, target - ef));
      rest -= toEmergency;
      const active = plan.goals.filter((g) => g.share > 0 && !completed.has(g.id) && (!g.targetDate || toIndex(g.targetDate) >= i));
      const totalShare = sum(active.map((g) => g.share));
      if (totalShare > 0) for (const g of active) alloc[g.id] = (rest * g.share) / totalShare;
      else unallocated = rest;
    }

    // Step 4: growth, then contributions.
    ef = ef * (1 + monthlyRate(plan.assume.liquidRet)) + toEmergency;
    for (const g of plan.goals) goals[g.id] = goals[g.id] * (1 + monthlyRate(goalRate(plan, g, i))) + (alloc[g.id] || 0);
    plan.commitments.forEach((c, k) => {
      commit[c.id] = commit[c.id] * (1 + monthlyRate(c.rate)) + commitmentItems[k];
    });
    const closingGoals = { ...goals };

    // Step 5: goal completion at the end of the target month (ENG-4).
    const withdrawn: Record<string, number> = {};
    const purchases: Purchase[] = [];
    for (const g of plan.goals) {
      if (!g.targetDate || toIndex(g.targetDate) !== i || completed.has(g.id) || onTargetOf(g) !== "withdraw") continue;
      if (g.kind === "house" && g.house) {
        const outlook = houseOutlookFrom(plan, g, goals[g.id], income, i);
        if (!outlook || outlook.verdict === "short") continue; // short: don't buy, the goal holds
        const p: Purchase = { goalId: g.id, i, emi: outlook.emi, loanEnd: i + g.house.loanYears * 12, replacesExpenseId: g.house.replacesExpenseId, outlook };
        purchases.push(p);
        applyPurchase(p);
        // Costs and down payment are spent; anything beyond the price stays in the fund.
        withdrawn[g.id] = Math.min(goals[g.id], outlook.costs + outlook.down);
      } else {
        completed.add(g.id);
        withdrawn[g.id] = goals[g.id];
      }
      goals[g.id] -= withdrawn[g.id];
    }

    rows.push({
      i, income, expenses, expenseItems, extraExpenses, commitments, commitmentItems, buffer, target, free, oneTime,
      oneTimeNames: ones.map((o) => o.name), deficit, toEmergency, fromEmergency, repaid, carried, unallocated,
      alloc, ef, goals: closingGoals, commit: { ...commit }, withdrawn, purchases,
    });
  }
  return rows;
}

/** Balances at the start of month `i`, read from a projection or the plan's start values. */
export function balancesAt(plan: Plan, rows: MonthRow[], i: number): Balances | null {
  const prev = rows.find((r) => r.i === i - 1);
  if (prev) {
    const goals = { ...prev.goals };
    for (const [id, w] of Object.entries(prev.withdrawn)) goals[id] = (goals[id] ?? 0) - w;
    return { ef: prev.ef, goals, commit: prev.commit, shortfall: prev.carried };
  }
  if (i === toIndex(plan.baseMonth)) return { ...plan.start, shortfall: 0 };
  return null;
}

/** First month in `rows` where the emergency fund reaches its target (within ₹1). */
export function emergencyFullRow(rows: MonthRow[]): MonthRow | undefined {
  return rows.find((r) => r.ef >= r.target - 1);
}

export type Forecast = {
  /** The tracking baseline (a frozen plan revision, or the current plan) from its start month. */
  baseline: MonthRow[];
  /** The current plan from its start month and starting balances. */
  planned: MonthRow[];
  /** The current plan re-run from the latest logged balances. */
  live: MonthRow[];
  current: MonthRow;
  currentIndex: number;
  latestLog: MonthlyLog | null;
};

export type ForecastOptions = {
  now?: Date;
  timezone?: string;
  /** The plan revision Track compares against (ADR-0007). Defaults to the current plan. */
  baselinePlan?: Plan;
};

/** Engine spec §6. */
export function forecast(plan: Plan, logs: MonthlyLog[], opts: ForecastOptions = {}): Forecast {
  const now = opts.now ?? new Date();
  const base = toIndex(plan.baseMonth);
  const planned = project(plan, base, plan.start);
  const baseline = opts.baselinePlan ? project(opts.baselinePlan, toIndex(opts.baselinePlan.baseMonth), opts.baselinePlan.start) : planned;
  const cur = Math.min(Math.max(currentMonth(now, opts.timezone ?? DEFAULT_TIMEZONE), base), toIndex(plan.horizon));
  const latestLog =
    [...logs].filter((l) => toIndex(l.month) <= cur && toIndex(l.month) >= base).sort((a, b) => toIndex(b.month) - toIndex(a.month))[0] ?? null;
  const seed = planned.flatMap((r) => r.purchases);
  const live = latestLog ? project(plan, toIndex(latestLog.month), latestLog, seed) : planned;
  const current = live.find((r) => r.i === cur) ?? live[0];
  return { baseline, planned, live, current, currentIndex: cur, latestLog };
}
