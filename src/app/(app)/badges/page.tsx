import { getTranslations } from "next-intl/server";
import { Award } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { BadgeGrid } from "@/components/badges/BadgeGrid";

export default async function BadgesPage() {
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("badges");
  const supabase = await createClient();

  const [{ data: badges }, { data: earned }] = await Promise.all([
    supabase.from("badges").select("*"),
    supabase.from("user_badges").select("*").eq("user_id", user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Award}
        title={t("title")}
        subtitle={t("subtitle", { earned: earned?.length ?? 0, total: badges?.length ?? 0 })}
      />
      <BadgeGrid badges={badges ?? []} earned={earned ?? []} />
    </div>
  );
}
