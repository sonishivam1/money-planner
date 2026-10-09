import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { signOutAction } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-4">
        <div>
          <div className="eyebrow">Personal plan · amounts in ₹ per month</div>
          <h1 className="text-[1.9rem] font-bold leading-tight">Money Planner</h1>
        </div>
        <form action={signOutAction} className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{session.user.email}</span>
          <button className="btn btn-sm" type="submit">Sign out</button>
        </form>
      </header>
      <div className="my-4">
        <Nav />
      </div>
      <main>{children}</main>
    </div>
  );
}
