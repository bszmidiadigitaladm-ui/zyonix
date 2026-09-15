import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CODES, type PlanCode } from "@/lib/config";

type AdminClient = ReturnType<typeof createAdminClient>;

// Best-effort shape based on Hotmart's published 2.0.0 webhook examples
// (buyer/offer/product all live under `data`, same shape across event
// types). Exact field names for `purchase`/`subscription` are NOT verified
// against a real payload yet — every event is logged in full below so the
// first real sale/test purchase can confirm or correct this.
interface HotmartWebhookBody {
  event?: string;
  data?: {
    buyer?: { email?: string; name?: string };
    offer?: { code?: string };
    purchase?: { transaction?: string; status?: string };
    subscription?: { subscriber?: { code?: string }; status?: string };
    tracking?: Record<string, string>;
  };
}

const ACTIVATION_KEYWORDS = ["APPROVED", "COMPLETE"];
const CANCELLATION_KEYWORDS = ["CANCEL", "REFUND", "CHARGEBACK", "EXPIRED", "DELAYED"];

async function resolvePlan(
  admin: AdminClient,
  trackingPlanCode: string | undefined,
  offerCode: string | undefined,
): Promise<{ planCode: PlanCode; isAnnual: boolean } | null> {
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

async function handleActivation(
  admin: AdminClient,
  params: { email: string; planCode: PlanCode; isAnnual: boolean; transactionCode?: string; subscriberCode?: string },
) {
  const { email, planCode, isAnnual, transactionCode, subscriberCode } = params;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, team_id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    console.error("Hotmart webhook: no profile found for buyer email", email);
    return;
  }

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
  const periodEnd = new Date(now);
  if (isAnnual) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

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

async function handleCancellation(admin: AdminClient, params: { email?: string; subscriberCode?: string }) {
  const { email, subscriberCode } = params;

  if (subscriberCode) {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("hotmart_subscriber_code", subscriberCode);
    if (!error) return;
  }

  if (!email) return;

  const { data: profile } = await admin.from("profiles").select("id, team_id").eq("email", email).maybeSingle();
  if (!profile) return;

  const query = admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() });

  if (profile.team_id) await query.eq("team_id", profile.team_id);
  else await query.eq("owner_id", profile.id).is("team_id", null);
}

export async function POST(request: Request) {
  const hottok = request.headers.get("x-hotmart-hottok");
  if (!hottok || hottok !== process.env.HOTMART_HOTTOK) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as HotmartWebhookBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Full payload logged until a real event has confirmed field names —
  // see the module-level comment above.
  console.log("Hotmart webhook received:", JSON.stringify(body));

  const event = body.event ?? "";
  const data = body.data ?? {};
  const email = data.buyer?.email;
  const offerCode = data.offer?.code;
  const trackingPlanCode = data.tracking?.plan_code;
  const transactionCode = data.purchase?.transaction;
  const subscriberCode = data.subscription?.subscriber?.code;

  const admin = createAdminClient();

  try {
    if (ACTIVATION_KEYWORDS.some((k) => event.toUpperCase().includes(k))) {
      const resolved = await resolvePlan(admin, trackingPlanCode, offerCode);
      if (!resolved || !email) {
        console.error("Hotmart webhook: could not resolve plan or buyer email", { event, offerCode, email });
        return NextResponse.json({ received: true });
      }
      await handleActivation(admin, { email, ...resolved, transactionCode, subscriberCode });
    } else if (CANCELLATION_KEYWORDS.some((k) => event.toUpperCase().includes(k))) {
      await handleCancellation(admin, { email, subscriberCode });
    }
  } catch (err) {
    console.error(`Error handling Hotmart webhook event ${event}`, err);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
