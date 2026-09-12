import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kept as a plain (non-component) function deliberately: eslint's react-hooks
 * purity rule flags a direct `Date.now()` call inside a component/page body,
 * even a Server Component that only ever runs once per request.
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString).getTime() < Date.now();
}

/**
 * Parses a bare "YYYY-MM-DD" string (e.g. a Postgres `date` column, like
 * devotionals.publish_date) as local-time midnight instead of UTC midnight.
 * `new Date("YYYY-MM-DD")` parses as UTC, which then renders as the previous
 * day in any timezone behind UTC (e.g. Brazil, GMT-3) — this avoids that.
 */
export function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
