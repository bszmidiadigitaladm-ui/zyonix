import { Resend } from "resend";

// Lazily constructed for the same reason as lib/openai/client.ts and
// lib/stripe/client.ts: Next.js imports every API route module at build time
// to collect its config, which would throw here if RESEND_API_KEY isn't
// present in the build environment.
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
}): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: params.to,
      subject: params.subject,
      html: params.html,
      bcc: params.bcc,
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
