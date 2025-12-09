-- Add insert policy for browse_search_logs to allow authenticated users (or service role)
-- to log their own searches while respecting tenant membership.

DO $$
BEGIN
  CREATE POLICY "users_can_insert_search_logs"
  ON browse_search_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND (user_id IS NULL OR user_id = auth.uid())
      AND (tenant_id IS NULL OR tenant_id = ANY(get_user_tenant_ids()))
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
