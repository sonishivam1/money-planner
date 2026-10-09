/** ₹1,25,000 (Indian digit grouping). */
export function inr(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

/** ₹71.4L, ₹1.79 Cr, ₹32k. */
export function inrShort(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  const trim = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (a >= 1e7) return `${sign}₹${trim((a / 1e7).toFixed(2))} Cr`;
  if (a >= 1e5) return `${sign}₹${trim((a / 1e5).toFixed(1))}L`;
  if (a >= 1e3) return `${sign}₹${trim((a / 1e3).toFixed(1))}k`;
  return `${sign}₹${Math.round(a)}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
