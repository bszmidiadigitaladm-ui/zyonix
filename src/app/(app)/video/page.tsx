import { getTranslations } from "next-intl/server";
import { Clapperboard } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoForm } from "@/components/video/VideoForm";

export default async function VideoPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("video");
  const supabase = await createClient();

  const query = supabase
    .from("video_generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: history } = profile.team_id
    ? await query.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
    : await query.eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={Clapperboard} title={t("title")} />
      <VideoForm />

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">{t("history")}</h2>
        {history && history.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/40"
              >
                {item.status === "succeeded" && item.video_url ? (
                  <video src={item.video_url} controls className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-xs text-muted">
                    {item.status === "failed" ? t("statusFailed") : t("statusProcessing")}
                  </div>
                )}
                <p className="truncate p-2 text-xs text-muted">{item.prompt}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Clapperboard} title={t("noHistory")} />
        )}
      </div>
    </div>
  );
}
