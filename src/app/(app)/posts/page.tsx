import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PostComposer } from "@/components/posts/PostComposer";

export default async function PostsPage() {
  const { subscription } = await requireOnboardedUser();
  const t = await getTranslations("posts");
  const supabase = await createClient();

  const [{ data: templates }, { data: limits }] = await Promise.all([
    supabase.from("seasonal_templates").select("*").order("created_at"),
    supabase.from("plan_limits").select("*").eq("plan_code", subscription!.plan_code).single(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <PostComposer
        templates={templates ?? []}
        allowSeasonalTemplates={limits?.allow_seasonal_templates ?? false}
        allowCarouselExport={limits?.allow_carousel_export ?? false}
      />
    </div>
  );
}
