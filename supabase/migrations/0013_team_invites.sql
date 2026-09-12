create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index team_invites_team_id_idx on public.team_invites(team_id);
create index team_invites_email_idx on public.team_invites(email);
