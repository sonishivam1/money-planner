import type { ReactNode } from "react";

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-accent-soft text-accent",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Bar({ value }: { value: number }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full border border-line bg-surface-2">
      <span className="block h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${w}%` }} />
    </div>
  );
}

export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
      {rows.map(([k, v], idx) => (
        <div key={idx} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="num text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
