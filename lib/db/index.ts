import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

/** Lazily connects, so builds and tests never need a database. */
export function getDb(): DB {
  if (globalForDb.__db) return globalForDb.__db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const client = postgres(url, { max: 5, prepare: false });
  const db = drizzle(client, { schema });
  globalForDb.__db = db;
  return db;
}

export { schema };
