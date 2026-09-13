-- Bible reader module. Book names/order/chapter counts are objective canonical
-- facts (seeded in supabase/seed.sql), not copyrighted. Verse *text* is a lazy
-- cache (see bible_verses below) fetched from a free public-domain translation
-- API on first request per chapter — never pre-seeded in full, to avoid a
-- massive upfront import and to keep licensing clean (WEB/KJV in English,
-- Reina-Valera 1909 in Spanish — all public domain).

create table public.bible_translations (
  code text primary key,
  language text not null check (language in ('en', 'es')),
  name text not null,
  license text not null default 'Public Domain'
);

create table public.bible_books (
  code text primary key,
  testament text not null check (testament in ('ot', 'nt')),
  sort_order int not null,
  chapter_count int not null
);

-- The verse-text cache. Populated by the admin client the first time a
-- chapter is requested (src/app/api/bible/chapter/route.ts), never seeded.
create table public.bible_verses (
  id bigint generated always as identity primary key,
  translation_code text not null references public.bible_translations(code),
  book_code text not null references public.bible_books(code),
  chapter int not null,
  verse int not null,
  text text not null,
  unique (translation_code, book_code, chapter, verse)
);

create index bible_verses_lookup_idx on public.bible_verses(translation_code, book_code, chapter);

create table public.reading_plans (
  id text primary key, -- 'thirty-day' | 'ninety-day' | 'year'
  duration_days int not null,
  sort_order int not null
);

-- `readings` is a jsonb array of {"book": code, "chapter": n} for that day —
-- named to avoid colliding with the `references` SQL keyword.
create table public.reading_plan_days (
  id bigint generated always as identity primary key,
  plan_id text not null references public.reading_plans(id) on delete cascade,
  day_number int not null,
  readings jsonb not null,
  unique (plan_id, day_number)
);

create table public.user_reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.reading_plans(id),
  current_day int not null default 1,
  started_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create table public.reading_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_code text not null references public.bible_books(code),
  chapter int not null,
  completed_at timestamptz not null default now(),
  unique (user_id, book_code, chapter)
);

create index reading_progress_user_id_idx on public.reading_progress(user_id);

create table public.bible_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_code text not null references public.bible_books(code),
  chapter int not null,
  verse int, -- null = whole-chapter favorite
  created_at timestamptz not null default now(),
  unique (user_id, book_code, chapter, verse)
);

create index bible_favorites_user_id_idx on public.bible_favorites(user_id);

create table public.bible_study_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('map', 'timeline', 'context')),
  title text not null,
  body text not null,
  image_url text,
  sort_order int not null default 0
);

-- RLS: translations/books/verses/plans/plan_days/study_resources are shared,
-- non-sensitive reference content — read-only for authenticated, writes only
-- via the admin client (seed data, or the lazy-cache route for bible_verses).
alter table public.bible_translations enable row level security;
create policy "bible_translations_select_all" on public.bible_translations for select using (true);

alter table public.bible_books enable row level security;
create policy "bible_books_select_all" on public.bible_books for select using (true);

alter table public.bible_verses enable row level security;
create policy "bible_verses_select_all" on public.bible_verses for select using (true);

alter table public.reading_plans enable row level security;
create policy "reading_plans_select_all" on public.reading_plans for select using (true);

alter table public.reading_plan_days enable row level security;
create policy "reading_plan_days_select_all" on public.reading_plan_days for select using (true);

alter table public.bible_study_resources enable row level security;
create policy "bible_study_resources_select_all" on public.bible_study_resources for select using (true);

-- Own-row RLS for user-generated Bible data.
alter table public.user_reading_plans enable row level security;
create policy "user_reading_plans_all_own" on public.user_reading_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.reading_progress enable row level security;
create policy "reading_progress_all_own" on public.reading_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.bible_favorites enable row level security;
create policy "bible_favorites_all_own" on public.bible_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
