import { Resend } from "resend";

// Lazily constructed for the same reason as lib/openai/client.ts: Next.js
// imports every API route module at build time to collect its config, which
// would throw here if RESEND_API_KEY isn't present in the build environment.
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

/**
 * Sends one email. Never throws — callers that loop over many recipients
 * (church broadcasts, daily reminders) must not have one bad address or a
 * transient API error abort the whole batch. Returns whether it succeeded so
 * callers can count/report failures if they want to.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
  replyTo?: string;
}): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: params.to,
      subject: params.subject,
      html: params.html,
      bcc: params.bcc,
      replyTo: params.replyTo,
    });
    if (error) {
      console.error("Resend send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send threw", err);
    return false;
  }
}

// Resend caps a single message at 50 recipients (to + cc + bcc combined), so a
// church list bigger than that has to go out as several messages.
const BCC_BATCH_SIZE = 45;

/**
 * Sends the same message to a large list as bcc batches (nobody sees anyone
 * else's address), one Resend call per batch. Never throws; reports how many
 * recipients were in batches that actually went out.
 */
export async function sendBccBatches(params: {
  recipients: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < params.recipients.length; i += BCC_BATCH_SIZE) {
    const batch = params.recipients.slice(i, i + BCC_BATCH_SIZE);
    const ok = await sendEmail({
      to: process.env.RESEND_FROM_EMAIL!,
      bcc: batch,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (ok) sent += batch.length;
    else failed += batch.length;
  }

  return { sent, failed };
}
