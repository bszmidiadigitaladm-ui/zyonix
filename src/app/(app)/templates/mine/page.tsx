import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutTemplate } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PosterGallery } from "@/components/templates/PosterGallery";

export default async function MyPostersPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("templates");
  const supabase = await createClient();

  const query = supabase
    .from("poster_generations")
    .select("id, template_slug, image_url, status, options, created_at")
    .neq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(60);

  const { data: posters } = profile.team_id
    ? await query.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
    : await query.eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={LayoutTemplate}
        title={t("mineTitle")}
        actions={
          <Link href="/templates" className="text-sm font-medium text-accent hover:underline">
            {t("browse")}
          </Link>
        }
      />
      <PosterGallery posters={posters ?? []} />
    </div>
  );
}
