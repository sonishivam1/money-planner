import type { Plan } from "./schema";
import type { Forecast } from "./project";
import { toIndex } from "./months";
import { inr, inrShort } from "./format";

export type UpcomingEvent = { i: number; text: string };

/** The next few things that change the plan, soonest first. */
export function upcomingEvents(plan: Plan, f: Forecast, limit = 6): UpcomingEvent[] {
  const cur = f.currentIndex;
  const ev: UpcomingEvent[] = [];
  for (const e of plan.expenses) {
    if (e.end && toIndex(e.end) >= cur) ev.push({ i: toIndex(e.end) + 1, text: `${e.name}: done, freeing ${inr(e.amount)} a month` });
    for (const c of e.changes) if (toIndex(c.month) >= cur) ev.push({ i: toIndex(c.month), text: `${e.name} changes to ${inr(c.amount)} a month` });
  }
  for (const o of plan.oneTimes) if (toIndex(o.month) >= cur) ev.push({ i: toIndex(o.month), text: `${o.name}: ${inr(o.amount)} from the emergency fund` });
  for (const e of plan.income.events) if (toIndex(e.month) >= cur) ev.push({ i: toIndex(e.month), text: `Salary becomes ${inr(e.inHand)} in hand${e.note ? ` (${e.note})` : ""}` });

  let raise = cur + 1;
  while (raise % 12 !== plan.income.raiseMonth - 1) raise++;
  ev.push({ i: raise, text: `Yearly raise of ${plan.income.raisePct}% assumed; SIPs and PPF step up` });

  const target = plan.emergency.target;
  if (f.current.ef < target - 1) {
    const full = f.live.find((r) => r.ef >= target - 1);
    if (full) ev.push({ i: full.i, text: `Emergency fund reaches ${inrShort(target)}; goal SIPs start next month` });
  }
  for (const g of plan.goals) {
    if (!g.targetDate || toIndex(g.targetDate) < cur) continue;
    if (g.debtYears > 0) ev.push({ i: toIndex(g.targetDate) - 12 * g.debtYears + 1, text: `Move the ${g.name} fund into FDs or a debt fund` });
    ev.push({ i: toIndex(g.targetDate), text: `${g.name}: target date` });
  }
  return ev.filter((e) => e.i >= cur).sort((a, b) => a.i - b.i).slice(0, limit);
}
