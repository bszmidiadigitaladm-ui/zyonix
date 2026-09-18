import { getTranslations } from "next-intl/server";
import { Church, Mic, Baby, Palette, type LucideIcon } from "lucide-react";

const AUDIENCES: { key: string; icon: LucideIcon }[] = [
  { key: "churches", icon: Church },
  { key: "pastors", icon: Mic },
  { key: "kids", icon: Baby },
  { key: "creators", icon: Palette },
];

// Deliberately no user counts or testimonials until there are real ones to show.
export async function AudienceStrip() {
  const t = await getTranslations("landing.audience");

  return (
    <section className="mx-auto max-w-5xl px-6 pb-4 pt-2">
      <div className="flex flex-col items-center gap-4 border-y border-border py-5 sm:flex-row sm:justify-between">
        <span className="text-xs font-medium tracking-widest text-muted uppercase">{t("label")}</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-foreground/90">
          {AUDIENCES.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2">
              <Icon size={16} className="text-accent" aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
