-- ============================================================
-- Consolidated migration bundle: remaining original-brief modules
-- (Prayer Journal, Notification Settings, Church Admin, Financeiro
-- Básico, Badges). Liturgical suggestions need no schema change.
--
-- Run this ONCE in the Supabase SQL Editor, after the two previous
-- consolidated files you already ran (through migration 0022). It
-- only includes what's new since then: migrations 0023-0027 plus
-- the badges catalog seed data — NOT a re-run of the Bible/Quiz
-- seed sections from last time, which would duplicate those rows.
-- ============================================================

-- ---- migrations/0023_church_admin.sql ----
-- Church Admin: member contact list, a lightweight event calendar with
-- reminders, and an email-broadcast log — the "Comunicação" module from the
-- original brief. Church Pro only, gated the same way the rest of the team
-- workspace already is (a subscription's team_id is only ever set for
-- church_pro plans).
create table public.church_contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (team_id, email)
);

create index church_contacts_team_id_idx on public.church_contacts(team_id);

create table public.church_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  reminder_days_before int not null default 1,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index church_events_team_id_idx on public.church_events(team_id, event_date);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sent_by uuid not null references auth.users(id),
  subject text not null,
  body text not null,
  template_type text not null default 'custom'
    check (template_type in ('custom', 'sunday_bulletin', 'event_reminder')),
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);

create index communications_team_id_idx on public.communications(team_id, created_at desc);

alter table public.church_contacts enable row level security;
alter table public.church_events enable row level security;
alter table public.communications enable row level security;

-- Any team member can view (transparency); only the team owner can write —
-- same "team_role = 'owner'" exists-check the team_invites_insert_owner
-- policy (0015_rls_policies.sql) already uses.
create policy "church_contacts_select_team" on public.church_contacts
  for select using (team_id = public.current_team_id());

create policy "church_contacts_insert_owner" on public.church_contacts
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_contacts.team_id and team_role = 'owner'
    )
  );

create policy "church_contacts_delete_owner" on public.church_contacts
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_contacts.team_id and team_role = 'owner'
    )
  );

create policy "church_events_select_team" on public.church_events
  for select using (team_id = public.current_team_id());

create policy "church_events_insert_owner" on public.church_events
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_events.team_id and team_role = 'owner'
    )
  );

create policy "church_events_delete_owner" on public.church_events
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_events.team_id and team_role = 'owner'
    )
  );

create policy "communications_select_team" on public.communications
  for select using (team_id = public.current_team_id());

create policy "communications_insert_owner" on public.communications
  for insert with check (
    sent_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = communications.team_id and team_role = 'owner'
    )
  );
-- No update/delete policy: the send log is append-only.

-- ---- migrations/0024_financial_transactions.sql ----
-- Financeiro Básico: a simple income/expense ledger for a church, not a real
-- accounting system — no receipts, no bank integration, no reconciliation.
-- Category is free text with UI-suggested options rather than a separate
-- categories table, matching the brief's "categorias simples configuráveis".
create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  category text not null,
  description text,
  occurred_on date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index financial_transactions_team_id_idx
  on public.financial_transactions(team_id, occurred_on desc);

alter table public.financial_transactions enable row level security;

-- Same team-read / owner-write shape as church_contacts/church_events
-- (0023_church_admin.sql) — transparency for the whole team, but only the
-- owner (treasurer) can record or remove transactions.
create policy "financial_transactions_select_team" on public.financial_transactions
  for select using (team_id = public.current_team_id());

create policy "financial_transactions_insert_owner" on public.financial_transactions
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = financial_transactions.team_id and team_role = 'owner'
    )
  );

create policy "financial_transactions_delete_owner" on public.financial_transactions
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = financial_transactions.team_id and team_role = 'owner'
    )
  );

-- ---- migrations/0025_notification_prefs.sql ----
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

-- ---- migrations/0026_prayer_requests.sql ----
-- Personal prayer journal: a list of requests the user can mark as answered.
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_answered boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index prayer_requests_user_id_idx on public.prayer_requests(user_id, created_at desc);

alter table public.prayer_requests enable row level security;

create policy "prayer_requests_all_own" on public.prayer_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- migrations/0027_badges.sql ----
-- Conquistas/Badges: a small fixed catalog of achievements, awarded
-- idempotently by the admin client from various API routes.
create table public.badges (
  code text primary key,
  name text not null,
  description text not null,
  icon_key text not null -- maps to a lucide-react icon name in the UI
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null references public.badges(code),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

create index user_badges_user_id_idx on public.user_badges(user_id);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Shared catalog, same posture as seasonal_templates: readable by any
-- authenticated user, writable only via migrations/seed.
create policy "badges_select_authenticated" on public.badges
  for select using (auth.role() = 'authenticated');

create policy "user_badges_select_own" on public.user_badges
  for select using (user_id = auth.uid());
-- No insert/update/delete policy: badges are awarded exclusively by the
-- service-role admin client (src/lib/badges/award.ts), never by the client
-- directly — a user can't self-award an achievement.

-- ---- seed.sql: new section only (Badges catalog) ----
-- Conquistas/Badges catalog — icon_key maps to a lucide-react icon name.
insert into public.badges (code, name, description, icon_key)
values
  ('first_art', 'First Art', 'Generated your first piece of Bible art.', 'Palette'),
  ('first_post', 'First Post', 'Created your first social post.', 'Layers'),
  ('first_devotional_note', 'Reflective Heart', 'Wrote your first devotional note.', 'Sunrise'),
  ('first_message_outline', 'First Message', 'Generated your first sermon outline.', 'Mic'),
  ('first_video', 'First Video', 'Generated your first AI video.', 'Clapperboard'),
  ('streak_7', '7-Day Streak', 'Read the Bible 7 days in a row.', 'Flame'),
  ('streak_30', '30-Day Streak', 'Read the Bible 30 days in a row.', 'Zap'),
  ('ten_chapters_read', 'Ten Chapters', 'Read 10 chapters of the Bible.', 'BookOpen'),
  ('book_complete', 'Book Complete', 'Finished reading an entire book of the Bible.', 'BookMarked'),
  ('quiz_champion', 'Perfect Score', 'Got a perfect score on a Bible trivia quiz.', 'Trophy')
on conflict (code) do update set name = excluded.name, description = excluded.description, icon_key = excluded.icon_key;
