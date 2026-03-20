ALTER POLICY "session_artifact_state_service" ON public.session_artifact_state
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

ALTER POLICY "session_artifact_variant_assignments_v2_service" ON public.session_artifact_variant_assignments_v2
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

ALTER POLICY "session_artifact_variant_state_service" ON public.session_artifact_variant_state
  USING ((SELECT auth.role()) = 'service_role'::text)
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);