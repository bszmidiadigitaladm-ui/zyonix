-- Security fix: consume_credit/refund_credit (0016, re-granted in 0018) are
-- `security definer` and were granted to `authenticated`, but neither checks
-- that the calling user (auth.uid()) actually owns p_owner_id. Since they're
-- exposed as Postgres RPCs, any signed-in user could call them directly via
-- Supabase's REST API (their own JWT + the public anon key) with an
-- arbitrary p_owner_id and p_amount:
--   - refund_credit(own_owner_id, 'image', 999999) mints unlimited free
--     credits for themselves — direct OpenAI/Runway cost abuse.
--   - consume_credit(any_other_owner_id, 'image', 999999) drains another
--     user's or team's balance to zero — a griefing/denial-of-service vector.
--
-- Every real caller already goes through src/lib/credits/consume.ts, which
-- uses the service-role client exclusively (confirmed: no client-side or
-- RLS-scoped call site exists). reset_credits already follows this same
-- service_role-only principle — these two should too.
revoke execute on function public.consume_credit(uuid, text, int) from authenticated;
revoke execute on function public.refund_credit(uuid, text, int) from authenticated;
