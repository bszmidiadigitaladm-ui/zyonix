import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Hosts the app legitimately talks to / loads from. Supabase serves the API,
// realtime websocket and the public "generations" storage bucket (images, video).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "*.supabase.co";
const TURNSTILE = "https://challenges.cloudflare.com";

// Directives that are safe to enforce today: they don't depend on which
// scripts/styles/images a page pulls in, only on things the app never does.
const ENFORCED_CSP = [
  "frame-ancestors 'none'", // same intent as X-Frame-Options, for modern browsers
  "base-uri 'self'", // a injected <base> can't redirect relative URLs
  "object-src 'none'", // no plugins
  "form-action 'self'", // forms can only post to us
].join("; ");

// The full policy runs in Report-Only mode first: violations show up in the
// browser console instead of breaking a page. Promote it to enforcing once a
// real session (login, checkout redirect, chat, video) shows no violations.
// 'unsafe-inline' is needed for Next's inline bootstrap scripts and Tailwind's
// style tags until nonces are wired through the proxy.
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost}`,
  `media-src 'self' blob: https://${supabaseHost}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} ${TURNSTILE}`,
  `frame-src ${TURNSTILE}`,
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No page here is meant to be framed by another site — blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing content types away from what we declare.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Full URL only ever sent to our own origin; other origins get just the scheme+host.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No feature here needs the camera, mic, location or the Payment Request API.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: ENFORCED_CSP },
          { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
