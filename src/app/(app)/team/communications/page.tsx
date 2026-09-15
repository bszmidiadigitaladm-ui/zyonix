import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamTabNav } from "@/components/team/TeamTabNav";
import { CommunicationsPanel } from "@/components/team/CommunicationsPanel";

export default async function TeamCommunicationsPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.workspace");

  if (!profile.team_id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: communications } = await supabase
    .from("communications")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={Users} title={t("title")} />
      <TeamTabNav />
      <CommunicationsPanel
        initialCommunications={communications ?? []}
        isOwner={profile.team_role === "owner"}
      />
    </div>
  );
}
