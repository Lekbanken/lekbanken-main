create index if not exists idx_conversation_card_collections_tenant_id
  on public.conversation_card_collections (tenant_id)
  where tenant_id is not null;