# Ad tracking (Meta Pixel)

Pixel ID: `META_PIXEL_ID` in `src/lib/config.ts` (public by design, not a secret).

## Rules this implementation follows

- **Consent first.** Nothing from Meta loads until the visitor clicks Accept in the cookie
  banner. The choice is stored in `localStorage` (`zyonix-tracking-consent`). Declining is as
  easy as accepting, and "Cookie preferences" in the footer reopens the banner.
- **Public pages only.** The pixel and banner run only on `/`, `/terms`, `/privacy`,
  `/welcome` and `/signup` (`TRACKED_PATHS` in `src/components/analytics/TrackingConsent.tsx`).
  Signed-in screens, `/login`, password reset and `/auth/callback` are excluded because their
  URLs can carry one-time codes or error details. Add a path to that list only if its URL is safe
  to send to a third party.
- **Only the events we choose.** Meta's own automatic PageView-on-navigation and Automatic
  Configuration are switched off (`src/lib/analytics/meta.ts`); PageView is sent once per allowed page.

## Events sent (only after consent)

| Event | Where |
|---|---|
| `PageView` | each allowed public page |
| `InitiateCheckout` (value, currency USD, plan, cycle) | click on a plan's checkout button (`PlanCard`) |
| `CompleteRegistration` | successful email sign-up (`/signup`) |

`Purchase` is **not** sent from the site: the payment happens on Hotmart, so it is configured in
Hotmart's own Meta Pixel integration (same pixel ID), where it fires on their confirmation page.

## Also required outside the code

- Privacy policy text about the pixel lives in `src/lib/legal/content.ts` (sections 2, 3, 4 and 6).
  Keep it in sync if events or pages change; have it reviewed by a lawyer.
- In Meta Events Manager: turn off Automatic Advanced Matching, and verify the `zyonix.pro` domain.
