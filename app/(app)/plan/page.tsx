import { requireUserId } from "@/lib/session";
import { getPlanInput } from "@/lib/db/queries";
import { PlanEditor } from "@/components/plan-editor";
import { NoPlan } from "@/components/no-plan";

export default async function PlanPage() {
  const userId = await requireUserId();
  const plan = await getPlanInput(userId);
  if (!plan) return <NoPlan />;
  return <PlanEditor initial={plan} />;
}
