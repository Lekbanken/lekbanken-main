-- Powerups: time-limited effects v1 (coin multiplier)
-- Adds an authoritative effects table and extends consume_powerup_v1 to activate an effect.

begin;

create table if not exists public.user_powerup_effects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  consumption_id uuid not null references public.user_powerup_consumptions(id) on delete cascade,
  effect_type text not null,
  multiplier numeric not null default 1,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, consumption_id)
);

alter table public.user_powerup_effects enable row level security;

drop policy if exists user_powerup_effects_select on public.user_powerup_effects;
create policy user_powerup_effects_select
  on public.user_powerup_effects for select
  using (
    auth.uid() = user_id
    or public.is_system_admin()
    or (
      tenant_id is not null
      and public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
    )
  );

-- Helper: fetch best active coin multiplier at time (service only)
create or replace function public.get_active_coin_multiplier_v1(
  p_user_id uuid,
  p_tenant_id uuid,
  p_at timestamptz
)
returns table (multiplier numeric, effect_id uuid)
language sql
security definer
set search_path = public
as $$
  select
    upe.multiplier as multiplier,
    upe.id as effect_id
  from public.user_powerup_effects upe
  where upe.user_id = p_user_id
    and upe.tenant_id = p_tenant_id
    and upe.effect_type = 'coin_multiplier'
    and upe.starts_at <= p_at
    and upe.expires_at > p_at
  order by upe.multiplier desc
  limit 1;
$$;

revoke all on function public.get_active_coin_multiplier_v1(uuid,uuid,timestamptz) from public;
revoke all on function public.get_active_coin_multiplier_v1(uuid,uuid,timestamptz) from anon;
revoke all on function public.get_active_coin_multiplier_v1(uuid,uuid,timestamptz) from authenticated;
grant execute on function public.get_active_coin_multiplier_v1(uuid,uuid,timestamptz) to service_role;

-- Extend consume_powerup_v1 to activate effect based on shop_items.metadata.
-- Metadata keys (optional):
--   effectType: 'coin_multiplier'
--   multiplier: number (e.g. 2)
--   durationSeconds: number (e.g. 86400)
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
  v_consumption_id uuid;
  v_effect_type text;
  v_multiplier numeric;
  v_duration_seconds integer;
  v_expires_at timestamptz;
  v_metadata jsonb;
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

  select si.category, si.metadata
    into v_category, v_metadata
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
  )
  returning id into v_consumption_id;

  -- Activate effect (defaults: 2x coins for 24h)
  v_effect_type := coalesce(nullif(v_metadata->>'effectType',''), 'coin_multiplier');
  v_multiplier := coalesce(nullif(v_metadata->>'multiplier','')::numeric, 2);
  v_duration_seconds := coalesce(nullif(v_metadata->>'durationSeconds','')::int, 86400);

  if v_duration_seconds < 60 then
    v_duration_seconds := 60;
  end if;
  if v_multiplier < 1 then
    v_multiplier := 1;
  end if;

  v_expires_at := v_now + make_interval(secs => v_duration_seconds);

  insert into public.user_powerup_effects(
    tenant_id,
    user_id,
    shop_item_id,
    consumption_id,
    effect_type,
    multiplier,
    starts_at,
    expires_at,
    created_at
  ) values (
    p_tenant_id,
    p_user_id,
    p_shop_item_id,
    v_consumption_id,
    v_effect_type,
    v_multiplier,
    v_now,
    v_expires_at,
    v_now
  )
  on conflict (tenant_id, user_id, consumption_id) do nothing;

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
