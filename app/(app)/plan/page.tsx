import { requireUserId } from "@/lib/session";
import { getPlanRecord } from "@/lib/db/queries";
import { PlanEditor } from "@/components/plan-editor";
import { NoPlan } from "@/components/no-plan";
import type { PlanInput } from "@/lib/engine/schema";

export default async function PlanPage() {
  const userId = await requireUserId();
  const record = await getPlanRecord(userId);
  if (!record) return <NoPlan />;
  return <PlanEditor initial={record.plan as PlanInput} version={record.version} />;
}
