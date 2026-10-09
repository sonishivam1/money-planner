"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import * as q from "@/lib/db/queries";
import { Month, Plan, type PlanInput } from "@/lib/engine/schema";
import { currentIndex, toMonth } from "@/lib/engine/months";
import { signIn, signOut } from "@/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

function firstIssue(e: unknown): string {
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    return `${i.path.join(".") || "plan"}: ${i.message}`;
  }
  return "Something went wrong. Try again.";
}

function refreshAll() {
  for (const p of ["/dashboard", "/timeline", "/track", "/plan", "/scenarios"]) revalidatePath(p);
}

/** Drops half-filled rows the editor can leave behind (a change with no month, a salary change with no amount). */
function tidy(input: PlanInput): PlanInput {
  const p = structuredClone(input);
  p.expenses = (p.expenses ?? []).map((e) => ({ ...e, changes: (e.changes ?? []).filter((c) => c.month && c.amount !== undefined && String(c.amount) !== "") }));
  p.income.events = (p.income.events ?? []).filter((e) => e.month && Number(e.inHand) > 0);
  return p;
}

export async function savePlanAction(input: PlanInput): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    await q.upsertPlan(userId, tidy(input));
  } catch (e) {
    return { ok: false, error: firstIssue(e) };
  }
  refreshAll();
  return { ok: true };
}

export async function startBlankPlanAction(): Promise<void> {
  const userId = await requireUserId();
  const m = currentIndex();
  const blank: PlanInput = {
    baseMonth: toMonth(m),
    horizon: toMonth(m + 119),
    income: { inHand: 0, raisePct: 8, raiseMonth: 4, events: [] },
    expenses: [],
    commitments: [],
    oneTimes: [],
    emergency: { target: 300000, funds: "Savings account + one liquid fund" },
    goals: [{ id: "wealth", name: "Long-term wealth", kind: "invest", share: 100, funds: [{ name: "Nifty 50 index fund", pct: 100 }] }],
    assume: { inflation: 6, equityRet: 11, debtRet: 7, liquidRet: 6.5, buffer: 5000 },
    start: { ef: 0, goals: {}, commit: {} },
  };
  await q.upsertPlan(userId, blank);
  refreshAll();
  redirect("/plan");
}

const SalaryChange = z.object({ month: Month, inHand: z.coerce.number().positive(), note: z.string().max(200).default("") });

export async function recordSalaryChangeAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const plan = await q.getPlanInput(userId);
  if (!plan) return { ok: false, error: "Create your plan first." };
  const parsed = SalaryChange.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Enter a month and a positive amount." };
  const { month, inHand, note } = parsed.data;
  const events = (plan.income.events ?? []).filter((e) => e.month !== month);
  events.push({ id: crypto.randomUUID(), month, inHand, note });
  events.sort((a, b) => a.month.localeCompare(b.month));
  await q.upsertPlan(userId, { ...plan, income: { ...plan.income, events } });
  refreshAll();
  return { ok: true };
}

export async function saveLogAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const goals: Record<string, number> = {};
  const commit: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("goal:")) goals[k.slice(5)] = Number(v) || 0;
    if (k.startsWith("commit:")) commit[k.slice(7)] = Number(v) || 0;
  }
  try {
    await q.upsertLog(userId, {
      month: form.get("month"),
      salary: form.get("salary"),
      ef: form.get("ef"),
      goals,
      commit,
      note: String(form.get("note") ?? ""),
    });
  } catch (e) {
    return { ok: false, error: firstIssue(e) };
  }
  refreshAll();
  return { ok: true };
}

export async function deleteLogAction(month: string): Promise<void> {
  const userId = await requireUserId();
  if (!Month.safeParse(month).success) return;
  await q.deleteLog(userId, month);
  refreshAll();
}

const ScenarioForm = z.object({
  name: z.string().min(1).max(80),
  month: z.union([Month, z.literal("")]).default(""),
  inHand: z.coerce.number().min(0).default(0),
  raisePct: z.union([z.coerce.number(), z.literal("")]).default(""),
  housePrice: z.union([z.coerce.number(), z.literal("")]).default(""),
  houseDate: z.union([Month, z.literal("")]).default(""),
  houseShare: z.union([z.coerce.number().min(0).max(100), z.literal("")]).default(""),
});

export async function createScenarioAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const base = await q.getPlanInput(userId);
  if (!base) return { ok: false, error: "Create your plan first." };
  const parsed = ScenarioForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const s = parsed.data;
  const plan: PlanInput = structuredClone(base);
  if (s.month && s.inHand > 0) {
    plan.income.events = [...(plan.income.events ?? []).filter((e) => e.month !== s.month), { id: crypto.randomUUID(), month: s.month, inHand: s.inHand, note: s.name }];
  }
  if (s.raisePct !== "") plan.income.raisePct = s.raisePct;
  const goals = plan.goals ?? [];
  const house = goals.find((g) => g.kind === "house");
  if (house) {
    if (s.housePrice !== "" && house.house) house.house.priceToday = s.housePrice;
    if (s.houseDate) house.targetDate = s.houseDate;
    if (s.houseShare !== "") {
      const others = goals.filter((g) => g !== house);
      const otherTotal = others.reduce((t, g) => t + Number(g.share ?? 0), 0);
      house.share = s.houseShare;
      for (const g of others) g.share = otherTotal > 0 ? (Number(g.share ?? 0) / otherTotal) * (100 - s.houseShare) : (100 - s.houseShare) / others.length;
    }
  }
  try {
    Plan.parse(plan);
    await q.createScenario(userId, s.name, plan);
  } catch (e) {
    return { ok: false, error: firstIssue(e) };
  }
  revalidatePath("/scenarios");
  return { ok: true };
}

export async function deleteScenarioAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return;
  await q.deleteScenario(userId, id);
  revalidatePath("/scenarios");
}

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
