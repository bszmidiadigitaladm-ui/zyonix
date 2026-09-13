-- Message/sermon prep tool. Consumes the existing `text` credit pool (see
-- ai_usage_log.feature = 'message_outline') — no new credit type needed.
create table public.message_outlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  topic text not null,
  audience text not null,
  duration_minutes int not null,
  style text not null,
  tone text not null,
  outline jsonb not null,
  created_at timestamptz not null default now()
);

create index message_outlines_user_id_idx on public.message_outlines(user_id, created_at desc);
create index message_outlines_team_id_idx on public.message_outlines(team_id, created_at desc);

alter table public.message_outlines enable row level security;

create policy "message_outlines_select_own_or_team" on public.message_outlines
  for select using (
    user_id = auth.uid() or (team_id is not null and team_id = public.current_team_id())
  );

create policy "message_outlines_insert_own" on public.message_outlines
  for insert with check (user_id = auth.uid());

create policy "message_outlines_delete_own" on public.message_outlines
  for delete using (user_id = auth.uid());

-- ai_usage_log.feature is constrained by a check — widen it to include the
-- two new AI features added in this pass (message outlines, video).
alter table public.ai_usage_log drop constraint ai_usage_log_feature_check;
alter table public.ai_usage_log add constraint ai_usage_log_feature_check
  check (feature in ('bible_art', 'post_caption', 'devotional', 'spiritual_chat', 'message_outline', 'video'));
