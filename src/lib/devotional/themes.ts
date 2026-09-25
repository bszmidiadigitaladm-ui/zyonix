// A rotating theme per day keeps the daily devotional varied. Without one, the model was
// asked only to "write today's devotional" and kept landing on the same handful of ideas
// (the same title two days running). Order is arbitrary; the day of the year picks the entry.
export const DEVOTIONAL_THEMES = [
  "hope in hard seasons",
  "gratitude",
  "forgiveness",
  "perseverance",
  "joy",
  "humility",
  "prayer",
  "courage",
  "peace that guards the heart",
  "wisdom",
  "love for others",
  "patience",
  "generosity",
  "trusting God's plan",
  "rest and Sabbath",
  "God's grace",
  "purpose and calling",
  "unity in the church",
  "serving quietly",
  "repentance and a fresh start",
  "faithfulness in small things",
  "God's presence in loneliness",
  "overcoming fear",
  "self-control",
  "praising God in trouble",
  "the Good Shepherd",
  "light in the darkness",
  "kindness",
  "walking by faith, not by sight",
  "finishing well",
] as const;

/** Day of the year (1-366) of a YYYY-MM-DD date, computed in UTC so it never depends on the server's timezone. */
function dayOfYear(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000);
}

export function devotionalThemeFor(isoDate: string): string {
  return DEVOTIONAL_THEMES[dayOfYear(isoDate) % DEVOTIONAL_THEMES.length];
}
