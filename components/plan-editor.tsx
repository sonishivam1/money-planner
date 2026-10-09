"use client";

import { useMemo, useState, useTransition } from "react";
import { savePlanAction } from "@/lib/actions";
import type { PlanInput } from "@/lib/engine/schema";
import { MONTHS } from "@/lib/engine/months";
import { Card } from "./ui";

type Path = (string | number)[];

function setIn<T>(obj: T, path: Path, value: unknown): T {
  const copy = structuredClone(obj) as Record<string | number, unknown>;
  let o = copy as Record<string | number, unknown>;
  for (let k = 0; k < path.length - 1; k++) {
    const key = path[k];
    if (o[key] == null) o[key] = typeof path[k + 1] === "number" ? [] : {};
    o = o[key] as Record<string | number, unknown>;
  }
  o[path[path.length - 1]] = value;
  return copy as T;
}

const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function PlanEditor({ initial }: { initial: PlanInput }) {
  const [plan, setPlan] = useState<PlanInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(plan) !== saved, [plan, saved]);

  const set = (path: Path, value: unknown) => {
    setPlan((p) => setIn(p, path, value));
    setMessage(null);
  };
  const get = (path: Path): unknown => path.reduce<unknown>((o, k) => (o == null ? o : (o as Record<string | number, unknown>)[k]), plan);
  const list = <T,>(path: Path) => ((get(path) as T[] | undefined) ?? []);
  const add = (path: Path, item: unknown) => set(path, [...list(path), item]);
  const remove = (path: Path, idx: number) => set(path, list(path).filter((_, k) => k !== idx));

  const num = (label: string, path: Path, step = "any") => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" inputMode="decimal" step={step} value={String(get(path) ?? "")} onChange={(e) => set(path, e.target.value === "" ? "" : Number(e.target.value))} />
    </label>
  );
  const text = (label: string, path: Path, placeholder?: string) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="text" value={String(get(path) ?? "")} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} />
    </label>
  );
  const month = (label: string, path: Path) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="month" value={String(get(path) ?? "")} onChange={(e) => set(path, e.target.value)} />
    </label>
  );
  const check = (label: string, path: Path) => (
    <label className="flex items-center gap-2 pb-2 text-sm text-muted">
      <input type="checkbox" checked={!!get(path)} onChange={(e) => set(path, e.target.checked)} /> {label}
    </label>
  );
  const removeBtn = (path: Path, idx: number, label = "Remove") => (
    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(path, idx)}>{label}</button>
  );

  const save = () =>
    start(async () => {
      const res = await savePlanAction(plan);
      if (res.ok) {
        setSaved(JSON.stringify(plan));
        setMessage({ ok: true, text: "Plan saved. Every page now uses it." });
      } else setMessage({ ok: false, text: res.error });
    });

  const goals = list<NonNullable<PlanInput["goals"]>[number]>(["goals"]);
  const shareTotal = goals.reduce((s, g) => s + Number(g.share ?? 0), 0);
  const goalOptions = [["", "None"], ...goals.map((g) => [g.id, g.name]), ["kids", "Kids' education"]];
  const row = "grid items-end gap-2 rounded-lg border border-line bg-surface-2 p-2.5";
  const section = "grid gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0";

  return (
    <div className="grid gap-4">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-4 py-3">
        <span className="text-sm text-muted">
          {message ? <span className={message.ok ? "text-good" : "text-bad"}>{message.text}</span> : dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" disabled={!dirty || pending} onClick={() => { setPlan(JSON.parse(saved)); setMessage(null); }}>Discard</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save plan"}</button>
        </div>
      </div>

      <Card>
        <div className="grid gap-6">
          <div className={section}>
            <h3 className="font-semibold">Income</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {num("In-hand salary / month (at plan start)", ["income", "inHand"], "1000")}
              {num("Yearly raise %", ["income", "raisePct"], "0.5")}
              <label className="field">
                <span>Raise month</span>
                <select className="input" value={String(get(["income", "raiseMonth"]) ?? 4)} onChange={(e) => set(["income", "raiseMonth"], Number(e.target.value))}>
                  {MONTHS.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
                </select>
              </label>
              {month("Plan starts", ["baseMonth"])}
              {month("Plan ends", ["horizon"])}
            </div>
            <span className="eyebrow">Salary changes (raise, promotion, new job)</span>
            {list(["income", "events"]).length === 0 && <p className="text-sm text-muted">None yet. Your yearly raise is applied automatically.</p>}
            {list(["income", "events"]).map((_, k) => (
              <div key={k} className={`${row} grid-cols-2 sm:grid-cols-[1fr_1fr_2fr_auto]`}>
                {month("From", ["income", "events", k, "month"])}
                {num("New in-hand", ["income", "events", k, "inHand"], "1000")}
                {text("Note", ["income", "events", k, "note"])}
                {removeBtn(["income", "events"], k)}
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => add(["income", "events"], { id: id("ev"), month: "", inHand: 0, note: "" })}>Add salary change</button></div>
          </div>

          <div className={section}>
            <h3 className="font-semibold">Monthly expenses and EMIs</h3>
            <p className="text-sm text-muted">Leave "Ends" empty for ongoing costs. "Changes to" sets a new amount from a month, like reducing parents' support.</p>
            {list(["expenses"]).map((_, k) => (
              <div key={k} className={`${row} grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto]`}>
                {text("Name", ["expenses", k, "name"])}
                {num("₹ / month", ["expenses", k, "amount"], "100")}
                {month("Ends (last month)", ["expenses", k, "end"])}
                {num("Changes to ₹", ["expenses", k, "changes", 0, "amount"], "100")}
                {month("From", ["expenses", k, "changes", 0, "month"])}
                {check("Grows with inflation", ["expenses", k, "inflate"])}
                {removeBtn(["expenses"], k)}
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => add(["expenses"], { id: id("ex"), name: "New expense", amount: 0, inflate: true, changes: [] })}>Add expense</button></div>
          </div>

          <div className={section}>
            <h3 className="font-semibold">Fixed investments</h3>
            <p className="text-sm text-muted">Policies and PPF you pay every month regardless. Step-up applies each raise month, up to the cap.</p>
            {list<{ id: string }>(["commitments"]).map((c, k) => (
              <div key={c.id} className={`${row} grid-cols-2 lg:grid-cols-[2fr_repeat(5,1fr)_auto]`}>
                {text("Name", ["commitments", k, "name"])}
                {num("₹ / month", ["commitments", k, "amount"], "100")}
                {month("Ends", ["commitments", k, "end"])}
                {num("Step-up %/yr", ["commitments", k, "stepUp"])}
                {num("Cap ₹/month", ["commitments", k, "cap"], "500")}
                {num("Return %/yr", ["commitments", k, "rate"])}
                {removeBtn(["commitments"], k)}
                <div className="col-span-full grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="field">
                    <span>Counts toward</span>
                    <select className="input" value={String(get(["commitments", k, "goal"]) ?? "")} onChange={(e) => set(["commitments", k, "goal"], e.target.value)}>
                      {goalOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  {text("Note", ["commitments", k, "note"])}
                  {num("Value at plan start", ["start", "commit", c.id], "100")}
                </div>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => add(["commitments"], { id: id("cm"), name: "New fixed investment", amount: 0, stepUp: 0, cap: 0, rate: 7, goal: "", note: "" })}>Add fixed investment</button></div>
          </div>

          <div className={section}>
            <h3 className="font-semibold">One-time payments</h3>
            <p className="text-sm text-muted">Paid from the emergency fund in that month, such as a loan foreclosure.</p>
            {list(["oneTimes"]).map((_, k) => (
              <div key={k} className={`${row} grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_auto]`}>
                {text("Name", ["oneTimes", k, "name"])}
                {month("Month", ["oneTimes", k, "month"])}
                {num("Amount ₹", ["oneTimes", k, "amount"], "1000")}
                {removeBtn(["oneTimes"], k)}
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => add(["oneTimes"], { id: id("ot"), name: "One-time payment", month: "", amount: 0 })}>Add one-time payment</button></div>
          </div>

          <div className={section}>
            <h3 className="font-semibold">Goals</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {num("Emergency fund target ₹", ["emergency", "target"], "10000")}
              {num("Emergency fund value at plan start", ["start", "ef"], "1000")}
              {text("Where it is kept", ["emergency", "funds"])}
            </div>
            <p className="text-sm text-muted">
              Once the emergency fund is full, free money splits across these goals by share (now {Math.round(shareTotal)}% in total). A goal stops receiving money after its target date.
            </p>
            {goals.map((g, k) => (
              <div key={g.id} className="grid gap-3 rounded-[10px] border border-line p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {text("Goal name", ["goals", k, "name"])}
                  {num("Share of free money %", ["goals", k, "share"])}
                  {month("Target date", ["goals", k, "targetDate"])}
                  {num("Move to debt (years before)", ["goals", k, "debtYears"])}
                  {num("Value at plan start", ["start", "goals", g.id], "1000")}
                </div>
                {g.kind === "house" && (
                  <>
                    <span className="eyebrow">House details</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {num("Price today ₹", ["goals", k, "house", "priceToday"], "100000")}
                      {num("Price growth %/yr", ["goals", k, "house", "growth"])}
                      {num("Down payment %", ["goals", k, "house", "downPct"])}
                      {num("Stamp duty + interiors %", ["goals", k, "house", "costsPct"])}
                      {num("Loan rate %", ["goals", k, "house", "loanRate"])}
                      {num("Loan years", ["goals", k, "house", "loanYears"], "1")}
                    </div>
                  </>
                )}
                <span className="eyebrow">Funds for this goal (% of its SIP)</span>
                {list(["goals", k, "funds"]).map((_, j) => (
                  <div key={j} className={`${row} grid-cols-[3fr_1fr_auto] bg-surface`}>
                    {text("Fund", ["goals", k, "funds", j, "name"])}
                    {num("%", ["goals", k, "funds", j, "pct"])}
                    {removeBtn(["goals", k, "funds"], j)}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => add(["goals", k, "funds"], { name: "New fund", pct: 0 })}>Add fund</button>
                  {removeBtn(["goals"], k, "Remove goal")}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm" onClick={() => add(["goals"], { id: id("g"), name: "New goal", kind: "invest", share: 10, debtYears: 0, funds: [{ name: "Nifty 50 index fund", pct: 100 }] })}>Add goal</button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  add(["goals"], {
                    id: id("g"), name: "House", kind: "house", share: 50, targetDate: "", debtYears: 3,
                    funds: [{ name: "Nifty 50 index fund", pct: 100 }],
                    house: { priceToday: 9000000, growth: 6.5, downPct: 20, costsPct: 12, loanRate: 8.5, loanYears: 25 },
                  })
                }
              >
                Add house goal
              </button>
            </div>
          </div>

          <div className={section}>
            <h3 className="font-semibold">Assumptions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {num("Inflation %/yr", ["assume", "inflation"])}
              {num("Equity return %/yr", ["assume", "equityRet"])}
              {num("Debt / FD return %/yr", ["assume", "debtRet"])}
              {num("Liquid fund return %/yr", ["assume", "liquidRet"])}
              {num("Spending buffer ₹/month", ["assume", "buffer"], "500")}
            </div>
            <p className="text-sm text-muted">These are projections, not guarantees. Review them every April.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
