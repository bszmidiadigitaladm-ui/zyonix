-- Daily devotional reminder preferences. Real per-user timezone-aware
-- scheduling isn't practical for a single daily cron without storing a real
-- timezone, so "configurable time" is scoped to three broad slots — the
-- external scheduler hits /api/cron/daily-reminder once per slot per day.
alter table public.profiles
  add column daily_reminder_enabled boolean not null default true,
  add column reminder_slot text not null default 'morning'
    check (reminder_slot in ('morning', 'afternoon', 'evening'));

-- No new RLS policy needed: the existing profiles_update_own policy
-- (0015_rls_policies.sql) already covers these columns.
