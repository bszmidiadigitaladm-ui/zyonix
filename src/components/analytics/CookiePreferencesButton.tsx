"use client";

import { requestConsentBanner } from "@/lib/analytics/consent";

/** Footer link that reopens the cookie banner so a past choice can be changed. */
export function CookiePreferencesButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={requestConsentBanner} className="transition hover:text-foreground">
      {label}
    </button>
  );
}
