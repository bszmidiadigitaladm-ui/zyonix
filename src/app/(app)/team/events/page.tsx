import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamTabNav } from "@/components/team/TeamTabNav";
import { EventsManager } from "@/components/team/EventsManager";

export default async function TeamEventsPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.workspace");

  if (!profile.team_id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("church_events")
    .select("*")
    .eq("team_id", profile.team_id)
    .order("event_date");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={Users} title={t("title")} />
      <TeamTabNav />
      <EventsManager initialEvents={events ?? []} isOwner={profile.team_role === "owner"} />
    </div>
  );
}
