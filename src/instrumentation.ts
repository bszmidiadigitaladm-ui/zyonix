import type { Instrumentation } from "next";

// Server-side error reporting. Every unhandled error in a render, route
// handler or server action lands here. It always writes one structured line to
// the function logs (searchable in Netlify by "server_error"), and — when
// ERROR_ALERT_WEBHOOK_URL is set to a Discord/Slack incoming-webhook — also
// posts a short alert so failures don't go unnoticed until a customer writes in.
//
// Deliberately logs no headers or cookies (they carry session tokens).

const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
// Per server instance: the same failing route/message alerts at most once per
// cooldown, so one broken page under traffic can't flood the channel.
const recentAlerts = new Map<string, number>();

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;

  const entry = {
    type: "server_error",
    message,
    digest,
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
  };
  console.error(JSON.stringify(entry));

  const webhookUrl = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const dedupeKey = `${entry.route}:${message}`;
  const last = recentAlerts.get(dedupeKey);
  if (last && Date.now() - last < ALERT_COOLDOWN_MS) return;
  recentAlerts.set(dedupeKey, Date.now());

  const text = `Zyonix error on ${entry.method} ${entry.path} (${entry.route})\n${message.slice(0, 500)}${digest ? `\ndigest: ${digest}` : ""}`;
  try {
    // `content` is Discord's field, `text` is Slack's; each ignores the other.
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, text }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Alerting must never turn one error into two.
  }
};
