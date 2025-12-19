-- Kör detta i Supabase SQL Editor för att verifiera vilka migrations som körts
-- och vilka tabeller/enums som finns

-- 1. Visa alla körda migrations
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC
LIMIT 50;

-- 1b. Snabbcheck: är de senaste repo-migrations registrerade?
-- (Om du har kört SQL manuellt kan schema vara uppdaterat men schema_migrations sakna rader.)
SELECT
  m.version,
  m.name,
  CASE WHEN sm.version IS NULL THEN '❌' ELSE '✅' END AS registered
FROM (VALUES
  ('20251217120000', 'planner_total_time_trigger'),
  ('20251219090000', 'play_chat_messages'),
  ('20251219113000', 'legendary_play_primitives_v1')
) AS m(version, name)
LEFT JOIN supabase_migrations.schema_migrations sm ON sm.version = m.version
ORDER BY m.version;

-- 1c. (Valfritt) Om schema är uppdaterat men 1b visar ❌: registrera migrationerna manuellt.
-- OBS: Registrera INTE 20251217120000 innan 2h visar ✅ (annars “lurar” du registret).
-- Kör i så fall först själva migrationen 20251217120000 (planner_total_time_trigger).
--
-- INSERT INTO supabase_migrations.schema_migrations (version, name)
-- VALUES
--   ('20251217120000', 'planner_total_time_trigger'),
--   ('20251219090000', 'play_chat_messages'),
--   ('20251219113000', 'legendary_play_primitives_v1')
-- ON CONFLICT (version) DO NOTHING;

-- 2. Kolla om kritiska tabeller finns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_mfa') 
    THEN '✅' ELSE '❌' 
  END AS user_mfa,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_audit_logs') 
    THEN '✅' ELSE '❌' 
  END AS user_audit_logs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') 
    THEN '✅' ELSE '❌' 
  END AS user_sessions,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_devices') 
    THEN '✅' ELSE '❌' 
  END AS user_devices,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_settings') 
    THEN '✅' ELSE '❌' 
  END AS tenant_settings,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_branding') 
    THEN '✅' ELSE '❌' 
  END AS tenant_branding,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_invitations') 
    THEN '✅' ELSE '❌' 
  END AS tenant_invitations,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_accounts') 
    THEN '✅' ELSE '❌' 
  END AS billing_accounts,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenant_memberships')
    THEN '✅' ELSE '❌'
  END AS user_tenant_memberships;

-- 2b. Kolla Play/Participants-tabeller (runtime + chat)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participant_sessions') 
    THEN '✅' ELSE '❌' 
  END AS participant_sessions,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_roles') 
    THEN '✅' ELSE '❌' 
  END AS session_roles,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_events') 
    THEN '✅' ELSE '❌' 
  END AS session_events,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'play_chat_messages') 
    THEN '✅' ELSE '❌' 
  END AS play_chat_messages;

-- 2b2. Kolla Legendary Play Primitives-tabeller
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_artifacts')
    THEN '✅' ELSE '❌'
  END AS game_artifacts,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_artifact_variants')
    THEN '✅' ELSE '❌'
  END AS game_artifact_variants,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_artifacts')
    THEN '✅' ELSE '❌'
  END AS session_artifacts,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_artifact_variants')
    THEN '✅' ELSE '❌'
  END AS session_artifact_variants,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_artifact_assignments')
    THEN '✅' ELSE '❌'
  END AS session_artifact_assignments,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_decisions')
    THEN '✅' ELSE '❌'
  END AS session_decisions,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_votes')
    THEN '✅' ELSE '❌'
  END AS session_votes,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_outcomes')
    THEN '✅' ELSE '❌'
  END AS session_outcomes;

-- 2d. Kolla att is_global_admin() finns (används i flera RLS policies)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'is_global_admin'
    )
    THEN '✅' ELSE '❌'
  END AS is_global_admin_function;

-- 2e. Kolla att RLS är enabled på chat/runtime tabeller
SELECT
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('play_chat_messages', 'session_roles', 'session_events')
ORDER BY c.relname;

-- 2e2. Kolla att RLS är enabled på Legendary Play Primitives runtime tabeller
SELECT
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'session_artifacts',
    'session_artifact_variants',
    'session_artifact_assignments',
    'session_decisions',
    'session_votes',
    'session_outcomes'
  )
ORDER BY c.relname;

-- 2e3. Kolla att host policies finns för primitives runtime tabeller
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'session_artifacts',
    'session_artifact_variants',
    'session_artifact_assignments',
    'session_decisions',
    'session_votes',
    'session_outcomes'
  )
ORDER BY tablename, policyname;

-- 2f. Kolla att chat-policies finns (host select/insert)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'play_chat_messages'
ORDER BY policyname;

-- 2g. Kolla att chat-index finns
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'play_chat_messages'
        AND indexname = 'idx_play_chat_messages_session_created'
    )
    THEN '✅' ELSE '❌'
  END AS idx_play_chat_messages_session_created;

-- 2h. Kolla att planner total_time trigger/funktioner finns (20251217120000)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'recalc_plan_total_time_minutes'
    )
    THEN '✅' ELSE '❌'
  END AS recalc_plan_total_time_minutes_fn,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'trg_plan_blocks_recalc_plan_total_time_minutes'
    )
    THEN '✅' ELSE '❌'
  END AS trg_plan_blocks_recalc_fn,
  CASE
    WHEN to_regclass('public.plan_blocks') IS NOT NULL
     AND EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgname = 'plan_blocks_recalc_plan_total_time_minutes_ins'
        AND t.tgrelid = to_regclass('public.plan_blocks')
    )
    THEN '✅' ELSE '❌'
  END AS plan_blocks_trigger_ins,
  CASE
    WHEN to_regclass('public.plan_blocks') IS NOT NULL
     AND EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgname = 'plan_blocks_recalc_plan_total_time_minutes_del'
        AND t.tgrelid = to_regclass('public.plan_blocks')
    )
    THEN '✅' ELSE '❌'
  END AS plan_blocks_trigger_del,
  CASE
    WHEN to_regclass('public.plan_blocks') IS NOT NULL
     AND EXISTS (
      SELECT 1
      FROM pg_trigger t
      WHERE t.tgname = 'plan_blocks_recalc_plan_total_time_minutes_upd'
        AND t.tgrelid = to_regclass('public.plan_blocks')
    )
    THEN '✅' ELSE '❌'
  END AS plan_blocks_trigger_upd;

-- 2c. Kolla att runtime-kolumner finns på participant_sessions
SELECT 
  column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'participant_sessions'
  AND column_name IN (
    'current_step_index',
    'current_phase_index',
    'timer_state',
    'board_state'
  )
ORDER BY column_name;

-- 3. Kolla om kritiska enums finns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role_enum') 
    THEN '✅' ELSE '❌' 
  END AS global_role_enum,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type_enum') 
    THEN '✅' ELSE '❌' 
  END AS tenant_type_enum,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status_enum') 
    THEN '✅' ELSE '❌' 
  END AS tenant_status_enum;

-- 4. Kolla vilka kolumner som finns på tenants
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 5. Kolla vilka kolumner som finns på tenant_memberships
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tenant_memberships'
ORDER BY ordinal_position;

-- 5b. Kolla om user_tenant_memberships finns och om det är TABLE/VIEW
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tenant_memberships', 'user_tenant_memberships')
ORDER BY table_name;

-- 5c. Kolla vilka kolumner som finns på user_tenant_memberships
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_tenant_memberships'
ORDER BY ordinal_position;
