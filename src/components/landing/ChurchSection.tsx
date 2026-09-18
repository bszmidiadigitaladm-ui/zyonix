import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, Mail, Users, Wallet, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";

const ITEMS: { key: string; icon: LucideIcon }[] = [
  { key: "workspace", icon: Users },
  { key: "contacts", icon: Mail },
  { key: "events", icon: CalendarDays },
  { key: "finances", icon: Wallet },
];

// The differentiator: Zyonix serves the whole congregation, not only the individual creator.
export async function ChurchSection() {
  const t = await getTranslations("landing.church");

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow={t("eyebrow")}
            lead={t("titleLead")}
            accent={t("titleAccent")}
            subtitle={t("subtitle")}
            className="[&_p]:max-w-lg [&_h2]:sm:text-4xl"
          />

          <ul className="mt-8 flex flex-col gap-5">
            {ITEMS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent">
                  <Icon size={19} />
                </span>
                <div>
                  <h3 className="font-semibold">{t(`items.${key}.title`)}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(`items.${key}.description`)}</p>
                </div>
              </li>
            ))}
          </ul>

          <a
            href="#pricing"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:border-accent/50 hover:bg-surface-raised"
          >
            {t("cta")}
            <ArrowRight size={15} />
          </a>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent/10 blur-3xl" aria-hidden />
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
            <Image
              src="/landing/church-team.webp"
              alt={t("photoAlt")}
              fill
              unoptimized
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden />
            <span className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              {t("caption")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
