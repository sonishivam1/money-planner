import { redirect } from "next/navigation";
import { auth, googleConfigured } from "@/auth";
import { devSignInAction, signInWithGoogle } from "@/lib/actions";
import { devLoginEnabled } from "@/lib/db/dev-auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const { error } = await searchParams;
  const google = googleConfigured();
  const dev = devLoginEnabled();
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-6 px-4">
      <div className="grid gap-2">
        <span className="eyebrow">Personal finance</span>
        <h1 className="text-3xl font-bold">Money Planner</h1>
        <p className="text-muted">
          See where each rupee goes this month, track every goal, and let the plan recalculate when your salary changes.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
          {error === "AccessDenied" ? "This account isn't allowed to sign in. Ask the owner for access." : "Sign-in didn't work. Try again."}
        </p>
      )}
      <div className="grid gap-2">
        {google && (
          <form action={signInWithGoogle}>
            <button className="btn btn-primary w-full" type="submit">Continue with Google</button>
          </form>
        )}
        {dev && (
          <form action={devSignInAction}>
            <button className={`btn w-full ${google ? "" : "btn-primary"}`} type="submit">Continue as dev user</button>
          </form>
        )}
        {!google && !dev && <p className="text-sm text-bad">Sign-in isn&apos;t configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.</p>}
      </div>
      <p className="text-xs text-muted">Your data stays in your own database. Only accounts you allow can sign in.</p>
    </main>
  );
}
