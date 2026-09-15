/** Counts consecutive days up to and including today with at least one reading. */
export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const daySet = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
