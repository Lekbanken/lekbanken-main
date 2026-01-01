-- Shop: seed additional cosmetic subcategories v1
-- Adds a couple of cosmetic items with category prefixes like 'cosmetic:avatar_frame'.

begin;

do $$
begin
  if to_regclass('public.shop_items') is null then
    raise exception 'Missing table public.shop_items';
  end if;

  if to_regclass('public.tenants') is null then
    raise exception 'Missing table public.tenants';
  end if;

  if to_regclass('public.virtual_currencies') is null then
    raise exception 'Missing table public.virtual_currencies';
  end if;
end;
$$;

-- Avatar frame (cosmetic subcategory)
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
  'Neon Avatar-ram',
  'En neonfärgad ram för din profilbild',
  'cosmetic:avatar_frame',
  null,
  300,
  vc.id,
  true,
  false,
  15,
  jsonb_build_object('rarity','rare','isNew',true)
from public.tenants t
join public.virtual_currencies vc on vc.tenant_id = t.id
where not exists (
  select 1
  from public.shop_items si
  where si.tenant_id = t.id
    and si.name = 'Neon Avatar-ram'
);

-- Name emoji (cosmetic subcategory)
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
  'Stjärn-emoji',
  'Använd en stjärn-emoji i ditt namn',
  'cosmetic:name_emoji',
  null,
  120,
  vc.id,
  true,
  false,
  25,
  jsonb_build_object('rarity','common')
from public.tenants t
join public.virtual_currencies vc on vc.tenant_id = t.id
where not exists (
  select 1
  from public.shop_items si
  where si.tenant_id = t.id
    and si.name = 'Stjärn-emoji'
);

commit;
