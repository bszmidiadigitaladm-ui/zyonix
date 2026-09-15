-- 0032 revoked EXECUTE from `authenticated` only, but PostgreSQL grants
-- EXECUTE to PUBLIC by default on function creation — and Supabase never
-- revoked that default for consume_credit/refund_credit. Since PUBLIC
-- includes every role (anon, authenticated, service_role all inherit it),
-- the `authenticated`-only revoke in 0032 did nothing: verified by directly
-- calling both RPCs as a signed-in test user immediately after 0032 was
-- applied — both still succeeded.
--
-- Same gap found on reset_credits (0016/0018), which was never revoked from
-- `authenticated` OR `public` in the first place — its "service_role only"
-- comment was aspirational, not enforced. Verified live: a signed-in test
-- user called it directly and fully refilled their own subscription's
-- credits to the plan's max, repeatable at will (free unlimited credits).
-- This is the most severe of the three since it resets straight to the
-- plan's full allowance in one call, no accumulation needed.
-- Same gap on get_random_quiz_questions (0022_quiz_schema.sql), whose own
-- comment says quiz_questions.correct_index "must never be readable by an
-- authenticated client directly" — verified live: a signed-in test user
-- called it directly and got full question rows including correct_index,
-- i.e. the answer key, before ever submitting a quiz.
revoke execute on function public.consume_credit(uuid, text, int) from public;
revoke execute on function public.refund_credit(uuid, text, int) from public;
revoke execute on function public.reset_credits(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.get_random_quiz_questions(int) from public;

-- Re-affirm the intended grants explicitly (belt and suspenders — these
-- already exist from 0016/0018/0022, but PUBLIC revoke can be surprising,
-- so make the service_role/postgres access explicit here too).
grant execute on function public.consume_credit(uuid, text, int) to service_role;
grant execute on function public.refund_credit(uuid, text, int) to service_role;
grant execute on function public.reset_credits(uuid, timestamptz, timestamptz) to service_role;
grant execute on function public.get_random_quiz_questions(int) to service_role;

-- get_leaderboard and current_team_id are left as-is: both are safe even
-- with the open PUBLIC grant. get_leaderboard returns only
-- (display_name, best_score) with no caller-suppliable owner/user id to
-- spoof — it's the one deliberately public-read surface in the app.
-- current_team_id() reads auth.uid() internally and returns only the
-- calling user's own team_id, so it can't be used to probe anyone else's
-- data regardless of who can call it.
