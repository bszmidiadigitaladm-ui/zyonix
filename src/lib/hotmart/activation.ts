import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CODES, type PlanCode } from "@/lib/config";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ResolvedPlan {
  planCode: PlanCode;
  isAnnual: boolean;
}

/** Tracking-key match first (set per-offer in Hotmart), falling back to matching Hotmart's own offer code against `plans`. */
export async function resolvePlan(
  admin: AdminClient,
  trackingPlanCode: string | undefined,
  offerCode: string | undefined,
): Promise<ResolvedPlan | null> {
  if (trackingPlanCode && (PLAN_CODES as readonly string[]).includes(trackingPlanCode)) {
    return { planCode: trackingPlanCode as PlanCode, isAnnual: false };
  }

  if (!offerCode) return null;

  const { data: plan } = await admin
    .from("plans")
    .select("code, hotmart_offer_code_annual")
    .or(`hotmart_offer_code.eq.${offerCode},hotmart_offer_code_annual.eq.${offerCode}`)
    .maybeSingle();

  if (!plan) return null;
  return { planCode: plan.code, isAnnual: plan.hotmart_offer_code_annual === offerCode };
}

/**
 * Creates/updates the subscription for an already-resolved profile. Split out
 * from the Hotmart webhook so /onboarding/plan can apply a pending
 * activation the moment a matching profile finally exists, without
 * duplicating the team-creation/credit-reset logic.
 */
export async function activateSubscriptionForProfile(
  admin: AdminClient,
  params: {
    profile: { id: string; email: string; full_name: string | null; team_id: string | null };
    planCode: PlanCode;
    isAnnual: boolean;
    transactionCode?: string | null;
    subscriberCode?: string | null;
    /**
     * Admin-granted (complimentary) plan: explicit expiry instead of a paid billing
     * period, and tagged so revenue figures can exclude it. The `source` column is
     * only written for grants, so the Hotmart path keeps working even before the
     * migration that adds the column has been applied.
     */
    grant?: { periodEnd: Date };
  },
) {
  const { profile, planCode, isAnnual, transactionCode, subscriberCode, grant } = params;

  const { data: plan } = await admin.from("plans").select("is_team_plan").eq("code", planCode).single();

  let teamId = profile.team_id;

  if (plan?.is_team_plan && !teamId) {
    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({ name: `${profile.full_name ?? profile.email}'s Team`, owner_id: profile.id })
      .select()
      .single();
    if (teamError) throw teamError;
    teamId = team.id;
    await admin.from("profiles").update({ team_id: teamId, team_role: "owner" }).eq("id", profile.id);
  }

  const now = new Date();
  const periodEnd = grant ? new Date(grant.periodEnd) : new Date(now);
  if (!grant) {
    if (isAnnual) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const creditsCycleEnd = new Date(now);
  creditsCycleEnd.setMonth(creditsCycleEnd.getMonth() + 1);

  const query = admin.from("subscriptions").select("id");
  const { data: existing } = teamId
    ? await query.eq("team_id", teamId).maybeSingle()
    : await query.eq("owner_id", profile.id).is("team_id", null).maybeSingle();

  const payload = {
    owner_id: profile.id,
    team_id: teamId,
    plan_code: planCode,
    status: "active" as const,
    trial_end: null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    canceled_at: null,
    billing_cycle: isAnnual ? ("annual" as const) : ("monthly" as const),
    credits_cycle_end: creditsCycleEnd.toISOString(),
    hotmart_transaction_code: transactionCode ?? null,
    hotmart_subscriber_code: subscriberCode ?? null,
    ...(grant ? { source: "admin_grant" as const } : {}),
  };

  const { data: subscriptionRow, error } = existing
    ? await admin.from("subscriptions").update(payload).eq("id", existing.id).select().single()
    : await admin.from("subscriptions").insert(payload).select().single();

  if (error) throw error;

  if (teamId) {
    await admin.from("teams").update({ subscription_id: subscriptionRow.id }).eq("id", teamId);
  }

  const { error: resetError } = await admin.rpc("reset_credits", {
    p_subscription_id: subscriptionRow.id,
    p_cycle_start: now.toISOString(),
    p_cycle_end: creditsCycleEnd.toISOString(),
  });
  if (resetError) throw resetError;
}
