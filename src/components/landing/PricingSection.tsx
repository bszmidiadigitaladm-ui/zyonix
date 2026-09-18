import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PricingGrid, type PricingPlan } from "@/components/landing/PricingGrid";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { featuresFor } from "@/lib/plans/features";
import type { PlanCode } from "@/lib/config";

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

  const cards: PricingPlan[] = [];
  let maxSavingsPercent = 0;

  for (const plan of plans) {
    const planLimits = limits.find((l) => l.plan_code === plan.code);
    if (!planLimits) continue;

    if (plan.annual_monthly_equivalent_usd && plan.hotmart_checkout_url_annual && plan.monthly_price_usd > 0) {
      const percent = Math.round((1 - plan.annual_monthly_equivalent_usd / plan.monthly_price_usd) * 100);
      maxSavingsPercent = Math.max(maxSavingsPercent, percent);
    }

    cards.push({
      code: plan.code as PlanCode,
      displayName: plan.display_name,
      priceUsd: plan.monthly_price_usd,
      features: featuresFor(plan.code as PlanCode, planLimits, tFeatures),
      highlighted: plan.code === "church_pro",
      checkoutUrl: plan.hotmart_checkout_url,
      checkoutUrlAnnual: plan.hotmart_checkout_url_annual,
      annualPriceUsd: plan.annual_monthly_equivalent_usd,
    });
  }

  return (
    <section id="pricing" className="mx-auto max-w-4xl scroll-mt-20 px-6 py-24">
      <SectionHeading eyebrow={t("eyebrow")} lead={t("title")} className="mb-10" />
      <PricingGrid plans={cards} maxSavingsPercent={maxSavingsPercent} />
    </section>
  );
}
