import { getBookMeta } from "@/lib/bible/books";

export interface SourceVerse {
  verse: number;
  text: string;
}

export interface SourceChapter {
  chapter: number;
  verses: SourceVerse[];
}

/** English public-domain translations, fetched one chapter at a time. */
export async function fetchChapterFromBibleApi(
  bookCode: string,
  chapter: number,
  translationCode: "web" | "kjv",
): Promise<SourceVerse[]> {
  const book = getBookMeta(bookCode);
  if (!book) throw new Error(`Unknown book code: ${bookCode}`);

  const ref = `${book.englishName} ${chapter}`.split(" ").join("+");
  const res = await fetch(`https://bible-api.com/${ref}?translation=${translationCode}`);
  if (!res.ok) throw new Error(`bible-api.com request failed: ${res.status}`);

  const data = (await res.json()) as { verses?: { verse: number; text: string }[] };
  return (data.verses ?? []).map((v) => ({ verse: v.verse, text: v.text.trim() }));
}

/**
 * Reina-Valera 1909 (Spanish, public domain) is only available as whole-book
 * JSON files (github.com/aruljohn/Reina-Valera), so this fetches and returns
 * every chapter of the book at once — the caller caches all of them in a
 * single pass rather than re-downloading the whole book per chapter.
 */
export async function fetchBookFromReinaValera1909(bookCode: string): Promise<SourceChapter[]> {
  const book = getBookMeta(bookCode);
  if (!book) throw new Error(`Unknown book code: ${bookCode}`);

  const url = `https://raw.githubusercontent.com/aruljohn/Reina-Valera/master/${encodeURIComponent(book.rvaFilename + ".json")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reina-Valera 1909 source fetch failed: ${res.status}`);

  const data = (await res.json()) as {
    chapters: { chapter: string | number; verses: { verse: string | number; text: string }[] }[];
  };

  return data.chapters.map((c) => ({
    chapter: Number(c.chapter),
    verses: c.verses.map((v) => ({ verse: Number(v.verse), text: v.text.trim() })),
  }));
}
