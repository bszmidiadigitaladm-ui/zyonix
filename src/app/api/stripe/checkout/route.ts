import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CODES } from "@/lib/config";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const planCode = body?.plan_code;

  if (!planCode || !PLAN_CODES.includes(planCode)) {
    return NextResponse.json({ error: "invalid_plan_code" }, { status: 400 });
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("code, stripe_price_id")
    .eq("code", planCode)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // profiles.stripe_customer_id is protected by a DB trigger (0031) — only
    // the service-role client can write it, so RLS can't be tricked into
    // accepting a client-supplied customer id via this same column.
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan_code: plan.code },
    },
    payment_method_collection: "always",
    metadata: { supabase_user_id: user.id, plan_code: plan.code },
    success_url: `${siteUrl}/onboarding/checkout?status=success`,
    cancel_url: `${siteUrl}/onboarding/plan?status=canceled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout_session_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
