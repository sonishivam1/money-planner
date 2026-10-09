import { startBlankPlanAction } from "@/lib/actions";
import { Card } from "./ui";

export function NoPlan() {
  return (
    <Card className="grid justify-items-center gap-3 py-14 text-center">
      <h2 className="text-xl font-semibold">No plan saved yet</h2>
      <p className="max-w-[46ch] text-muted">
        Start a blank plan and fill in your salary, expenses and goals. To load the sample plan instead, run{" "}
        <code className="num">npm run db:seed -- your@email</code>.
      </p>
      <form action={startBlankPlanAction}>
        <button className="btn btn-primary" type="submit">Start a blank plan</button>
      </form>
    </Card>
  );
}
