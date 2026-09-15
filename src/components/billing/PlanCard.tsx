"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PlanCode } from "@/lib/config";

interface PlanCardProps {
  code: PlanCode;
  displayName: string;
  priceUsd: number;
  features: string[];
  highlighted?: boolean;
  checkoutUrl: string | null;
  checkoutUrlAnnual: string | null;
  annualPriceUsd: number | null;
}

export function PlanCard({
  code,
  displayName,
  priceUsd,
  features,
  highlighted,
  checkoutUrl,
  checkoutUrlAnnual,
  annualPriceUsd,
}: PlanCardProps) {
  const t = useTranslations("onboarding.plan");
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnnual = Boolean(checkoutUrlAnnual && annualPriceUsd);
  const isAnnual = hasAnnual && billingCycle === "annual";
  const activeUrl = isAnnual ? checkoutUrlAnnual : checkoutUrl;
  const activePrice = isAnnual && annualPriceUsd ? annualPriceUsd : priceUsd;

  async function handleDevActivate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/fake-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? t("startTrial"));
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : t("startTrial"));
    }
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        highlighted && "border-accent/60 shadow-[0_0_32px_-12px_var(--accent)]",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
          {t("mostPopular")}
        </span>
      )}
      <h3 className="text-lg font-semibold">{displayName}</h3>

      {hasAnnual && (
        <div className="mt-3 inline-flex w-fit gap-1 rounded-full border border-border bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-full px-3 py-1 font-medium transition",
              !isAnnual ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "rounded-full px-3 py-1 font-medium transition",
              isAnnual ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t("annual")}
          </button>
        </div>
      )}

      <p className="mt-3 text-3xl font-bold">
        ${activePrice.toFixed(2)}
        <span className="text-sm font-normal text-muted">{t("perMonth")}</span>
      </p>
      <p className="mt-1 text-xs text-muted">{isAnnual ? t("billedAnnually") : t("trialNote")}</p>

      <ul className="my-6 flex flex-1 flex-col gap-2 text-sm text-foreground/90">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {activeUrl ? (
        <a
          href={activeUrl}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
            highlighted
              ? "bg-accent text-accent-foreground hover:brightness-110 shadow-[0_0_24px_-8px_var(--accent)]"
              : "border border-border bg-surface text-foreground hover:border-accent/50 hover:bg-surface-raised",
          )}
        >
          {t("startTrial")}
        </a>
      ) : (
        <Button disabled className="w-full">
          {t("startTrial")}
        </Button>
      )}

      {process.env.NODE_ENV !== "production" && (
        <button
          onClick={handleDevActivate}
          disabled={loading}
          className="mt-2 rounded-full border border-dashed border-warning/50 px-3 py-2 text-xs font-medium text-warning disabled:opacity-50"
        >
          {t("devActivate")}
        </button>
      )}
    </Card>
  );
}
