"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { META_PIXEL_ID } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import {
  onConsentBannerRequest,
  readConsent,
  subscribeConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import {
  captureAdClickId,
  grantMetaPixel,
  loadMetaPixel,
  restoreAdClickCookie,
  revokeMetaPixel,
} from "@/lib/analytics/meta";

// The Meta Pixel — and the banner that asks for it — only run on these public
// pages. Signed-in screens, login, password reset and the auth callback are left
// out on purpose: their URLs can carry one-time codes or error details that must
// never be sent to a third party. /onboarding/plan is the one signed-in page
// included: it's where people land after signing up to pick a plan, and its URL
// carries nothing sensitive.
const TRACKED_PATHS = new Set(["/", "/terms", "/privacy", "/welcome", "/signup", "/onboarding/plan"]);

const CHOICE_BUTTON = "flex-1 border-foreground/30 font-semibold";

/**
 * Asks for consent to optional advertising cookies and, only if the visitor
 * accepts, loads the Meta Pixel and reports page views on the public pages.
 * Declining is as easy as accepting, and can be changed later from the footer.
 */
export function TrackingConsent() {
  const t = useTranslations("consent");
  const pathname = usePathname();
  const consent = useSyncExternalStore<ConsentChoice | null | "pending">(subscribeConsent, readConsent, () => "pending");
  const [reopened, setReopened] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);
  const eligible = TRACKED_PATHS.has(pathname);

  useEffect(() => onConsentBannerRequest(() => setReopened(true)), []);

  useEffect(() => {
    if (eligible && readConsent() !== "denied") captureAdClickId();
  }, [eligible, pathname]);

  useEffect(() => {
    if (consent === "granted" && eligible) {
      restoreAdClickCookie();
      loadMetaPixel(META_PIXEL_ID);
      if (lastTrackedPath.current !== pathname) {
        lastTrackedPath.current = pathname;
        window.fbq?.("track", "PageView");
      }
    } else {
      lastTrackedPath.current = null;
    }
  }, [consent, eligible, pathname]);

  function accept() {
    writeConsent("granted");
    grantMetaPixel();
    setReopened(false);
  }

  function decline() {
    writeConsent("denied");
    revokeMetaPixel();
    setReopened(false);
  }

  const visible = eligible && consent !== "pending" && (consent === null || reopened);
  if (!visible) return null;

  return (
    <div role="dialog" aria-label={t("title")} className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface-raised p-5 shadow-[0_8px_48px_-8px_rgba(0,0,0,0.75)] sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-base font-semibold">{t("title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t.rich("body", {
              privacy: (chunks) => (
                <Link href="/privacy" className="text-accent hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        {/* Same size and style on purpose: declining must be as easy as accepting. */}
        <div className="flex gap-2 sm:w-64 sm:shrink-0">
          <Button variant="secondary" onClick={decline} className={CHOICE_BUTTON}>
            {t("decline")}
          </Button>
          <Button variant="secondary" onClick={accept} className={CHOICE_BUTTON}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
