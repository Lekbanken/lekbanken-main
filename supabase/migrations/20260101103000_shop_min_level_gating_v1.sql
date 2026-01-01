-- Shop: min level gating v1
-- Adds optional metadata-driven gating for shop purchases.
-- Usage: set shop_items.metadata.minLevel = <int> (or min_level) to require a user level.

begin;

do $$
begin
  if to_regclass('public.shop_items') is null then
    raise exception 'Missing table public.shop_items';
  end if;
  if to_regclass('public.user_progress') is null then
    raise exception 'Missing table public.user_progress';
  end if;
end;
$$;

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
  v_metadata jsonb;
  v_bundle_items jsonb;
  v_bundle_elem jsonb;
  v_child_item_id uuid;
  v_child_qty integer;
  v_child_category text;
  v_child_base_category text;
  v_child_available boolean;
  v_child_name text;
  v_child_metadata jsonb;
  v_required_level integer;
  v_child_required_level integer;
  v_user_level integer;

  v_required_level_text text;
  v_child_required_level_text text;
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

  select si.price, si.name, si.category, si.is_available, coalesce(si.metadata, '{}'::jsonb)
    into v_price_numeric, v_item_name, v_item_category, v_item_available, v_metadata
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

  -- Optional level gating
  v_required_level := null;
  v_required_level_text := null;
  begin
    v_required_level_text := nullif(trim(coalesce(v_metadata->>'minLevel', '')), '');
  exception when others then
    v_required_level_text := null;
  end;
  if v_required_level_text is null then
    begin
      v_required_level_text := nullif(trim(coalesce(v_metadata->>'min_level', '')), '');
    exception when others then
      v_required_level_text := null;
    end;
  end if;

  if v_required_level_text is not null then
    begin
      v_required_level := (v_required_level_text)::int;
    exception when others then
      v_required_level := null;
    end;
  end if;

  if v_required_level is not null and v_required_level > 1 then
    select up.level
      into v_user_level
      from public.user_progress up
      where up.user_id = p_user_id
        and up.tenant_id = p_tenant_id
      limit 1;

    v_user_level := coalesce(v_user_level, 1);

    if v_user_level < v_required_level then
      raise exception 'requires level %', v_required_level;
    end if;
  end if;

  v_base_category := nullif(split_part(coalesce(v_item_category, ''), ':', 1), '');
  if v_base_category is null then
    v_base_category := v_item_category;
  end if;

  v_price_coins := round(coalesce(v_price_numeric, 0))::int;
  if v_price_coins <= 0 then
    raise exception 'invalid price';
  end if;

  v_bundle_items := null;
  if v_base_category is not distinct from 'bundle' then
    v_bundle_items := v_metadata->'bundleItems';
    if v_bundle_items is null or jsonb_typeof(v_bundle_items) is distinct from 'array' or jsonb_array_length(v_bundle_items) = 0 then
      raise exception 'bundleItems metadata is required for bundle purchases';
    end if;
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
      jsonb_build_object(
        'shopItemId', p_shop_item_id,
        'tenantId', p_tenant_id,
        'category', v_item_category,
        'bundleItems', v_bundle_items
      )
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
  elsif v_base_category is not distinct from 'bundle' then
    -- If parent required level was set, reuse computed v_user_level. Otherwise compute lazily if needed for children.
    if v_user_level is null then
      select up.level
        into v_user_level
        from public.user_progress up
        where up.user_id = p_user_id
          and up.tenant_id = p_tenant_id
        limit 1;
      v_user_level := coalesce(v_user_level, 1);
    end if;

    for v_bundle_elem in
      select value from jsonb_array_elements(v_bundle_items)
    loop
      begin
        v_child_item_id := (v_bundle_elem->>'shopItemId')::uuid;
      exception when others then
        raise exception 'Invalid bundleItems.shopItemId';
      end;

      begin
        v_child_qty := coalesce((v_bundle_elem->>'quantity')::int, 1);
      exception when others then
        v_child_qty := 1;
      end;

      if v_child_qty < 1 or v_child_qty > 100 then
        raise exception 'Invalid bundleItems.quantity';
      end if;

      select si.category, si.is_available, si.name, coalesce(si.metadata, '{}'::jsonb)
        into v_child_category, v_child_available, v_child_name, v_child_metadata
        from public.shop_items si
        where si.id = v_child_item_id
          and si.tenant_id = p_tenant_id
        limit 1;

      if v_child_name is null then
        raise exception 'bundle item not found';
      end if;

      if coalesce(v_child_available, false) is not true then
        raise exception 'bundle item not available';
      end if;

      -- Optional level gating for child items
      v_child_required_level := null;
      v_child_required_level_text := null;
      begin
        v_child_required_level_text := nullif(trim(coalesce(v_child_metadata->>'minLevel', '')), '');
      exception when others then
        v_child_required_level_text := null;
      end;
      if v_child_required_level_text is null then
        begin
          v_child_required_level_text := nullif(trim(coalesce(v_child_metadata->>'min_level', '')), '');
        exception when others then
          v_child_required_level_text := null;
        end;
      end if;

      if v_child_required_level_text is not null then
        begin
          v_child_required_level := (v_child_required_level_text)::int;
        exception when others then
          v_child_required_level := null;
        end;
      end if;

      if v_child_required_level is not null and v_child_required_level > 1 then
        if v_user_level < v_child_required_level then
          raise exception 'requires level %', v_child_required_level;
        end if;
      end if;

      v_child_base_category := nullif(split_part(coalesce(v_child_category, ''), ':', 1), '');
      if v_child_base_category is null then
        v_child_base_category := v_child_category;
      end if;

      if v_child_base_category is not distinct from 'cosmetic' then
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
          v_child_item_id,
          false,
          v_now,
          v_now
        )
        on conflict (user_id, tenant_id, shop_item_id) do nothing;
      elsif v_child_base_category is not distinct from 'powerup' then
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
          v_child_item_id,
          v_child_qty,
          v_now,
          v_now
        )
        on conflict (tenant_id, user_id, shop_item_id)
        do update set
          quantity = public.user_powerup_inventory.quantity + excluded.quantity,
          updated_at = excluded.updated_at;
      else
        raise exception 'bundle item category not supported';
      end if;
    end loop;
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

commit;
