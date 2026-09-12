import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MemberList } from "@/components/team/MemberList";
import { ArtGalleryGrid } from "@/components/art/ArtGalleryGrid";

export default async function TeamPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("team.workspace");

  if (!profile.team_id) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: members }, { data: sharedArt }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, team_role")
      .eq("team_id", profile.team_id),
    supabase
      .from("bible_art_generations")
      .select("*")
      .eq("team_id", profile.team_id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const isOwner = profile.team_role === "owner";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("members")}</h2>
          {isOwner && (
            <Link href="/team/invite" className="text-sm font-medium text-accent hover:underline">
              {t("inviteTeammate")}
            </Link>
          )}
        </div>
        <MemberList members={members ?? []} isOwner={isOwner} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("sharedLibrary")}</h2>
        <ArtGalleryGrid generations={sharedArt ?? []} />
      </div>
    </div>
  );
}
