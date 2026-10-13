import type { MonthlyLog, Plan } from "./schema";
import { emergencyFullRow, forecast, type ForecastOptions } from "./project";
import { houseOutlook, type HouseOutlook } from "./house";

export type PlanSummary = {
  emergencyFullIndex: number | null;
  house: HouseOutlook | null;
  /** Goal funds plus linked fixed investments at the horizon, by goal id. */
  goalsAtHorizon: Record<string, number>;
  horizonIndex: number;
  incomeAtHorizon: number;
  /** Largest carried shortfall at any point (0 if the plan is always affordable). */
  maxCarried: number;
};

/** The handful of numbers used to compare a plan with a what-if scenario (engine spec §8). */
export function summarize(plan: Plan, logs: MonthlyLog[], opts: ForecastOptions = {}): PlanSummary {
  const f = forecast(plan, logs, opts);
  const last = f.live[f.live.length - 1];
  const full = emergencyFullRow(f.live);
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
    maxCarried: Math.max(0, ...f.live.map((r) => r.carried)),
  };
}
