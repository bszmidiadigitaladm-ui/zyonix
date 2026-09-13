import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getChapter } from "@/lib/bible/cache";
import { getBookMeta } from "@/lib/bible/books";
import { ChapterReader } from "@/components/bible/ChapterReader";

const DEFAULT_TRANSLATION: Record<string, string> = { en: "web", es: "rva1909" };

export default async function BibleChapterPage({
  params,
  searchParams,
}: PageProps<"/bible/[book]/[chapter]">) {
  const { book, chapter: chapterParam } = await params;
  const search = await searchParams;
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("bible.books");
  const locale = await getLocale();

  const chapter = Number(chapterParam);
  const meta = getBookMeta(book);
  if (!meta || !Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapterCount) {
    notFound();
  }

  const translation =
    (Array.isArray(search.translation) ? search.translation[0] : search.translation) ??
    DEFAULT_TRANSLATION[locale] ??
    "web";
  const planId = Array.isArray(search.plan) ? search.plan[0] : search.plan;

  const supabase = await createClient();

  let verses;
  try {
    verses = await getChapter(translation, book, chapter);
  } catch {
    notFound();
  }

  const [{ data: readRow }, { data: favRow }] = await Promise.all([
    supabase
      .from("reading_progress")
      .select("chapter")
      .eq("user_id", user.id)
      .eq("book_code", book)
      .eq("chapter", chapter)
      .maybeSingle(),
    supabase
      .from("bible_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_code", book)
      .eq("chapter", chapter)
      .is("verse", null)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <ChapterReader
        bookCode={book}
        bookName={t(book)}
        chapter={chapter}
        chapterCount={meta.chapterCount}
        translation={translation}
        planId={planId}
        verses={verses}
        initiallyRead={Boolean(readRow)}
        initiallyFavorited={Boolean(favRow)}
      />
    </div>
  );
}
