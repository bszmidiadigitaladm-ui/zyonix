import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostComposer, type ComposerArt } from "@/components/posts/PostComposer";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ art?: string }>;
}) {
  const { profile, subscription } = await requireOnboardedUser();
  const { art: initialArtId } = await searchParams;
  const t = await getTranslations("posts");
  const supabase = await createClient();

  const artQuery = supabase
    .from("bible_art_generations")
    .select("id, image_url, verse_reference, theme, output_format")
    .eq("status", "completed")
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(24);

  const [{ data: limits }, { data: arts }] = await Promise.all([
    supabase.from("plan_limits").select("*").eq("plan_code", subscription!.plan_code).single(),
    profile.team_id
      ? artQuery.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
      : artQuery.eq("user_id", profile.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={Layers} title={t("title")} />
      <PostComposer
        arts={(arts ?? []) as ComposerArt[]}
        initialArtId={initialArtId}
        allowCarouselExport={limits?.allow_carousel_export ?? false}
      />
    </div>
  );
}
