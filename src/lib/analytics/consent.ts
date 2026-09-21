// Client-side record of the visitor's choice about optional (advertising) cookies.
// Kept in localStorage — the choice itself is not tracking data — and mirrored in
// memory so the current session still respects it when storage is unavailable.

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "zyonix-tracking-consent";
const CHANGE_EVENT = "zyonix:consent-change";
const OPEN_EVENT = "zyonix:consent-open";

let memoryChoice: ConsentChoice | null = null;

export function readConsent(): ConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    // storage blocked (private mode, site data disabled): fall through to memory
  }
  return memoryChoice;
}

export function writeConsent(choice: ConsentChoice): void {
  memoryChoice = choice;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore — the in-memory copy covers this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Lets a "Cookie preferences" link anywhere on the page reopen the banner. */
export function requestConsentBanner(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentBannerRequest(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
