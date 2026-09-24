export const APP_NAME = "Zyonix";

export const PLAN_CODES = ["starter", "church_pro"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const CREDIT_TYPES = ["image", "text", "video"] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

// Where buyers cancel, update their card and download invoices — Hotmart's
// consumer area (purchase.hotmart.com redirects here).
export const HOTMART_MANAGE_URL = "https://consumer.hotmart.com/";

// Canonical public origin, used for metadata, sitemap and robots. Falls back to
// the production domain so those files are right even if the env var is unset.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://zyonix.pro").replace(/\/$/, "");

// Meta (Facebook/Instagram) Pixel for ad campaigns. A pixel ID is public by design
// (it ships to every visitor's browser), so it lives here rather than in an env var
// that would need to be set at build time on Netlify. It only loads after consent —
// see src/components/analytics/TrackingConsent.tsx.
export const META_PIXEL_ID = "3309931505858975";

// Postal address printed in the footer of marketing email (CAN-SPAM requires a valid
// one). Marketing sends are switched off while this is empty — see
// src/app/api/cron/signup-reminder/route.ts. Use an address you're happy to publish
// (a PO box or virtual mailbox works).
export const BUSINESS_POSTAL_ADDRESS = "";

// Money-back window shown on pricing and in the FAQ. Hotmart enforces its own
// guarantee period per product — keep this in sync with the product's setting.
export const GUARANTEE_DAYS = 7;
