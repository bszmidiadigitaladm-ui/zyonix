-- 0033's "revoke ... from public" was based on a wrong assumption: these
-- functions were never granted to PUBLIC. Supabase's project bootstrap sets
-- `alter default privileges in schema public grant execute on functions to
-- anon, authenticated, service_role` — so every new function gets three
-- SEPARATE explicit grants at creation time, not one PUBLIC grant. 0033's
-- revoke was a no-op for all four functions.
--
-- Confirmed via a live pg_proc/has_function_privilege query after 0033:
--   consume_credit / refund_credit  → anon: true,  authenticated: false
--   reset_credits / get_random_quiz_questions → anon: true, authenticated: true
-- The `authenticated: false` on the first two is only because 0032 revoked
-- from `authenticated` specifically (never from `anon`). reset_credits and
-- get_random_quiz_questions never had an authenticated-specific revoke at
-- all, so both grants were still fully intact.
--
-- Net effect until this migration: consume_credit and refund_credit were
-- callable by literally anyone, authenticated or not (just the public anon
-- key, no login) — worse than "any signed-in user" as originally reported.
-- reset_credits and get_random_quiz_questions were wide open to both anon
-- and authenticated callers the whole time, 0033 notwithstanding.
revoke execute on function public.consume_credit(uuid, text, int) from anon, authenticated;
revoke execute on function public.refund_credit(uuid, text, int) from anon, authenticated;
revoke execute on function public.reset_credits(uuid, timestamptz, timestamptz) from anon, authenticated;
revoke execute on function public.get_random_quiz_questions(int) from anon, authenticated;
