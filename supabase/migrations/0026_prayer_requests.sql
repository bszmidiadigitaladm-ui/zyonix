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
