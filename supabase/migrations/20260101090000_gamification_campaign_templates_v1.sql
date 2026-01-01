-- Gamification Campaign Templates v1
-- Adds reusable templates for tenant admins and system admins.
-- Templates can be global (tenant_id NULL) or tenant-scoped.

begin;

create table if not exists public.gamification_campaign_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete cascade,
  label text not null,
  name text not null,
  event_type text not null,
  bonus_amount integer not null check (bonus_amount > 0),
  budget_amount integer null check (budget_amount is null or budget_amount >= 0),
  duration_days integer not null check (duration_days >= 1 and duration_days <= 365),
  is_active_default boolean not null default true,
  sort_order integer not null default 0,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_campaign_templates_tenant
  on public.gamification_campaign_templates(tenant_id, sort_order, created_at desc);

alter table public.gamification_campaign_templates enable row level security;

-- Select: system_admin, tenant owner/admin for tenant-scoped templates,
-- and all authenticated users can read global templates (tenant_id is null).
drop policy if exists gamification_campaign_templates_select on public.gamification_campaign_templates;
create policy gamification_campaign_templates_select
  on public.gamification_campaign_templates for select
  using (
    public.is_system_admin()
    or tenant_id is null
    or public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role_enum[])
  );

-- Service role can manage
 drop policy if exists gamification_campaign_templates_service_all on public.gamification_campaign_templates;
create policy gamification_campaign_templates_service_all
  on public.gamification_campaign_templates for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seed a few global templates (idempotent)
insert into public.gamification_campaign_templates (
  tenant_id,
  label,
  name,
  event_type,
  bonus_amount,
  budget_amount,
  duration_days,
  is_active_default,
  sort_order
)
select * from (
  values
    (null::uuid, 'Planner (7 dagar)',  'Planner week',  'plan_published', 5, 250, 7,  true, 10),
    (null::uuid, 'Planner (30 dagar)', 'Planner month', 'plan_published', 5, 1000, 30, true, 20),
    (null::uuid, 'Play (7 dagar)',     'Play week',     'run_completed',  5, 250, 7,  true, 30),
    (null::uuid, 'Play (30 dagar)',    'Play month',    'run_completed',  5, 1000, 30, true, 40)
) as v(tenant_id, label, name, event_type, bonus_amount, budget_amount, duration_days, is_active_default, sort_order)
where not exists (
  select 1
  from public.gamification_campaign_templates t
  where t.tenant_id is null
    and t.label = v.label
);

commit;
