-- Patch: make apply_coin_transaction_v1 race-safe under concurrency and restrict execution

-- Problem: Without a lock, two concurrent calls with same idempotency_key can both pass the
-- "existing" check, update user_coins, and then one insert will fail on the unique index.
-- This migration serializes calls per (user_id, tenant_id, idempotency_key).

create or replace function public.apply_coin_transaction_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_type text,
  p_amount integer,
  p_reason_code text,
  p_idempotency_key text,
  p_description text default null,
  p_source text default null,
  p_metadata jsonb default null
)
returns table (transaction_id uuid, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_balance integer;
  v_delta integer;
  v_earned_delta integer;
  v_spent_delta integer;
  v_now timestamptz := now();
  v_lock_key bigint;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_type is null or p_type not in ('earn','spend') then
    raise exception 'p_type must be earn|spend';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  -- Serialize per idempotency key to prevent double-apply under concurrency.
  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select ct.id
    into v_existing_id
    from public.coin_transactions ct
    where ct.user_id = p_user_id
      and ct.tenant_id = p_tenant_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    transaction_id := v_existing_id;
    balance := coalesce(v_balance, 0);
    return next;
    return;
  end if;

  insert into public.user_coins(user_id, tenant_id, balance, total_earned, total_spent, created_at, updated_at)
  values (p_user_id, p_tenant_id, 0, 0, 0, v_now, v_now)
  on conflict (user_id, tenant_id) do nothing;

  v_delta := case when p_type = 'earn' then p_amount else -p_amount end;
  v_earned_delta := case when p_type = 'earn' then p_amount else 0 end;
  v_spent_delta := case when p_type = 'spend' then p_amount else 0 end;

  update public.user_coins
    set balance = balance + v_delta,
        total_earned = total_earned + v_earned_delta,
        total_spent = total_spent + v_spent_delta,
        updated_at = v_now
    where user_id = p_user_id
      and tenant_id = p_tenant_id
      and (p_type <> 'spend' or balance >= p_amount)
    returning public.user_coins.balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient funds';
  end if;

  insert into public.coin_transactions(
    user_id,
    tenant_id,
    type,
    amount,
    description,
    reason_code,
    idempotency_key,
    source,
    metadata,
    created_at
  ) values (
    p_user_id,
    p_tenant_id,
    p_type,
    p_amount,
    p_description,
    p_reason_code,
    p_idempotency_key,
    p_source,
    p_metadata,
    v_now
  ) returning id into transaction_id;

  balance := v_balance;
  return next;
end;
$$;

-- Restrict who can execute the function (server/service only)
revoke all on function public.apply_coin_transaction_v1(uuid,uuid,text,integer,text,text,text,text,jsonb) from public;
revoke all on function public.apply_coin_transaction_v1(uuid,uuid,text,integer,text,text,text,text,jsonb) from anon;
revoke all on function public.apply_coin_transaction_v1(uuid,uuid,text,integer,text,text,text,text,jsonb) from authenticated;

grant execute on function public.apply_coin_transaction_v1(uuid,uuid,text,integer,text,text,text,text,jsonb) to service_role;
