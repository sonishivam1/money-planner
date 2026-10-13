import { loadExamplePlanAction, startBlankPlanAction } from "@/lib/actions";
import { Card } from "./ui";

export function NoPlan() {
  return (
    <Card className="grid justify-items-center gap-3 py-14 text-center">
      <h2 className="text-xl font-semibold">No plan saved yet</h2>
      <p className="max-w-[46ch] text-muted">
        Start a blank plan and fill in your salary, expenses and goals, or explore with a made-up example first. You can replace it later.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <form action={startBlankPlanAction}>
          <button className="btn btn-primary" type="submit">Start a blank plan</button>
        </form>
        <form action={loadExamplePlanAction}>
          <button className="btn" type="submit">Load the example plan</button>
        </form>
      </div>
    </Card>
  );
}
