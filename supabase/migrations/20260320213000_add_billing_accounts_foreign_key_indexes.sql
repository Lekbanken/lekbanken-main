create index if not exists idx_billing_accounts_tenant_id
  on public.billing_accounts (tenant_id)
  where tenant_id is not null;

create index if not exists idx_billing_accounts_user_id
  on public.billing_accounts (user_id)
  where user_id is not null;