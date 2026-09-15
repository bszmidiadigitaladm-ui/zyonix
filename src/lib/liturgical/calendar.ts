// Computes upcoming occasions to proactively suggest content for. Deliberately
// a pure function rather than a database table — the only occasion with a
// moving date (Easter) needs a real algorithm anyway, and the other two are
// simple fixed/nth-weekday rules. Occasion codes match seasonal_templates.occasion
// (0008_seasonal_templates.sql) so a suggestion can deep-link straight into
// the art generator or template library.

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for the date of Easter Sunday. */
function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** US convention: the second Sunday of May. */
function computeMothersDay(year: number): Date {
  const may1 = new Date(Date.UTC(year, 4, 1));
  const daysToFirstSunday = (7 - may1.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 4, 1 + daysToFirstSunday + 7));
}

function computeChristmas(year: number): Date {
  return new Date(Date.UTC(year, 11, 25));
}

export interface UpcomingOccasion {
  occasion: "easter" | "christmas" | "mothers_day";
  date: Date;
  daysUntil: number;
}

/** Returns the nearest occasion within `windowDays` of `today`, or null. */
export function getUpcomingOccasion(today: Date = new Date(), windowDays = 21): UpcomingOccasion | null {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const years = [todayUtc.getUTCFullYear(), todayUtc.getUTCFullYear() + 1];

  const candidates: UpcomingOccasion[] = years.flatMap((year) => [
    { occasion: "easter" as const, date: computeEasterSunday(year) },
    { occasion: "christmas" as const, date: computeChristmas(year) },
    { occasion: "mothers_day" as const, date: computeMothersDay(year) },
  ]).map(({ occasion, date }) => ({
    occasion,
    date,
    daysUntil: Math.round((date.getTime() - todayUtc.getTime()) / 86_400_000),
  }));

  const inWindow = candidates
    .filter((c) => c.daysUntil >= 0 && c.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return inWindow[0] ?? null;
}
