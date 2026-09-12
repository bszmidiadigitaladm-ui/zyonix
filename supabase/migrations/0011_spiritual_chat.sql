-- Spiritual chat is always private to the individual user, even on a Church Pro
-- team plan — no team_id column here by design. Pastoral/personal disclosures
-- must never become visible to a "team admin".
create table public.spiritual_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'crisis_flagged', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spiritual_chat_conversations_user_id_idx on public.spiritual_chat_conversations(user_id, created_at desc);

-- Immutable audit trail: no update/delete RLS policy is ever granted on this table
-- (see 0015_rls_policies.sql) so history can't be altered after the fact.
create table public.spiritual_chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.spiritual_chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized for simple RLS
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  is_crisis_flagged boolean not null default false,
  moderation_categories jsonb,
  created_at timestamptz not null default now()
);

create index spiritual_chat_messages_conversation_id_idx on public.spiritual_chat_messages(conversation_id, created_at);
