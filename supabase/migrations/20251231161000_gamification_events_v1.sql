-- Gamification Events v1: append-only event ingestion backbone

create table if not exists public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  actor_user_id uuid not null references public.users on delete cascade,
  event_type text not null,
  source text not null,
  idempotency_key text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_gamification_events_idempotency
  on public.gamification_events(tenant_id, source, idempotency_key);

create index if not exists idx_gamification_events_tenant_created
  on public.gamification_events(tenant_id, created_at desc);

create index if not exists idx_gamification_events_actor_created
  on public.gamification_events(tenant_id, actor_user_id, created_at desc);

alter table public.gamification_events enable row level security;

-- Minimal RLS: user can read own events; service role can insert/manage

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gamification_events'
      and policyname='users_can_select_own_gamification_events'
  ) then
    create policy "users_can_select_own_gamification_events"
      on public.gamification_events for select
      using (auth.uid() = actor_user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gamification_events'
      and policyname='service_can_insert_gamification_events'
  ) then
    create policy "service_can_insert_gamification_events"
      on public.gamification_events for insert
      with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='gamification_events'
      and policyname='service_can_modify_gamification_events'
  ) then
    create policy "service_can_modify_gamification_events"
      on public.gamification_events for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

comment on table public.gamification_events is 'Append-only gamification event log (Event Contract v1)';
