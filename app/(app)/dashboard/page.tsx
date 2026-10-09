import { requireUserId } from "@/lib/session";
import { loadPlan } from "@/lib/load";
import { houseOutlook, inr, inrShort, monthLabel, pct, toMonth, upcomingEvents, MONTHS } from "@/lib/engine";
import { Bar, Card, KV, Pill } from "@/components/ui";
import { GrowthChart, type ChartPoint, type ChartSeries } from "@/components/growth-chart";
import { SalaryChangeForm } from "@/components/salary-change-form";
import { NoPlan } from "@/components/no-plan";

const goalColors = ["var(--accent)", "var(--chart-2)", "var(--chart-3)", "var(--warn)", "var(--good)"];

export default async function DashboardPage() {
  const userId = await requireUserId();
  const loaded = await loadPlan(userId);
  if (!loaded) return <NoPlan />;
  const { plan, f } = loaded;
  const r = f.current;
  const last = f.live[f.live.length - 1];
  const target = plan.emergency.target;

  const status =
    r.deficit > 0 ? <Pill tone="bad">Short by {inr(r.deficit)}</Pill> : r.toEmergency > 0 ? <Pill tone="warn">Building emergency fund</Pill> : <Pill tone="good">Investing for goals</Pill>;

  // Where the money goes
  type Line = { label: string; amount: number; color?: string; sub?: boolean };
  const lines: Line[] = [
    { label: "Expenses and EMIs", amount: r.expenses, color: "var(--ink)" },
    { label: "Fixed investments", amount: r.commitments, color: "var(--muted)" },
    ...plan.commitments.flatMap((c, k) => (r.commitmentItems[k] > 0 ? [{ label: c.name, amount: r.commitmentItems[k], sub: true }] : [])),
  ];
  if (r.toEmergency > 0) {
    lines.push({ label: "Emergency fund", amount: r.toEmergency, color: "var(--warn)" });
    if (plan.emergency.funds) lines.push({ label: plan.emergency.funds, amount: NaN, sub: true });
  }
  plan.goals.forEach((g, gi) => {
    const a = r.alloc[g.id] ?? 0;
    if (a <= 0) return;
    lines.push({ label: g.name, amount: a, color: goalColors[gi % goalColors.length] });
    for (const fund of g.funds) lines.push({ label: fund.name, amount: Math.round((a * fund.pct) / 100 / 100) * 100, sub: true });
  });
  lines.push({ label: "Spending buffer", amount: r.buffer + r.unallocated, color: "var(--line)" });

  // Chart: end of each year
  const pts = f.live.filter((row, idx) => row.i % 12 === 11 || idx === f.live.length - 1);
  const series: ChartSeries[] = [{ key: "ef", name: "Emergency fund", color: "var(--warn)", dashed: true }];
  plan.goals.forEach((g, gi) => {
    const linked = plan.commitments.filter((c) => c.goal === g.id);
    series.push({
      key: g.id,
      name: linked.length ? `${g.name} (incl. ${linked.map((c) => c.name.split(" (")[0]).join(", ")})` : g.name,
      color: goalColors[gi % goalColors.length],
      strong: gi === 0,
    });
  });
  const data: ChartPoint[] = pts.map((row) => {
    const p: ChartPoint = { label: row.i % 12 === 11 ? String(Math.floor(row.i / 12)) : monthLabel(row.i), ef: Math.round(row.ef) };
    for (const g of plan.goals) {
      const linked = plan.commitments.filter((c) => c.goal === g.id);
      p[g.id] = Math.round((row.goals[g.id] ?? 0) + linked.reduce((s, c) => s + (row.commit[c.id] ?? 0), 0));
    }
    return p;
  });
  const houseGoal = plan.goals.find((g) => g.kind === "house");
  const house = houseGoal ? houseOutlook(plan, houseGoal, f.live) : null;

  const efFull = f.live.find((row) => row.ef >= target - 1);
  const events = upcomingEvents(plan, f);
  const orphanGoals = [...new Set(plan.commitments.map((c) => c.goal).filter((g) => g && !plan.goals.some((x) => x.id === g)))];

  return (
    <div className="grid gap-4">
      <div className="grid overflow-hidden rounded-[10px] border border-line bg-surface sm:grid-cols-4">
        {[
          [`${monthLabel(f.currentIndex)} · in hand`, inr(r.income)],
          ["Committed", inr(r.expenses + r.commitments)],
          ["Free to allocate", inr(Math.max(r.free, 0))],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-line px-4 py-3 sm:border-b-0 sm:border-r">
            <span className="eyebrow">{k}</span>
            <span className="num text-xl font-medium">{v}</span>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-3">
          <span className="eyebrow">Status</span>
          <span>{status}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card title="Where this month's money goes" aside={monthLabel(f.currentIndex)}>
          {r.deficit > 0 && (
            <p className="mb-3 rounded-lg bg-bad-soft px-3 py-2 text-sm">
              Commitments exceed income by {inr(r.deficit)} this month. Cut spending or pause new SIPs; keep insurance premiums paid.
            </p>
          )}
          {r.oneTime > 0 && (
            <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm">
              {r.oneTimeNames.join(", ")}: {inr(r.oneTime)} this month, paid from the emergency fund.
            </p>
          )}
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className={l.sub ? "text-sm text-muted" : "border-t border-dashed border-line"}>
                  <td className={l.sub ? "py-0.5 pl-5" : "py-2"}>
                    {l.sub ? l.label : (
                      <span className="flex items-center gap-2 font-medium">
                        <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: l.color }} />
                        {l.label}
                      </span>
                    )}
                  </td>
                  <td className="num whitespace-nowrap pl-3 text-right">{Number.isFinite(l.amount) ? inr(l.amount) : ""}</td>
                </tr>
              ))}
              <tr className="border-t border-ink font-semibold">
                <td className="py-2">In hand</td>
                <td className="num pl-3 text-right">{inr(r.income)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted">Set each SIP on auto-debit 2–3 days after salary day. Direct plan, Growth option.</p>
        </Card>

        <div className="grid content-start gap-4">
          <Card title="Coming up">
            <ul className="grid">
              {events.map((e, idx) => (
                <li key={idx} className="grid grid-cols-[84px_1fr] gap-3 border-b border-dashed border-line py-2 last:border-b-0">
                  <span className="num pt-0.5 text-xs text-muted">{monthLabel(e.i)}</span>
                  <span className="text-sm">{e.text}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Salary changed?">
            <p className="mb-3 text-sm text-muted">Record a raise or a new job. Every goal and SIP amount recalculates from that month.</p>
            <SalaryChangeForm defaultMonth={toMonth(f.currentIndex)} defaultAmount={r.income} />
          </Card>
        </div>
      </div>

      <h2 className="mt-4 text-xl font-semibold">Goals</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="grid gap-2.5">
            <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">Emergency fund</h3>{r.ef >= target - 1 ? <Pill tone="good">Done</Pill> : <Pill tone="warn">Building</Pill>}</div>
            <div className="flex items-baseline justify-between"><span className="num text-2xl">{inrShort(r.ef)}</span><span className="text-sm text-muted">of {inrShort(target)}</span></div>
            <Bar value={target ? (r.ef / target) * 100 : 0} />
            <KV rows={[["Full by", efFull ? monthLabel(efFull.i) : "Not within plan"], ["Adding now", `${inr(r.toEmergency)}/mo`]]} />
          </div>
        </Card>

        {plan.goals.map((g) => {
          const linked = plan.commitments.filter((c) => c.goal === g.id);
          const now = r.goals[g.id] ?? 0;
          if (g.kind === "house" && house && g === houseGoal) {
            const label = house.verdict === "short" ? `Short ${inrShort(house.shortfall)}` : house.verdict === "comfortable" ? "On track" : house.verdict === "stretched" ? "EMI stretched" : "EMI too high";
            const tone = house.verdict === "comfortable" ? "good" : house.verdict === "stretched" ? "warn" : "bad";
            return (
              <Card key={g.id}>
                <div className="grid gap-2.5">
                  <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{g.name}</h3><Pill tone={tone}>{label}</Pill></div>
                  <div className="flex items-baseline justify-between"><span className="num text-2xl">{inrShort(house.fund)}</span><span className="text-sm text-muted">by {monthLabel(house.buyIndex)}</span></div>
                  <Bar value={house.upfrontNeeded ? (now / house.upfrontNeeded) * 100 : 0} />
                  <KV
                    rows={[
                      ["Today", inrShort(now)],
                      ["Price then", inrShort(house.price)],
                      ["Upfront needed", inrShort(house.upfrontNeeded)],
                      ["Home loan", inrShort(house.loan)],
                      ["EMI", inr(house.emi)],
                      ["EMI share of pay", pct(house.emiShare)],
                    ]}
                  />
                </div>
              </Card>
            );
          }
          return (
            <Card key={g.id}>
              <div className="grid gap-2.5">
                <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{g.name}</h3><Pill tone="info">{pct(g.share)} of surplus</Pill></div>
                <div className="flex items-baseline justify-between">
                  <span className="num text-2xl">{inrShort((last.goals[g.id] ?? 0) + linked.reduce((s, c) => s + (last.commit[c.id] ?? 0), 0))}</span>
                  <span className="text-sm text-muted">by {monthLabel(last.i)}</span>
                </div>
                <KV
                  rows={[
                    ["SIP funds today", inrShort(now)],
                    ...linked.map((c) => [c.name, `${inrShort(r.commit[c.id] ?? 0)} → ${inrShort(last.commit[c.id] ?? 0)}`] as [string, string]),
                    [`SIP funds by ${MONTHS[last.i % 12]} ${Math.floor(last.i / 12)}`, inrShort(last.goals[g.id] ?? 0)],
                  ]}
                />
              </div>
            </Card>
          );
        })}

        {orphanGoals.map((gid) => (
          <Card key={gid}>
            <div className="grid gap-2.5">
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{gid === "kids" ? "Kids' education" : gid}</h3><Pill tone="good">Guaranteed</Pill></div>
              {plan.commitments.filter((c) => c.goal === gid).map((c) => (
                <div key={c.id} className="grid gap-1">
                  <div className="flex items-baseline justify-between"><span className="num text-2xl">{inrShort(r.commit[c.id] ?? 0)}</span><span className="text-sm text-muted">estimated value now</span></div>
                  <p className="text-sm text-muted">{c.name}{c.note ? `: ${c.note}` : ""}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="How your money grows" aside="₹ lakh, end of each year" className="mt-2">
        <GrowthChart data={data} series={series} target={house ? { value: Math.round(house.upfrontNeeded), label: `Upfront cash for the house: ${inrShort(house.upfrontNeeded)}` } : undefined} />
      </Card>
    </div>
  );
}
