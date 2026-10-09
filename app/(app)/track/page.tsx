import { requireUserId } from "@/lib/session";
import { loadPlan } from "@/lib/load";
import { balancesAt, inr, inrShort, monthLabel, salaryAt, toIndex, toMonth } from "@/lib/engine";
import { Card } from "@/components/ui";
import { LogForm } from "@/components/log-form";
import { ConfirmButton } from "@/components/confirm-button";
import { NoPlan } from "@/components/no-plan";
import { deleteLogAction } from "@/lib/actions";

export default async function TrackPage() {
  const userId = await requireUserId();
  const loaded = await loadPlan(userId);
  if (!loaded) return <NoPlan />;
  const { plan, logs, f } = loaded;
  const month = toMonth(f.currentIndex);
  const existing = logs.find((l) => l.month === month);
  const expected = balancesAt(plan, f.live, f.currentIndex) ?? balancesAt(plan, f.baseline, f.currentIndex) ?? { ef: 0, goals: {}, commit: {} };
  const fields = [
    ...plan.goals.map((g) => ({ name: `goal:${g.id}`, label: `${g.name} funds value`, value: existing?.goals[g.id] ?? expected.goals[g.id] ?? 0 })),
    ...plan.commitments.map((c) => ({ name: `commit:${c.id}`, label: `${c.name} value`, value: existing?.commit[c.id] ?? expected.commit[c.id] ?? 0 })),
  ];

  const diff = (actual: number, planned: number | undefined) => {
    if (planned === undefined) return null;
    const d = actual - planned;
    return <div className={`text-xs ${d >= 0 ? "text-good" : "text-bad"}`}>{d >= 0 ? "+" : ""}{inrShort(d)} vs plan</div>;
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card title="Log this month's balances">
          <p className="mb-3 text-sm text-muted">Once a month, before that month's SIPs go out, enter what each bucket is actually worth. The plan then projects from your real numbers.</p>
          <LogForm
            month={month}
            salary={existing?.salary ?? salaryAt(plan, f.currentIndex)}
            ef={existing?.ef ?? expected.ef}
            fields={fields}
            note={existing?.note ?? ""}
            isUpdate={!!existing}
          />
        </Card>
        <Card title="How tracking works">
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-muted">
            <li>Log once a month, on salary day, before the SIPs debit.</li>
            <li>The latest entry becomes the starting point for every projection.</li>
            <li>Green means ahead of the original plan, red means behind.</li>
            <li>Behind two months in a row? Compare real spending with the expenses under Edit plan.</li>
          </ol>
        </Card>
      </div>
      <Card title="History">
        {logs.length === 0 ? (
          <p className="text-sm text-muted">No entries yet. Your first entry appears here after you save it.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Month", "Salary", "Emergency", ...plan.goals.map((g) => g.name.split(":")[0]), "Note", ""].map((h, k) => (
                    <th key={k} className="eyebrow border-b border-line px-2.5 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const planned = balancesAt(plan, f.baseline, toIndex(l.month));
                  return (
                    <tr key={l.month} className="align-top">
                      <td className="border-b border-line px-2.5 py-2">{monthLabel(toIndex(l.month))}</td>
                      <td className="border-b border-line px-2.5 py-2">{l.salary ? inr(l.salary) : "—"}</td>
                      <td className="border-b border-line px-2.5 py-2">{inrShort(l.ef)}{diff(l.ef, planned?.ef)}</td>
                      {plan.goals.map((g) => (
                        <td key={g.id} className="border-b border-line px-2.5 py-2">{inrShort(l.goals[g.id] ?? 0)}{diff(l.goals[g.id] ?? 0, planned?.goals[g.id])}</td>
                      ))}
                      <td className="border-b border-line px-2.5 py-2 font-sans">{l.note}</td>
                      <td className="border-b border-line px-2.5 py-2 text-right">
                        <ConfirmButton label="Delete" onConfirm={deleteLogAction.bind(null, l.month)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
