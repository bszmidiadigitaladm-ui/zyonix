-- 0032-0035 all tried to lock these functions down via REVOKE, and it kept
-- not sticking: has_function_privilege('anon', ..., 'execute') and
-- ('authenticated', ..., 'execute') came back true immediately after a
-- clean, error-free run of a REVOKE targeting exactly those roles (verified
-- live via pg_proc + has_function_privilege). Whatever mechanism on this
-- Supabase project re-applies (or never actually drops) that grant, fighting
-- it at the GRANT/REVOKE layer has proven unreliable twice in a row.
--
-- Switching strategy: enforce the restriction *inside* the function body
-- instead, the same way 0031's protect_profile_privileged_columns trigger
-- does — checking auth.role() and refusing outright if it isn't
-- 'service_role'. This was verified live and held up immediately, so it's
-- the mechanism actually trustworthy on this project. The REVOKE statements
-- stay in place as defense in depth (harmless if they don't fully take
-- effect — this check is now the real gate, not a backstop).
create or replace function public.consume_credit(
  p_owner_id uuid,
  p_credit_type text,
  p_amount int default 1
) returns table (success boolean, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credits_balance%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'permission denied for function consume_credit';
  end if;

  if p_credit_type not in ('image', 'text', 'video') then
    raise exception 'invalid credit type: %', p_credit_type;
  end if;

  select * into v_row
  from public.credits_balance
  where owner_id = p_owner_id
  for update;

  if not found then
    return query select false, 0;
    return;
  end if;

  if p_credit_type = 'image' then
    if v_row.image_credits_remaining < p_amount then
      return query select false, v_row.image_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set image_credits_remaining = image_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.image_credits_remaining - p_amount;
  elsif p_credit_type = 'text' then
    if v_row.text_credits_remaining < p_amount then
      return query select false, v_row.text_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set text_credits_remaining = text_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.text_credits_remaining - p_amount;
  else
    if v_row.video_credits_remaining < p_amount then
      return query select false, v_row.video_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set video_credits_remaining = video_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.video_credits_remaining - p_amount;
  end if;
end;
$$;

create or replace function public.refund_credit(
  p_owner_id uuid,
  p_credit_type text,
  p_amount int default 1
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'permission denied for function refund_credit';
  end if;

  if p_credit_type not in ('image', 'text', 'video') then
    raise exception 'invalid credit type: %', p_credit_type;
  end if;

  if p_credit_type = 'image' then
    update public.credits_balance
      set image_credits_remaining = image_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  elsif p_credit_type = 'text' then
    update public.credits_balance
      set text_credits_remaining = text_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  else
    update public.credits_balance
      set video_credits_remaining = video_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  end if;
end;
$$;

create or replace function public.reset_credits(
  p_subscription_id uuid,
  p_cycle_start timestamptz,
  p_cycle_end timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_limits public.plan_limits%rowtype;
  v_owner uuid;
  v_is_team boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'permission denied for function reset_credits';
  end if;

  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'subscription % not found', p_subscription_id;
  end if;

  select * into v_limits from public.plan_limits where plan_code = v_sub.plan_code;
  if not found then
    raise exception 'plan_limits for % not found', v_sub.plan_code;
  end if;

  v_owner := coalesce(v_sub.team_id, v_sub.owner_id);
  v_is_team := v_sub.team_id is not null;

  insert into public.credits_balance (
    owner_id, is_team, subscription_id,
    image_credits_remaining, text_credits_remaining, video_credits_remaining,
    cycle_start, cycle_end
  ) values (
    v_owner, v_is_team, p_subscription_id,
    v_limits.image_credits_per_cycle, v_limits.text_credits_per_cycle, v_limits.video_credits_per_cycle,
    p_cycle_start, p_cycle_end
  )
  on conflict (subscription_id) do update set
    owner_id = excluded.owner_id,
    is_team = excluded.is_team,
    image_credits_remaining = excluded.image_credits_remaining,
    text_credits_remaining = excluded.text_credits_remaining,
    video_credits_remaining = excluded.video_credits_remaining,
    cycle_start = excluded.cycle_start,
    cycle_end = excluded.cycle_end,
    updated_at = now();
end;
$$;

create or replace function public.get_random_quiz_questions(p_count int default 10)
returns setof public.quiz_questions
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'permission denied for function get_random_quiz_questions';
  end if;

  return query select * from public.quiz_questions order by random() limit p_count;
end;
$$;

create or replace function public.check_rate_limit(
  p_key text,
  p_max_requests int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'permission denied for function check_rate_limit';
  end if;

  select * into v_row from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits (key, count, window_start) values (p_key, 1, now());
    return true;
  end if;

  if now() - v_row.window_start > (p_window_seconds || ' seconds')::interval then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;

  if v_row.count >= p_max_requests then
    return false;
  end if;

  update public.rate_limits set count = count + 1 where key = p_key;
  return true;
end;
$$;
