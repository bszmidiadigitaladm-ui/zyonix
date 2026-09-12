import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PlanCard } from "@/components/billing/PlanCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { APP_NAME } from "@/lib/config";
import type { PlanCode } from "@/lib/config";

function featuresFor(code: PlanCode, limits: { allow_carousel_export: boolean; allow_seasonal_templates: boolean; watermark: boolean; max_team_seats: number | null }) {
  const base = [
    limits.watermark ? "Bible art & posts (watermarked)" : "Bible art & posts, no watermark",
    "Daily devotional",
    code === "starter" ? "Spiritual chat (daily limit)" : "Unlimited spiritual chat",
  ];
  if (limits.allow_carousel_export) base.push("All formats: feed, story, carousel");
  if (limits.allow_seasonal_templates) base.push("Seasonal template library");
  if (limits.max_team_seats) base.push(`Team workspace (up to ${limits.max_team_seats} seats)`);
  return base;
}

export default async function OnboardingPlanPage() {
  await requireUser();

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
        <Eyebrow className="mb-3">3-day free trial</Eyebrow>
        <h1 className="mb-2 text-3xl font-semibold">Choose your {APP_NAME} plan</h1>
        <p className="text-sm text-muted">Your card won&apos;t be charged until the trial ends.</p>
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
              features={featuresFor(plan.code as PlanCode, planLimits)}
              highlighted={plan.code === "creator"}
            />
          );
        })}
      </div>
    </div>
  );
}
