-- Licensing (Phase 1/3): purchase intents + tenant entitlements

begin;

-- Purchase intents are created server-side and provisioned by Stripe webhook.
create table if not exists public.purchase_intents (
  id uuid primary key default gen_random_uuid(),

  kind text not null default 'organisation_subscription',
  status text not null default 'draft',

  email text,
  user_id uuid references public.users(id) on delete set null,

  tenant_name text,
  tenant_id uuid references public.tenants(id) on delete set null,

  product_id uuid references public.products(id) on delete set null,
  product_price_id uuid references public.product_prices(id) on delete set null,
  quantity_seats integer not null default 1,

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_intents_kind_chk check (kind in ('organisation_subscription','user_subscription','one_time')),
  constraint purchase_intents_status_chk check (status in ('draft','awaiting_payment','paid','provisioned','failed','expired')),
  constraint purchase_intents_quantity_seats_chk check (quantity_seats >= 1)
);

create index if not exists purchase_intents_user_idx on public.purchase_intents(user_id);
create index if not exists purchase_intents_tenant_idx on public.purchase_intents(tenant_id);
create index if not exists purchase_intents_status_idx on public.purchase_intents(status);

create or replace function public.update_purchase_intents_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists purchase_intents_updated_at on public.purchase_intents;
create trigger purchase_intents_updated_at
  before update on public.purchase_intents
  for each row
  execute function public.update_purchase_intents_updated_at();

alter table public.purchase_intents enable row level security;

-- Service role manages all intents; users can read their own.
drop policy if exists purchase_intents_select on public.purchase_intents;
create policy purchase_intents_select
  on public.purchase_intents
  for select
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null and auth.uid() = user_id)
  );

drop policy if exists purchase_intents_manage on public.purchase_intents;
create policy purchase_intents_manage
  on public.purchase_intents
  for all
  using (
    auth.role() = 'service_role'
    or (auth.uid() is not null and auth.uid() = user_id)
  )
  with check (
    auth.role() = 'service_role'
    or (auth.uid() is not null and auth.uid() = user_id)
  );


-- Tenant entitlements are the canonical access control layer.
create table if not exists public.tenant_product_entitlements (
  id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  status text not null default 'active',
  source text not null default 'stripe_subscription',

  quantity_seats integer not null default 1,

  valid_from timestamptz not null default now(),
  valid_to timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_product_entitlements_status_chk check (status in ('active','revoked','expired')),
  constraint tenant_product_entitlements_quantity_seats_chk check (quantity_seats between 1 and 100000)
);

create index if not exists tenant_product_entitlements_tenant_idx on public.tenant_product_entitlements(tenant_id);
create index if not exists tenant_product_entitlements_product_idx on public.tenant_product_entitlements(product_id);

create or replace function public.update_tenant_product_entitlements_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_product_entitlements_updated_at on public.tenant_product_entitlements;
create trigger tenant_product_entitlements_updated_at
  before update on public.tenant_product_entitlements
  for each row
  execute function public.update_tenant_product_entitlements_updated_at();

alter table public.tenant_product_entitlements enable row level security;

-- Read: tenant owner/admin + system admin
-- (Members read policy is added in a follow-up migration.)
drop policy if exists tenant_product_entitlements_select on public.tenant_product_entitlements;
create policy tenant_product_entitlements_select
  on public.tenant_product_entitlements
  for select
  using (
    public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

-- Writes: tenant owner/admin + system admin + service_role
-- (Admin grants can be done via system_admin.)
drop policy if exists tenant_product_entitlements_manage on public.tenant_product_entitlements;
create policy tenant_product_entitlements_manage
  on public.tenant_product_entitlements
  for all
  using (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  )
  with check (
    auth.role() = 'service_role'
    or public.is_system_admin()
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

commit;
