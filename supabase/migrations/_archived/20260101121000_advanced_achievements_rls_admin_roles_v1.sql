-- Harmonize advanced achievements admin policies to match current tenant roles
-- Goal: treat tenant admin capabilities as (owner OR admin), with system_admin allowed via has_tenant_role helper.

begin;

DO $$
BEGIN
  -- Community Challenges: admin management policy
  IF to_regclass('public.community_challenges') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can manage challenges" ON public.community_challenges;

    CREATE POLICY "Admins can manage challenges"
      ON public.community_challenges FOR ALL
      USING (
        public.has_tenant_role(
          community_challenges.tenant_id,
          ARRAY['owner','admin']::public.tenant_role_enum[]
        )
      );
  END IF;

  -- Limited-Time Events: admin management policy
  IF to_regclass('public.limited_time_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can manage events" ON public.limited_time_events;

    CREATE POLICY "Admins can manage events"
      ON public.limited_time_events FOR ALL
      USING (
        public.has_tenant_role(
          limited_time_events.tenant_id,
          ARRAY['owner','admin']::public.tenant_role_enum[]
        )
      );
  END IF;
END $$;

commit;
