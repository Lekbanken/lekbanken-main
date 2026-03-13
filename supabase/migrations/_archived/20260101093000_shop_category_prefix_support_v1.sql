-- Shop: category prefix support v1
-- Allows category values like 'cosmetic:avatar_frame' while preserving existing behavior.

begin;

create or replace function public.purchase_shop_item_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_shop_item_id uuid,
  p_idempotency_key text
)
returns table (purchase_id uuid, coin_transaction_id uuid, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_purchase_id uuid;
  v_existing_tx_id uuid;
  v_balance integer;
  v_now timestamptz := now();
  v_price_numeric numeric;
  v_price_coins integer;
  v_item_name text;
  v_item_category text;
  v_item_available boolean;
  v_lock_key bigint;
  v_coin_tx_id uuid;
  v_tmp_balance integer;
  v_base_category text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_shop_item_id is null then
    raise exception 'p_shop_item_id is required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select up.id, up.coin_transaction_id
    into v_existing_purchase_id, v_existing_tx_id
    from public.user_purchases up
    where up.user_id = p_user_id
      and up.tenant_id = p_tenant_id
      and up.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_purchase_id is not null then
    select uc.balance
      into v_balance
      from public.user_coins uc
      where uc.user_id = p_user_id
        and uc.tenant_id = p_tenant_id
      limit 1;

    purchase_id := v_existing_purchase_id;
    coin_transaction_id := v_existing_tx_id;
    balance := coalesce(v_balance, 0);
    return next;
    return;
  end if;

  select si.price, si.name, si.category, si.is_available
    into v_price_numeric, v_item_name, v_item_category, v_item_available
    from public.shop_items si
    where si.id = p_shop_item_id
      and si.tenant_id = p_tenant_id
    limit 1;

  if v_item_name is null then
    raise exception 'shop item not found';
  end if;

  if coalesce(v_item_available, false) is not true then
    raise exception 'shop item not available';
  end if;

  v_base_category := nullif(split_part(coalesce(v_item_category, ''), ':', 1), '');
  if v_base_category is null then
    v_base_category := v_item_category;
  end if;

  v_price_coins := round(coalesce(v_price_numeric, 0))::int;
  if v_price_coins <= 0 then
    raise exception 'invalid price';
  end if;

  -- Spend DiceCoin (idempotent)
  select t.transaction_id, t.balance
    into v_coin_tx_id, v_tmp_balance
    from public.apply_coin_transaction_v1(
      p_user_id,
      p_tenant_id,
      'spend',
      v_price_coins,
      'shop:purchase',
      'shop:' || p_idempotency_key,
      'Purchase: ' || v_item_name,
      'shop',
      jsonb_build_object('shopItemId', p_shop_item_id, 'tenantId', p_tenant_id)
    ) as t;

  -- Create purchase row
  insert into public.user_purchases(
    tenant_id,
    user_id,
    shop_item_id,
    quantity,
    price_paid,
    currency_id,
    created_at,
    idempotency_key,
    coin_transaction_id
  )
  select
    p_tenant_id,
    p_user_id,
    si.id,
    1,
    si.price,
    si.currency_id,
    v_now,
    p_idempotency_key,
    v_coin_tx_id
  from public.shop_items si
  where si.id = p_shop_item_id
  returning id into purchase_id;

  if v_base_category is not distinct from 'cosmetic' then
    insert into public.player_cosmetics(
      tenant_id,
      user_id,
      shop_item_id,
      is_equipped,
      acquired_at,
      created_at
    ) values (
      p_tenant_id,
      p_user_id,
      p_shop_item_id,
      false,
      v_now,
      v_now
    )
    on conflict (user_id, tenant_id, shop_item_id) do nothing;
  elsif v_base_category is not distinct from 'powerup' then
    insert into public.user_powerup_inventory(
      tenant_id,
      user_id,
      shop_item_id,
      quantity,
      created_at,
      updated_at
    ) values (
      p_tenant_id,
      p_user_id,
      p_shop_item_id,
      1,
      v_now,
      v_now
    )
    on conflict (tenant_id, user_id, shop_item_id)
    do update set
      quantity = public.user_powerup_inventory.quantity + 1,
      updated_at = excluded.updated_at;
  end if;

  coin_transaction_id := v_coin_tx_id;
  balance := v_tmp_balance;
  return next;
end;
$$;

revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from public;
revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from anon;
revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from authenticated;
grant execute on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) to service_role;

create or replace function public.consume_powerup_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_shop_item_id uuid,
  p_idempotency_key text
)
returns table (remaining_quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_lock_key bigint;
  v_existing_id uuid;
  v_category text;
  v_base_category text;
  v_qty integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_tenant_id is null then
    raise exception 'p_tenant_id is required';
  end if;
  if p_shop_item_id is null then
    raise exception 'p_shop_item_id is required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'p_idempotency_key is required';
  end if;

  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select upc.id
    into v_existing_id
    from public.user_powerup_consumptions upc
    where upc.tenant_id = p_tenant_id
      and upc.user_id = p_user_id
      and upc.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select coalesce(upi.quantity, 0)
      into v_qty
      from public.user_powerup_inventory upi
      where upi.tenant_id = p_tenant_id
        and upi.user_id = p_user_id
        and upi.shop_item_id = p_shop_item_id
      limit 1;

    remaining_quantity := coalesce(v_qty, 0);
    return next;
    return;
  end if;

  select si.category
    into v_category
    from public.shop_items si
    where si.id = p_shop_item_id
      and si.tenant_id = p_tenant_id
    limit 1;

  v_base_category := nullif(split_part(coalesce(v_category, ''), ':', 1), '');
  if v_base_category is null then
    v_base_category := v_category;
  end if;

  if v_base_category is distinct from 'powerup' then
    raise exception 'item is not a powerup';
  end if;

  select coalesce(upi.quantity, 0)
    into v_qty
    from public.user_powerup_inventory upi
    where upi.tenant_id = p_tenant_id
      and upi.user_id = p_user_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  if coalesce(v_qty, 0) <= 0 then
    raise exception 'no remaining quantity';
  end if;

  update public.user_powerup_inventory
    set quantity = quantity - 1,
        updated_at = v_now
    where tenant_id = p_tenant_id
      and user_id = p_user_id
      and shop_item_id = p_shop_item_id;

  insert into public.user_powerup_consumptions(
    tenant_id,
    user_id,
    shop_item_id,
    idempotency_key,
    created_at
  ) values (
    p_tenant_id,
    p_user_id,
    p_shop_item_id,
    p_idempotency_key,
    v_now
  );

  select coalesce(upi.quantity, 0)
    into remaining_quantity
    from public.user_powerup_inventory upi
    where upi.tenant_id = p_tenant_id
      and upi.user_id = p_user_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  return next;
end;
$$;

revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from public;
revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from anon;
revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from authenticated;
grant execute on function public.consume_powerup_v1(uuid,uuid,uuid,text) to service_role;

commit;
