import "server-only";
import { forecast, type Forecast, type MonthlyLog, type Plan } from "@/lib/engine";
import { getBaselinePlan, getLogs, getPlanRecord, getSettings, type Settings } from "@/lib/db/queries";

export type Loaded = {
  plan: Plan;
  version: number;
  logs: MonthlyLog[];
  settings: Settings;
  /** When the tracking baseline revision was saved (null: the current plan is the baseline). */
  baselineSavedAt: Date | null;
  f: Forecast;
  now: Date;
} | null;

/** Loads the plan, logs, settings and baseline, then runs the forecast (system architecture §3). */
export async function loadPlan(userId: string): Promise<Loaded> {
  const [record, logs, settings] = await Promise.all([getPlanRecord(userId), getLogs(userId), getSettings(userId)]);
  if (!record) return null;
  const baseline = await getBaselinePlan(userId, record.baselineRevisionId);
  const now = new Date();
  const f = forecast(record.plan, logs, { now, timezone: settings.timezone, baselinePlan: baseline?.plan });
  return { plan: record.plan, version: record.version, logs, settings, baselineSavedAt: baseline?.createdAt ?? null, f, now };
}
