-- Product restructure: 2 tiers instead of 3, plus a Hotmart-only annual
-- offer on the higher tier (no schema change needed for that — an annual
-- Hotmart offer just sends the same plan_code tracking value as its monthly
-- counterpart, so it's indistinguishable from a monthly purchase to us).
--
-- "Creator" is folded into "church_pro", renamed "Pro" in display_name only
-- — the internal code stays church_pro to avoid migrating every team_id/
-- is_team_plan-dependent row (teams, church_contacts, church_events,
-- financial_transactions, communications). church_pro's plan_limits were
-- already equal-or-better than creator's in every column, so the merged
-- tier keeps them unchanged.
delete from public.plan_limits where plan_code = 'creator';
delete from public.plans where code = 'creator';

update public.plans set monthly_price_usd = 19.90 where code = 'starter';
update public.plans set display_name = 'Pro', sort_order = 2 where code = 'church_pro';
