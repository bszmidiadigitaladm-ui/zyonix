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
