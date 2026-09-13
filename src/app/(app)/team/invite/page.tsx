import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { InviteForm } from "@/components/team/InviteForm";

export default async function TeamInvitePage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.invite");

  if (!profile.team_id || profile.team_role !== "owner") {
    redirect("/team");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader icon={UserPlus} title={t("title")} />
      <InviteForm />
    </div>
  );
}
