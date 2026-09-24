import { APP_NAME } from "@/lib/config";
import { escapeHtml } from "@/lib/utils";

interface DevotionalReminderInput {
  fullName: string | null;
  devotional: { title: string; scripture_reference: string | null; body: string };
  siteUrl: string;
  unsubscribeUrl: string;
  /** Printed in the footer when set (see BUSINESS_POSTAL_ADDRESS in config.ts). */
  postalAddress?: string;
}

/**
 * The daily devotional email. Same content as before, plus a footer that says why the
 * person is getting it and how to stop: one-click unsubscribe, or the Settings toggle.
 */
export function buildDevotionalReminder({ fullName, devotional, siteUrl, unsubscribeUrl, postalAddress }: DevotionalReminderInput) {
  const subject = `${APP_NAME}: ${devotional.title}`;
  const excerpt = `${devotional.body.slice(0, 280)}${devotional.body.length > 280 ? "…" : ""}`;
  const settingsUrl = `${siteUrl}/settings`;

  const html = `
    <p>Hi ${escapeHtml(fullName ?? "there")},</p>
    <p>Today's devotional is ready:</p>
    <h2>${escapeHtml(devotional.title)}</h2>
    ${devotional.scripture_reference ? `<p><em>${escapeHtml(devotional.scripture_reference)}</em></p>` : ""}
    <p>${escapeHtml(excerpt)}</p>
    <p><a href="${escapeHtml(siteUrl)}/devotionals">Read the full devotional</a></p>
    <hr style="border:none;border-top:1px solid #e3e8e6;margin:24px 0 12px;">
    <p style="font-size:12px;color:#5b6b68;">
      You're getting this because daily devotional emails are turned on for your ${escapeHtml(APP_NAME)} account.
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b68;">Unsubscribe</a>,
      or change it any time in <a href="${escapeHtml(settingsUrl)}" style="color:#5b6b68;">Settings</a>.
    </p>
    ${postalAddress ? `<p style="font-size:12px;color:#5b6b68;">${escapeHtml(postalAddress)}</p>` : ""}
  `;

  const text = [
    `Hi ${fullName ?? "there"},`,
    "",
    "Today's devotional is ready:",
    devotional.title,
    devotional.scripture_reference ? `(${devotional.scripture_reference})` : "",
    "",
    excerpt,
    "",
    `Read the full devotional: ${siteUrl}/devotionals`,
    "",
    `You're getting this because daily devotional emails are turned on for your ${APP_NAME} account.`,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Or change it in Settings: ${settingsUrl}`,
    postalAddress ?? "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  return { subject, html, text };
}
