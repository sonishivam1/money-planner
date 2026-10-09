import { integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { MonthlyLog, PlanInput } from "@/lib/engine/schema";

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

// ---- App tables ----

/** One plan per user. The plan is edited as a whole, so it lives in one validated JSONB document. */
export const plans = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<PlanInput>().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

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

/** A what-if copy of the plan ("switch jobs in June 2027 at ₹1.6L"). */
export const scenarios = pgTable("scenario", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  data: jsonb("data").$type<PlanInput>().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
