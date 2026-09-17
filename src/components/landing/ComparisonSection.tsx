import { getTranslations } from "next-intl/server";
import { Check, X } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

const ROW_KEYS = ["row1", "row2", "row3", "row4", "row5", "row6"] as const;

export async function ComparisonSection() {
  const t = await getTranslations("landing.comparison");

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-10 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h2 className="mb-2 text-3xl font-semibold sm:text-4xl">{t("title")}</h2>
        <p className="max-w-md text-sm text-muted">{t("subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 bg-surface-raised/60 px-5 py-3 text-xs font-medium text-muted">
          <span />
          <span className="w-20 text-center">{t("columnGeneric")}</span>
          <span className="w-20 rounded-full bg-accent-soft px-2 py-1 text-center text-accent">
            {t("columnZyonix")}
          </span>
        </div>
        {ROW_KEYS.map((key, i) => (
          <div
            key={key}
            className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-4 text-sm ${
              i % 2 === 0 ? "bg-surface/40" : ""
            }`}
          >
            <span className="text-foreground/90">{t(key)}</span>
            <span className="flex w-20 justify-center">
              <X size={16} className="text-muted" />
            </span>
            <span className="flex w-20 justify-center">
              <Check size={16} className="text-accent" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
