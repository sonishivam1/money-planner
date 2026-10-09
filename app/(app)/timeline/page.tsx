import { requireUserId } from "@/lib/session";
import { loadPlan } from "@/lib/load";
import { inr, inrShort, monthLabel, MONTHS } from "@/lib/engine";
import { Card } from "@/components/ui";
import { NoPlan } from "@/components/no-plan";

export default async function TimelinePage() {
  const userId = await requireUserId();
  const loaded = await loadPlan(userId);
  if (!loaded) return <NoPlan />;
  const { plan, f } = loaded;
  const rows = f.live.filter((r, idx) => r.i % 12 === 11 || idx === 0 || idx === f.live.length - 1);
  const short = (n: string) => n.split(":")[0];
  return (
    <Card title="Year by year" aside="Monthly amounts in December of each year; fund values at that point">
      <div className="overflow-x-auto">
        <table className="num w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left">
              {["Month", "In hand", "Expenses", "Policies + PPF", "Free", "To emergency", ...plan.goals.map((g) => `To ${short(g.name)}`), "Emergency fund", ...plan.goals.map((g) => `${short(g.name)} fund`)].map((h) => (
                <th key={h} className="eyebrow border-b border-line px-2.5 py-2 text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.i} className={r.i === f.currentIndex ? "bg-accent-soft" : ""}>
                <td className="border-b border-line px-2.5 py-2">{monthLabel(r.i)}</td>
                {[r.income, r.expenses, r.commitments, r.free, r.toEmergency, ...plan.goals.map((g) => r.alloc[g.id] ?? 0)].map((v, k) => (
                  <td key={k} className="border-b border-line px-2.5 py-2 text-right">{inr(v)}</td>
                ))}
                {[r.ef, ...plan.goals.map((g) => r.goals[g.id] ?? 0)].map((v, k) => (
                  <td key={`b${k}`} className="border-b border-line px-2.5 py-2 text-right">{inrShort(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        Assumes {plan.income.raisePct}% yearly raises each {MONTHS[plan.income.raiseMonth - 1]}, {plan.assume.inflation}% inflation, {plan.assume.equityRet}% equity and {plan.assume.debtRet}% debt returns.
      </p>
    </Card>
  );
}
