import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Promise<DB> };

/**
 * Lazily connects on first use, so builds and tests never need a database.
 * `pglite:<dir>` (or `pglite:memory`) runs embedded Postgres in-process for local
 * development and tests, applying migrations on first use (ADR-0011). Any other
 * URL uses postgres.js, as production does with Neon.
 */
export function getDb(): Promise<DB> {
  if (!globalForDb.__db) {
    globalForDb.__db = connect().catch((e) => {
      globalForDb.__db = undefined;
      throw e;
    });
  }
  return globalForDb.__db;
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  if (url.startsWith("pglite:")) {
    const target = url.slice("pglite:".length);
    return openPglite(target === "memory" ? undefined : target);
  }
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  return drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as DB;
}

/** Opens PGlite at `dataDir` (in memory when undefined) and applies the SQL migrations in /drizzle. */
export async function openPglite(dataDir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const path = await import("node:path");
  if (dataDir) (await import("node:fs")).mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as DB;
}

export { schema };
