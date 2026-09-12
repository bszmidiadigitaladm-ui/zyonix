import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanCode } from "@/lib/config";
import type { SubscriptionStatus } from "@/lib/types/database.types";

// Stripe's Node SDK needs the Node crypto module for signature verification.
export const runtime = "nodejs";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Billing periods live on the subscription's line item in this Stripe API
 * version, not on the Subscription object itself. We only ever create
 * single-item subscriptions, so item[0]'s period is the subscription's period.
 */
function subscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    start: new Date(item.current_period_start * 1000).toISOString(),
    end: new Date(item.current_period_end * 1000).toISOString(),
  };
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription;
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : subRef.id;
}

async function upsertSubscriptionRow(
  supabase: AdminClient,
  params: {
    stripeSubscription: Stripe.Subscription;
    ownerId: string;
    teamId: string | null;
    planCode: PlanCode;
  },
) {
  const { stripeSubscription, ownerId, teamId, planCode } = params;
  const { start, end } = subscriptionPeriod(stripeSubscription);
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        owner_id: ownerId,
        team_id: teamId,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: customerId,
        plan_code: planCode,
        status: stripeSubscription.status as SubscriptionStatus,
        trial_end: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null,
        current_period_start: start,
        current_period_end: end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        canceled_at: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
          : null,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handleCheckoutCompleted(event: Stripe.CheckoutSessionCompletedEvent) {
  const session = event.data.object;
  const ownerId = session.client_reference_id ?? session.metadata?.supabase_user_id;
  const planCode = session.metadata?.plan_code as PlanCode | undefined;

  if (!ownerId || !planCode || !session.subscription) {
    console.error("checkout.session.completed missing required fields", session.id);
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);

  const supabase = createAdminClient();

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  if (customerId) {
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", ownerId)
      .is("stripe_customer_id", null);
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("is_team_plan")
    .eq("code", planCode)
    .single();

  let teamId: string | null = null;

  if (plan?.is_team_plan) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", ownerId)
      .single();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: `${profile?.full_name ?? profile?.email ?? "My"}'s Team`,
        owner_id: ownerId,
      })
      .select()
      .single();

    if (teamError) throw teamError;
    teamId = team.id;

    await supabase
      .from("profiles")
      .update({ team_id: teamId, team_role: "owner" })
      .eq("id", ownerId);
  }

  const subscriptionRow = await upsertSubscriptionRow(supabase, {
    stripeSubscription,
    ownerId,
    teamId,
    planCode,
  });

  if (teamId) {
    await supabase
      .from("teams")
      .update({ subscription_id: subscriptionRow.id })
      .eq("id", teamId);
  }

  const { start, end } = subscriptionPeriod(stripeSubscription);
  const { error: resetError } = await supabase.rpc("reset_credits", {
    p_subscription_id: subscriptionRow.id,
    p_cycle_start: start,
    p_cycle_end: end,
  });
  if (resetError) throw resetError;
}

async function handleSubscriptionUpdated(event: Stripe.CustomerSubscriptionUpdatedEvent) {
  const stripeSubscription = event.data.object;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, owner_id, team_id, plan_code")
    .eq("stripe_subscription_id", stripeSubscription.id)
    .maybeSingle();

  if (!existing) {
    console.warn("customer.subscription.updated for unknown subscription", stripeSubscription.id);
    return;
  }

  let planCode = existing.plan_code as PlanCode;
  const priceId = stripeSubscription.items.data[0]?.price.id;

  if (priceId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("code")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (plan) planCode = plan.code as PlanCode;
  }

  // Deliberately no credit reset here on a plan change (upgrade/downgrade via
  // the Customer Portal) — the next invoice.payment_succeeded renewal applies
  // the new plan's limits, avoiding an easy upgrade-then-reset abuse path.
  await upsertSubscriptionRow(supabase, {
    stripeSubscription,
    ownerId: existing.owner_id,
    teamId: existing.team_id,
    planCode,
  });
}

async function handleInvoicePaymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent) {
  const subscriptionId = subscriptionIdFromInvoice(event.data.object);
  if (!subscriptionId) return; // one-off invoice, not subscription-related

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, owner_id, team_id, plan_code")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!existing) {
    console.warn("invoice.payment_succeeded for unknown subscription", subscriptionId);
    return;
  }

  const subscriptionRow = await upsertSubscriptionRow(supabase, {
    stripeSubscription,
    ownerId: existing.owner_id,
    teamId: existing.team_id,
    planCode: existing.plan_code as PlanCode,
  });

  // The one and only place recurring credit resets happen — fires both at
  // trial end (first charge) and every renewal after that.
  const { start, end } = subscriptionPeriod(stripeSubscription);
  const { error } = await supabase.rpc("reset_credits", {
    p_subscription_id: subscriptionRow.id,
    p_cycle_start: start,
    p_cycle_end: end,
  });
  if (error) throw error;
}

async function handleInvoicePaymentFailed(event: Stripe.InvoicePaymentFailedEvent) {
  const subscriptionId = subscriptionIdFromInvoice(event.data.object);
  if (!subscriptionId) return;

  const supabase = createAdminClient();
  // Stripe's own Smart Retries handle dunning; we just reflect status so the
  // billing page can prompt the user, and the credit-consumption check can
  // apply a grace-window gate.
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" satisfies SubscriptionStatus })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent) {
  const stripeSubscription = event.data.object;
  const supabase = createAdminClient();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled" satisfies SubscriptionStatus,
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscription.id);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type}`, err);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
