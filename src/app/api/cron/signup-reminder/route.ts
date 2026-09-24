import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { buildSignupReminder } from "@/lib/email/signup-reminder";
import { BUSINESS_POSTAL_ADDRESS, SEND_MARKETING_WITHOUT_POSTAL_ADDRESS, SITE_URL } from "@/lib/config";
import { SUPPORT_EMAIL } from "@/lib/legal/content";

const HOUR_MS = 60 * 60 * 1000;
// Wait a day after sign-up, and never email accounts older than a week: this is a
// timely nudge, not a way to reach back into old sign-ups.
const MIN_AGE_MS = 24 * HOUR_MS;
const MAX_AGE_MS = 7 * 24 * HOUR_MS;
// Sends run one after another inside a serverless function with a short time limit.
// A run killed mid-way would leave claimed-but-unsent accounts, so keep batches small;
// anyone left over is picked up by the next daily run.
const MAX_PER_RUN = 20;

const mask = (email: string) => {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
};

// Sends ONE reminder email to people who created an account (email confirmed) but
// have no subscription and no paid-but-unclaimed purchase. Once per account, ever;
// every message carries an unsubscribe link. Called once a day by the external
// scheduler (see README.md). `?dry=1` lists who WOULD get it without sending anything.
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dry = new URL(request.url).searchParams.get("dry") === "1";

  // Marketing email should carry a postal address in the footer. Sending without one is
  // allowed only while SEND_MARKETING_WITHOUT_POSTAL_ADDRESS is on (a deliberate, temporary
  // choice); otherwise nothing is sent. A dry run always works.
  if (!dry && !BUSINESS_POSTAL_ADDRESS) {
    if (!SEND_MARKETING_WITHOUT_POSTAL_ADDRESS) {
      console.warn("signup-reminder: BUSINESS_POSTAL_ADDRESS is empty, not sending");
      return NextResponse.json({ sent: 0, skipped: "missing_postal_address" });
    }
    console.warn("signup-reminder: sending WITHOUT a postal address (SEND_MARKETING_WITHOUT_POSTAL_ADDRESS is on)");
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: candidates, error } = await admin
    .from("profiles")
    .select("id, email, full_name, unsubscribe_token")
    .is("signup_reminder_sent_at", null)
    .eq("marketing_opt_out", false)
    .is("team_id", null) // team members and owners are covered by a subscription
    .gte("created_at", new Date(now - MAX_AGE_MS).toISOString())
    .lte("created_at", new Date(now - MIN_AGE_MS).toISOString())
    .order("created_at")
    .limit(200);

  if (error) {
    // Most likely migration 0040 hasn't been applied yet.
    console.error("signup-reminder: could not load candidates", error);
    return NextResponse.json({ error: "candidates_query_failed" }, { status: 500 });
  }

  const list = candidates ?? [];
  if (list.length === 0) {
    return NextResponse.json({ dry, candidates: 0, eligible: 0, sent: 0, failed: 0 });
  }

  const [{ data: subs }, { data: pending }] = await Promise.all([
    admin.from("subscriptions").select("owner_id").in("owner_id", list.map((p) => p.id)),
    // Paid but hasn't finished setting up: telling them to "pick a plan" would be wrong.
    admin.from("pending_activations").select("email"),
  ]);
  const hasSubscription = new Set((subs ?? []).map((s) => s.owner_id));
  const hasPendingPurchase = new Set((pending ?? []).map((p) => p.email.toLowerCase()));

  const eligible: typeof list = [];
  for (const profile of list) {
    if (hasSubscription.has(profile.id) || hasPendingPurchase.has(profile.email.toLowerCase())) continue;

    // Only confirmed, non-suspended accounts: an unconfirmed address may not be theirs.
    const { data } = await admin.auth.admin.getUserById(profile.id);
    const user = data?.user;
    if (!user?.email_confirmed_at) continue;
    if (user.banned_until && new Date(user.banned_until).getTime() > now) continue;

    eligible.push(profile);
  }

  const batch = eligible.slice(0, MAX_PER_RUN);

  if (dry) {
    return NextResponse.json({
      dry: true,
      candidates: list.length,
      eligible: eligible.length,
      wouldSend: batch.map((p) => mask(p.email)),
    });
  }

  let sent = 0;
  let failed = 0;

  for (const profile of batch) {
    // Claim first, send second: two overlapping runs can't both email the same person.
    const { data: claimed } = await admin
      .from("profiles")
      .update({ signup_reminder_sent_at: new Date().toISOString() })
      .eq("id", profile.id)
      .is("signup_reminder_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?token=${profile.unsubscribe_token}`;
    const { subject, html, text } = buildSignupReminder({
      fullName: profile.full_name,
      siteUrl: SITE_URL,
      unsubscribeUrl,
      postalAddress: BUSINESS_POSTAL_ADDRESS,
    });

    const ok = await sendEmail({
      to: profile.email,
      subject,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (ok) {
      sent++;
    } else {
      failed++;
      // Release the claim so the next run retries (the 7-day window bounds how long).
      await admin.from("profiles").update({ signup_reminder_sent_at: null }).eq("id", profile.id);
    }
  }

  return NextResponse.json({ dry: false, candidates: list.length, eligible: eligible.length, sent, failed });
}
