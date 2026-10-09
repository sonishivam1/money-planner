/**
 * Loads the sample plan for an existing user.
 * Sign in to the app once first, then run:  npm run db:seed -- you@gmail.com
 */
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch {}
}

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run db:seed -- you@gmail.com");
  const { eq } = await import("drizzle-orm");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const schema = await import("../lib/db/schema");
  const { Plan } = await import("../lib/engine/schema");
  const { samplePlan } = await import("../lib/engine/sample-plan");

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) throw new Error(`No user with email ${email}. Sign in to the app once, then rerun.`);
  const data = Plan.parse(samplePlan);
  await db.insert(schema.plans).values({ userId: user.id, data })
    .onConflictDoUpdate({ target: schema.plans.userId, set: { data, updatedAt: new Date() } });
  console.log(`Loaded the sample plan for ${email}.`);
  await client.end();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
