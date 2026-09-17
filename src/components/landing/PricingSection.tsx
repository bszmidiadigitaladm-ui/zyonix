import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PlanCard } from "@/components/billing/PlanCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PlanCode } from "@/lib/config";

type FeatureTranslator = (key: string, values?: Record<string, string | number>) => string;

function featuresFor(
  code: PlanCode,
  limits: {
    allow_carousel_export: boolean;
    allow_seasonal_templates: boolean;
    watermark: boolean;
    max_team_seats: number | null;
  },
  t: FeatureTranslator,
) {
  const base = [
    limits.watermark ? t("artWatermarked") : t("artNoWatermark"),
    t("dailyDevotional"),
    code === "starter" ? t("chatLimited") : t("chatUnlimited"),
  ];
  if (limits.allow_carousel_export) base.push(t("allFormats"));
  if (limits.allow_seasonal_templates) base.push(t("templateLibrary"));
  if (limits.max_team_seats) base.push(t("teamWorkspace", { seats: limits.max_team_seats }));
  return base;
}

export async function PricingSection() {
  const t = await getTranslations("landing.pricing");
  const tFeatures = await getTranslations("onboarding.plan.features");

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "code, display_name, monthly_price_usd, sort_order, hotmart_checkout_url, hotmart_checkout_url_annual, annual_monthly_equivalent_usd",
    )
    .order("sort_order");

  const { data: limits } = await supabase.from("plan_limits").select("*");

  if (!plans || !limits) return null;

  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
      <div className="mb-10 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h2 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h2>
      </div>

      <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
        {plans.map((plan) => {
          const planLimits = limits.find((l) => l.plan_code === plan.code);
          if (!planLimits) return null;
          return (
            <PlanCard
              key={plan.code}
              code={plan.code as PlanCode}
              displayName={plan.display_name}
              priceUsd={plan.monthly_price_usd}
              features={featuresFor(plan.code as PlanCode, planLimits, tFeatures)}
              highlighted={plan.code === "church_pro"}
              checkoutUrl={plan.hotmart_checkout_url}
              checkoutUrlAnnual={plan.hotmart_checkout_url_annual}
              annualPriceUsd={plan.annual_monthly_equivalent_usd}
            />
          );
        })}
      </div>
    </section>
  );
}
