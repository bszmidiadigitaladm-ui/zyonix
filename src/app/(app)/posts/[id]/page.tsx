import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostCanvas } from "@/components/posts/PostCanvas";
import { CopyCaptionButton } from "@/components/posts/CopyCaptionButton";

export default async function PostDetailPage({ params }: PageProps<"/posts/[id]">) {
  const { id } = await params;
  await requireOnboardedUser();
  const t = await getTranslations("posts");
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("social_post_generations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  let imageUrl: string | null = null;
  if (post.art_generation_id) {
    const { data: art } = await supabase
      .from("bible_art_generations")
      .select("image_url")
      .eq("id", post.art_generation_id)
      .maybeSingle();
    imageUrl = art?.image_url ?? null;
  } else if (post.template_id) {
    const { data: template } = await supabase
      .from("seasonal_templates")
      .select("asset_url")
      .eq("id", post.template_id)
      .maybeSingle();
    imageUrl = template?.asset_url ?? null;
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader icon={Layers} title={t("post")} />
      <PostCanvas
        imageUrl={imageUrl}
        overlayText={post.overlay_text ?? undefined}
        verseReference={post.verse_reference ?? undefined}
        format={post.format}
      />
      {post.caption_text && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="whitespace-pre-wrap rounded-xl border border-border p-3 text-sm">{post.caption_text}</p>
          <CopyCaptionButton text={post.caption_text} className="self-start" />
        </div>
      )}
    </div>
  );
}
