"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import { GUARANTEE_DAYS } from "@/lib/config";

const QUESTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function FaqSection() {
  const t = useTranslations("landing.faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-10 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h2>
      </div>

      <div className="flex flex-col gap-3">
        {QUESTION_KEYS.map((num, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={num}
              className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-raised/70 to-surface"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
              >
                {t(`q${num}`)}
                <ChevronDown
                  size={18}
                  className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180 text-accent")}
                />
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-muted">{t(`a${num}`, { days: GUARANTEE_DAYS })}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
