-- Poster templates: a ready-made church poster that the image model re-renders
-- with the person's own details. Generated in the background like Bible art
-- (see 0041): a `pending` row is inserted, then finished when the image is ready.
create table public.poster_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  template_slug text not null,
  fields jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  instructions text not null,
  prompt_used text not null,
  used_photo boolean not null default false,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index poster_generations_user_id_idx on public.poster_generations(user_id, created_at desc);
create index poster_generations_team_id_idx on public.poster_generations(team_id, created_at desc);
create index poster_generations_pending_idx
  on public.poster_generations(user_id, created_at)
  where status = 'pending';

alter table public.poster_generations enable row level security;

create policy "poster_generations_select_own_or_team" on public.poster_generations
  for select using (
    user_id = auth.uid() or (team_id is not null and team_id = public.current_team_id())
  );

create policy "poster_generations_delete_own" on public.poster_generations
  for delete using (user_id = auth.uid());
-- No insert/update policy: rows are written only by the server via the admin client.

-- Usage log feature check (same widening pattern as 0019 / 0028).
alter table public.ai_usage_log drop constraint ai_usage_log_feature_check;
alter table public.ai_usage_log add constraint ai_usage_log_feature_check
  check (feature in ('bible_art', 'post_caption', 'devotional', 'spiritual_chat', 'message_outline', 'video', 'event_flyer', 'poster'));
