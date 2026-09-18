"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlanCard } from "@/components/billing/PlanCard";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/lib/config";

export interface PricingPlan {
  code: PlanCode;
  displayName: string;
  priceUsd: number;
  features: string[];
  highlighted: boolean;
  checkoutUrl: string | null;
  checkoutUrlAnnual: string | null;
  annualPriceUsd: number | null;
}

/**
 * One shared Monthly/Annual switch above all cards (instead of a toggle buried
 * inside a single card) so the annual saving is visible before anyone scrolls to a plan.
 */
export function PricingGrid({ plans, maxSavingsPercent }: { plans: PricingPlan[]; maxSavingsPercent: number }) {
  const t = useTranslations("landing.pricing");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const anyAnnual = plans.some((p) => p.checkoutUrlAnnual && p.annualPriceUsd);

  return (
    <>
      {anyAnnual && (
        <div className="mb-10 flex flex-col items-center gap-3">
          <div role="group" aria-label={t("cycleLabel")} className="inline-flex gap-1 rounded-full border border-border bg-surface p-1 text-sm">
            {(["monthly", "annual"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={cycle === value}
                onClick={() => setCycle(value)}
                className={cn(
                  "rounded-full px-5 py-1.5 font-medium transition",
                  cycle === value ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {value === "monthly" ? t("toggleMonthly") : t("toggleAnnual")}
              </button>
            ))}
          </div>
          {maxSavingsPercent > 0 && (
            <span className="rounded-full border border-accent/30 bg-accent-soft/50 px-3 py-1 text-xs font-medium text-accent">
              {t("save", { percent: maxSavingsPercent })}
            </span>
          )}
        </div>
      )}

      <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.code} {...plan} billingCycle={anyAnnual ? cycle : undefined} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted">{t("note")}</p>
      <p className="mt-2 text-center text-xs text-muted">{t("afterCheckout")}</p>
    </>
  );
}
