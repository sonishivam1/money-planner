/**
 * Splits a goal's monthly amount across its funds for display (engine spec §9):
 * each fund is rounded to the nearest `step`, and the rounding difference goes to
 * the largest fund so the funds add up to the goal's amount rounded to `step`.
 */
export function splitFunds(amount: number, funds: { name: string; pct: number }[], step = 100): { name: string; amount: number }[] {
  if (funds.length === 0) return [];
  const round = (n: number) => Math.round(n / step) * step;
  const totalPct = funds.reduce((s, f) => s + f.pct, 0) || 1;
  const parts = funds.map((f) => ({ name: f.name, amount: round((amount * f.pct) / totalPct) }));
  const diff = round(amount) - parts.reduce((s, p) => s + p.amount, 0);
  if (diff !== 0) {
    let largest = 0;
    funds.forEach((f, k) => {
      if (f.pct > funds[largest].pct) largest = k;
    });
    parts[largest].amount += diff;
  }
  return parts;
}
