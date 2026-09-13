import { createAdminClient } from "@/lib/supabase/admin";
import { fetchChapterFromBibleApi, fetchBookFromReinaValera1909 } from "@/lib/bible/source";

export interface CachedVerse {
  verse: number;
  text: string;
}

/**
 * Returns a chapter's verses, populating the bible_verses cache on first
 * request. English translations cache one chapter at a time; Spanish
 * (Reina-Valera 1909) caches the whole book in one pass since that's how the
 * source data is bundled — see src/lib/bible/source.ts.
 */
export async function getChapter(
  translationCode: string,
  bookCode: string,
  chapter: number,
): Promise<CachedVerse[]> {
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("bible_verses")
    .select("verse, text")
    .eq("translation_code", translationCode)
    .eq("book_code", bookCode)
    .eq("chapter", chapter)
    .order("verse");

  if (cached && cached.length > 0) return cached;

  if (translationCode === "web" || translationCode === "kjv") {
    const verses = await fetchChapterFromBibleApi(bookCode, chapter, translationCode);
    if (verses.length === 0) throw new Error("Source returned no verses");

    await admin.from("bible_verses").insert(
      verses.map((v) => ({
        translation_code: translationCode,
        book_code: bookCode,
        chapter,
        verse: v.verse,
        text: v.text,
      })),
    );

    return verses;
  }

  if (translationCode === "rva1909") {
    const chapters = await fetchBookFromReinaValera1909(bookCode);

    const rows = chapters.flatMap((c) =>
      c.verses.map((v) => ({
        translation_code: translationCode,
        book_code: bookCode,
        chapter: c.chapter,
        verse: v.verse,
        text: v.text,
      })),
    );
    if (rows.length > 0) {
      await admin.from("bible_verses").upsert(rows, {
        onConflict: "translation_code,book_code,chapter,verse",
        ignoreDuplicates: true,
      });
    }

    const requested = chapters.find((c) => c.chapter === chapter);
    if (!requested) throw new Error(`Chapter ${chapter} not found`);
    return requested.verses;
  }

  throw new Error(`No source configured for translation: ${translationCode}`);
}
