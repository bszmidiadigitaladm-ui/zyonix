-- teams has no FK to subscriptions yet (subscriptions doesn't exist until 0005) —
-- the constraint is added at the end of 0005_subscriptions.sql to avoid a circular
-- forward reference between the two tables.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid,
  created_at timestamptz not null default now()
);

create index teams_owner_id_idx on public.teams(owner_id);
