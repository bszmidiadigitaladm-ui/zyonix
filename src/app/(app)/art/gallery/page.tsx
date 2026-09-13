import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArtGalleryGrid } from "@/components/art/ArtGalleryGrid";

export default async function ArtGalleryPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("art");
  const supabase = await createClient();

  const query = supabase
    .from("bible_art_generations")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: generations } = profile.team_id
    ? await query.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
    : await query.eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Palette}
        title={t("yourArt")}
        actions={
          <Link href="/art" className="text-sm font-medium text-accent hover:underline">
            {t("newGeneration")}
          </Link>
        }
      />
      <ArtGalleryGrid generations={generations ?? []} />
    </div>
  );
}
