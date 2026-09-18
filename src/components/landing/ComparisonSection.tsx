import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BookOpen, Check, HandHeart, ImageIcon, MessageSquareText, Users, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { APP_NAME } from "@/lib/config";

const ROWS: { key: string; icon: LucideIcon }[] = [
  { key: "study", icon: BookOpen },
  { key: "messages", icon: MessageSquareText },
  { key: "visual", icon: ImageIcon },
  { key: "church", icon: Users },
  { key: "faith", icon: HandHeart },
];

// Framed as "one tool for many things vs a studio for one thing" rather than a
// column of ✗ marks — a general-purpose assistant genuinely can do part of each row.
export async function ComparisonSection() {
  const t = await getTranslations("landing.comparison");

  return (
    <section id="compare" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        eyebrow={t("eyebrow")}
        lead={t("titleLead")}
        accent={t("titleAccent")}
        subtitle={t("subtitle")}
        className="mb-12"
      />

      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="grid md:grid-cols-2">
          <div className="bg-surface/60 p-6 sm:p-8">
            <h3 className="text-lg font-semibold">{t("generalTitle")}</h3>
            <p className="mt-1 text-sm text-muted">{t("generalDescription")}</p>
          </div>
          <div className="border-t border-accent/20 bg-gradient-to-br from-accent-soft/50 via-surface to-surface p-6 sm:p-8 md:border-l md:border-t-0">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Image src="/logo-mark.png" alt="" width={22} height={22} />
              {APP_NAME}
            </h3>
            <p className="mt-1 text-sm text-accent/90">{t("zyonixDescription")}</p>
          </div>
        </div>

        {ROWS.map(({ key, icon: Icon }) => (
          <div key={key} className="grid border-t border-border md:grid-cols-2">
            <div className="p-6 sm:px-8">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Icon size={15} className="text-muted" aria-hidden />
                {t(`rows.${key}.title`)}
              </h4>
              <p className="mt-1.5 text-sm text-muted">{t(`rows.${key}.general`)}</p>
            </div>
            <div className="flex gap-3 bg-accent-soft/15 p-6 pt-0 sm:px-8 md:border-l md:border-accent/15 md:pt-6">
              <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <p className="text-sm text-foreground/90">{t(`rows.${key}.zyonix`)}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">{t("footnote")}</p>
    </section>
  );
}
