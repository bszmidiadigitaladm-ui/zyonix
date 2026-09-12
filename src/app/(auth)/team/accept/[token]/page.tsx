import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { isPast } from "@/lib/utils";
import { AcceptInviteButton } from "@/components/team/AcceptInviteButton";

export default async function AcceptInvitePage({ params }: PageProps<"/team/accept/[token]">) {
  const { token } = await params;
  await requireUser();
  const t = await getTranslations("team.accept");

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("team_invites")
    .select("status, expires_at, team_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return <StatusMessage title={t("notFoundTitle")} body={t("notFoundBody")} />;
  }

  if (invite.status !== "pending") {
    return <StatusMessage title={t("usedTitle")} body={t("usedBody")} />;
  }

  if (isPast(invite.expires_at)) {
    return <StatusMessage title={t("expiredTitle")} body={t("expiredBody")} />;
  }

  const { data: team } = await admin.from("teams").select("name").eq("id", invite.team_id).single();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">
        {t("joinTitle", { teamName: team?.name ?? t("theTeam") })}
      </h1>
      <p className="mb-6 text-sm text-muted">{t("joinBody")}</p>
      <AcceptInviteButton token={token} />
    </div>
  );
}

function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}
