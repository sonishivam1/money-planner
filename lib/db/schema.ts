import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { LeverInput, MonthlyLog, PlanInput } from "@/lib/engine/schema";

// ---- Auth.js tables (shape required by @auth/drizzle-adapter) ----

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---- App tables (docs/04-architecture/data-model.md) ----

/** One plan per user. The plan is edited as a whole, so it lives in one validated JSONB document (ADR-0002). */
export const plans = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<PlanInput>().notNull(),
  /** Bumped on every save; optimistic concurrency (PLN-10). */
  version: integer("version").notNull().default(1),
  /** The revision Track compares against (ADR-0007). */
  baselineRevisionId: uuid("baselineRevisionId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/** Append-only history of every saved plan (PLN-11). */
export const planRevisions = pgTable(
  "plan_revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("planId").notNull().references(() => plans.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").$type<PlanInput>().notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("plan_revision_plan_version").on(t.planId, t.version), index("plan_revision_user_created").on(t.userId, t.createdAt)],
);

/** Actual balances at the start of a month, before that month's SIPs. */
export const monthlyLogs = pgTable(
  "monthly_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    data: jsonb("data").$type<MonthlyLog>().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("monthly_log_user_month").on(t.userId, t.month)],
);

/** A what-if: a name and levers applied to the current plan (ADR-0006). */
export const scenarios = pgTable("scenario", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  levers: jsonb("levers").$type<LeverInput[]>().notNull().default([]),
  /** v1 snapshot; converted to levers on first read, then cleared. */
  data: jsonb("data").$type<PlanInput>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  theme: text("theme").$type<"system" | "light" | "dark">().notNull().default("system"),
  salaryDay: integer("salaryDay"),
  emailReminders: boolean("emailReminders").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
