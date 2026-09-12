-- Human-reviewable safety log. This table is intentionally invisible to every
-- client role (see 0015_rls_policies.sql, which grants it zero policies) —
-- only a service-role key (webhook/API server code, or an internal admin tool)
-- can read or write it. Never exposed to or used punitively against the user.
create table public.crisis_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.spiritual_chat_conversations(id) on delete cascade,
  message_id bigint not null references public.spiritual_chat_messages(id) on delete cascade,
  detection_source text not null check (detection_source in ('openai_moderation', 'keyword_fallback', 'both')),
  severity text not null check (severity in ('high', 'medium')),
  reviewed boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index crisis_flags_user_id_idx on public.crisis_flags(user_id);
create index crisis_flags_reviewed_idx on public.crisis_flags(reviewed);
