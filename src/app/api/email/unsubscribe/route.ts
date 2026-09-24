import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/rate-limit";
import { APP_NAME } from "@/lib/config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function html(title: string, body: string, status = 200) {
  const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} | ${APP_NAME}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050f0e;color:#f3efe4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px}
.card{max-width:420px;width:100%;background:#0b1f1d;border:1px solid #16332f;border-radius:16px;padding:28px}
h1{font-size:20px;margin:0 0 10px}p{margin:0 0 18px;color:#b8c4c0;line-height:1.5;font-size:15px}
button{background:#16d6c5;color:#04211e;border:0;border-radius:999px;padding:11px 22px;font-weight:600;font-size:15px;cursor:pointer}
a{color:#16d6c5}</style></head>
<body><div class="card">${body}</div></body></html>`;
  return new Response(doc, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "no-store" },
  });
}

function tokenFrom(request: Request): string | null {
  const token = new URL(request.url).searchParams.get("token");
  return token && UUID.test(token) ? token : null;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// GET only asks for confirmation. Mail scanners and link previewers fetch links with
// GET, so a GET that unsubscribed would silently opt people out who never clicked.
export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!token) return html("Link not valid", `<h1>This link isn't valid</h1><p>It may be incomplete. If you keep getting emails you don't want, write to us and we'll stop them.</p>`, 400);

  return html(
    "Unsubscribe",
    `<h1>Unsubscribe from ${APP_NAME} reminders?</h1>
     <p>We'll stop sending you these reminder emails. You can still use your account as usual.</p>
     <form method="post" action="/api/email/unsubscribe?token=${token}"><button type="submit">Unsubscribe</button></form>`,
  );
}

// POST does the work. It serves both the button above and one-click unsubscribe
// (RFC 8058) from the mail app, which POSTs to the List-Unsubscribe URL.
export async function POST(request: Request) {
  const limited = await rateLimitResponse(`unsubscribe:${clientIp(request)}`, 30, 3600);
  if (limited) return limited;

  const token = tokenFrom(request);
  if (!token) return html("Link not valid", `<h1>This link isn't valid</h1><p>It may be incomplete. If you keep getting emails you don't want, write to us and we'll stop them.</p>`, 400);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ marketing_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id");

  if (error) {
    console.error("Unsubscribe failed", error);
    return html("Something went wrong", `<h1>Something went wrong</h1><p>Please try again in a moment.</p>`, 500);
  }
  if (!data || data.length === 0) {
    return html("Link not valid", `<h1>This link isn't valid</h1><p>We couldn't find that subscription.</p>`, 404);
  }

  return html("Unsubscribed", `<h1>You're unsubscribed</h1><p>You won't get these reminder emails from ${APP_NAME} again.</p>`);
}
