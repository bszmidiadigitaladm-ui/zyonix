import { readConsent } from "./consent";

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  disablePushState?: boolean;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/**
 * Installs Meta's standard queueing stub and loads fbevents.js. Calls made before
 * the library finishes loading are queued, so callers never need to wait for it.
 * Idempotent.
 */
export function loadMetaPixel(pixelId: string): void {
  if (window.fbq) return;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as FbqFn;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // By default the library fires a PageView on every history change by itself,
  // which would also report pages we deliberately keep out (login, signed-in app).
  // TrackingConsent sends PageView only for the allowed public pages instead.
  fbq.disablePushState = true;
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  // Automatic Configuration would let Meta scrape button clicks and page
  // metadata on its own; we only send the events we choose to send.
  fbq("set", "autoConfig", false, pixelId);
  fbq("init", pixelId);
}

/** Withdraws consent for the current page session and clears Meta's cookies. */
export function revokeMetaPixel(): void {
  window.fbq?.("consent", "revoke");
  const host = window.location.hostname;
  const domains = [undefined, host, `.${host.replace(/^www\./, "")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/** Re-enables a pixel that was loaded earlier in this session and then revoked. */
export function grantMetaPixel(): void {
  window.fbq?.("consent", "grant");
}

/** Sends a standard Meta event. A no-op unless the visitor accepted and the pixel is loaded. */
export function trackMeta(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.fbq || readConsent() !== "granted") return;
  window.fbq("track", event, params);
}
