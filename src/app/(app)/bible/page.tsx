import { getLocale, getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BibleTabNav } from "@/components/bible/BibleTabNav";
import { BookGrid } from "@/components/bible/BookGrid";

export default async function BiblePage() {
  await requireOnboardedUser();
  const t = await getTranslations("bible");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: books } = await supabase.from("bible_books").select("*").order("sort_order");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold">{t("tabRead")}</h1>
      <BibleTabNav />
      <BookGrid books={books ?? []} locale={locale} />
    </div>
  );
}
