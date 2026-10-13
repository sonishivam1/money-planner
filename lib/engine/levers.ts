import type { Lever, Plan } from "./schema";
import { toIndex } from "./months";

export type SkippedLever = { lever: Lever; reason: string };

/** Applies a scenario's levers to the current plan (ADR-0006). Pure; levers that no longer apply are skipped. */
export function applyLevers(plan: Plan, levers: Lever[]): { plan: Plan; skipped: SkippedLever[] } {
  const p: Plan = structuredClone(plan);
  const skipped: SkippedLever[] = [];
  const house = () => p.goals.find((g) => g.kind === "house");

  levers.forEach((lever, k) => {
    switch (lever.type) {
      case "salary":
        p.income.events = [...p.income.events.filter((e) => e.month !== lever.month), { id: `lever-${k}`, month: lever.month, inHand: lever.inHand, note: "What if" }].sort(
          (a, b) => toIndex(a.month) - toIndex(b.month),
        );
        break;
      case "raise":
        p.income.raisePct = lever.pct;
        break;
      case "housePrice": {
        const h = house();
        if (h?.house) h.house.priceToday = lever.priceToday;
        else skipped.push({ lever, reason: "The plan has no house goal" });
        break;
      }
      case "houseDate": {
        const h = house();
        if (h) h.targetDate = lever.month;
        else skipped.push({ lever, reason: "The plan has no house goal" });
        break;
      }
      case "houseShare": {
        const h = house();
        if (!h) {
          skipped.push({ lever, reason: "The plan has no house goal" });
          break;
        }
        const others = p.goals.filter((g) => g !== h && g.share > 0);
        const otherTotal = others.reduce((t, g) => t + g.share, 0);
        h.share = lever.pct;
        for (const g of others) g.share = otherTotal > 0 ? (g.share / otherTotal) * (100 - lever.pct) : 0;
        break;
      }
      case "expense": {
        const e = p.expenses.find((x) => x.id === lever.expenseId);
        if (!e) {
          skipped.push({ lever, reason: "That expense is no longer in the plan" });
          break;
        }
        e.changes = [...e.changes.filter((c) => c.month !== lever.month), { month: lever.month, amount: lever.amount }].sort((a, b) => toIndex(a.month) - toIndex(b.month));
        break;
      }
      case "oneTime":
        p.oneTimes = [...p.oneTimes, { id: `lever-${k}`, name: lever.name, month: lever.month, amount: lever.amount }];
        break;
    }
  });
  return { plan: p, skipped };
}

/**
 * Recovers levers from a v1 scenario snapshot by comparing it with the current plan
 * on the fields v1 scenarios could change (data model, "Migrating v1 scenarios").
 */
export function leversFromSnapshot(plan: Plan, snapshot: Plan): Lever[] {
  const levers: Lever[] = [];
  for (const e of snapshot.income.events) {
    if (!plan.income.events.some((x) => x.month === e.month && x.inHand === e.inHand)) levers.push({ type: "salary", month: e.month, inHand: e.inHand });
  }
  if (snapshot.income.raisePct !== plan.income.raisePct) levers.push({ type: "raise", pct: snapshot.income.raisePct });
  const a = plan.goals.find((g) => g.kind === "house");
  const b = snapshot.goals.find((g) => g.kind === "house");
  if (a && b) {
    if (b.house && a.house && b.house.priceToday !== a.house.priceToday) levers.push({ type: "housePrice", priceToday: b.house.priceToday });
    if (b.targetDate && b.targetDate !== a.targetDate) levers.push({ type: "houseDate", month: b.targetDate });
    if (Math.abs(b.share - a.share) > 0.01) levers.push({ type: "houseShare", pct: b.share });
  }
  return levers;
}

/** A short human description of a lever, for scenario cards. */
export function describeLever(lever: Lever, plan: Plan, fmt: { inr: (n: number) => string; month: (m: string) => string }): string {
  switch (lever.type) {
    case "salary":
      return `In-hand ${fmt.inr(lever.inHand)} from ${fmt.month(lever.month)}`;
    case "raise":
      return `Yearly raise ${lever.pct}%`;
    case "housePrice":
      return `House price today ${fmt.inr(lever.priceToday)}`;
    case "houseDate":
      return `Buy the house in ${fmt.month(lever.month)}`;
    case "houseShare":
      return `House gets ${lever.pct}% of free money`;
    case "expense": {
      const e = plan.expenses.find((x) => x.id === lever.expenseId);
      return `${e?.name ?? "An expense"} becomes ${fmt.inr(lever.amount)} from ${fmt.month(lever.month)}`;
    }
    case "oneTime":
      return `${lever.name}: ${fmt.inr(lever.amount)} in ${fmt.month(lever.month)}`;
  }
}
