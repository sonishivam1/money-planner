"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartSeries = { key: string; name: string; color: string; dashed?: boolean; strong?: boolean };
export type ChartPoint = { label: string } & Record<string, number | string>;

const lakh = (v: number) => `₹${Math.round(v / 1e5)}L`;
const short = (v: number) => (v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${Math.round(v / 1e3)}k`);

export function GrowthChart({ data, series, target }: { data: ChartPoint[]; series: ChartSeries[]; target?: { value: number; label: string } }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
          <YAxis tickFormatter={lakh} width={56} tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => short(Number(v))}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", fontSize: 12 }}
            labelStyle={{ color: "var(--muted)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
          {target && (
            <ReferenceLine
              y={target.value}
              stroke="var(--chart-2)"
              strokeDasharray="2 4"
              label={{ value: target.label, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.strong ? 3 : 2}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              dot={{ r: s.strong ? 3 : 2, fill: s.color }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
