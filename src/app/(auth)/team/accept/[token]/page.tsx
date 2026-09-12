import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { isPast } from "@/lib/utils";
import { AcceptInviteButton } from "@/components/team/AcceptInviteButton";

export default async function AcceptInvitePage({ params }: PageProps<"/team/accept/[token]">) {
  const { token } = await params;
  await requireUser();

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("team_invites")
    .select("status, expires_at, team_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return <StatusMessage title="Invite not found" body="This invite link is invalid." />;
  }

  if (invite.status !== "pending") {
    return <StatusMessage title="Invite already used" body="This invite has already been accepted." />;
  }

  if (isPast(invite.expires_at)) {
    return <StatusMessage title="Invite expired" body="Ask the team owner to send a new invite." />;
  }

  const { data: team } = await admin.from("teams").select("name").eq("id", invite.team_id).single();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">Join {team?.name ?? "the team"}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        You&apos;ve been invited to collaborate on this Church Pro workspace.
      </p>
      <AcceptInviteButton token={token} />
    </div>
  );
}

function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      <p className="text-sm text-neutral-500">{body}</p>
    </div>
  );
}
