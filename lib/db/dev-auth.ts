import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { sessions, users } from "./schema";

/** Dev sign-in (ADR-0011) is only ever available outside production builds, and only when switched on. */
export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";
}

export const SESSION_DAYS = 30;

/** Creates (or reuses) the dev user and a normal database session; returns the session token and expiry. */
export async function createDevSession(email: string): Promise<{ token: string; expires: Date }> {
  if (!devLoginEnabled()) throw new Error("Dev sign-in is disabled.");
  const db = await getDb();
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) [user] = await db.insert(users).values({ email, name: "Dev user" }).returning();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ sessionToken: token, userId: user.id, expires });
  return { token, expires };
}
