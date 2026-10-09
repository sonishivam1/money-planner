import type { MonthlyLog, Plan } from "./schema";
import { forecast } from "./project";
import { houseOutlook, type HouseOutlook } from "./house";

export type PlanSummary = {
  emergencyFullIndex: number | null;
  house: HouseOutlook | null;
  /** Goal funds plus linked fixed investments at the horizon, by goal id. */
  goalsAtHorizon: Record<string, number>;
  horizonIndex: number;
  incomeAtHorizon: number;
};

/** The handful of numbers used to compare a plan with a what-if scenario. */
export function summarize(plan: Plan, logs: MonthlyLog[], now = new Date()): PlanSummary {
  const f = forecast(plan, logs, now);
  const last = f.live[f.live.length - 1];
  const full = f.live.find((r) => r.ef >= plan.emergency.target - 1);
  const goalsAtHorizon: Record<string, number> = {};
  for (const g of plan.goals) {
    goalsAtHorizon[g.id] = (last.goals[g.id] ?? 0) + plan.commitments.filter((c) => c.goal === g.id).reduce((s, c) => s + (last.commit[c.id] ?? 0), 0);
  }
  const houseGoal = plan.goals.find((g) => g.kind === "house");
  return {
    emergencyFullIndex: full ? full.i : null,
    house: houseGoal ? houseOutlook(plan, houseGoal, f.live) : null,
    goalsAtHorizon,
    horizonIndex: last.i,
    incomeAtHorizon: last.income,
  };
}
