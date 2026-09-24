import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";
import { sendEmail } from "@/lib/email/resend";
import { buildDevotionalReminder } from "@/lib/email/devotional-reminder";
import { BUSINESS_POSTAL_ADDRESS, SITE_URL } from "@/lib/config";

const VALID_SLOTS = ["morning", "afternoon", "evening"] as const;

// Sends today's devotional to every user whose reminder preference matches
// this slot. Real per-user timezone scheduling isn't practical for a single
// daily cron, so this is called once per slot per day by an external
// scheduler — see README.md.
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slotParam = new URL(request.url).searchParams.get("slot");
  if (!VALID_SLOTS.includes(slotParam as (typeof VALID_SLOTS)[number])) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  const slot = slotParam as (typeof VALID_SLOTS)[number];

  const devotional = await ensureTodaysDevotional();

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("email, full_name, unsubscribe_token")
    .eq("daily_reminder_enabled", true)
    .eq("reminder_slot", slot);

  let sent = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?token=${profile.unsubscribe_token}&list=devotional`;
    const { subject, html, text } = buildDevotionalReminder({
      fullName: profile.full_name,
      devotional,
      siteUrl: SITE_URL,
      unsubscribeUrl,
      postalAddress: BUSINESS_POSTAL_ADDRESS,
    });

    const ok = await sendEmail({
      to: profile.email,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ slot, sent, failed });
}
