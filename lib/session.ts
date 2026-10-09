import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The signed-in user's id, or a redirect to the login page. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
