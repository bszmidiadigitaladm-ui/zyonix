create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  team_id uuid references public.teams(id) on delete set null,
  team_role text check (team_role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_team_id_idx on public.profiles(team_id);
