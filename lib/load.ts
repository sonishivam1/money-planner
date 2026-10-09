import "server-only";
import { forecast, type Forecast, type MonthlyLog, type Plan } from "@/lib/engine";
import { getLogs, getPlan } from "@/lib/db/queries";

export type Loaded = { plan: Plan; logs: MonthlyLog[]; f: Forecast } | null;

export async function loadPlan(userId: string): Promise<Loaded> {
  const [plan, logs] = await Promise.all([getPlan(userId), getLogs(userId)]);
  if (!plan) return null;
  return { plan, logs, f: forecast(plan, logs) };
}
