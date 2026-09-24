// Poster templates: ready-made church posters that the AI re-renders with the
// person's own details. The images live in public/template-assets (a small
// thumbnail for browsing and a padded 2:3 copy that is sent to the image model).

export const TEMPLATE_CATEGORIES = ["services", "events", "ministries", "seasonal", "digital"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// The details a template can take. Each maps to a placeholder printed on the poster.
export const TEMPLATE_FIELDS = [
  "church",
  "date",
  "time",
  "location",
  "website",
  "speaker",
  "theme",
  "ages",
  "quote",
  "reference",
] as const;
export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

export interface PosterTemplate {
  slug: string;
  name: string;
  category: TemplateCategory;
  fields: TemplateField[];
  /** The poster has a person's photo that can be swapped for the speaker's. */
  photoSlot?: boolean;
}

export const POSTER_TEMPLATES: PosterTemplate[] = [
  // Services
  { slug: "sunday-service", name: "Sunday Service", category: "services", fields: ["church", "date", "speaker", "time", "location", "website"], photoSlot: true },
  { slug: "midweek-service", name: "Midweek Service", category: "services", fields: ["date", "time", "location"] },
  { slug: "baptism-sunday", name: "Baptism Sunday", category: "services", fields: ["church", "date", "time", "location", "website"] },
  { slug: "communion-sunday", name: "Communion Sunday", category: "services", fields: ["date", "time", "location"] },
  { slug: "child-dedication", name: "Child Dedication", category: "services", fields: ["church", "date", "time", "location", "website"] },
  { slug: "back-to-church", name: "Back to Church", category: "services", fields: ["date", "time"] },
  { slug: "new-here", name: "New Here?", category: "services", fields: ["time", "location"] },
  { slug: "sunday-recap", name: "Sunday Recap", category: "services", fields: ["quote", "date"] },
  { slug: "through-the-waters", name: "Sermon Series: Through the Waters", category: "services", fields: ["church", "theme", "date", "time", "location"] },
  { slug: "weekly-schedule", name: "This Week at Church", category: "services", fields: ["church", "location"] },

  // Events
  { slug: "church-conference", name: "Church Conference", category: "events", fields: ["church", "theme", "speaker", "date", "time", "location", "website"], photoSlot: true },
  { slug: "stewardship-conference", name: "Stewardship Conference", category: "events", fields: ["church", "speaker", "date", "time", "location", "website"], photoSlot: true },
  { slug: "marriage-conference", name: "Marriage Conference", category: "events", fields: ["date"] },
  { slug: "womens-conference", name: "Women's Conference", category: "events", fields: ["date"] },
  { slug: "next-gen-conference", name: "Next Gen Conference", category: "events", fields: ["church", "date", "time", "location", "website"] },
  { slug: "youth-conference-unshaken", name: "Youth Conference: Unshaken", category: "events", fields: ["date", "website"] },
  { slug: "gospel-night", name: "Gospel Night", category: "events", fields: ["date", "location"] },
  { slug: "revival-night", name: "Revival Night", category: "events", fields: ["date", "time"] },
  { slug: "praise-party", name: "Praise Party", category: "events", fields: ["date", "time"] },
  { slug: "community-festival", name: "Community Festival", category: "events", fields: ["date", "location"] },
  { slug: "prayer-night", name: "Prayer Night", category: "events", fields: ["date", "time"] },
  { slug: "prayer-fasting", name: "Prayer & Fasting", category: "events", fields: ["theme", "date", "time", "location"] },

  // Ministries
  { slug: "kids-church", name: "Kids Church", category: "ministries", fields: ["church", "date", "time", "location", "ages"] },
  { slug: "kids-summer-camp", name: "Kids Summer Camp", category: "ministries", fields: ["date"] },
  { slug: "youth-night", name: "Youth Night", category: "ministries", fields: ["church", "date", "time", "location"] },
  { slug: "mens-fellowship", name: "Men's Fellowship", category: "ministries", fields: ["church", "date", "time", "location", "website"] },
  { slug: "mens-gathering", name: "Men's Gathering", category: "ministries", fields: ["date"] },
  { slug: "womens-gathering", name: "Women's Gathering", category: "ministries", fields: ["theme", "date", "time", "location"] },
  { slug: "small-groups", name: "Small Groups", category: "ministries", fields: ["website"] },
  { slug: "bible-study", name: "Bible Study", category: "ministries", fields: ["date", "time"] },
  { slug: "serve-day", name: "Serve Day", category: "ministries", fields: ["date", "location"] },
  { slug: "serve-with-us", name: "Serve With Us", category: "ministries", fields: ["website"] },
  { slug: "community-outreach", name: "Community Outreach", category: "ministries", fields: ["church", "date", "time", "location", "website"] },
  { slug: "missions-week", name: "Missions Week", category: "ministries", fields: ["date"] },

  // Seasonal
  { slug: "easter-sunday", name: "Easter Sunday", category: "seasonal", fields: ["church", "date", "time", "location", "website"] },
  { slug: "christmas-eve", name: "Christmas Eve Service", category: "seasonal", fields: ["church", "date", "time", "location", "website"] },
  { slug: "new-years-eve", name: "New Year's Eve Service", category: "seasonal", fields: ["church", "date", "time", "location", "website"] },
  { slug: "mothers-day", name: "Mother's Day Service", category: "seasonal", fields: ["church", "date", "time", "location", "website"] },
  { slug: "fathers-day", name: "Father's Day Service", category: "seasonal", fields: ["church", "date", "time", "location", "website"] },
  { slug: "pentecost-service", name: "Pentecost Service", category: "seasonal", fields: ["date", "time", "location", "website"] },

  // Digital and devotional
  { slug: "verse-of-the-week", name: "Verse of the Week", category: "digital", fields: ["church", "quote", "reference"] },
  { slug: "daily-reflection", name: "Daily Reflection", category: "digital", fields: ["church", "quote", "reference"] },
  { slug: "worship-moment", name: "Worship Moment", category: "digital", fields: ["church", "quote", "reference"] },
  { slug: "worship-playlist", name: "Worship Playlist", category: "digital", fields: [] },
  { slug: "podcast-episode", name: "Podcast Episode", category: "digital", fields: ["church", "theme", "speaker", "website"] },
];

export function getTemplate(slug: string): PosterTemplate | undefined {
  return POSTER_TEMPLATES.find((t) => t.slug === slug);
}

export const templateThumbUrl = (slug: string) => `/template-assets/thumb/${slug}.jpg`;
export const templateInputPath = (slug: string) => `/template-assets/input/${slug}.jpg`;

// How the person can restyle the lettering. `css` drives the preview in the
// editor; `prompt` is the description the image model is given, so the result is
// close to, not identical to, the preview.
export const FONT_STYLES = [
  { key: "bold_condensed", prompt: "a tall, bold, condensed sans-serif typeface (like Bebas Neue)" },
  { key: "elegant_serif", prompt: "an elegant high-contrast serif typeface (like Playfair Display)" },
  { key: "modern_sans", prompt: "a clean, modern geometric sans-serif typeface (like Montserrat)" },
  { key: "handwritten_script", prompt: "a flowing handwritten script typeface (like Dancing Script)" },
  { key: "friendly_rounded", prompt: "a friendly, rounded, playful sans-serif typeface (like Fredoka)" },
] as const;
export type FontStyleKey = (typeof FONT_STYLES)[number]["key"];
