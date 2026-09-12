-- Global content, one row per calendar day — shared across all users, not per-user.
create table public.devotionals (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  title text not null,
  body text not null,
  scripture_reference text,
  audio_url text, -- reserved for a future TTS enhancement; MVP ships text-only
  created_at timestamptz not null default now()
);

-- Private per-user notes on a devotional.
create table public.devotional_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  devotional_id uuid not null references public.devotionals(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, devotional_id)
);

create index devotional_notes_user_id_idx on public.devotional_notes(user_id);
