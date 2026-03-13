-- Gamification events: align schema with Event Contract v1 (tenant_id nullable)
-- Also adjust idempotency uniqueness to work with NULL tenant_id (global events).

begin;

alter table public.gamification_events
  alter column tenant_id drop not null;

-- Previous unique index was (tenant_id, source, idempotency_key) which treats NULLs as distinct.
-- Use a coalesced expression index so global (tenant_id IS NULL) events are also idempotent.

drop index if exists public.idx_gamification_events_idempotency;

drop index if exists public.idx_gamification_events_idempotency_v2;

create unique index idx_gamification_events_idempotency_v2
  on public.gamification_events (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    source,
    idempotency_key
  );

commit;
