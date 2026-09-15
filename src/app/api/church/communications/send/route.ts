import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamOwnerId } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/utils";

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

  // "To" is our own sending address and every real recipient is bcc'd, so no
  // contact ever sees another contact's email address. Escape before wrapping
  // in <p> tags — `body` is authored by the team owner, not us, and an
  // unescaped `<`/`>` would let arbitrary HTML/links ride along in an email
  // sent to the whole congregation.
  const html = body
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  const sent = await sendEmail({
    to: process.env.RESEND_FROM_EMAIL!,
    bcc: recipients,
    subject,
    html,
  });

  if (!sent) {
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
      recipient_count: recipients.length,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }

  return NextResponse.json({ communication });
}
