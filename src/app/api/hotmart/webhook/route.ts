import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePlan, activateSubscriptionForProfile } from "@/lib/hotmart/activation";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";
import { safeEqual } from "@/lib/security";

type AdminClient = ReturnType<typeof createAdminClient>;

// Shape confirmed against a real Hotmart 2.0.0 PURCHASE_APPROVED test event
// sent from their webhook test tool — buyer/purchase/subscription field
// paths below are verified. `offer` lives under `data.purchase.offer`, not
// directly under `data` (an earlier version of this code had that wrong).
// `tracking` was absent from the sandbox test payload (it uses a generic
// test product, not one of our configured offers with a tracking key set),
// so that one field's path is still unconfirmed — kept as a secondary
// fallback behind offer.code either way, so a wrong guess there just means
// resolvePlan() falls through to the offer-code lookup instead.
interface HotmartWebhookBody {
  event?: string;
  data?: {
    buyer?: { email?: string; name?: string };
    purchase?: { transaction?: string; status?: string; offer?: { code?: string } };
    subscription?: { subscriber?: { code?: string }; status?: string };
    tracking?: Record<string, string>;
  };
}

const ACTIVATION_KEYWORDS = ["APPROVED", "COMPLETE"];
const CANCELLATION_KEYWORDS = ["CANCEL", "REFUND", "CHARGEBACK", "EXPIRED", "DELAYED"];

type EventKind = "activation" | "cancellation";

// Hotmart retries failed deliveries and sends several events per purchase
// (APPROVED, then COMPLETE), so each (transaction, kind) pair is claimed in
// hotmart_events before any work happens. "unavailable" (e.g. the table
// doesn't exist yet) fails open: a missed dedupe is better than dropping a
// real purchase.
async function claimEvent(admin: AdminClient, key: string, event: string): Promise<"claimed" | "duplicate" | "unavailable"> {
  const { error } = await admin.from("hotmart_events").insert({ dedupe_key: key, event });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  console.error("Hotmart webhook: dedupe check failed, processing anyway", error);
  return "unavailable";
}

async function releaseEvent(admin: AdminClient, key: string) {
  await admin.from("hotmart_events").delete().eq("dedupe_key", key);
}

// Checkout is open to anyone from the pricing page — no signup required
// first — so a purchase can easily arrive before a matching profile exists.
// Rather than lose the activation, stash it and email the buyer a signup
// link; /onboarding/plan applies it the moment they finish signing up.
async function handleUnmatchedPurchase(
  admin: AdminClient,
  params: {
    email: string;
    planCode: string;
    isAnnual: boolean;
    transactionCode?: string;
    subscriberCode?: string;
  },
) {
  const { email, planCode, isAnnual, transactionCode, subscriberCode } = params;

  const { error } = await admin.from("pending_activations").insert({
    email,
    plan_code: planCode,
    is_annual: isAnnual,
    transaction_code: transactionCode ?? null,
    subscriber_code: subscriberCode ?? null,
  });
  if (error) throw error;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const signupUrl = `${siteUrl}/signup?email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: `${APP_NAME}: Your payment is confirmed — create your account`,
    html: `
      <p>Thanks for subscribing to ${escapeHtml(APP_NAME)}!</p>
      <p>Your payment went through. To start creating, create your account using this same email address:</p>
      <p><a href="${signupUrl}">Create your ${escapeHtml(APP_NAME)} account</a></p>
      <p>Your plan activates automatically as soon as your account is set up.</p>
      <p>Already created your account? <a href="${siteUrl}/login">Sign in</a> with this same email address and your plan activates automatically.</p>
    `,
  });
}

// An ordinary cancellation keeps access until the period the customer already
// paid for runs out (see isBillable in lib/auth/session.ts). A refund or chargeback
// gives the money back, so access must end immediately instead: current_period_end
// is pulled to "now". Otherwise a refunded annual plan would stay usable for a year.
async function handleCancellation(
  admin: AdminClient,
  params: { email?: string; subscriberCode?: string; transactionCode?: string; revokeNow: boolean },
) {
  const { email, subscriberCode, transactionCode, revokeNow } = params;
  const nowIso = new Date().toISOString();
  const changes = {
    status: "canceled" as const,
    canceled_at: nowIso,
    ...(revokeNow ? { current_period_end: nowIso, cancel_at_period_end: false } : {}),
  };

  // A purchase refunded before the buyer ever created an account is still waiting in
  // pending_activations; drop it so the plan doesn't switch on when they sign up later.
  if (revokeNow) {
    if (transactionCode) await admin.from("pending_activations").delete().eq("transaction_code", transactionCode);
    if (subscriberCode) await admin.from("pending_activations").delete().eq("subscriber_code", subscriberCode);
  }

  if (subscriberCode) {
    const { error } = await admin.from("subscriptions").update(changes).eq("hotmart_subscriber_code", subscriberCode);
    if (!error) return;
  }

  if (!email) return;

  const { data: profile } = await admin.from("profiles").select("id, team_id").eq("email", email).maybeSingle();
  if (!profile) return;

  const query = admin.from("subscriptions").update(changes);

  if (profile.team_id) await query.eq("team_id", profile.team_id);
  else await query.eq("owner_id", profile.id).is("team_id", null);
}

export async function POST(request: Request) {
  const hottok = request.headers.get("x-hotmart-hottok");
  const expectedHottok = process.env.HOTMART_HOTTOK;
  if (!hottok || !expectedHottok || !safeEqual(hottok, expectedHottok)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as HotmartWebhookBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Full payload still logged — `tracking` (the primary plan-resolution
  // path) remains unconfirmed against a real payload; see the interface
  // comment above.
  console.log("Hotmart webhook received:", JSON.stringify(body));

  const event = body.event ?? "";
  const data = body.data ?? {};
  const email = data.buyer?.email;
  const offerCode = data.purchase?.offer?.code;
  const trackingPlanCode = data.tracking?.plan_code;
  const transactionCode = data.purchase?.transaction;
  const subscriberCode = data.subscription?.subscriber?.code;

  const admin = createAdminClient();

  const upperEvent = event.toUpperCase();
  const kind: EventKind | null = ACTIVATION_KEYWORDS.some((k) => upperEvent.includes(k))
    ? "activation"
    : CANCELLATION_KEYWORDS.some((k) => upperEvent.includes(k))
      ? "cancellation"
      : null;

  let claimedKey: string | null = null;
  if (kind && transactionCode) {
    // Cancellation keys carry the exact event name: "cancel, then refund" produces two
    // different events for the same transaction, and the refund must not be swallowed
    // as a duplicate of the cancellation. A retry of the same event still dedupes.
    const key = kind === "cancellation" ? `${transactionCode}:cancellation:${upperEvent}` : `${transactionCode}:${kind}`;
    const claim = await claimEvent(admin, key, event);
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (claim === "claimed") claimedKey = key;
  }

  try {
    if (kind === "activation") {
      const resolved = await resolvePlan(admin, trackingPlanCode, offerCode);
      if (!resolved || !email) {
        console.error("Hotmart webhook: could not resolve plan or buyer email", { event, offerCode, email });
        // Release so a manual resend from Hotmart is processed once the plan config is fixed.
        if (claimedKey) await releaseEvent(admin, claimedKey);
        return NextResponse.json({ received: true });
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("id, email, full_name, team_id")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        await activateSubscriptionForProfile(admin, { profile, ...resolved, transactionCode, subscriberCode });
      } else {
        await handleUnmatchedPurchase(admin, { email, ...resolved, transactionCode, subscriberCode });
      }
    } else if (kind === "cancellation") {
      await handleCancellation(admin, {
        email,
        subscriberCode,
        transactionCode,
        revokeNow: upperEvent.includes("REFUND") || upperEvent.includes("CHARGEBACK"),
      });
    }
  } catch (err) {
    console.error(`Error handling Hotmart webhook event ${event}`, err);
    // Let Hotmart's retry through: the failed attempt must not count as handled.
    if (claimedKey) await releaseEvent(admin, claimedKey);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
