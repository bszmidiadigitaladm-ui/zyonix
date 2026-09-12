import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const OCCASION_LABEL: Record<string, string> = {
  verse_of_the_day: "Verse of the Day",
  easter: "Easter",
  christmas: "Christmas",
  mothers_day: "Mother's Day",
};

export default async function TemplatesPage() {
  const { subscription } = await requireOnboardedUser();
  const supabase = await createClient();

  const [{ data: templates }, { data: limits }] = await Promise.all([
    supabase.from("seasonal_templates").select("*").order("occasion"),
    supabase.from("plan_limits").select("allow_seasonal_templates").eq("plan_code", subscription!.plan_code).single(),
  ]);

  const allowExclusive = limits?.allow_seasonal_templates ?? false;
  const byOccasion = new Map<string, typeof templates>();
  for (const t of templates ?? []) {
    if (!byOccasion.has(t.occasion)) byOccasion.set(t.occasion, []);
    byOccasion.get(t.occasion)!.push(t);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Seasonal Templates</h1>

      {[...byOccasion.entries()].map(([occasion, items]) => (
        <section key={occasion} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted">
            {OCCASION_LABEL[occasion] ?? occasion}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {items!.map((t) => {
              const locked = t.is_exclusive && !allowExclusive;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-border bg-surface",
                    locked && "opacity-50",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.preview_url} alt={t.name} className="aspect-square w-full object-cover" />
                  <p className="p-2 text-xs">{t.name}</p>
                  {locked && (
                    <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      Creator+
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
