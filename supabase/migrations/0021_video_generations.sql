-- Video Studio module: AI video generation jobs (Runway) plus a media_type
-- column on seasonal_templates so the curated loop library ("Zeal Lab") can
-- serve video loops through the same table used for image templates.
create table public.video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  prompt text not null,
  duration_seconds int not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  video_url text,
  thumbnail_url text,
  runway_job_id text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index video_generations_user_id_idx on public.video_generations(user_id, created_at desc);
create index video_generations_team_id_idx on public.video_generations(team_id, created_at desc);

alter table public.video_generations enable row level security;

create policy "video_generations_select_own_or_team" on public.video_generations
  for select using (
    user_id = auth.uid() or (team_id is not null and team_id = public.current_team_id())
  );

create policy "video_generations_insert_own" on public.video_generations
  for insert with check (user_id = auth.uid());

create policy "video_generations_delete_own" on public.video_generations
  for delete using (user_id = auth.uid());

alter table public.seasonal_templates
  add column media_type text not null default 'image' check (media_type in ('image', 'video'));
