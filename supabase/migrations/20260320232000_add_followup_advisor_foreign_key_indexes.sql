create index if not exists idx_categories_bundle_product_id
  on public.categories (bundle_product_id)
  where bundle_product_id is not null;

create index if not exists idx_data_retention_policies_created_by
  on public.data_retention_policies (created_by)
  where created_by is not null;

create index if not exists idx_data_retention_policies_tenant_id
  on public.data_retention_policies (tenant_id)
  where tenant_id is not null;

create index if not exists idx_gamification_burn_log_tenant_id
  on public.gamification_burn_log (tenant_id)
  where tenant_id is not null;

create index if not exists idx_gamification_daily_earnings_tenant_id
  on public.gamification_daily_earnings (tenant_id)
  where tenant_id is not null;