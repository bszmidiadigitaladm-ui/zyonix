-- Bible trivia quiz with a global leaderboard.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('old_testament', 'new_testament', 'people', 'miracles', 'general')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question text not null,
  options jsonb not null, -- exactly 4 strings, e.g. '["A", "B", "C", "D"]'
  correct_index int not null check (correct_index between 0 and 3),
  created_at timestamptz not null default now()
);

-- No select policy: quiz_questions.correct_index must never be readable by an
-- authenticated client directly. RLS is enabled with a default-deny stance —
-- only the service-role admin client (which bypasses RLS entirely) reads this
-- table, stripping correct_index before the questions ever reach the browser
-- (see /api/quiz/questions) and using it server-side to grade submissions
-- (see /api/quiz/submit). This is the same "server never trusts the client"
-- posture the plan calls for, enforced at the data layer instead of just the
-- API layer.
alter table public.quiz_questions enable row level security;

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  total_questions int not null,
  -- Snapshotted at submit time (from profiles, server-side) rather than
  -- joined live, so the leaderboard is stable even if the user later renames
  -- themselves, and so a client can never spoof another display name.
  display_name text not null,
  completed_at timestamptz not null default now()
);

create index quiz_sessions_user_id_idx on public.quiz_sessions(user_id, completed_at desc);
create index quiz_sessions_score_idx on public.quiz_sessions(score desc);

alter table public.quiz_sessions enable row level security;

create policy "quiz_sessions_select_own" on public.quiz_sessions
  for select using (user_id = auth.uid());

-- No insert/update/delete policy for authenticated users: sessions are only
-- ever written by the admin client from /api/quiz/submit, which computes the
-- score itself from quiz_questions.correct_index instead of trusting a
-- client-supplied score.

-- Draws a random batch of full question rows (correct_index included) for the
-- service-role admin client to use when building a quiz round — the API
-- route (GET /api/quiz/questions) strips correct_index before responding.
-- Only granted to service_role, never authenticated, so this function can't
-- be called directly from the browser to leak answers.
create or replace function public.get_random_quiz_questions(p_count int default 10)
returns setof public.quiz_questions
language sql
security definer
set search_path = public
stable
as $$
  select * from public.quiz_questions order by random() limit p_count;
$$;

grant execute on function public.get_random_quiz_questions(int) to service_role;

-- Public leaderboard: the one deliberately public-read surface in the app.
-- Exposes only (display_name, best_score) per user — never user_id, email, or
-- any other profile data — via the same security-definer pattern already
-- used by current_team_id(), so quiz_sessions itself never needs a broad
-- read policy.
create or replace function public.get_leaderboard(p_limit int default 20)
returns table (display_name text, best_score int)
language sql
security definer
set search_path = public
stable
as $$
  select display_name, score as best_score
  from (
    select
      display_name,
      score,
      row_number() over (partition by user_id order by score desc, completed_at desc) as rn
    from public.quiz_sessions
  ) ranked
  where rn = 1
  order by best_score desc
  limit p_limit;
$$;

grant execute on function public.get_leaderboard(int) to authenticated;
