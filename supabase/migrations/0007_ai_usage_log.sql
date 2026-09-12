-- Per-user AI cost audit trail. Inserted only by server routes using the
-- service-role/admin client — never trust client-supplied cost figures.
create table public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  plan_code text not null references public.plans(code),
  feature text not null check (feature in ('bible_art', 'post_caption', 'devotional', 'spiritual_chat')),
  provider text not null default 'openai',
  model text not null,
  input_tokens int,
  output_tokens int,
  image_count int,
  estimated_cost_usd numeric(10, 4),
  request_id text,
  created_at timestamptz not null default now()
);

create index ai_usage_log_user_id_idx on public.ai_usage_log(user_id, created_at desc);
create index ai_usage_log_plan_code_idx on public.ai_usage_log(plan_code, created_at desc);
