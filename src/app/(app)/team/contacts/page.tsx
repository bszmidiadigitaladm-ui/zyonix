import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamTabNav } from "@/components/team/TeamTabNav";
import { ContactsManager } from "@/components/team/ContactsManager";

export default async function TeamContactsPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.workspace");

  if (!profile.team_id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("church_contacts")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("name");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={Users} title={t("title")} />
      <TeamTabNav />
      <ContactsManager initialContacts={contacts ?? []} isOwner={profile.team_role === "owner"} />
    </div>
  );
}
