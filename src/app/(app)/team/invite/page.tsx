import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { InviteForm } from "@/components/team/InviteForm";

export default async function TeamInvitePage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.invite");

  if (!profile.team_id || profile.team_role !== "owner") {
    redirect("/team");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <InviteForm />
    </div>
  );
}
