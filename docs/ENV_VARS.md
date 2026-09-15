# Environment Variables

Copy `.env.example` to `.env.local` for local development. In production
(Netlify), set these under Site configuration → Environment variables.

Rule enforced throughout the codebase: any variable **without** the
`NEXT_PUBLIC_` prefix is server-only and must never be imported from a
`"use client"` component. Server-only variables are only referenced under
`src/app/api/**`, `src/lib/{stripe,openai,supabase/admin}.ts`, and
`src/middleware.ts` / `src/proxy.ts`.

## Public (safe to expose in the browser bundle)

| Variable | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key — RLS-enforced client access | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Reserved for a future embedded Stripe Elements flow; not required for the current Checkout-redirect flow | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for OAuth/Checkout/Portal redirect URLs | Set manually per environment (e.g. `http://localhost:3000`, or your Netlify URL) |

## Server-only secrets

| Variable | Purpose | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — used only in webhook/cron/admin code paths | Supabase Dashboard → Project Settings → API (**keep secret**) |
| `STRIPE_SECRET_KEY` | Create Checkout Sessions, Portal sessions, read subscriptions | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Verifies the `Stripe-Signature` header on incoming webhooks | Stripe Dashboard → Developers → Webhooks (or `stripe listen` for local dev) |
| `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_CREATOR` / `STRIPE_PRICE_CHURCH_PRO` | Not read directly by the app (the `plans` table is the source of truth) — used only to fill in `supabase/seed.sql` per environment | Stripe Dashboard → Products |
| `OPENAI_API_KEY` | GPT text, GPT Image, and Moderation endpoint calls | OpenAI Platform → API keys |
| `OPENAI_ORG_ID` | Optional — org-scoped billing/usage attribution | OpenAI Platform → Organization settings |
| `RUNWAY_API_KEY` | Video Studio module — AI video generation (Gen-4 Turbo) | [dev.runwayml.com](https://dev.runwayml.com) → API Keys |
| `RESEND_API_KEY` | Sends Church Admin communications, event reminders, and daily devotional reminder emails | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | The verified "from" address used for all outgoing email | [resend.com](https://resend.com) → Domains (must be on a verified domain) |
| `CRON_SECRET` | Shared secret checked by `/api/cron/*` routes | Generate any random string yourself |

## Setting up the accounts

1. **Supabase**: create a project, run the migrations in `supabase/migrations/`
   (in order) via the SQL editor or `supabase db push`, then run
   `supabase/seed.sql`. Create a **public** Storage bucket named `generations`
   (Storage → New bucket) for AI-generated art/post assets.
2. **Stripe**: create 3 recurring monthly Products/Prices ($9.90, $19.90,
   $29.90), copy their Price IDs into `supabase/seed.sql`'s `plans` insert
   (replacing the `price_..._REPLACE_ME` placeholders) and re-run that seed.
   Create a webhook endpoint pointing at `/api/stripe/webhook` subscribed to:
   `checkout.session.completed`, `customer.subscription.updated`,
   `invoice.payment_succeeded`, `invoice.payment_failed`,
   `customer.subscription.deleted`. For local testing, use
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` instead.
3. **OpenAI**: create an API key with access to `gpt-image-1` and a GPT chat
   model.
4. **Runway** (Video Studio only): create an account at
   [dev.runwayml.com](https://dev.runwayml.com), generate an API key, and add
   credit to the account — generations are billed per second of output.
5. **Resend** (Church Admin communications + daily reminder emails): create an
   account at [resend.com](https://resend.com), verify a sending domain, and
   generate an API key.
