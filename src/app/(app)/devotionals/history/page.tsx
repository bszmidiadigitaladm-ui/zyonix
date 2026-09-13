import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sunrise } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DevotionalCard } from "@/components/devotional/DevotionalCard";

export default async function DevotionalHistoryPage() {
  await requireOnboardedUser();
  const t = await getTranslations("devotionals");
  const supabase = await createClient();

  const { data: devotionals } = await supabase
    .from("devotionals")
    .select("*")
    .order("publish_date", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={Sunrise}
        title={t("historyTitle")}
        actions={
          <Link href="/devotionals" className="text-sm font-medium text-accent hover:underline">
            {t("backToToday")}
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        {(devotionals ?? []).map((d) => (
          <DevotionalCard key={d.id} devotional={d} />
        ))}
        {devotionals?.length === 0 && <EmptyState icon={Sunrise} title={t("empty")} />}
      </div>
    </div>
  );
}
