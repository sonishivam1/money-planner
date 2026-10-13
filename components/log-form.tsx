"use client";

import { useActionState } from "react";
import { saveLogAction, type ActionResult } from "@/lib/actions";

type Field = { name: string; label: string; value: number };

export function LogForm({ month, salary, ef, fields, note, isUpdate }: { month: string; salary: number; ef: number; fields: Field[]; note: string; isUpdate: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveLogAction, null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="field"><span>Month</span><input className="input" type="month" name="month" defaultValue={month} required /></label>
        <label className="field"><span>Salary credited</span><input className="input" type="number" name="salary" inputMode="numeric" defaultValue={Math.round(salary)} /></label>
        <label className="field"><span>Emergency fund (savings + liquid fund)</span><input className="input" type="number" name="ef" inputMode="numeric" defaultValue={Math.round(ef)} /></label>
        {fields.map((f) => (
          <label key={f.name} className="field"><span>{f.label}</span><input className="input" type="number" name={f.name} inputMode="numeric" defaultValue={Math.round(f.value)} /></label>
        ))}
        <label className="field sm:col-span-2"><span>Note</span><input className="input" type="text" name="note" defaultValue={note} placeholder="e.g. Paid a hospital bill from the liquid fund" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : isUpdate ? "Save changes" : "Save entry"}</button>
        {state?.ok && <span className="text-sm text-good">Saved. Projections now start from these balances.</span>}
        {state && !state.ok && <span className="text-sm text-bad">{state.formError}</span>}
        {!state && <span className="text-sm text-muted">Pre-filled with what the plan expected.</span>}
      </div>
    </form>
  );
}
