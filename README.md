# Zyonix

A recurring-subscription SaaS for Christian content creators: an AI Bible art
generator, a social post/caption generator with seasonal templates, a daily
devotional, and a Bible-principle spiritual chat with crisis detection.

The product name lives in one place — `APP_NAME` in [`src/lib/config.ts`](src/lib/config.ts) — and is interpolated everywhere else (emails, UI copy) rather than hardcoded.

## Stack

Next.js (App Router) + Tailwind · Supabase (Postgres + Auth + Storage) ·
Hotmart subscriptions · OpenAI (GPT text + GPT Image + Moderation) · Netlify hosting.

## First-time setup

1. **Install dependencies**: `npm install`
2. **Create the accounts and env vars** — see [`docs/ENV_VARS.md`](docs/ENV_VARS.md)
   for the full checklist (Supabase project + migrations + seed + Storage
   bucket, Hotmart offers + webhook, OpenAI key). Copy `.env.example` to
   `.env.local` and fill it in.
3. **Generate real Supabase types** once your project exists (replaces the
   hand-written `src/lib/types/database.types.ts`):
   ```bash
   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/types/database.types.ts
   ```
   If you do this, keep the file's inlining convention — see the comment at
   the top of that file before hand-editing it again.
4. **Run the dev server**: `npm run dev` → http://localhost:3000

## Signup → payment flow

Checkout is on Hotmart. A purchase reaches `/api/hotmart/webhook`, which
activates the subscription for the buyer's email — immediately if a Zyonix
account with that email exists, otherwise it is parked in `pending_activations`
and applied the moment they sign up with the same email. Each webhook event is
recorded in `hotmart_events` so Hotmart retries can't double-process a purchase.

## Tuning credit limits

Every plan's image/text credits per cycle, spiritual-chat daily cap,
watermark/quality behavior, and template/carousel gating live in one table:
`plan_limits` (seeded in [`supabase/seed.sql`](supabase/seed.sql), read
through [`src/lib/credits/config.ts`](src/lib/credits/config.ts)). Adjust
values directly in Supabase's SQL editor after measuring real OpenAI cost —
no code changes needed.

## The daily devotional job

`src/app/api/cron/daily-devotional` generates and caches one devotional per
day, gated by a `CRON_SECRET` bearer token. Netlify's native Scheduled
Functions target standalone Netlify Functions, not Next.js API routes, so
point an external scheduler at it instead — a GitHub Actions cron workflow,
[cron-job.org](https://cron-job.org), or Supabase `pg_cron` + `pg_net` —
hitting `POST https://<your-site>/api/cron/daily-devotional` once a day with
header `Authorization: Bearer <CRON_SECRET>`. The devotionals page also
lazy-generates today's entry on first visit if the cron hasn't run yet, so
the feature works in local dev without any scheduler configured.

Two more jobs use the same scheduler + `CRON_SECRET` pattern:

- `POST /api/cron/daily-reminder?slot=morning` (and again with `slot=afternoon`,
  `slot=evening`) — emails today's devotional to every user whose notification
  preference (`/settings`) matches that slot. Schedule all three once a day,
  at whatever wall-clock time you consider "morning"/"afternoon"/"evening" for
  your userbase — there's no per-user timezone, just the slot they picked.
- `POST /api/cron/event-reminders` — once a day, emails a reminder to a
  church's contact list for any `church_events` row whose reminder is due
  today (see "Church Admin" below).

Both require `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to actually send;
without them the routes still run but every send fails (and is logged, not
thrown — one bad address never aborts the whole batch).

A fifth job, `POST /api/cron/signup-reminder`, sends ONE reminder email to people who
created an account (email confirmed) 1-7 days ago and never picked a plan. Once a day,
same `CRON_SECRET` header. It needs migration `0040_signup_reminder.sql`. The email footer
should carry `BUSINESS_POSTAL_ADDRESS` (`src/lib/config.ts`, required by CAN-SPAM). While it
is empty, sending is allowed only because `SEND_MARKETING_WITHOUT_POSTAL_ADDRESS` is on: a
temporary, known compliance gap. Fill the address and turn that switch off to close it.
`?dry=1` lists who would get it without sending anything.
Recipients unsubscribe through `/api/email/unsubscribe`.

A fourth job, `POST /api/cron/monthly-credit-refresh`, uses the same
scheduler + `CRON_SECRET` pattern but runs once a day rather than on a fixed
slot: it refreshes credits for any subscription whose `credits_cycle_end` has
arrived. See "Hotmart payments" below for why this is a separate cycle from
the billing period.

## Hotmart payments

Hotmart is the payment processor. Each `plans`
row carries its own checkout URL(s) and offer code(s)
(`hotmart_checkout_url[_annual]`, `hotmart_offer_code[_annual]`,
`supabase/migrations/0030_hotmart_integration.sql`) — the pricing page just
links straight to Hotmart's checkout, no API call.

`src/app/api/hotmart/webhook` verifies the `X-HOTMART-HOTTOK` header,
resolves which plan was purchased (primarily via a `plan_code` tracking key
sent on the offer, falling back to matching Hotmart's own `offer.code`
against the `plans` table), and activates/cancels the buyer's subscription by
email. Point Hotmart's webhook config at
`https://<your-site>/api/hotmart/webhook`.

Billing period and credit refresh are intentionally decoupled: an annual
subscriber is charged once a year (`subscriptions.current_period_end`), but
their credits still refresh monthly (`subscriptions.credits_cycle_end`,
advanced by the `monthly-credit-refresh` cron above) so a full year of usage
never accrues on one cycle.

The exact JSON field paths for `purchase.transaction`/`subscription.subscriber.code`
are best-effort from Hotmart's public docs, not yet confirmed against a real
payload — the handler logs every payload in full so this can be corrected
after the first real (or sandbox) purchase.

## Church Admin

Church Pro teams get a 4-tab `/team` hub (Workspace/Contacts/Events/
Communications) plus `/team/finances`. Any team member can view; only the
`team_role = 'owner'` can add/remove contacts, events, transactions, or send
a communication — enforced both in each route handler
(`requireTeamOwnerId`, `src/lib/auth/session.ts`) and in RLS. Communications
are sent as a single Resend call with every contact in `bcc`, so contacts
never see each other's addresses; each send is logged in `communications`.

## Project structure

```
src/app/(auth)/       signup, login, onboarding (plan selection + Hotmart checkout links), team invite acceptance
src/app/(app)/        the authenticated shell: dashboard, art, posts, devotionals, chat, templates, billing, team
src/app/api/          Hotmart webhook, AI (art/posts/devotional/chat), account export/delete, credits, team, cron
src/lib/supabase/     server/browser/admin Supabase clients + the middleware session-refresh helper
src/lib/security.ts    constant-time secret comparison + cron auth
src/lib/openai/       lazily-constructed OpenAI client + art/text/chat/moderation prompt logic
src/lib/credits/      plan_limits reader + the consume/refund credit RPC wrappers
src/lib/safety/       crisis keyword fallback list + crisis resources/disclaimer copy
supabase/migrations/  full schema, RLS policies, and the credit RPC functions
supabase/seed.sql     plans, plan_limits, seasonal_templates, a sample devotional
```

## What's deliberately out of scope for this phase

Per the original brief: no marketing/sales landing page, no native mobile
apps, no ChMS integrations. The root `/` route is a minimal placeholder, not
a funnel.
