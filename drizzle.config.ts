import { defineConfig } from "drizzle-kit";

// Load .env.local (or .env) when running drizzle-kit outside Next.js.
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch {}
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
