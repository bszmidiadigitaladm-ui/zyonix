"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, MessageCircle, Mic, Palette, Sunrise, Users, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { cn } from "@/lib/utils";

const TOOLS: { key: string; icon: LucideIcon; src: string }[] = [
  { key: "art", icon: Palette, src: "/landing/app-art-gen.webp" },
  { key: "message", icon: Mic, src: "/landing/app-message.webp" },
  { key: "devotional", icon: Sunrise, src: "/landing/app-devotional.webp" },
  { key: "chat", icon: MessageCircle, src: "/landing/app-chat.webp" },
  { key: "bible", icon: BookOpen, src: "/landing/app-bible.webp" },
  { key: "church", icon: Users, src: "/landing/app-church.webp" },
];

// Captures are 1400x926; the frame crops to a slightly shorter window so short pages don't leave dead space.
const SHOWCASE_ASPECT = 1400 / 860;

const ALSO_INCLUDED = ["video", "posts", "games", "prayer", "badges", "templates"] as const;

export function ToolShowcase() {
  const t = useTranslations("landing.tools");
  const [active, setActive] = useState(0);

  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        eyebrow={t("eyebrow")}
        lead={t("titleLead")}
        accent={t("titleAccent")}
        subtitle={t("subtitle")}
        className="mb-14"
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
        <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-2">
          {TOOLS.map(({ key, icon: Icon }, i) => {
            const isActive = i === active;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-2xl border transition",
                  isActive
                    ? "border-accent/50 bg-gradient-to-b from-surface-raised to-surface shadow-[0_0_32px_-16px_var(--accent)]"
                    : "border-border bg-surface/40 hover:border-accent/30",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  id={`tool-tab-${key}`}
                  aria-selected={isActive}
                  aria-controls={`tool-panel-${key}`}
                  onClick={() => setActive(i)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                      isActive ? "bg-accent text-accent-foreground" : "bg-accent-soft/60 text-accent",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="font-semibold">{t(`items.${key}.title`)}</span>
                </button>
                {isActive && (
                  <div id={`tool-panel-${key}`} role="tabpanel" aria-labelledby={`tool-tab-${key}`} className="px-4 pb-4">
                    <p className="text-sm leading-relaxed text-muted">{t(`items.${key}.description`)}</p>
                    <a
                      href="#pricing"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                      {t("cta")}
                      <ArrowRight size={14} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All screens are stacked and cross-faded, so switching tabs never shifts the layout. */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_40px_90px_-40px_rgba(45,212,191,0.4)]">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised/70 px-4 py-2.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="ml-3 rounded-md bg-background/60 px-3 py-0.5 text-[11px] text-muted">zyonix.pro</span>
          </div>
          <div className="relative" style={{ aspectRatio: String(SHOWCASE_ASPECT) }}>
            {TOOLS.map(({ key, src }, i) => (
              <Image
                key={key}
                src={src}
                alt={t(`items.${key}.title`)}
                fill
                unoptimized
                loading={i === 0 ? "eager" : "lazy"}
                sizes="(min-width: 1024px) 700px, 100vw"
                aria-hidden={i !== active}
                className={cn("object-cover object-top transition-opacity duration-500", i === active ? "opacity-100" : "opacity-0")}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm text-muted">
        <span className="font-medium text-foreground/80">{t("alsoIncluded")}</span>
        {ALSO_INCLUDED.map((key) => (
          <span key={key} className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs">
            {t(`also.${key}`)}
          </span>
        ))}
      </p>
    </section>
  );
}
