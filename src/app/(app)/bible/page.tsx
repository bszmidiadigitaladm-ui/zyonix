import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader icon={BookOpen} title={t("hubTitle")} subtitle={t("hubSubtitle")} />
      <BibleTabNav />
      <BookGrid books={books ?? []} locale={locale} />
    </div>
  );
}
