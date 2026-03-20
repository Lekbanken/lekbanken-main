create index if not exists idx_cookie_consents_tenant_id_snapshot
  on public.cookie_consents (tenant_id_snapshot)
  where tenant_id_snapshot is not null;