import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateSubscriptionForProfile } from "@/lib/hotmart/activation";
import { PlanCard } from "@/components/billing/PlanCard";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { APP_NAME } from "@/lib/config";
import type { PlanCode } from "@/lib/config";
import { featuresFor } from "@/lib/plans/features";

export default async function OnboardingPlanPage() {
  const user = await requireUser();

  // A purchase made before this account existed (checkout is open to
  // anyone, no signup required first) is stashed in pending_activations by
  // the Hotmart webhook. Apply it now that a matching profile finally
  // exists, rather than making the person pick a plan they already paid for.
  if (user.email) {
    const admin = createAdminClient();
    const { data: pending } = await admin
      .from("pending_activations")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      const profile = await getProfile(user.id);
      if (profile) {
        await activateSubscriptionForProfile(admin, {
          profile,
          planCode: pending.plan_code as PlanCode,
          isAnnual: pending.is_annual,
          transactionCode: pending.transaction_code,
          subscriberCode: pending.subscriber_code,
        });
        await admin.from("pending_activations").delete().eq("email", user.email);
        redirect("/dashboard");
      }
    }
  }

  const t = await getTranslations("onboarding.plan");
  const tFeatures = await getTranslations("onboarding.plan.features");

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "code, display_name, monthly_price_usd, sort_order, hotmart_checkout_url, hotmart_checkout_url_annual, annual_monthly_equivalent_usd",
    )
    .order("sort_order");

  const { data: limits } = await supabase.from("plan_limits").select("*");

  if (!plans || !limits) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Someone who paid with another email would otherwise be stuck here with no way out. */}
      <div className="mb-8 flex flex-wrap items-center justify-end gap-3 text-xs text-muted">
        {user.email && <span>{t("signedInAs", { email: user.email })}</span>}
        <SignOutButton />
      </div>

      <div className="mb-10 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h1 className="mb-2 text-3xl font-semibold">{t("title", { appName: APP_NAME })}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
        <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">{t("alreadyPaid")}</p>
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
    </div>
  );
}
