import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PostCanvas } from "@/components/posts/PostCanvas";

export default async function PostDetailPage({ params }: PageProps<"/posts/[id]">) {
  const { id } = await params;
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("social_post_generations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  let imageUrl: string | null = null;
  if (post.template_id) {
    const { data: template } = await supabase
      .from("seasonal_templates")
      .select("asset_url")
      .eq("id", post.template_id)
      .maybeSingle();
    imageUrl = template?.asset_url ?? null;
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Post</h1>
      <PostCanvas
        imageUrl={imageUrl}
        captionText={post.caption_text ?? ""}
        verseReference={post.verse_reference ?? undefined}
        format={post.format}
      />
    </div>
  );
}
