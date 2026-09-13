import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
      <h1 className="mb-2 text-2xl font-semibold">{t("resourcesTitle")}</h1>
      <BibleTabNav />
      <p className="mb-6 text-sm text-muted">{t("resourcesSubtitle")}</p>
      <ResourceList resources={resources ?? []} />
    </div>
  );
}
