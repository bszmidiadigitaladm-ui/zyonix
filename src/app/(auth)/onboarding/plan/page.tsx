import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PlanCard } from "@/components/billing/PlanCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { APP_NAME } from "@/lib/config";
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

export default async function OnboardingPlanPage() {
  await requireUser();
  const t = await getTranslations("onboarding.plan");
  const tFeatures = await getTranslations("onboarding.plan.features");

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("code, display_name, monthly_price_usd, sort_order")
    .order("sort_order");

  const { data: limits } = await supabase.from("plan_limits").select("*");

  if (!plans || !limits) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 text-3xl font-semibold">{t("title", { appName: APP_NAME })}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
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
            />
          );
        })}
      </div>
    </div>
  );
}
