-- Hotmart replaces Stripe as the active payment processor. Both sets of
-- processor-specific columns coexist on `subscriptions` — Stripe's become
-- nullable since a Hotmart-created row won't have them, and vice versa.
alter table public.subscriptions
  alter column stripe_subscription_id drop not null,
  alter column stripe_customer_id drop not null;

alter table public.subscriptions
  add column hotmart_transaction_code text,
  add column hotmart_subscriber_code text,
  -- Billing cadence (what Hotmart actually charges on) is independent from
  -- credit refresh cadence, which is always monthly regardless — see
  -- credits_cycle_end below and 0031's monthly-credit-refresh cron.
  add column billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  add column credits_cycle_end timestamptz;

create unique index subscriptions_hotmart_transaction_unique
  on public.subscriptions(hotmart_transaction_code)
  where hotmart_transaction_code is not null;

-- Backfill: existing (Stripe-era) rows refresh credits on their normal
-- billing renewal, same as before — give them a credits_cycle_end matching
-- their current billing period so the new monthly-refresh cron leaves them
-- alone until Stripe's own webhook naturally updates current_period_end.
update public.subscriptions set credits_cycle_end = current_period_end where credits_cycle_end is null;

-- Where each plan's Hotmart checkout link/offer code live. These are public
-- checkout URLs, not secrets, so a normal table column is fine (no env var
-- needed) — and it means changing an offer later is a SQL update, not a
-- redeploy.
alter table public.plans
  add column hotmart_checkout_url text,
  add column hotmart_offer_code text,
  add column hotmart_checkout_url_annual text,
  add column hotmart_offer_code_annual text,
  -- Monthly-equivalent display price for the annual offer (billed as one
  -- annual charge, e.g. $264/yr = $22/mo) — null for plans with no annual
  -- option.
  add column annual_monthly_equivalent_usd numeric(6, 2);

update public.plans set
  hotmart_checkout_url = 'https://pay.hotmart.com/R107627031E?off=z7asq0l3&checkoutMode=10',
  hotmart_offer_code = 'z7asq0l3'
where code = 'starter';

update public.plans set
  hotmart_checkout_url = 'https://pay.hotmart.com/R107627031E?off=mx2ms7hv&checkoutMode=10',
  hotmart_offer_code = 'mx2ms7hv',
  hotmart_checkout_url_annual = 'https://pay.hotmart.com/R107627031E?off=6z7z0oxh&checkoutMode=10',
  hotmart_offer_code_annual = '6z7z0oxh',
  annual_monthly_equivalent_usd = 22.00
where code = 'church_pro';
