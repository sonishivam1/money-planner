import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { monthlyLogs, plans, scenarios } from "./schema";
import { MonthlyLog, Plan, type PlanInput } from "@/lib/engine/schema";

// Every query takes the signed-in user's id and filters on it.

export async function getPlan(userId: string): Promise<Plan | null> {
  const row = await getDb().query.plans.findFirst({ where: eq(plans.userId, userId) });
  return row ? Plan.parse(row.data) : null;
}

export async function getPlanInput(userId: string): Promise<PlanInput | null> {
  const row = await getDb().query.plans.findFirst({ where: eq(plans.userId, userId) });
  return row ? (Plan.parse(row.data) as PlanInput) : null;
}

export async function upsertPlan(userId: string, input: unknown): Promise<Plan> {
  const parsed = Plan.parse(input);
  await getDb()
    .insert(plans)
    .values({ userId, data: parsed })
    .onConflictDoUpdate({ target: plans.userId, set: { data: parsed, updatedAt: new Date() } });
  return parsed;
}

export async function getLogs(userId: string): Promise<MonthlyLog[]> {
  const rows = await getDb().select().from(monthlyLogs).where(eq(monthlyLogs.userId, userId)).orderBy(desc(monthlyLogs.month));
  return rows.map((r) => MonthlyLog.parse(r.data));
}

export async function upsertLog(userId: string, input: unknown): Promise<MonthlyLog> {
  const log = MonthlyLog.parse(input);
  await getDb()
    .insert(monthlyLogs)
    .values({ userId, month: log.month, data: log })
    .onConflictDoUpdate({ target: [monthlyLogs.userId, monthlyLogs.month], set: { data: log, updatedAt: new Date() } });
  return log;
}

export async function deleteLog(userId: string, month: string): Promise<void> {
  await getDb().delete(monthlyLogs).where(and(eq(monthlyLogs.userId, userId), eq(monthlyLogs.month, month)));
}

export async function listScenarios(userId: string) {
  const rows = await getDb().select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(asc(scenarios.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, plan: Plan.parse(r.data) }));
}

export async function createScenario(userId: string, name: string, input: unknown) {
  const data = Plan.parse(input);
  const [row] = await getDb().insert(scenarios).values({ userId, name, data }).returning({ id: scenarios.id });
  return row.id;
}

export async function deleteScenario(userId: string, id: string): Promise<void> {
  await getDb().delete(scenarios).where(and(eq(scenarios.userId, userId), eq(scenarios.id, id)));
}
