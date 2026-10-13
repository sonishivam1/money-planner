/** Months are handled as integer indexes: year * 12 + (month - 1). */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

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

/**
 * The calendar month index of `now` in `timeZone` (ENG-8, ADR-0009). The only
 * function that decides "this month"; the server clock is UTC on Vercel.
 */
export function currentMonth(now: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE, year: "numeric", month: "2-digit" }).formatToParts(now);
  }
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  return y * 12 + (m - 1);
}

/** True when `timeZone` is a valid IANA name. */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Number of raise months in the half-open range (from, to]. */
export function raisesBetween(from: number, to: number, raiseMonth: number): number {
  if (to <= from) return 0;
  const rm = raiseMonth - 1;
  // Raise months k with from < k <= to and k % 12 === rm.
  const first = from + 1 + ((rm - ((from + 1) % 12) + 12) % 12);
  return first > to ? 0 : Math.floor((to - first) / 12) + 1;
}
