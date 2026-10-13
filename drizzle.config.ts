import { defineConfig } from "drizzle-kit";

// Load .env.local (or .env) when running drizzle-kit outside Next.js.
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch {}
}

const url = process.env.DATABASE_URL ?? "";

export default url.startsWith("pglite:")
  ? defineConfig({ schema: "./lib/db/schema.ts", out: "./drizzle", dialect: "postgresql", driver: "pglite", dbCredentials: { url: url.slice("pglite:".length) } })
  : defineConfig({ schema: "./lib/db/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url } });
