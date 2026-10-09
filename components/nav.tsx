"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "This month" },
  { href: "/timeline", label: "Year by year" },
  { href: "/track", label: "Track" },
  { href: "/scenarios", label: "What if" },
  { href: "/plan", label: "Edit plan" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1">
      {links.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
