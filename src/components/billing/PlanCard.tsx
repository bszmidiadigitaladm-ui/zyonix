"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GUARANTEE_DAYS, type PlanCode } from "@/lib/config";
import { trackMeta } from "@/lib/analytics/meta";

interface PlanCardProps {
  code: PlanCode;
  displayName: string;
  priceUsd: number;
  features: string[];
  highlighted?: boolean;
  checkoutUrl: string | null;
  checkoutUrlAnnual: string | null;
  annualPriceUsd: number | null;
  /**
   * When provided, the billing cycle is controlled by the parent (the landing
   * page shows one shared toggle above all cards) and the card's own toggle is hidden.
   */
  billingCycle?: "monthly" | "annual";
}

const usd = (amount: number) => `$${amount.toFixed(2)}`;

export function PlanCard({
  code,
  displayName,
  priceUsd,
  features,
  highlighted,
  checkoutUrl,
  checkoutUrlAnnual,
  annualPriceUsd,
  billingCycle: controlledCycle,
}: PlanCardProps) {
  const t = useTranslations("onboarding.plan");
  const router = useRouter();
  const [ownCycle, setOwnCycle] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledCycle !== undefined;
  const billingCycle = isControlled ? controlledCycle : ownCycle;

  const hasAnnual = Boolean(checkoutUrlAnnual && annualPriceUsd);
  const isAnnual = hasAnnual && billingCycle === "annual";
  const activeUrl = isAnnual ? checkoutUrlAnnual : checkoutUrl;
  const activePrice = isAnnual && annualPriceUsd ? annualPriceUsd : priceUsd;
  const yearlySavings = hasAnnual && annualPriceUsd ? Math.max(0, (priceUsd - annualPriceUsd) * 12) : 0;

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

      {hasAnnual && !isControlled && (
        <div className="mt-3 inline-flex w-fit gap-1 rounded-full border border-border bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => setOwnCycle("monthly")}
            className={cn(
              "rounded-full px-3 py-1 font-medium transition",
              !isAnnual ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setOwnCycle("annual")}
            className={cn(
              "rounded-full px-3 py-1 font-medium transition",
              isAnnual ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t("annual")}
          </button>
        </div>
      )}

      <p
        className={cn(
          "mt-3 font-extrabold tracking-tight",
          highlighted
            ? "bg-[image:var(--gradient-accent)] bg-clip-text text-5xl text-transparent sm:text-6xl"
            : "text-4xl",
        )}
      >
        {usd(activePrice)}
        <span className="text-sm font-medium text-muted">{t("perMonth")}</span>
      </p>
      <p className="mt-1 text-xs text-muted">
        {isAnnual && annualPriceUsd
          ? t("billedAnnuallyTotal", { total: usd(annualPriceUsd * 12) })
          : t("billedMonthly", { price: usd(priceUsd) })}
      </p>
      {isAnnual && yearlySavings > 0 && (
        <span className="mt-2 w-fit rounded-full border border-accent/30 bg-accent-soft/60 px-2.5 py-0.5 text-[11px] font-medium text-accent">
          {t("saveBadge", { amount: usd(yearlySavings) })}
        </span>
      )}

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
          onClick={() =>
            trackMeta("InitiateCheckout", {
              value: isAnnual && annualPriceUsd ? annualPriceUsd * 12 : priceUsd,
              currency: "USD",
              content_name: displayName,
              content_category: isAnnual ? "annual" : "monthly",
            })
          }
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

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck size={14} className="text-accent" aria-hidden />
        {t("guarantee", { days: GUARANTEE_DAYS })}
      </p>

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
