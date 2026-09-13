import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const OCCASION_KEY: Record<string, string> = {
  verse_of_the_day: "occasionVerseOfTheDay",
  easter: "occasionEaster",
  christmas: "occasionChristmas",
  mothers_day: "occasionMothersDay",
};

export default async function TemplatesPage() {
  const { subscription } = await requireOnboardedUser();
  const t = await getTranslations("templates");
  const supabase = await createClient();

  const [{ data: templates }, { data: limits }] = await Promise.all([
    supabase.from("seasonal_templates").select("*").order("occasion"),
    supabase.from("plan_limits").select("allow_seasonal_templates").eq("plan_code", subscription!.plan_code).single(),
  ]);

  const allowExclusive = limits?.allow_seasonal_templates ?? false;
  const byOccasion = new Map<string, typeof templates>();
  for (const template of templates ?? []) {
    if (!byOccasion.has(template.occasion)) byOccasion.set(template.occasion, []);
    byOccasion.get(template.occasion)!.push(template);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

      {[...byOccasion.entries()].map(([occasion, items]) => (
        <section key={occasion} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted">
            {OCCASION_KEY[occasion] ? t(OCCASION_KEY[occasion]) : occasion}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {items!.map((template) => {
              const locked = template.is_exclusive && !allowExclusive;
              return (
                <div
                  key={template.id}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-border bg-surface",
                    locked && "opacity-50",
                  )}
                >
                  {template.media_type === "video" ? (
                    <video
                      src={template.preview_url}
                      className="aspect-square w-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.preview_url}
                      alt={template.name}
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <p className="p-2 text-xs">{template.name}</p>
                  {locked && (
                    <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      {t("locked")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
