import { auth } from "@/auth";
import { exportAll } from "@/lib/db/queries";

/** ACC-4: downloads everything the signed-in user owns as one JSON file. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Not signed in", { status: 401 });
  const data = await exportAll(session.user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="money-planner-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
