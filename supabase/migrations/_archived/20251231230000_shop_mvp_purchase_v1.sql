-- Shop MVP: DiceCoin purchases (server-only)
-- Uses existing marketplace tables (shop_items, user_purchases, player_cosmetics)
-- and the gamification coin ledger (apply_coin_transaction_v1).

begin;

-- Idempotency + audit linkage
alter table public.user_purchases
  add column if not exists idempotency_key text;

alter table public.user_purchases
  add column if not exists coin_transaction_id uuid references public.coin_transactions(id) on delete set null;

create unique index if not exists idx_user_purchases_idempotency
  on public.user_purchases(user_id, tenant_id, idempotency_key)
  where idempotency_key is not null;

-- Prevent duplicate cosmetics ownership for the same item (MVP: non-consumable cosmetics)
create unique index if not exists idx_player_cosmetics_unique_item
  on public.player_cosmetics(user_id, tenant_id, shop_item_id);

-- Tighten read access for purchase/inventory (align with gamification personal data)
-- Allow: self, system_admin, tenant owner/admin
alter table public.user_purchases enable row level security;

drop policy if exists user_purchases_select on public.user_purchases;
create policy user_purchases_select
  on public.user_purchases for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

alter table public.player_cosmetics enable row level security;

drop policy if exists player_cosmetics_select on public.player_cosmetics;
create policy player_cosmetics_select
  on public.player_cosmetics for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- Atomic purchase function (service only)
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

  -- MVP: only allow cosmetic purchases (no powerups/bundles yet)
  if v_item_category is distinct from 'cosmetic' then
    raise exception 'only cosmetic items are purchasable in MVP';
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

  coin_transaction_id := v_coin_tx_id;
  balance := v_tmp_balance;
  return next;
end;
$$;

revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from public;
revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from anon;
revoke all on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) from authenticated;
grant execute on function public.purchase_shop_item_v1(uuid,uuid,uuid,text) to service_role;

-- Seed a tenant-scoped "DiceCoin" currency row if needed, and some cosmetic items.
-- Note: virtual_currencies.code is globally unique, so we scope by tenant id in the code value.
insert into public.virtual_currencies(tenant_id, name, code, symbol, exchange_rate, is_premium, description)
select
  t.id,
  'DiceCoin',
  'dicecoin:' || t.id::text,
  '🪙',
  1.0,
  false,
  'Tenant-scoped DiceCoin currency for Shop MVP'
from public.tenants t
where not exists (
  select 1
  from public.virtual_currencies vc
  where vc.tenant_id = t.id
);

-- Insert minimal cosmetic items per tenant (idempotent via name+tenant check)
insert into public.shop_items(
  tenant_id,
  name,
  description,
  category,
  image_url,
  price,
  currency_id,
  is_available,
  is_featured,
  sort_order,
  metadata
)
select
  t.id,
  'Gyllene Avatar-ram',
  'En glänsande gyllene ram för din profilbild',
  'cosmetic',
  null,
  500,
  vc.id,
  true,
  false,
  10,
  jsonb_build_object('rarity','epic','isNew',true)
from public.tenants t
join public.virtual_currencies vc on vc.tenant_id = t.id
where not exists (
  select 1
  from public.shop_items si
  where si.tenant_id = t.id
    and si.name = 'Gyllene Avatar-ram'
);

insert into public.shop_items(
  tenant_id,
  name,
  description,
  category,
  image_url,
  price,
  currency_id,
  is_available,
  is_featured,
  sort_order,
  metadata
)
select
  t.id,
  'Regnbågs-emoji',
  'Använd en regnbågs-emoji i ditt namn',
  'cosmetic',
  null,
  150,
  vc.id,
  true,
  false,
  20,
  jsonb_build_object('rarity','common')
from public.tenants t
join public.virtual_currencies vc on vc.tenant_id = t.id
where not exists (
  select 1
  from public.shop_items si
  where si.tenant_id = t.id
    and si.name = 'Regnbågs-emoji'
);

commit;
