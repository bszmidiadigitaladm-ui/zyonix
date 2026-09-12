import { requireOnboardedUser, resolveCreditOwnerId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreditMeter } from "@/components/billing/CreditMeter";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { PlanBadge } from "@/components/billing/PlanBadge";

export default async function BillingPage() {
  const { profile, subscription } = await requireOnboardedUser();
  const supabase = await createClient();

  const ownerId = resolveCreditOwnerId(profile);
  const [{ data: credits }, { data: limits }] = await Promise.all([
    supabase.from("credits_balance").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabase.from("plan_limits").select("*").eq("plan_code", subscription!.plan_code).single(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Plan & Credits</h1>

      <div className="mb-6 flex items-center justify-between rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div>
          <PlanBadge planCode={subscription!.plan_code} status={subscription!.status} />
          <p className="mt-2 text-sm text-neutral-500">
            {subscription!.cancel_at_period_end
              ? `Access ends on ${new Date(subscription!.current_period_end).toLocaleDateString()}`
              : `Renews on ${new Date(subscription!.current_period_end).toLocaleDateString()}`}
          </p>
          {subscription!.status === "past_due" && (
            <p className="mt-1 text-sm text-amber-600">
              Your last payment failed — please update your card to keep access.
            </p>
          )}
        </div>
        <ManageBillingButton />
      </div>

      {credits && limits && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <CreditMeter
            label="Image credits this cycle"
            remaining={credits.image_credits_remaining}
            total={limits.image_credits_per_cycle}
          />
          <CreditMeter
            label="Text credits this cycle"
            remaining={credits.text_credits_remaining}
            total={limits.text_credits_per_cycle}
          />
        </div>
      )}
    </div>
  );
}
