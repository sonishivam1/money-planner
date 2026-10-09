"use client";

import { useActionState } from "react";
import { createScenarioAction, type ActionResult } from "@/lib/actions";

export function ScenarioForm({ hasHouse }: { hasHouse: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createScenarioAction, null);
  return (
    <form action={action} className="grid gap-3">
      <label className="field"><span>Name</span><input className="input" name="name" required placeholder="Switch to a product company" /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="field"><span>New salary from</span><input className="input" type="month" name="month" /></label>
        <label className="field"><span>New in-hand / month</span><input className="input" type="number" name="inHand" inputMode="numeric" step="1000" placeholder="150000" /></label>
        <label className="field"><span>Yearly raise %</span><input className="input" type="number" name="raisePct" step="0.5" placeholder="Same as plan" /></label>
      </div>
      {hasHouse && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="field"><span>House price today ₹</span><input className="input" type="number" name="housePrice" step="100000" placeholder="12500000" /></label>
          <label className="field"><span>Buy in</span><input className="input" type="month" name="houseDate" /></label>
          <label className="field"><span>House share of free money %</span><input className="input" type="number" name="houseShare" min="0" max="100" placeholder="65" /></label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Working…" : "Create scenario"}</button>
        {state && !state.ok && <span className="text-sm text-bad">{state.error}</span>}
        {state?.ok && <span className="text-sm text-good">Scenario added below.</span>}
        <span className="text-sm text-muted">Leave a field empty to keep your plan's value.</span>
      </div>
    </form>
  );
}
