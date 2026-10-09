import { z } from "zod";

/** A calendar month as "YYYY-MM". */
export const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
const OptMonth = z
  .union([Month, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));
const Money = z.coerce.number().min(0);
const Pct = z.coerce.number().min(-100).max(100);

export const IncomeEvent = z.object({
  id: z.string(),
  month: Month,
  inHand: Money,
  note: z.string().max(200).default(""),
});

export const ExpenseChange = z.object({ month: Month, amount: Money });

export const Expense = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  amount: Money,
  start: OptMonth,
  end: OptMonth,
  inflate: z.boolean().default(true),
  changes: z.array(ExpenseChange).default([]),
});

export const Commitment = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  amount: Money,
  start: OptMonth,
  end: OptMonth,
  /** Yearly step-up in %, applied every raise month. */
  stepUp: Pct.default(0),
  /** Monthly cap after step-ups; 0 means no cap. */
  cap: Money.default(0),
  /** Expected yearly return in %, used to estimate its value. */
  rate: Pct.default(0),
  /** Goal id this counts toward ("kids" etc. may be outside the goal list). */
  goal: z.string().default(""),
  note: z.string().max(300).default(""),
});

export const OneTime = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  month: Month,
  amount: Money,
});

export const Fund = z.object({ name: z.string().min(1).max(120), pct: Pct });

export const HouseDetails = z.object({
  priceToday: Money,
  growth: Pct,
  downPct: Pct,
  costsPct: Pct,
  loanRate: Pct,
  loanYears: z.coerce.number().int().min(1).max(40),
});

export const Goal = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  kind: z.enum(["invest", "house"]).default("invest"),
  /** Share of free money once the emergency fund is full. */
  share: Pct.default(0),
  targetDate: OptMonth,
  /** Years before the target date to move this goal into debt. */
  debtYears: z.coerce.number().min(0).max(20).default(0),
  /** Overrides the equity return assumption for this goal. */
  rate: Pct.optional(),
  funds: z.array(Fund).default([]),
  house: HouseDetails.optional(),
});

export const Plan = z.object({
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
  emergency: z.object({ target: Money, funds: z.string().max(300).default("") }),
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

export const MonthlyLog = z.object({
  month: Month,
  salary: Money.default(0),
  ef: Money.default(0),
  goals: z.record(z.string(), Money).default({}),
  commit: z.record(z.string(), Money).default({}),
  note: z.string().max(300).default(""),
});

export type PlanInput = z.input<typeof Plan>;
export type Plan = z.output<typeof Plan>;
export type Goal = z.output<typeof Goal>;
export type Expense = z.output<typeof Expense>;
export type Commitment = z.output<typeof Commitment>;
export type MonthlyLog = z.output<typeof MonthlyLog>;
