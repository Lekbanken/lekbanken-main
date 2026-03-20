ALTER POLICY "purchase_intents_insert" ON public.purchase_intents
  WITH CHECK (
    ((SELECT auth.role()) = 'service_role'::text)
    OR (
      ((SELECT auth.uid()) IS NOT NULL)
      AND ((SELECT auth.uid()) = user_id)
    )
  );

ALTER POLICY "purchase_intents_manage_service" ON public.purchase_intents
  USING (((SELECT auth.role()) = 'service_role'::text) OR is_system_admin())
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR is_system_admin());

ALTER POLICY "purchase_intents_select" ON public.purchase_intents
  USING (
    ((SELECT auth.role()) = 'service_role'::text)
    OR (
      ((SELECT auth.uid()) IS NOT NULL)
      AND ((SELECT auth.uid()) = user_id)
    )
  );

ALTER POLICY "session_commands_insert" ON public.session_commands
  WITH CHECK (
    (issued_by = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.participant_sessions ps
      WHERE ps.id = session_commands.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "session_commands_select" ON public.session_commands
  USING (
    EXISTS (
      SELECT 1
      FROM public.participant_sessions ps
      WHERE ps.id = session_commands.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
  );