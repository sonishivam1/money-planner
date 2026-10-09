/** Months are handled as integer indexes: year * 12 + (month - 1). */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function toIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

export function toMonth(index: number): string {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(index: number): string {
  return `${MONTHS[index % 12]} ${Math.floor(index / 12)}`;
}

export function currentIndex(now = new Date()): number {
  return now.getFullYear() * 12 + now.getMonth();
}

/** Number of raise months in the half-open range (from, to]. */
export function raisesBetween(from: number, to: number, raiseMonth: number): number {
  if (to <= from) return 0;
  const rm = raiseMonth - 1;
  let count = 0;
  for (let i = from + 1; i <= to; i++) if (i % 12 === rm) count++;
  return count;
}
