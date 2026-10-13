import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { monthlyLogs, planRevisions, plans, scenarios, users, userSettings } from "./schema";
import { Levers, MonthlyLog, parsePlan, Plan, leversFromSnapshot, type Lever, type PlanInput } from "@/lib/engine";
import { DEFAULT_TIMEZONE } from "@/lib/engine/months";

// Every query takes the signed-in user's id first and filters on it (NFR-SEC-2).

export type RevisionReason = "edit" | "salary-change" | "restore" | "apply-scenario" | "migration" | "extend";

export type PlanRecord = { id: string; plan: Plan; version: number; baselineRevisionId: string | null; updatedAt: Date };

export async function getPlanRecord(userId: string): Promise<PlanRecord | null> {
  const db = await getDb();
  const row = await db.query.plans.findFirst({ where: eq(plans.userId, userId) });
  if (!row) return null;
  return { id: row.id, plan: parsePlan(row.data), version: row.version, baselineRevisionId: row.baselineRevisionId, updatedAt: row.updatedAt };
}

export async function getPlan(userId: string): Promise<Plan | null> {
  return (await getPlanRecord(userId))?.plan ?? null;
}

export type SaveResult = { ok: true; version: number; plan: Plan } | { ok: false; conflict: true };

/**
 * Validates and saves the whole plan, appending a revision in the same transaction.
 * `expectedVersion` is the version the editor loaded; a different stored version means
 * the plan changed elsewhere and nothing is written (PLN-10). Pass null only for the
 * very first save. Throws a ZodError for invalid input.
 */
export async function savePlan(userId: string, input: unknown, expectedVersion: number | null, reason: RevisionReason): Promise<SaveResult> {
  const plan = Plan.parse(input);
  const data = plan as PlanInput;
  const db = await getDb();
  return db.transaction(async (tx) => {
    const existing = await tx.query.plans.findFirst({ where: eq(plans.userId, userId) });
    if (!existing) {
      if (expectedVersion !== null && expectedVersion !== 0) return { ok: false, conflict: true } as const;
      const [row] = await tx.insert(plans).values({ userId, data, version: 1 }).returning({ id: plans.id });
      const [rev] = await tx.insert(planRevisions).values({ planId: row.id, userId, version: 1, data, reason }).returning({ id: planRevisions.id });
      await tx.update(plans).set({ baselineRevisionId: rev.id }).where(eq(plans.id, row.id));
      return { ok: true, version: 1, plan } as const;
    }
    if (expectedVersion !== null && existing.version !== expectedVersion) return { ok: false, conflict: true } as const;
    if (!existing.baselineRevisionId) {
      // Plans saved before revisions existed: keep their original as the first revision and baseline.
      const [first] = await tx
        .insert(planRevisions)
        .values({ planId: existing.id, userId, version: existing.version, data: existing.data, reason: "migration" })
        .onConflictDoNothing()
        .returning({ id: planRevisions.id });
      if (first) await tx.update(plans).set({ baselineRevisionId: first.id }).where(and(eq(plans.id, existing.id), eq(plans.userId, userId)));
    }
    const version = existing.version + 1;
    const updated = await tx
      .update(plans)
      .set({ data, version, updatedAt: new Date() })
      .where(and(eq(plans.id, existing.id), eq(plans.userId, userId), eq(plans.version, existing.version)))
      .returning({ id: plans.id });
    if (updated.length === 0) return { ok: false, conflict: true } as const;
    await tx.insert(planRevisions).values({ planId: existing.id, userId, version, data, reason });
    return { ok: true, version, plan } as const;
  });
}

// ---- Revisions and the tracking baseline (ADR-0007) ----

export type RevisionSummary = { id: string; version: number; reason: string; createdAt: Date; isBaseline: boolean };

export async function listRevisions(userId: string): Promise<RevisionSummary[]> {
  const db = await getDb();
  const record = await db.query.plans.findFirst({ where: eq(plans.userId, userId), columns: { baselineRevisionId: true } });
  const rows = await db
    .select({ id: planRevisions.id, version: planRevisions.version, reason: planRevisions.reason, createdAt: planRevisions.createdAt })
    .from(planRevisions)
    .where(eq(planRevisions.userId, userId))
    .orderBy(desc(planRevisions.version));
  return rows.map((r) => ({ ...r, isBaseline: r.id === record?.baselineRevisionId }));
}

export async function getRevision(userId: string, id: string): Promise<{ id: string; version: number; reason: string; createdAt: Date; plan: Plan } | null> {
  const db = await getDb();
  const row = await db.query.planRevisions.findFirst({ where: and(eq(planRevisions.id, id), eq(planRevisions.userId, userId)) });
  return row ? { id: row.id, version: row.version, reason: row.reason, createdAt: row.createdAt, plan: parsePlan(row.data) } : null;
}

export async function getBaselinePlan(userId: string, baselineRevisionId: string | null): Promise<{ plan: Plan; createdAt: Date } | null> {
  if (!baselineRevisionId) return null;
  const rev = await getRevision(userId, baselineRevisionId);
  return rev ? { plan: rev.plan, createdAt: rev.createdAt } : null;
}

/** Points the tracking baseline at a revision of this user's plan. */
export async function setBaseline(userId: string, revisionId: string): Promise<boolean> {
  const db = await getDb();
  const rev = await db.query.planRevisions.findFirst({ where: and(eq(planRevisions.id, revisionId), eq(planRevisions.userId, userId)), columns: { id: true } });
  if (!rev) return false;
  await db.update(plans).set({ baselineRevisionId: rev.id }).where(eq(plans.userId, userId));
  return true;
}

/** The latest revision's id, to use the current plan as the baseline. */
export async function latestRevisionId(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ id: planRevisions.id }).from(planRevisions).where(eq(planRevisions.userId, userId)).orderBy(desc(planRevisions.version)).limit(1);
  return row?.id ?? null;
}

// ---- Balance logs ----

export async function getLogs(userId: string): Promise<MonthlyLog[]> {
  const db = await getDb();
  const rows = await db.select().from(monthlyLogs).where(eq(monthlyLogs.userId, userId)).orderBy(desc(monthlyLogs.month));
  return rows.map((r) => MonthlyLog.parse(r.data));
}

export async function upsertLog(userId: string, input: unknown): Promise<MonthlyLog> {
  const log = MonthlyLog.parse(input);
  const db = await getDb();
  await db
    .insert(monthlyLogs)
    .values({ userId, month: log.month, data: log })
    .onConflictDoUpdate({ target: [monthlyLogs.userId, monthlyLogs.month], set: { data: log, updatedAt: new Date() } });
  return log;
}

export async function deleteLog(userId: string, month: string): Promise<void> {
  const db = await getDb();
  await db.delete(monthlyLogs).where(and(eq(monthlyLogs.userId, userId), eq(monthlyLogs.month, month)));
}

// ---- Scenarios (ADR-0006) ----

export type ScenarioRecord = { id: string; name: string; levers: Lever[]; createdAt: Date };

/** Lists scenarios, converting any v1 snapshot scenarios to levers against the current plan on the way. */
export async function listScenarios(userId: string, currentPlan: Plan | null): Promise<ScenarioRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(asc(scenarios.createdAt));
  const out: ScenarioRecord[] = [];
  for (const r of rows) {
    let levers = Levers.safeParse(r.levers).success ? Levers.parse(r.levers) : [];
    if (r.data && levers.length === 0 && currentPlan) {
      try {
        levers = leversFromSnapshot(currentPlan, parsePlan(r.data));
        await db.update(scenarios).set({ levers, data: null, updatedAt: new Date() }).where(and(eq(scenarios.id, r.id), eq(scenarios.userId, userId)));
      } catch {
        levers = [];
      }
    }
    out.push({ id: r.id, name: r.name, levers, createdAt: r.createdAt });
  }
  return out;
}

export async function getScenario(userId: string, id: string): Promise<ScenarioRecord | null> {
  const db = await getDb();
  const r = await db.query.scenarios.findFirst({ where: and(eq(scenarios.id, id), eq(scenarios.userId, userId)) });
  return r ? { id: r.id, name: r.name, levers: Levers.parse(r.levers ?? []), createdAt: r.createdAt } : null;
}

export async function createScenario(userId: string, name: string, levers: unknown): Promise<string> {
  const parsed = Levers.parse(levers);
  const db = await getDb();
  const [row] = await db.insert(scenarios).values({ userId, name, levers: parsed }).returning({ id: scenarios.id });
  return row.id;
}

export async function updateScenario(userId: string, id: string, name: string, levers: unknown): Promise<boolean> {
  const parsed = Levers.parse(levers);
  const db = await getDb();
  const rows = await db
    .update(scenarios)
    .set({ name, levers: parsed, data: null, updatedAt: new Date() })
    .where(and(eq(scenarios.id, id), eq(scenarios.userId, userId)))
    .returning({ id: scenarios.id });
  return rows.length > 0;
}

export async function deleteScenario(userId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.delete(scenarios).where(and(eq(scenarios.userId, userId), eq(scenarios.id, id)));
}

// ---- Settings ----

export type Settings = { timezone: string; theme: "system" | "light" | "dark"; salaryDay: number | null; emailReminders: boolean };
export const defaultSettings: Settings = { timezone: DEFAULT_TIMEZONE, theme: "system", salaryDay: null, emailReminders: false };

export async function getSettings(userId: string): Promise<Settings> {
  const db = await getDb();
  const row = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  return row ? { timezone: row.timezone, theme: row.theme, salaryDay: row.salaryDay, emailReminders: row.emailReminders } : defaultSettings;
}

export async function saveSettings(userId: string, s: Partial<Settings>): Promise<void> {
  const db = await getDb();
  await db
    .insert(userSettings)
    .values({ userId, ...defaultSettings, ...s })
    .onConflictDoUpdate({ target: userSettings.userId, set: { ...s, updatedAt: new Date() } });
}

// ---- Export and deletion (ACC-4, ACC-5) ----

export async function exportAll(userId: string) {
  const db = await getDb();
  const [user, plan, revisions, logs, scenarioRows, settings] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { name: true, email: true } }),
    db.query.plans.findFirst({ where: eq(plans.userId, userId) }),
    db.select().from(planRevisions).where(eq(planRevisions.userId, userId)).orderBy(asc(planRevisions.version)),
    db.select().from(monthlyLogs).where(eq(monthlyLogs.userId, userId)).orderBy(asc(monthlyLogs.month)),
    db.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(asc(scenarios.createdAt)),
    getSettings(userId),
  ]);
  return {
    format: "money-planner-export",
    exportedAt: new Date().toISOString(),
    user: user ?? null,
    plan: plan ? { version: plan.version, data: plan.data, updatedAt: plan.updatedAt } : null,
    revisions: revisions.map((r) => ({ version: r.version, reason: r.reason, createdAt: r.createdAt, data: r.data })),
    logs: logs.map((l) => l.data),
    scenarios: scenarioRows.map((s) => ({ name: s.name, levers: s.levers, createdAt: s.createdAt })),
    settings,
  };
}

/** Deletes the user; every app table cascades (data model, "Integrity rules"). */
export async function deleteAccount(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));
}
