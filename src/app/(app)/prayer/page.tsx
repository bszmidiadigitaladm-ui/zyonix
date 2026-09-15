import { getTranslations } from "next-intl/server";
import { HandHeart } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrayerJournal } from "@/components/prayer/PrayerJournal";

export default async function PrayerPage() {
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("prayer");
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("prayer_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={HandHeart} title={t("title")} subtitle={t("subtitle")} />
      <PrayerJournal initialRequests={requests ?? []} />
    </div>
  );
}
