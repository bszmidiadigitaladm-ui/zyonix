import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/utils";

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Once a day, emails a reminder to a church's contact list for any upcoming
// event whose reminder is due today. CRON_SECRET-gated, same pattern as
// daily-devotional / daily-reminder.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = toDateOnly(new Date());

  const { data: events } = await admin
    .from("church_events")
    .select("*")
    .eq("reminder_sent", false)
    .gte("event_date", today);

  const due = (events ?? []).filter((event) => {
    const reminderDate = new Date(event.event_date);
    reminderDate.setDate(reminderDate.getDate() - event.reminder_days_before);
    return toDateOnly(reminderDate) === today;
  });

  let remindersSent = 0;

  for (const event of due) {
    const { data: contacts } = await admin
      .from("church_contacts")
      .select("email")
      .eq("team_id", event.team_id);
    const recipients = (contacts ?? []).map((c) => c.email);

    if (recipients.length > 0) {
      const html = `
        <p>Reminder: <strong>${escapeHtml(event.title)}</strong> is coming up on ${event.event_date}.</p>
        ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
      `;
      const sent = await sendEmail({
        to: process.env.RESEND_FROM_EMAIL!,
        bcc: recipients,
        subject: `Reminder: ${event.title}`,
        html,
      });
      if (sent) remindersSent++;
    }

    await admin.from("church_events").update({ reminder_sent: true }).eq("id", event.id);
  }

  return NextResponse.json({ eventsProcessed: due.length, remindersSent });
}
