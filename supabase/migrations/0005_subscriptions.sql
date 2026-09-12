create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  plan_code text not null references public.plans(code),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_end timestamptz,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_owner_id_idx on public.subscriptions(owner_id);
create index subscriptions_team_id_idx on public.subscriptions(team_id);

-- One subscription per solo user, one per team — enforced at the DB level.
create unique index subscriptions_owner_solo_unique on public.subscriptions(owner_id) where team_id is null;
create unique index subscriptions_team_unique on public.subscriptions(team_id) where team_id is not null;

alter table public.teams
  add constraint teams_subscription_id_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete set null;
