-- Public pricing: allow anonymous read of published products/prices only

begin;

alter table public.products enable row level security;
alter table public.product_prices enable row level security;

-- Products visible to anon only when active
drop policy if exists products_public_select on public.products;
create policy products_public_select
  on public.products
  for select
  to anon
  using (
    status = 'active'
  );

-- Prices visible to anon only when active and the product is active
drop policy if exists product_prices_public_select on public.product_prices;
create policy product_prices_public_select
  on public.product_prices
  for select
  to anon
  using (
    active = true
    and exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.status = 'active'
    )
  );

commit;
