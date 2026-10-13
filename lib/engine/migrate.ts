import { Plan, SCHEMA_VERSION } from "./schema";

type Doc = Record<string, unknown>;
const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * v1 → v2 (plan model, "Migrations"): adds schemaVersion, turns goal ids that fixed
 * investments point at but that aren't goals (such as "kids") into real goals with
 * share 0, sets the emergency fund mode, and makes each goal's onTarget explicit.
 */
function v1to2(doc: Doc): Doc {
  const d = structuredClone(doc);
  const goals = Array.isArray(d.goals) ? (d.goals as Doc[]) : [];
  const ids = new Set(goals.map((g) => g.id));
  const commitments = Array.isArray(d.commitments) ? (d.commitments as Doc[]) : [];
  for (const c of commitments) {
    const gid = typeof c.goal === "string" ? c.goal : "";
    if (gid && !ids.has(gid)) {
      goals.push({ id: gid, name: gid, kind: "invest", share: 0, debtYears: 0, funds: [], onTarget: "hold" });
      ids.add(gid);
    }
  }
  for (const g of goals) if (g.onTarget === undefined) g.onTarget = g.kind === "house" ? "withdraw" : "hold";
  d.goals = goals;
  if (isObj(d.emergency) && d.emergency.mode === undefined) d.emergency.mode = "amount";
  d.schemaVersion = 2;
  return d;
}

const steps: Record<number, (d: Doc) => Doc> = { 1: v1to2 };

/** Upgrades a stored plan document of any version to the current one. Pure; never throws on old shapes. */
export function migratePlan(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  let doc = raw;
  let v = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  if (v > SCHEMA_VERSION) throw new Error(`Plan version ${v} is newer than this app understands (${SCHEMA_VERSION}).`);
  while (v < SCHEMA_VERSION) {
    doc = steps[v](doc);
    v = doc.schemaVersion as number;
  }
  return doc;
}

/** Migrates then validates a stored plan document. */
export function parsePlan(raw: unknown): Plan {
  return Plan.parse(migratePlan(raw));
}
