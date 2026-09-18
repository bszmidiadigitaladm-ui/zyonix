import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamOwnerId } from "@/lib/auth/session";
import { sendBccBatches } from "@/lib/email/resend";
import { rateLimitResponse } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

const bodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  template_type: z.enum(["custom", "sunday_bulletin", "event_reminder"]).default("custom"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const teamId = await requireTeamOwnerId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "not_team_owner" }, { status: 403 });
  }

  // Every send goes out from our domain, so a runaway or abusive account could
  // burn the sender reputation for everyone. Limits are per team, not per user.
  const hourly = await rateLimitResponse(`church:send:hour:${teamId}`, 5, 3600);
  if (hourly) return hourly;
  const daily = await rateLimitResponse(`church:send:day:${teamId}`, 20, 86400);
  if (daily) return daily;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { subject, body, template_type } = parsed.data;

  const { data: contacts } = await supabase.from("church_contacts").select("email").eq("team_id", teamId);
  const recipients = (contacts ?? []).map((c) => c.email);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "no_contacts" }, { status: 400 });
  }

  const [{ data: team }, { data: sender }] = await Promise.all([
    supabase.from("teams").select("name").eq("id", teamId).single(),
    supabase.from("profiles").select("email, full_name").eq("id", user.id).single(),
  ]);
  const teamName = team?.name ?? APP_NAME;

  // "To" is our own sending address and every real recipient is bcc'd, so no
  // contact ever sees another contact's email address. Escape before wrapping
  // in <p> tags — `body` is authored by the team owner, not us, and an
  // unescaped `<`/`>` would let arbitrary HTML/links ride along in an email
  // sent to the whole congregation. The footer tells recipients who really
  // sent this and how to opt out / report it; replies go to the owner, not us.
  const html =
    body
      .split("\n")
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("") +
    `<hr style="margin-top:24px;border:none;border-top:1px solid #ddd" />
    <p style="font-size:12px;color:#666">
      Sent by ${escapeHtml(teamName)} through ${escapeHtml(APP_NAME)}. You are receiving this because
      ${escapeHtml(teamName)} has your email address. To stop receiving these emails, reply to this
      message and ask to be removed. Believe this is spam? Report it to support@zyonix.pro.
    </p>`;

  const { sent, failed } = await sendBccBatches({
    recipients,
    subject,
    html,
    replyTo: sender?.email,
  });

  if (sent === 0) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  const { data: communication, error } = await supabase
    .from("communications")
    .insert({
      team_id: teamId,
      sent_by: user.id,
      subject,
      body,
      template_type,
      recipient_count: sent,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }

  return NextResponse.json({ communication, failed });
}
