import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { GUARANTEE_DAYS } from "@/lib/config";

export async function FinalCta() {
  const t = await getTranslations("landing.cta");

  return (
    <section className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-soft/60 via-surface to-surface px-6 py-14 text-center sm:px-12">
        <div className="absolute left-1/2 top-0 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[90px]" aria-hidden />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("titleLead")}{" "}
            <span className="bg-[image:var(--gradient-accent)] bg-clip-text text-transparent">{t("titleAccent")}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">{t("subtitle")}</p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-medium text-accent-foreground shadow-[0_0_32px_-8px_var(--accent)] transition hover:brightness-110"
          >
            {t("button")}
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck size={14} className="text-accent" aria-hidden />
            {t("note", { days: GUARANTEE_DAYS })}
          </p>
        </div>
      </div>
    </section>
  );
}
