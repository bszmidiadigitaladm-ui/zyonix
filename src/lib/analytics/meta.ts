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

// Ad clicks arrive with ?fbclid=… in the URL. The pixel turns that into the _fbc
// cookie, which is how Meta ties a visit back to the ad — but only if the pixel
// loads while fbclid is still in the URL. Someone who browses to another page
// before accepting would lose it, so it's parked in this tab's sessionStorage
// (never sent anywhere) until they choose.
const CLICK_ID_KEY = "zyonix-fbclid";

function siteCookieDomain(): string | undefined {
  const host = window.location.hostname;
  return host.includes(".") ? `.${host.replace(/^www\./, "")}` : undefined;
}

/** Remembers the ad click id from the current URL, if there is one. */
export function captureAdClickId(): void {
  const id = new URLSearchParams(window.location.search).get("fbclid");
  if (!id) return;
  try {
    window.sessionStorage.setItem(CLICK_ID_KEY, JSON.stringify({ id, ts: Date.now() }));
  } catch {
    // storage blocked: the pixel can still pick it up if they accept on this page
  }
}

/**
 * After consent, recreates the _fbc cookie from a remembered ad click when the
 * visitor has since left the page that carried fbclid. Call before loadMetaPixel.
 */
export function restoreAdClickCookie(): void {
  if (new URLSearchParams(window.location.search).has("fbclid")) return;
  if (document.cookie.split("; ").some((c) => c.startsWith("_fbc="))) return;
  let stored: { id?: unknown; ts?: unknown } | null = null;
  try {
    stored = JSON.parse(window.sessionStorage.getItem(CLICK_ID_KEY) ?? "null");
  } catch {
    return;
  }
  if (!stored || typeof stored.id !== "string" || typeof stored.ts !== "number") return;
  // Meta's format: fb.<subdomain index>.<click time in ms>.<fbclid>
  const value = `fb.1.${stored.ts}.${stored.id}`;
  const domain = siteCookieDomain();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `_fbc=${value}; Max-Age=${90 * 24 * 60 * 60}; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}${secure}`;
}

/** Withdraws consent for the current page session and clears Meta's cookies. */
export function revokeMetaPixel(): void {
  window.fbq?.("consent", "revoke");
  try {
    window.sessionStorage.removeItem(CLICK_ID_KEY);
  } catch {
    // ignore
  }
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
