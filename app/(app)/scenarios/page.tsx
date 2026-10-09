import { requireUserId } from "@/lib/session";
import { loadPlan } from "@/lib/load";
import { listScenarios } from "@/lib/db/queries";
import { inr, inrShort, monthLabel, pct, summarize, type PlanSummary } from "@/lib/engine";
import { Card } from "@/components/ui";
import { ScenarioForm } from "@/components/scenario-form";
import { ConfirmButton } from "@/components/confirm-button";
import { NoPlan } from "@/components/no-plan";
import { deleteScenarioAction } from "@/lib/actions";

export default async function ScenariosPage() {
  const userId = await requireUserId();
  const loaded = await loadPlan(userId);
  if (!loaded) return <NoPlan />;
  const { plan, logs } = loaded;
  const scenarios = await listScenarios(userId);
  const cols: { id: string | null; name: string; s: PlanSummary }[] = [
    { id: null, name: "Your plan", s: summarize(plan, logs) },
    ...scenarios.map((sc) => ({ id: sc.id, name: sc.name, s: summarize(sc.plan, logs) })),
  ];
  const hasHouse = plan.goals.some((g) => g.kind === "house");
  const rows: [string, (s: PlanSummary) => string][] = [
    ["Emergency fund full", (s) => (s.emergencyFullIndex !== null ? monthLabel(s.emergencyFullIndex) : "Not within plan")],
    ...(hasHouse
      ? ([
          ["House fund at purchase", (s) => (s.house ? inrShort(s.house.fund) : "—")],
          ["House price then", (s) => (s.house ? inrShort(s.house.price) : "—")],
          ["Home loan EMI", (s) => (s.house ? inr(s.house.emi) : "—")],
          ["EMI share of pay", (s) => (s.house ? pct(s.house.emiShare) : "—")],
        ] as [string, (s: PlanSummary) => string][])
      : []),
    ...plan.goals.filter((g) => g.kind !== "house").map((g) => [`${g.name} at plan end`, (s: PlanSummary) => inrShort(s.goalsAtHorizon[g.id] ?? 0)] as [string, (s: PlanSummary) => string]),
    ["In-hand at plan end", (s) => inr(s.incomeAtHorizon)],
  ];

  return (
    <div className="grid gap-4">
      <Card title="Try a what-if">
        <p className="mb-3 text-sm text-muted">A scenario copies your current plan and changes a few levers, so you can compare without touching the real plan.</p>
        <ScenarioForm hasHouse={hasHouse} />
      </Card>
      <Card title="Side by side">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="eyebrow border-b border-line px-2.5 py-2 text-left">&nbsp;</th>
                {cols.map((c) => (
                  <th key={c.id ?? "plan"} className="border-b border-line px-2.5 py-2 text-right align-bottom">
                    <div className="font-semibold">{c.name}</div>
                    {c.id && <ConfirmButton label="Remove" onConfirm={deleteScenarioAction.bind(null, c.id)} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}>
                  <td className="border-b border-line px-2.5 py-2 text-muted">{label}</td>
                  {cols.map((c) => (
                    <td key={c.id ?? "plan"} className="num border-b border-line px-2.5 py-2 text-right">{fn(c.s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {scenarios.length === 0 && <p className="mt-3 text-sm text-muted">No scenarios yet. Create one above, for example a job switch in June 2027 at ₹1,50,000 in hand.</p>}
      </Card>
    </div>
  );
}
