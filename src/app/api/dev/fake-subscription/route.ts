import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CODES } from "@/lib/config";

// Dev-only shortcut so the app can be exercised locally before a real payment
// processor (Stripe or Hotmart) is wired up. Mirrors what the real
// checkout.session.completed webhook handler does, minus talking to Stripe —
// same tables, same reset_credits RPC, so the rest of the app can't tell the
// difference. Hard-blocked outside development so it can never ship live.
const bodySchema = z.object({ plan_code: z.enum(PLAN_CODES) });

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { plan_code: planCode } = parsed.data;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, team_id, email, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const { data: plan } = await admin
    .from("plans")
    .select("code, is_team_plan")
    .eq("code", planCode)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  let teamId: string | null = profile.team_id;

  if (plan.is_team_plan && !teamId) {
    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({ name: `${profile.full_name ?? profile.email}'s Team (dev)`, owner_id: user.id })
      .select()
      .single();
    if (teamError) {
      return NextResponse.json({ error: "team_create_failed" }, { status: 500 });
    }
    teamId = team.id;
    await admin.from("profiles").update({ team_id: teamId, team_role: "owner" }).eq("id", user.id);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Find any existing subscription for this owner/team so re-running this in
  // dev switches plans in place instead of violating the one-subscription
  // unique index.
  const existingQuery = admin.from("subscriptions").select("id");
  const { data: existing } = teamId
    ? await existingQuery.eq("team_id", teamId).maybeSingle()
    : await existingQuery.eq("owner_id", user.id).is("team_id", null).maybeSingle();

  const subscriptionPayload = {
    owner_id: user.id,
    team_id: teamId,
    stripe_subscription_id: existing ? undefined : `dev-${randomUUID()}`,
    stripe_customer_id: existing ? undefined : `dev-${randomUUID()}`,
    plan_code: planCode,
    status: "active" as const,
    trial_end: null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    canceled_at: null,
  };

  const { data: subscription, error: subError } = existing
    ? await admin
        .from("subscriptions")
        .update(subscriptionPayload)
        .eq("id", existing.id)
        .select()
        .single()
    : await admin
        .from("subscriptions")
        .insert({
          ...subscriptionPayload,
          stripe_subscription_id: subscriptionPayload.stripe_subscription_id!,
          stripe_customer_id: subscriptionPayload.stripe_customer_id!,
        })
        .select()
        .single();

  if (subError || !subscription) {
    return NextResponse.json({ error: "subscription_create_failed" }, { status: 500 });
  }

  const { error: resetError } = await admin.rpc("reset_credits", {
    p_subscription_id: subscription.id,
    p_cycle_start: now.toISOString(),
    p_cycle_end: periodEnd.toISOString(),
  });

  if (resetError) {
    return NextResponse.json({ error: "credit_reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ subscription });
}
