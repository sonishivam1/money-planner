"use client";

import { useActionState } from "react";
import { recordSalaryChangeAction, type ActionResult } from "@/lib/actions";

export function SalaryChangeForm({ defaultMonth, defaultAmount }: { defaultMonth: string; defaultAmount: number }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(recordSalaryChangeAction, null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="field"><span>From month</span><input className="input" type="month" name="month" defaultValue={defaultMonth} required /></label>
        <label className="field"><span>New in-hand / month</span><input className="input" type="number" name="inHand" inputMode="numeric" step="1000" defaultValue={Math.round(defaultAmount)} required /></label>
        <label className="field"><span>Note</span><input className="input" type="text" name="note" placeholder="e.g. New job" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Record salary change"}</button>
        {state?.ok && <span className="text-sm text-good">Saved. Every goal has been recalculated.</span>}
        {state && !state.ok && <span className="text-sm text-bad">{state.formError}</span>}
      </div>
    </form>
  );
}
