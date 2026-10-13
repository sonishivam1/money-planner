"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import * as q from "@/lib/db/queries";
import { createDevSession, devLoginEnabled, SESSION_DAYS } from "@/lib/db/dev-auth";
import { applyLevers, currentMonth, isTimeZone, Lever, Levers, MAX_MONTHS, Month, toIndex, toMonth, type LeverInput, type PlanInput } from "@/lib/engine";
import { samplePlan } from "@/lib/engine/sample-plan";
import { signIn, signOut } from "@/auth";

export type FieldErrors = Record<string, string>;
export type ActionResult =
  | { ok: true; version?: number; id?: string; message?: string }
  | { ok: false; formError?: string; fieldErrors?: FieldErrors; conflict?: boolean };

const CONFLICT: ActionResult = { ok: false, conflict: true, formError: "The plan changed elsewhere (another tab or device). Reload to see it." };

/** Turns a ZodError into one message per field path, keyed like "expenses.2.amount" (PLN-8). */
function zodErrors(e: z.ZodError): ActionResult {
  const fieldErrors: FieldErrors = {};
  for (const i of e.issues) {
    const key = i.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = i.message;
  }
  const n = Object.keys(fieldErrors).length;
  return { ok: false, fieldErrors, formError: n === 1 ? "Fix the highlighted field." : `Fix the ${n} highlighted fields.` };
}

function failure(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return zodErrors(e);
  console.error("[action] failed:", e instanceof Error ? e.name + ": " + e.message : "unknown error");
  return { ok: false, formError: "Something went wrong. Try again." };
}

const APP_PATHS = ["/dashboard", "/timeline", "/track", "/plan", "/plan/history", "/scenarios", "/settings"];
function refreshAll() {
  for (const p of APP_PATHS) revalidatePath(p);
}

const blank = (v: unknown) => v === undefined || v === null || v === "";

/**
 * Drops rows the editor leaves completely empty (no month and no amount) so they never
 * block a save; partly filled rows stay and get a message next to them (PLN-5).
 */
function tidy(input: PlanInput): PlanInput {
  const p = structuredClone(input);
  p.expenses = (p.expenses ?? []).map((e) => ({ ...e, changes: (e.changes ?? []).filter((c) => !(blank(c.month) && (blank(c.amount) || Number(c.amount) === 0))) }));
  p.income = { ...p.income, events: (p.income.events ?? []).filter((e) => !(blank(e.month) && (blank(e.inHand) || Number(e.inHand) === 0))) };
  p.oneTimes = (p.oneTimes ?? []).filter((o) => !(blank(o.month) && (blank(o.amount) || Number(o.amount) === 0)));
  return p;
}

async function userTimezone(userId: string) {
  return (await q.getSettings(userId)).timezone;
}

// ---- Plan ----

export async function savePlanAction(input: PlanInput, expectedVersion: number): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    const res = await q.savePlan(userId, tidy(input), expectedVersion, "edit");
    if (!res.ok) return CONFLICT;
    refreshAll();
    return { ok: true, version: res.version, message: "Plan saved. Every page now uses it." };
  } catch (e) {
    return failure(e);
  }
}

export async function startBlankPlanAction(): Promise<void> {
  const userId = await requireUserId();
  if (await q.getPlanRecord(userId)) redirect("/plan");
  const m = currentMonth(new Date(), await userTimezone(userId));
  const plan: PlanInput = {
    baseMonth: toMonth(m),
    horizon: toMonth(m + 119),
    income: { inHand: 0, raisePct: 8, raiseMonth: 4, events: [] },
    expenses: [],
    commitments: [],
    oneTimes: [],
    emergency: { target: 300000, mode: "months", months: 6, funds: "Savings account + one liquid fund" },
    goals: [{ id: "wealth", name: "Long-term wealth", kind: "invest", share: 100, onTarget: "hold", funds: [{ name: "Index fund", pct: 100 }] }],
    assume: { inflation: 6, equityRet: 11, debtRet: 7, liquidRet: 6.5, buffer: 5000 },
    start: { ef: 0, goals: {}, commit: {} },
  };
  await q.savePlan(userId, plan, null, "edit");
  refreshAll();
  redirect("/plan");
}

/** SET-2: loads the fictional example plan, only when the user has no plan yet. */
export async function loadExamplePlanAction(): Promise<void> {
  const userId = await requireUserId();
  if (!(await q.getPlanRecord(userId))) {
    await q.savePlan(userId, samplePlan, null, "edit");
    refreshAll();
  }
  redirect("/dashboard");
}

const SalaryChange = z.object({
  month: Month,
  inHand: z.coerce.number({ error: "Enter the new in-hand amount" }).positive("Enter the new in-hand amount"),
  note: z.string().max(200).default(""),
});

export async function recordSalaryChangeAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const record = await q.getPlanRecord(userId);
  if (!record) return { ok: false, formError: "Create your plan first." };
  const parsed = SalaryChange.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const { month, inHand, note } = parsed.data;
  const plan = structuredClone(record.plan) as PlanInput;
  const events = (plan.income.events ?? []).filter((e) => e.month !== month);
  events.push({ id: crypto.randomUUID(), month, inHand, note });
  events.sort((a, b) => a.month.localeCompare(b.month));
  plan.income = { ...plan.income, events };
  try {
    const res = await q.savePlan(userId, plan, record.version, "salary-change");
    if (!res.ok) return CONFLICT;
  } catch (e) {
    return failure(e);
  }
  refreshAll();
  return { ok: true, message: "Salary change recorded. Every amount now recalculates from that month." };
}

const Extend = z.object({ years: z.coerce.number().int().min(1).max(20) });

/** Q-12: extend the plan's end month by N years (saves a revision). */
export async function extendPlanAction(years: number): Promise<ActionResult> {
  const userId = await requireUserId();
  const record = await q.getPlanRecord(userId);
  if (!record) return { ok: false, formError: "Create your plan first." };
  const parsed = Extend.safeParse({ years });
  if (!parsed.success) return zodErrors(parsed.error);
  const base = toIndex(record.plan.baseMonth);
  const horizon = Math.min(toIndex(record.plan.horizon) + parsed.data.years * 12, base + MAX_MONTHS - 1);
  try {
    const res = await q.savePlan(userId, { ...record.plan, horizon: toMonth(horizon) }, record.version, "extend");
    if (!res.ok) return CONFLICT;
  } catch (e) {
    return failure(e);
  }
  refreshAll();
  return { ok: true, message: `Plan now runs to ${toMonth(horizon)}.` };
}

// ---- Revisions (PLN-11, ADR-0007) ----

export async function restoreRevisionAction(revisionId: string, expectedVersion: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(revisionId).success) return { ok: false, formError: "Unknown revision." };
  const rev = await q.getRevision(userId, revisionId);
  if (!rev) return { ok: false, formError: "Unknown revision." };
  try {
    const res = await q.savePlan(userId, rev.plan, expectedVersion, "restore");
    if (!res.ok) return CONFLICT;
    refreshAll();
    return { ok: true, version: res.version, message: `Restored the plan from version ${rev.version}.` };
  } catch (e) {
    return failure(e);
  }
}

/** Sets the tracking baseline to a revision, or to the current plan with "latest". */
export async function setBaselineAction(revisionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const id = revisionId === "latest" ? await q.latestRevisionId(userId) : revisionId;
  if (!id || !z.uuid().safeParse(id).success || !(await q.setBaseline(userId, id))) return { ok: false, formError: "Unknown revision." };
  refreshAll();
  return { ok: true, message: "Tracking now compares against this version of your plan." };
}

// ---- Balance logs ----

export async function saveLogAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const record = await q.getPlanRecord(userId);
  if (!record) return { ok: false, formError: "Create your plan first." };
  const goals: Record<string, number> = {};
  const commit: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("goal:")) goals[k.slice(5)] = Number(v) || 0;
    if (k.startsWith("commit:")) commit[k.slice(7)] = Number(v) || 0;
  }
  const month = String(form.get("month") ?? "");
  if (Month.safeParse(month).success) {
    const cur = currentMonth(new Date(), await userTimezone(userId));
    const i = toIndex(month);
    if (i > cur) return { ok: false, fieldErrors: { month: "You can't log a month that hasn't started" }, formError: "Fix the highlighted field." };
    if (i < toIndex(record.plan.baseMonth)) return { ok: false, fieldErrors: { month: "That month is before your plan starts" }, formError: "Fix the highlighted field." };
  }
  try {
    await q.upsertLog(userId, {
      month,
      salary: form.get("salary") || 0,
      ef: form.get("ef") || 0,
      shortfall: form.get("shortfall") || 0,
      goals,
      commit,
      note: String(form.get("note") ?? ""),
    });
  } catch (e) {
    return failure(e);
  }
  refreshAll();
  return { ok: true, message: "Balances saved. Projections now start from these numbers." };
}

export async function deleteLogAction(month: string): Promise<void> {
  const userId = await requireUserId();
  if (!Month.safeParse(month).success) return;
  await q.deleteLog(userId, month);
  refreshAll();
}

// ---- Scenarios (ADR-0006) ----

/** An empty form field means "keep the plan's value". Checked before coercion, which would turn "" into 0. */
const optNum = (n: z.ZodType<number>) => z.union([z.literal("").transform(() => undefined), n]).optional();

const ScenarioForm = z.object({
  name: z.string().trim().min(1, "Give the scenario a name").max(80),
  month: z.union([Month, z.literal("")]).default(""),
  inHand: optNum(z.coerce.number().min(0)),
  raisePct: optNum(z.coerce.number().min(-100).max(100)),
  housePrice: optNum(z.coerce.number().min(0)),
  houseDate: z.union([Month, z.literal("")]).default(""),
  houseShare: optNum(z.coerce.number().min(0).max(100)),
});

/** Turns the quick what-if form into levers. */
export async function createScenarioAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!(await q.getPlanRecord(userId))) return { ok: false, formError: "Create your plan first." };
  const parsed = ScenarioForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const s = parsed.data;
  const levers: LeverInput[] = [];
  if (s.month && s.inHand) levers.push({ type: "salary", month: s.month, inHand: s.inHand });
  if (s.raisePct !== undefined) levers.push({ type: "raise", pct: s.raisePct });
  if (s.housePrice !== undefined) levers.push({ type: "housePrice", priceToday: s.housePrice });
  if (s.houseDate) levers.push({ type: "houseDate", month: s.houseDate });
  if (s.houseShare !== undefined) levers.push({ type: "houseShare", pct: s.houseShare });
  if (levers.length === 0) return { ok: false, formError: "Change at least one lever." };
  try {
    const id = await q.createScenario(userId, s.name, levers);
    revalidatePath("/scenarios");
    return { ok: true, id, message: "Scenario added." };
  } catch (e) {
    return failure(e);
  }
}

const ScenarioInput = z.object({ id: z.uuid().optional(), name: z.string().trim().min(1, "Give the scenario a name").max(80), levers: Levers.min(1, "Change at least one lever") });

/** Creates or updates a scenario from the sandbox (EXP-2, WIF-4). */
export async function saveScenarioAction(input: { id?: string; name: string; levers: LeverInput[] }): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = ScenarioInput.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);
  const { id, name, levers } = parsed.data;
  try {
    if (id) {
      if (!(await q.updateScenario(userId, id, name, levers))) return { ok: false, formError: "That scenario no longer exists." };
      revalidatePath("/scenarios");
      return { ok: true, id, message: "Scenario updated." };
    }
    const newId = await q.createScenario(userId, name, levers);
    revalidatePath("/scenarios");
    return { ok: true, id: newId, message: "Scenario saved." };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteScenarioAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return;
  await q.deleteScenario(userId, id);
  revalidatePath("/scenarios");
}

/** WIF-5: applies a scenario's levers to the real plan as a new revision. */
export async function applyScenarioAction(id: string, expectedVersion: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return { ok: false, formError: "Unknown scenario." };
  const [record, scenario] = await Promise.all([q.getPlanRecord(userId), q.getScenario(userId, id)]);
  if (!record || !scenario) return { ok: false, formError: "Unknown scenario." };
  const { plan } = applyLevers(record.plan, scenario.levers.map((l) => Lever.parse(l)));
  try {
    const res = await q.savePlan(userId, plan, expectedVersion, "apply-scenario");
    if (!res.ok) return CONFLICT;
    refreshAll();
    return { ok: true, version: res.version, message: `"${scenario.name}" is now your plan. The previous version is in Plan history.` };
  } catch (e) {
    return failure(e);
  }
}

// ---- Settings and account ----

const THEME_COOKIE = "mp-theme";
const Theme = z.enum(["system", "light", "dark"]);

/** EXP-5: remembered per device in a cookie, so the first paint already has the right theme. */
export async function setThemeAction(theme: string): Promise<void> {
  const t = Theme.safeParse(theme);
  if (!t.success) return;
  (await cookies()).set(THEME_COOKIE, t.data, { path: "/", maxAge: 365 * 864e2, sameSite: "lax", httpOnly: false });
}

const SettingsForm = z.object({
  timezone: z.string().refine(isTimeZone, "Pick a valid timezone"),
  theme: Theme.default("system"),
});

export async function saveSettingsAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = SettingsForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrors(parsed.error);
  await q.saveSettings(userId, parsed.data);
  await setThemeAction(parsed.data.theme);
  refreshAll();
  return { ok: true, message: "Settings saved." };
}

export async function deleteAccountAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { ok: false, fieldErrors: { confirm: 'Type "delete" to confirm' }, formError: "Fix the highlighted field." };
  }
  await q.deleteAccount(userId);
  (await cookies()).delete("authjs.session-token");
  (await cookies()).delete("__Secure-authjs.session-token");
  redirect("/?deleted=1");
}

// ---- Sign-in ----

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

/** ADR-0011: dev-only sign-in; refuses in production builds. */
export async function devSignInAction(): Promise<void> {
  if (!devLoginEnabled()) throw new Error("Dev sign-in is disabled.");
  const { token, expires } = await createDevSession(process.env.DEV_LOGIN_EMAIL || "dev@example.com");
  (await cookies()).set("authjs.session-token", token, { path: "/", httpOnly: true, sameSite: "lax", expires, secure: false, maxAge: SESSION_DAYS * 864e2 });
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
