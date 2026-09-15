import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";
import { sendEmail } from "@/lib/email/resend";
import { APP_NAME } from "@/lib/config";

const VALID_SLOTS = ["morning", "afternoon", "evening"] as const;

// Sends today's devotional to every user whose reminder preference matches
// this slot. Real per-user timezone scheduling isn't practical for a single
// daily cron, so this is called once per slot per day by an external
// scheduler — see README.md.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
    .select("email, full_name")
    .eq("daily_reminder_enabled", true)
    .eq("reminder_slot", slot);

  let sent = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    const ok = await sendEmail({
      to: profile.email,
      subject: `${APP_NAME}: ${devotional.title}`,
      html: `
        <p>Hi ${profile.full_name ?? "there"},</p>
        <p>Today's devotional is ready:</p>
        <h2>${devotional.title}</h2>
        ${devotional.scripture_reference ? `<p><em>${devotional.scripture_reference}</em></p>` : ""}
        <p>${devotional.body.slice(0, 280)}${devotional.body.length > 280 ? "…" : ""}</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/devotionals">Read the full devotional</a></p>
      `,
    });
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ slot, sent, failed });
}
