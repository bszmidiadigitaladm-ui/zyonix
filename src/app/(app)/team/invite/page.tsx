import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { InviteForm } from "@/components/team/InviteForm";

export default async function TeamInvitePage() {
  const { profile } = await requireOnboardedUser();

  if (!profile.team_id || profile.team_role !== "owner") {
    redirect("/team");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Invite a teammate</h1>
      <InviteForm />
    </div>
  );
}
