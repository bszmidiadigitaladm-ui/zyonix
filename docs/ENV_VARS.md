# Environment Variables

Copy `.env.example` to `.env.local` for local development. In production
(Netlify), set these under Site configuration → Environment variables.

Netlify Functions snapshot env vars into the deployed bundle — saving a new
value in the dashboard does **not** reach an already-published function.
Trigger a fresh deploy (a real commit; an empty one can be skipped) after
changing any server-only variable, then confirm via Functions → logs.
If a var still doesn't reach the function after a real redeploy, delete
and re-add it (rather than just re-saving the value) — a var's scopes can
get stuck from however it was first created. Set multiple vars one at a
time, never as concurrent/parallel API calls — writing several at once
was observed to silently drop some of them even though each call reported
success individually.

Rule enforced throughout the codebase: any variable **without** the
`NEXT_PUBLIC_` prefix is server-only and must never be imported from a
`"use client"` component. Server-only variables are only referenced under
`src/app/api/**`, `src/lib/{openai,supabase/admin}.ts`, and
`src/middleware.ts` / `src/proxy.ts`.

## Public (safe to expose in the browser bundle)

| Variable | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key — RLS-enforced client access | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin — used for emailed links, metadata, sitemap and robots (production: `https://zyonix.pro`) | Set manually per environment (e.g. `http://localhost:3000`, or your Netlify URL) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bot protection widget on signup/login. Blank = no widget rendered, and Supabase won't enforce it either | [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add site (free) |

## Server-only secrets

| Variable | Purpose | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — used only in webhook/cron/admin code paths | Supabase Dashboard → Project Settings → API (**keep secret**) |
| `OPENAI_API_KEY` | GPT text, GPT Image, and Moderation endpoint calls | OpenAI Platform → API keys |
| `OPENAI_ORG_ID` | Optional — org-scoped billing/usage attribution | OpenAI Platform → Organization settings |
| `RUNWAY_API_KEY` | Video Studio module (AI video generation, `gen4.5`) and Church Admin event flyer images (`gen4_image`) | [dev.runwayml.com](https://dev.runwayml.com) → API Keys |
| `RESEND_API_KEY` | Sends Church Admin communications, event reminders, and daily devotional reminder emails | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | The verified "from" address used for all outgoing email | [resend.com](https://resend.com) → Domains (must be on a verified domain) |
| `CRON_SECRET` | Shared secret checked by `/api/cron/*` routes | Generate any random string yourself |
| `ERROR_ALERT_WEBHOOK_URL` | Optional. Discord/Slack incoming-webhook that receives a short alert when a server error occurs (same route+message alerts at most once per 10 minutes per server instance) | Discord: channel → Integrations → Webhooks → New webhook. Slack: Incoming Webhooks app |
| `HOTMART_HOTTOK` | Verifies the `X-HOTMART-HOTTOK` header on `/api/hotmart/webhook` | Hotmart Dashboard → Ferramentas → Webhook (HOTTOK is shown when you configure the webhook) |

## Setting up the accounts

1. **Supabase**: create a project, run the migrations in `supabase/migrations/`
   (in order) via the SQL editor or `supabase db push`, then run
   `supabase/seed.sql`. Create a **public** Storage bucket named `generations`
   (Storage → New bucket) for AI-generated art/post assets.
3. **OpenAI**: create an API key with access to `gpt-image-1` and a GPT chat
   model.
4. **Runway** (Video Studio only): create an account at
   [dev.runwayml.com](https://dev.runwayml.com), generate an API key, and add
   credit to the account — generations are billed per second of output.
5. **Resend** (Church Admin communications + daily reminder emails): create an
   account at [resend.com](https://resend.com), verify a sending domain, and
   generate an API key.
6. **Cloudflare Turnstile** (bot protection on signup/login): create a free
   account at [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile
   → Add site. Add your domain(s) (`localhost` works for local dev). Put the
   **Site Key** in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Then in the Supabase
   Dashboard → Authentication → Attack Protection (naming varies by
   dashboard version), enable CAPTCHA protection, choose Turnstile, and paste
   the **Secret Key** there (never put the secret key in this app's env —
   Supabase is the only thing that needs it, since it verifies the token
   server-side).
7. **Hotmart** (active payment processor): create the product and one offer
   per plan (Starter, Pro, Pro Annual). For each offer, add a tracking key
   named `plan_code` with the value `starter` or `church_pro` — this is how
   the webhook knows which plan was purchased. Copy each offer's checkout URL
   and offer code (the `off=` query param) into the `plans` table
   (`hotmart_checkout_url`/`hotmart_offer_code` and the `_annual` variants —
   see `supabase/migrations/0030_hotmart_integration.sql`); this is a plain
   SQL update, so changing an offer later needs no redeploy. Configure a
   webhook pointing at `/api/hotmart/webhook`, subscribed at least to
   purchase-approved and cancellation/refund/chargeback events, and copy the
   HOTTOK it shows into `HOTMART_HOTTOK`.
