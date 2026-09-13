import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { BibleTabNav } from "@/components/bible/BibleTabNav";
import { ResourceList } from "@/components/bible/ResourceList";

export default async function BibleResourcesPage() {
  await requireOnboardedUser();
  const t = await getTranslations("bible");
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("bible_study_resources")
    .select("*")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={BookOpen} title={t("hubTitle")} subtitle={t("hubSubtitle")} />
      <BibleTabNav />
      <h2 className="mb-1 text-lg font-semibold">{t("resourcesTitle")}</h2>
      <p className="mb-6 text-sm text-muted">{t("resourcesSubtitle")}</p>
      <ResourceList resources={resources ?? []} />
    </div>
  );
}
