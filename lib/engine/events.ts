import type { Plan } from "./schema";
import { emergencyFullRow, expenseAt, type Forecast } from "./project";
import { toIndex } from "./months";
import { inr, inrShort } from "./format";

export type EventKind = "expense-end" | "expense-change" | "one-time" | "salary" | "raise" | "emergency-full" | "debt" | "target" | "house" | "repaid";
export type UpcomingEvent = { i: number; kind: EventKind; text: string };

/** The next few things that change the plan, soonest first (engine spec §7). */
export function upcomingEvents(plan: Plan, f: Forecast, limit = 6): UpcomingEvent[] {
  const cur = f.currentIndex;
  const ev: UpcomingEvent[] = [];
  for (const e of plan.expenses) {
    if (e.end && toIndex(e.end) >= cur) {
      const last = toIndex(e.end);
      ev.push({ i: last + 1, kind: "expense-end", text: `${e.name}: done, freeing ${inr(expenseAt(plan, e, last))} a month` });
    }
    for (const c of e.changes) if (toIndex(c.month) >= cur) ev.push({ i: toIndex(c.month), kind: "expense-change", text: `${e.name} changes to ${inr(c.amount)} a month` });
  }
  for (const o of plan.oneTimes) if (toIndex(o.month) >= cur) ev.push({ i: toIndex(o.month), kind: "one-time", text: `${o.name}: ${inr(o.amount)}, from the emergency fund first` });
  for (const e of plan.income.events) if (toIndex(e.month) >= cur) ev.push({ i: toIndex(e.month), kind: "salary", text: `Salary becomes ${inr(e.inHand)} in hand${e.note ? ` (${e.note})` : ""}` });

  let raise = cur + 1;
  while (raise % 12 !== plan.income.raiseMonth - 1) raise++;
  const steps = plan.commitments.some((c) => c.stepUp > 0) ? "; fixed investments step up" : "";
  ev.push({ i: raise, kind: "raise", text: `Yearly raise of ${plan.income.raisePct}% assumed${steps}` });

  if (f.current.ef < f.current.target - 1) {
    const full = emergencyFullRow(f.live.filter((r) => r.i >= cur));
    if (full) ev.push({ i: full.i, kind: "emergency-full", text: `Emergency fund reaches ${inrShort(full.target)}; goal SIPs start next month` });
  }
  if (f.current.carried > 0) {
    const repaid = f.live.find((r) => r.i > cur && r.carried <= 0);
    if (repaid) ev.push({ i: repaid.i, kind: "repaid", text: `Carried shortfall fully repaid` });
  }
  for (const g of plan.goals) {
    if (!g.targetDate || toIndex(g.targetDate) < cur) continue;
    const t = toIndex(g.targetDate);
    if (g.debtYears > 0) ev.push({ i: t - 12 * g.debtYears + 1, kind: "debt", text: `Move the ${g.name} fund into FDs or a debt fund` });
    const bought = f.live.flatMap((r) => r.purchases).find((p) => p.goalId === g.id);
    if (bought) ev.push({ i: t, kind: "house", text: `${g.name}: bought; home loan EMI of ${inr(bought.emi)} starts next month` });
    else ev.push({ i: t, kind: "target", text: `${g.name}: target date` });
  }
  return ev.filter((e) => e.i >= cur).sort((a, b) => a.i - b.i).slice(0, limit);
}
