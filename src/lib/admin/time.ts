// Kept as plain functions (not inline in pages): eslint's react-hooks purity rule
// flags a direct `Date.now()` call inside a component body, even in a Server
// Component that only ever runs once per request.

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO timestamp for `days` days before now. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** Whether an ISO timestamp is still in the future. */
export function isFutureDate(value: string | null | undefined): boolean {
  return Boolean(value) && new Date(value as string).getTime() > Date.now();
}
