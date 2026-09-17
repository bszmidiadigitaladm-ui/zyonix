import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePlan, activateSubscriptionForProfile } from "@/lib/hotmart/activation";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

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
    `,
  });
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

  try {
    if (ACTIVATION_KEYWORDS.some((k) => event.toUpperCase().includes(k))) {
      const resolved = await resolvePlan(admin, trackingPlanCode, offerCode);
      if (!resolved || !email) {
        console.error("Hotmart webhook: could not resolve plan or buyer email", { event, offerCode, email });
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
    } else if (CANCELLATION_KEYWORDS.some((k) => event.toUpperCase().includes(k))) {
      await handleCancellation(admin, { email, subscriberCode });
    }
  } catch (err) {
    console.error(`Error handling Hotmart webhook event ${event}`, err);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
