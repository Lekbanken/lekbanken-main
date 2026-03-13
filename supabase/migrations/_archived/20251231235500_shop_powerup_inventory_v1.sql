-- Shop: powerup inventory + consumption (server-only)
-- Adds an authoritative remaining-quantity table and an idempotent consume RPC.

begin;

create table if not exists public.user_powerup_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, shop_item_id),
  constraint user_powerup_inventory_quantity_nonnegative check (quantity >= 0)
);

create table if not exists public.user_powerup_consumptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, idempotency_key)
);

alter table public.user_powerup_inventory enable row level security;
alter table public.user_powerup_consumptions enable row level security;

drop policy if exists user_powerup_inventory_select on public.user_powerup_inventory;
create policy user_powerup_inventory_select
  on public.user_powerup_inventory for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

drop policy if exists user_powerup_consumptions_select on public.user_powerup_consumptions;
create policy user_powerup_consumptions_select
  on public.user_powerup_consumptions for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- Update purchase RPC: powerups increment inventory; cosmetics still grant player_cosmetics.
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

  if v_item_category is not distinct from 'cosmetic' then
    -- Grant inventory (non-consumable)
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
  elsif v_item_category is not distinct from 'powerup' then
    -- Increment remaining inventory
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

-- Consume powerup (decrement remaining inventory) - service only.
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

  v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_shop_item_id::text || ':' || p_idempotency_key, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select upc.id
    into v_existing_id
    from public.user_powerup_consumptions upc
    where upc.user_id = p_user_id
      and upc.tenant_id = p_tenant_id
      and upc.idempotency_key = p_idempotency_key
    limit 1;

  if v_existing_id is not null then
    select upi.quantity
      into v_qty
      from public.user_powerup_inventory upi
      where upi.user_id = p_user_id
        and upi.tenant_id = p_tenant_id
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

  if v_category is distinct from 'powerup' then
    raise exception 'item is not a powerup';
  end if;

  select upi.quantity
    into v_qty
    from public.user_powerup_inventory upi
    where upi.user_id = p_user_id
      and upi.tenant_id = p_tenant_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  if coalesce(v_qty, 0) <= 0 then
    raise exception 'insufficient quantity';
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

  select upi.quantity
    into v_qty
    from public.user_powerup_inventory upi
    where upi.user_id = p_user_id
      and upi.tenant_id = p_tenant_id
      and upi.shop_item_id = p_shop_item_id
    limit 1;

  remaining_quantity := coalesce(v_qty, 0);
  return next;
end;
$$;

revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from public;
revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from anon;
revoke all on function public.consume_powerup_v1(uuid,uuid,uuid,text) from authenticated;
grant execute on function public.consume_powerup_v1(uuid,uuid,uuid,text) to service_role;

commit;
