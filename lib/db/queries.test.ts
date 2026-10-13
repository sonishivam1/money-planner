import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { samplePlan } from "@/lib/engine/sample-plan";
import type { PlanInput } from "@/lib/engine";

// Runs every query against real Postgres (PGlite, in memory) with the real migrations applied.
process.env.DATABASE_URL = "pglite:memory";

const q = await import("./queries");
const { getDb, schema } = await import("./index");

const A = "user-a";
const B = "user-b";

beforeAll(async () => {
  const db = await getDb();
  await db.insert(schema.users).values([
    { id: A, email: "a@example.com" },
    { id: B, email: "b@example.com" },
  ]);
});

const edit = (patch: (p: PlanInput) => void): PlanInput => {
  const p = structuredClone(samplePlan);
  patch(p);
  return p;
};

describe("plan saves (PLN-10, PLN-11)", () => {
  it("creates the plan with version 1, a first revision and that revision as baseline", async () => {
    const res = await q.savePlan(A, samplePlan, null, "edit");
    expect(res).toMatchObject({ ok: true, version: 1 });
    const record = (await q.getPlanRecord(A))!;
    expect(record.version).toBe(1);
    const revs = await q.listRevisions(A);
    expect(revs).toHaveLength(1);
    expect(revs[0].isBaseline).toBe(true);
    expect(record.baselineRevisionId).toBe(revs[0].id);
  });

  it("saves with the right expected version, bumps it and appends a revision", async () => {
    const res = await q.savePlan(A, edit((p) => (p.income.inHand = 120000)), 1, "edit");
    expect(res).toMatchObject({ ok: true, version: 2 });
    expect((await q.getPlan(A))!.income.inHand).toBe(120000);
    expect((await q.listRevisions(A)).map((r) => r.version)).toEqual([2, 1]);
  });

  it("rejects a stale save and writes nothing", async () => {
    const res = await q.savePlan(A, edit((p) => (p.income.inHand = 1)), 1, "edit");
    expect(res).toEqual({ ok: false, conflict: true });
    expect((await q.getPlan(A))!.income.inHand).toBe(120000);
    expect(await q.listRevisions(A)).toHaveLength(2);
  });

  it("throws for an invalid plan without writing", async () => {
    await expect(q.savePlan(A, edit((p) => (p.horizon = "2000-01")), 2, "edit")).rejects.toThrow();
    expect((await q.getPlanRecord(A))!.version).toBe(2);
  });

  it("keeps the baseline frozen when the plan is edited, and can move it to the latest", async () => {
    const record = (await q.getPlanRecord(A))!;
    const baseline = (await q.getBaselinePlan(A, record.baselineRevisionId))!;
    expect(baseline.plan.income.inHand).toBe(110000);
    const latest = (await q.latestRevisionId(A))!;
    expect(await q.setBaseline(A, latest)).toBe(true);
    const moved = (await q.getPlanRecord(A))!;
    expect((await q.getBaselinePlan(A, moved.baselineRevisionId))!.plan.income.inHand).toBe(120000);
  });

  it("migrates a v1 plan document on read", async () => {
    const db = await getDb();
    const v1 = edit((p) => {
      delete p.schemaVersion;
      p.goals = p.goals!.filter((g) => g.id !== "kids");
    });
    await db.insert(schema.users).values({ id: "user-v1", email: "v1@example.com" });
    await db.insert(schema.plans).values({ userId: "user-v1", data: v1 });
    const plan = (await q.getPlan("user-v1"))!;
    expect(plan.schemaVersion).toBe(2);
    expect(plan.goals.find((g) => g.id === "kids")!.share).toBe(0);
  });

  it("gives a pre-revision plan a 'migration' revision as baseline on its first save", async () => {
    const res = await q.savePlan("user-v1", samplePlan, 1, "edit");
    expect(res.ok).toBe(true);
    const revs = await q.listRevisions("user-v1");
    expect(revs.map((r) => r.reason)).toEqual(["edit", "migration"]);
    expect(revs.find((r) => r.reason === "migration")!.isBaseline).toBe(true);
  });
});

describe("user scoping (NFR-SEC-2)", () => {
  it("never returns another user's plan, revisions, logs or scenarios", async () => {
    await q.upsertLog(A, { month: "2026-11", ef: 1000 });
    const sid = await q.createScenario(A, "A's idea", [{ type: "raise", pct: 12 }]);
    expect(await q.getPlan(B)).toBeNull();
    expect(await q.listRevisions(B)).toEqual([]);
    expect(await q.getLogs(B)).toEqual([]);
    expect(await q.listScenarios(B, null)).toEqual([]);
    expect(await q.getScenario(B, sid)).toBeNull();
    const revId = (await q.listRevisions(A))[0].id;
    expect(await q.getRevision(B, revId)).toBeNull();
    expect(await q.setBaseline(B, revId)).toBe(false);
  });

  it("ignores another user's id in by-id updates and deletes", async () => {
    const sid = (await q.listScenarios(A, null))[0].id;
    expect(await q.updateScenario(B, sid, "hijack", [{ type: "raise", pct: 1 }])).toBe(false);
    await q.deleteScenario(B, sid);
    await q.deleteLog(B, "2026-11");
    expect((await q.listScenarios(A, null))[0].name).toBe("A's idea");
    expect(await q.getLogs(A)).toHaveLength(1);
  });
});

describe("scenarios (ADR-0006)", () => {
  it("converts a v1 snapshot scenario to levers on first read", async () => {
    const db = await getDb();
    const plan = (await q.getPlan(A))!;
    const snapshot = edit((p) => {
      p.income.inHand = 120000;
      p.income.raisePct = 10;
      p.goals![0].house!.priceToday = 9e6;
    });
    const [row] = await db.insert(schema.scenarios).values({ userId: A, name: "Legacy", data: snapshot }).returning();
    const list = await q.listScenarios(A, plan);
    const legacy = list.find((s) => s.id === row.id)!;
    expect(legacy.levers).toEqual([
      { type: "raise", pct: 10 },
      { type: "housePrice", priceToday: 9e6 },
    ]);
    const stored = await db.query.scenarios.findFirst({ where: eq(schema.scenarios.id, row.id) });
    expect(stored!.data).toBeNull();
  });
});

describe("settings, export and deletion (ACC-4, ACC-5, ACC-6)", () => {
  it("returns defaults, then saved settings", async () => {
    expect(await q.getSettings(A)).toEqual(q.defaultSettings);
    await q.saveSettings(A, { timezone: "Europe/London", theme: "dark" });
    expect(await q.getSettings(A)).toMatchObject({ timezone: "Europe/London", theme: "dark" });
  });

  it("exports everything the user owns and nothing else", async () => {
    const data = await q.exportAll(A);
    expect(data.user?.email).toBe("a@example.com");
    expect(data.plan?.version).toBe(2);
    expect(data.revisions.length).toBeGreaterThanOrEqual(2);
    expect(data.logs).toHaveLength(1);
    expect(data.scenarios.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(data)).not.toContain("b@example.com");
  });

  it("deleting the account removes every row by cascade", async () => {
    await q.deleteAccount(A);
    const db = await getDb();
    for (const t of [schema.plans, schema.planRevisions, schema.monthlyLogs, schema.scenarios, schema.userSettings]) {
      expect(await db.select().from(t).where(eq(t.userId, A))).toEqual([]);
    }
    expect(await db.select().from(schema.users).where(eq(schema.users.id, B))).toHaveLength(1);
  });
});
