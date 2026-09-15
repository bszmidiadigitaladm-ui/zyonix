import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamTabNav } from "@/components/team/TeamTabNav";
import { FinancesManager } from "@/components/team/FinancesManager";

export default async function TeamFinancesPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.workspace");

  if (!profile.team_id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("occurred_on", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={Users} title={t("title")} />
      <TeamTabNav />
      <FinancesManager initialTransactions={transactions ?? []} isOwner={profile.team_role === "owner"} />
    </div>
  );
}
