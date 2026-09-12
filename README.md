# Faith Studio

A recurring-subscription SaaS for Christian content creators: an AI Bible art
generator, a social post/caption generator with seasonal templates, a daily
devotional, and a Bible-principle spiritual chat with crisis detection.

"Faith Studio" is a working name (`APP_NAME` in [`src/lib/config.ts`](src/lib/config.ts)) — rename it there before launch.

## Stack

Next.js (App Router) + Tailwind · Supabase (Postgres + Auth + Storage) ·
Stripe Subscriptions · OpenAI (GPT text + GPT Image + Moderation) · Netlify hosting.

## First-time setup

1. **Install dependencies**: `npm install`
2. **Create the accounts and env vars** — see [`docs/ENV_VARS.md`](docs/ENV_VARS.md)
   for the full checklist (Supabase project + migrations + seed + Storage
   bucket, Stripe products + webhook, OpenAI key). Copy `.env.example` to
   `.env.local` and fill it in.
3. **Generate real Supabase types** once your project exists (replaces the
   hand-written `src/lib/types/database.types.ts`):
   ```bash
   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/types/database.types.ts
   ```
   If you do this, keep the file's inlining convention — see the comment at
   the top of that file before hand-editing it again.
4. **Run the dev server**: `npm run dev` → http://localhost:3000

## Testing Stripe locally

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET` in
`.env.local`. Then trigger events to exercise each handler in
[`src/app/api/stripe/webhook/route.ts`](src/app/api/stripe/webhook/route.ts):

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

Full signup flow: `/signup` → `/onboarding/plan` → Stripe Checkout (test
card `4242 4242 4242 4242`) → 3-day trial starts → webhook lands →
`subscriptions` + `credits_balance` are populated → redirected into `/dashboard`.

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

## Project structure

```
src/app/(auth)/       signup, login, onboarding (plan selection + Stripe handoff), team invite acceptance
src/app/(app)/        the authenticated shell: dashboard, art, posts, devotionals, chat, templates, billing, team
src/app/api/          Stripe (checkout/portal/webhook), AI (art/posts/devotional/chat), credits, team, cron
src/lib/supabase/     server/browser/admin Supabase clients + the middleware session-refresh helper
src/lib/stripe/       lazily-constructed Stripe client
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
