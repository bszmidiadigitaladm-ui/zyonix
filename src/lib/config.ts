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
