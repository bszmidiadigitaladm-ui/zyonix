create table public.bible_art_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null, -- populated when the creator is on a team plan, for the shared library
  verse_reference text,
  theme text,
  style text not null,
  output_format text not null check (output_format in ('square', 'story')),
  prompt_used text not null,
  image_url text not null,
  thumbnail_url text,
  resolution text not null,
  watermarked boolean not null default true,
  created_at timestamptz not null default now()
);

create index bible_art_generations_user_id_idx on public.bible_art_generations(user_id, created_at desc);
create index bible_art_generations_team_id_idx on public.bible_art_generations(team_id, created_at desc);

create table public.social_post_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  template_id uuid references public.seasonal_templates(id) on delete set null,
  format text not null check (format in ('feed', 'story', 'carousel')),
  caption_text text,
  verse_reference text,
  export_url text,
  created_at timestamptz not null default now()
);

create index social_post_generations_user_id_idx on public.social_post_generations(user_id, created_at desc);
create index social_post_generations_team_id_idx on public.social_post_generations(team_id, created_at desc);
