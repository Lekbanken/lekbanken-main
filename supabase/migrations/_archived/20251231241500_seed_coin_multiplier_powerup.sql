-- Seed: coin multiplier powerup item (2x coins for 24h)

begin;

-- Insert a minimal powerup per tenant (idempotent via name+tenant check)
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
  'DiceCoin-boost (24h)',
  'Dubbel DiceCoin-belöning på aktiviteter i 24 timmar',
  'powerup',
  null,
  200,
  vc.id,
  true,
  false,
  30,
  jsonb_build_object(
    'rarity','rare',
    'isNew',true,
    'effectType','coin_multiplier',
    'multiplier',2,
    'durationSeconds',86400
  )
from public.tenants t
join public.virtual_currencies vc on vc.tenant_id = t.id
where not exists (
  select 1
  from public.shop_items si
  where si.tenant_id = t.id
    and si.name = 'DiceCoin-boost (24h)'
);

commit;
