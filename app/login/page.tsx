import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle } from "@/lib/actions";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-6 px-4">
      <div className="grid gap-2">
        <span className="eyebrow">Personal finance</span>
        <h1 className="text-3xl font-bold">Money Planner</h1>
        <p className="text-muted">
          See where each rupee goes this month, track every goal, and let the plan recalculate when your salary changes.
        </p>
      </div>
      <form action={signInWithGoogle}>
        <button className="btn btn-primary w-full" type="submit">Continue with Google</button>
      </form>
      <p className="text-xs text-muted">Your data stays in your own database. Only accounts you allow can sign in.</p>
    </main>
  );
}
