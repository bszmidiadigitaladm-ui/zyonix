-- Atomic check-and-decrement. `for update` row-locks the wallet row, so
-- concurrent calls for the same owner_id (notably a shared Church Pro team
-- wallet, where multiple members can generate simultaneously) serialize at the
-- database level instead of racing on a read-then-write in application code.
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
  if p_credit_type not in ('image', 'text') then
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
  else
    if v_row.text_credits_remaining < p_amount then
      return query select false, v_row.text_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set text_credits_remaining = text_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.text_credits_remaining - p_amount;
  end if;
end;
$$;

grant execute on function public.consume_credit(uuid, text, int) to authenticated, service_role;

-- Additive counterpart, called when a generation fails *after* a credit was
-- already consumed, so users aren't charged credits for failed AI calls.
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
  if p_credit_type not in ('image', 'text') then
    raise exception 'invalid credit type: %', p_credit_type;
  end if;

  if p_credit_type = 'image' then
    update public.credits_balance
      set image_credits_remaining = image_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  else
    update public.credits_balance
      set text_credits_remaining = text_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  end if;
end;
$$;

grant execute on function public.refund_credit(uuid, text, int) to authenticated, service_role;

-- Seeds/resets a subscription's credit wallet from plan_limits for a new cycle.
-- Called by the Stripe webhook handler (service-role only — never exposed to
-- `authenticated`) on checkout.session.completed and on every invoice.payment_succeeded
-- renewal, which is the single place recurring credit resets happen.
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
    image_credits_remaining, text_credits_remaining,
    cycle_start, cycle_end
  ) values (
    v_owner, v_is_team, p_subscription_id,
    v_limits.image_credits_per_cycle, v_limits.text_credits_per_cycle,
    p_cycle_start, p_cycle_end
  )
  on conflict (subscription_id) do update set
    owner_id = excluded.owner_id,
    is_team = excluded.is_team,
    image_credits_remaining = excluded.image_credits_remaining,
    text_credits_remaining = excluded.text_credits_remaining,
    cycle_start = excluded.cycle_start,
    cycle_end = excluded.cycle_end,
    updated_at = now();
end;
$$;

-- Deliberately service_role only — this resets a wallet to full and must never
-- be callable directly by a signed-in user.
grant execute on function public.reset_credits(uuid, timestamptz, timestamptz) to service_role;
