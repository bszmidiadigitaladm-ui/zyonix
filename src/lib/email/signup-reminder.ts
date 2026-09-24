import { APP_NAME } from "@/lib/config";
import { escapeHtml } from "@/lib/utils";

interface SignupReminderInput {
  fullName: string | null;
  siteUrl: string;
  unsubscribeUrl: string;
  postalAddress: string;
}

export function firstName(fullName: string | null): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

/**
 * The single "you have an account but haven't picked a plan" email. Only claims that
 * the site already makes publicly (prices, guarantee, cancel anytime, what the tools do).
 */
export function buildSignupReminder({ fullName, siteUrl, unsubscribeUrl, postalAddress }: SignupReminderInput) {
  const name = firstName(fullName);
  const planUrl = `${siteUrl}/onboarding/plan?utm_source=email&utm_medium=lifecycle&utm_campaign=signup_reminder`;
  const subject = `Your ${APP_NAME} account is ready: pick a plan to start creating`;

  const bullets = [
    "Turn a Bible verse or theme into art you can share",
    "Write social posts and captions",
    "Build message outlines with verses",
    "Read a daily devotional",
  ];

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f5;">
    <div style="display:none;max-height:0;overflow:hidden;">Your account is ready. Choose a plan and start creating.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1f1d;line-height:1.55;">
          <tr><td>
            <p style="margin:0 0 16px;font-size:18px;font-weight:600;">${escapeHtml(APP_NAME)}</p>
            <p style="margin:0 0 14px;">Hi ${escapeHtml(name)},</p>
            <p style="margin:0 0 14px;">Thanks for creating your ${escapeHtml(APP_NAME)} account. It's ready whenever you are. You just haven't picked a plan yet.</p>
            <p style="margin:0 0 6px;">With ${escapeHtml(APP_NAME)} you can:</p>
            <ul style="margin:0 0 18px;padding-left:20px;">
              ${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("\n              ")}
            </ul>
            <p style="margin:0 0 22px;">
              <a href="${escapeHtml(planUrl)}" style="display:inline-block;background:#16d6c5;color:#04211e;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;">Choose your plan</a>
            </p>
            <p style="margin:0 0 14px;font-size:14px;">Plans start at US$19.90/month. Cancel anytime, and every plan has a 7-day money-back guarantee.</p>
            <p style="margin:0 0 14px;font-size:14px;">AI gives you a draft; you review and edit everything before it's shared.</p>
            <p style="margin:0 0 4px;font-size:14px;">Questions? Just reply to this email.</p>
          </td></tr>
          <tr><td style="border-top:1px solid #e3e8e6;padding-top:16px;font-size:12px;color:#5b6b68;">
            <p style="margin:0 0 6px;">You're getting this one-time reminder because you created a ${escapeHtml(APP_NAME)} account. We won't send it again.</p>
            <p style="margin:0 0 6px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b68;">Unsubscribe</a> from these reminders.</p>
            ${postalAddress ? `<p style="margin:0;">${escapeHtml(postalAddress)}</p>` : ""}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hi ${name},`,
    "",
    `Thanks for creating your ${APP_NAME} account. It's ready whenever you are. You just haven't picked a plan yet.`,
    "",
    `With ${APP_NAME} you can:`,
    ...bullets.map((b) => `- ${b}`),
    "",
    `Choose your plan: ${planUrl}`,
    "",
    "Plans start at US$19.90/month. Cancel anytime, and every plan has a 7-day money-back guarantee.",
    "AI gives you a draft; you review and edit everything before it's shared.",
    "Questions? Just reply to this email.",
    "",
    `You're getting this one-time reminder because you created a ${APP_NAME} account. We won't send it again.`,
    `Unsubscribe: ${unsubscribeUrl}`,
    ...(postalAddress ? [postalAddress] : []),
  ].join("\n");

  return { subject, html, text };
}
