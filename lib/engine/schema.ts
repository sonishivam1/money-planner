import { z } from "zod";

/** The plan document version this code reads and writes. See migrate.ts. */
export const SCHEMA_VERSION = 2;

/** A calendar month as "YYYY-MM". */
export const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2027-04");
const OptMonth = z
  .union([Month, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));
const Money = z.coerce.number({ error: "Enter an amount" }).min(0, "Can't be negative");
const Pct = z.coerce.number({ error: "Enter a percentage" }).min(-100, "At least −100").max(100, "At most 100");
const Name = z.string().trim().min(1, "Give it a name").max(120);

export const IncomeEvent = z.object({
  id: z.string(),
  month: Month,
  inHand: Money,
  note: z.string().max(200).default(""),
});

export const ExpenseChange = z.object({ month: Month, amount: Money });

export const Expense = z.object({
  id: z.string(),
  name: Name,
  amount: Money,
  start: OptMonth,
  end: OptMonth,
  inflate: z.boolean().default(true),
  changes: z.array(ExpenseChange).default([]),
});

export const Commitment = z.object({
  id: z.string(),
  name: Name,
  amount: Money,
  start: OptMonth,
  end: OptMonth,
  /** Yearly step-up in %, applied every raise month from its own start. */
  stepUp: Pct.default(0),
  /** Monthly cap after step-ups; 0 means no cap. */
  cap: Money.default(0),
  /** Expected yearly return in %, used to estimate its value. */
  rate: Pct.default(0),
  /** Id of the goal this counts toward, or "". */
  goal: z.string().default(""),
  /** Must never be stopped (policy premiums); named in shortfall warnings. */
  protected: z.boolean().default(false),
  note: z.string().max(300).default(""),
});

export const OneTime = z.object({
  id: z.string(),
  name: Name,
  month: Month,
  amount: Money,
});

export const Fund = z.object({ name: Name, pct: Pct });

export const HouseDetails = z.object({
  priceToday: Money,
  growth: Pct,
  downPct: Pct,
  costsPct: Pct,
  loanRate: Pct,
  loanYears: z.coerce.number().int("Whole years").min(1, "At least 1 year").max(40, "At most 40 years"),
  /** An expense (such as rent) that ends when the house is bought. */
  replacesExpenseId: z.string().optional(),
});

export const Goal = z.object({
  id: z.string(),
  name: Name,
  kind: z.enum(["invest", "house"]).default("invest"),
  /** Share of free money once the emergency fund is full; 0 = funded only by fixed investments. */
  share: z.coerce.number().min(0, "Can't be negative").max(100, "At most 100").default(0),
  targetDate: OptMonth,
  /** Years before the target date to move this goal into debt. */
  debtYears: z.coerce.number().min(0).max(20, "At most 20 years").default(0),
  /** Overrides the equity return assumption for this goal. */
  rate: z.union([z.literal(""), Pct]).optional().transform((v) => (v === "" || v === undefined ? undefined : v)),
  funds: z.array(Fund).default([]),
  /** At the target date: keep the money invested, or spend it. Defaults by kind (see onTargetOf). */
  onTarget: z.enum(["hold", "withdraw"]).optional(),
  house: HouseDetails.optional(),
});

export const Emergency = z.object({
  /** Target when mode is "amount". */
  target: Money,
  mode: z.enum(["amount", "months"]).default("amount"),
  /** Months of expenses when mode is "months". */
  months: z.coerce.number().min(1, "At least 1 month").max(24, "At most 24 months").default(6),
  funds: z.string().max(300).default(""),
});

const PlanShape = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  baseMonth: Month,
  horizon: Month,
  income: z.object({
    inHand: Money,
    raisePct: Pct,
    raiseMonth: z.coerce.number().int().min(1).max(12),
    events: z.array(IncomeEvent).default([]),
  }),
  expenses: z.array(Expense).default([]),
  commitments: z.array(Commitment).default([]),
  oneTimes: z.array(OneTime).default([]),
  emergency: Emergency,
  goals: z.array(Goal).default([]),
  assume: z.object({
    inflation: Pct,
    equityRet: Pct,
    debtRet: Pct,
    liquidRet: Pct,
    buffer: Money,
  }),
  start: z
    .object({
      ef: Money.default(0),
      goals: z.record(z.string(), Money).default({}),
      commit: z.record(z.string(), Money).default({}),
    })
    .default({ ef: 0, goals: {}, commit: {} }),
});

const monthIndex = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return y * 12 + (mo - 1);
};

/** Maximum projection length: 40 years. */
export const MAX_MONTHS = 480;

/** Plan-level rules that span fields (plan model, "Validation"). */
export const Plan = PlanShape.superRefine((p, ctx) => {
  const span = monthIndex(p.horizon) - monthIndex(p.baseMonth);
  if (span < 0) ctx.addIssue({ code: "custom", path: ["horizon"], message: "Plan end must be on or after the start" });
  if (span >= MAX_MONTHS) ctx.addIssue({ code: "custom", path: ["horizon"], message: "Plans can run at most 40 years" });

  const lists = [["expenses", p.expenses], ["commitments", p.commitments], ["oneTimes", p.oneTimes], ["goals", p.goals], ["income", p.income.events]] as const;
  for (const [key, list] of lists) {
    const seen = new Set<string>();
    list.forEach((item, k) => {
      if (seen.has(item.id)) ctx.addIssue({ code: "custom", path: key === "income" ? ["income", "events", k, "id"] : [key, k, "id"], message: "Duplicate id" });
      seen.add(item.id);
    });
  }

  const goalIds = new Set(p.goals.map((g) => g.id));
  p.commitments.forEach((c, k) => {
    if (c.goal && !goalIds.has(c.goal)) ctx.addIssue({ code: "custom", path: ["commitments", k, "goal"], message: "Pick one of your goals" });
  });

  for (const key of ["expenses", "commitments"] as const) {
    p[key].forEach((item, k) => {
      if (item.start && item.end && monthIndex(item.start) > monthIndex(item.end)) {
        ctx.addIssue({ code: "custom", path: [key, k, "end"], message: "Ends before it starts" });
      }
    });
  }

  p.goals.forEach((g, k) => {
    if (g.kind !== "house") return;
    if (!g.house) ctx.addIssue({ code: "custom", path: ["goals", k, "house"], message: "House goals need house details" });
    if (!g.targetDate) ctx.addIssue({ code: "custom", path: ["goals", k, "targetDate"], message: "House goals need a buying date" });
    const rep = g.house?.replacesExpenseId;
    if (rep && !p.expenses.some((e) => e.id === rep)) ctx.addIssue({ code: "custom", path: ["goals", k, "house", "replacesExpenseId"], message: "Pick one of your expenses" });
  });
});

export const MonthlyLog = z.object({
  month: Month,
  salary: Money.default(0),
  ef: Money.default(0),
  goals: z.record(z.string(), Money).default({}),
  commit: z.record(z.string(), Money).default({}),
  /** Carried shortfall still owed at the start of the month. */
  shortfall: Money.default(0),
  note: z.string().max(300).default(""),
});

/** One change a what-if scenario makes to the plan (ADR-0006). */
export const Lever = z.discriminatedUnion("type", [
  z.object({ type: z.literal("salary"), month: Month, inHand: z.coerce.number().positive("Enter the new in-hand amount") }),
  z.object({ type: z.literal("raise"), pct: Pct }),
  z.object({ type: z.literal("housePrice"), priceToday: Money }),
  z.object({ type: z.literal("houseDate"), month: Month }),
  z.object({ type: z.literal("houseShare"), pct: z.coerce.number().min(0).max(100) }),
  z.object({ type: z.literal("expense"), expenseId: z.string(), month: Month, amount: Money }),
  z.object({ type: z.literal("oneTime"), name: Name, month: Month, amount: Money }),
]);
export const Levers = z.array(Lever).max(20);

export type PlanInput = z.input<typeof Plan>;
export type Plan = z.output<typeof Plan>;
export type Goal = z.output<typeof Goal>;
export type Expense = z.output<typeof Expense>;
export type Commitment = z.output<typeof Commitment>;
export type MonthlyLog = z.output<typeof MonthlyLog>;
export type Lever = z.output<typeof Lever>;
export type LeverInput = z.input<typeof Lever>;

/** What a goal does at its target date when the plan doesn't say: houses are bought, other goals are held. */
export function onTargetOf(goal: Goal): "hold" | "withdraw" {
  return goal.onTarget ?? (goal.kind === "house" ? "withdraw" : "hold");
}

export type PlanWarning = { path: (string | number)[]; message: string };

/** Problems worth showing that don't block saving (plan model, "Validation"). */
export function planWarnings(p: Plan): PlanWarning[] {
  const w: PlanWarning[] = [];
  const shares = p.goals.reduce((s, g) => s + g.share, 0);
  if (p.goals.some((g) => g.share > 0) && Math.abs(shares - 100) > 0.01) {
    w.push({ path: ["goals"], message: `Goal shares add up to ${Math.round(shares * 10) / 10}%, not 100%. They'll be scaled to fill free money.` });
  }
  p.goals.forEach((g, k) => {
    if (g.funds.length === 0) return;
    const total = g.funds.reduce((s, f) => s + f.pct, 0);
    if (Math.abs(total - 100) > 0.01) w.push({ path: ["goals", k, "funds"], message: `${g.name}: fund split adds up to ${Math.round(total * 10) / 10}%, not 100%.` });
  });
  const base = monthIndex(p.baseMonth);
  const end = monthIndex(p.horizon);
  p.goals.forEach((g, k) => {
    if (g.targetDate && monthIndex(g.targetDate) < base) w.push({ path: ["goals", k, "targetDate"], message: `${g.name}: target date is before the plan starts, so it never receives money.` });
  });
  p.income.events.forEach((e, k) => {
    const i = monthIndex(e.month);
    if (i < base || i > end) w.push({ path: ["income", "events", k, "month"], message: "This salary change is outside the plan's months." });
  });
  return w;
}
