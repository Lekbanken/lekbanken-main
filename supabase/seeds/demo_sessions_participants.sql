-- ============================================================================
-- Demo data: participant_sessions + participants
-- ============================================================================
-- 
-- INSTRUKTIONER:
-- 1. Kör först dessa queries i Supabase SQL Editor för att hitta rätt IDs:
--    SELECT id, name FROM tenants LIMIT 5;
--    SELECT id, email FROM auth.users LIMIT 5;
--
-- 2. Ersätt TENANT_ID_HERE och HOST_USER_ID_HERE nedan med riktiga UUIDs
--
-- 3. Kör hela skriptet i Supabase SQL Editor
-- ============================================================================

-- ============== KONFIGURERA DESSA VÄRDEN =====================================
-- Du måste ersätta dessa med faktiska UUIDs från din databas
DO $$
DECLARE
  v_tenant_id uuid;
  v_host_user_id uuid;
  v_session_id uuid;
BEGIN
  -- Hämta första tenant (eller sätt manuellt)
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  
  -- Hämta första användare som host (eller sätt manuellt)
  SELECT id INTO v_host_user_id FROM auth.users LIMIT 1;
  
  -- Avbryt om vi inte har tenant eller host
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Ingen tenant hittades! Skapa en tenant först.';
  END IF;
  
  IF v_host_user_id IS NULL THEN
    RAISE EXCEPTION 'Ingen användare hittades! Skapa en användare först.';
  END IF;
  
  RAISE NOTICE 'Använder tenant: %', v_tenant_id;
  RAISE NOTICE 'Använder host: %', v_host_user_id;

  -- ============== SESSION 1: Aktiv demo-session ==============================
  INSERT INTO participant_sessions (
    id,
    tenant_id,
    host_user_id,
    display_name,
    description,
    status,
    session_code,
    settings,
    participant_count,
    created_at,
    started_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_host_user_id,
    'Fredagslek med teamet',
    'En rolig aktivitet för att bygga laganda',
    'active',
    'DEMO' || floor(random() * 9000 + 1000)::text,
    '{"mode": "demo", "difficulty": "medium", "allowLateJoin": true}'::jsonb,
    0,
    now() - interval '30 minutes',
    now() - interval '25 minutes',
    now()
  )
  RETURNING id INTO v_session_id;
  
  RAISE NOTICE 'Skapade session 1: %', v_session_id;
  
  -- Deltagare för session 1
  INSERT INTO participants (
    id,
    session_id,
    display_name,
    status,
    role,
    participant_token,
    token_expires_at,
    joined_at,
    last_seen_at,
    progress,
    created_at,
    updated_at,
    user_agent
  )
  VALUES
    (
      gen_random_uuid(),
      v_session_id,
      'Nora Nilsson',
      'active',
      'player',
      'tok-nora-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '20 minutes',
      now() - interval '1 minute',
      '{"score": 150, "completedGames": 2}'::jsonb,
      now() - interval '25 minutes',
      now(),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Erik Svensson',
      'active',
      'player',
      'tok-erik-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '18 minutes',
      now() - interval '30 seconds',
      '{"score": 120, "completedGames": 2}'::jsonb,
      now() - interval '20 minutes',
      now(),
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Sara Andersson',
      'idle',
      'player',
      'tok-sara-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '15 minutes',
      now() - interval '5 minutes',
      '{"score": 80, "completedGames": 1}'::jsonb,
      now() - interval '18 minutes',
      now(),
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Johan Lindberg',
      'disconnected',
      'player',
      'tok-johan-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '22 minutes',
      now() - interval '10 minutes',
      '{"score": 45, "completedGames": 1}'::jsonb,
      now() - interval '25 minutes',
      now(),
      'Mozilla/5.0 (Android 14; Mobile) Chrome/120.0'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Anna Karlsson',
      'active',
      'team_lead',
      'tok-anna-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '24 minutes',
      now(),
      '{"score": 200, "completedGames": 3}'::jsonb,
      now() - interval '25 minutes',
      now(),
      'Mozilla/5.0 (iPad; CPU OS 17_0) Safari/604.1'
    );

  -- Uppdatera participant_count för session 1
  UPDATE participant_sessions
  SET participant_count = (SELECT COUNT(*) FROM participants WHERE session_id = v_session_id),
      updated_at = now()
  WHERE id = v_session_id;

  -- ============== SESSION 2: Pausad session ==================================
  INSERT INTO participant_sessions (
    id,
    tenant_id,
    host_user_id,
    display_name,
    description,
    status,
    session_code,
    settings,
    participant_count,
    created_at,
    started_at,
    paused_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_host_user_id,
    'Teambuilding Workshop',
    'Lunchaktivitet - pausad för lunchrast',
    'paused',
    'WORK' || floor(random() * 9000 + 1000)::text,
    '{"mode": "workshop", "difficulty": "easy"}'::jsonb,
    0,
    now() - interval '2 hours',
    now() - interval '1 hour 45 minutes',
    now() - interval '30 minutes',
    now()
  )
  RETURNING id INTO v_session_id;
  
  RAISE NOTICE 'Skapade session 2: %', v_session_id;
  
  -- Deltagare för session 2
  INSERT INTO participants (
    id,
    session_id,
    display_name,
    status,
    role,
    participant_token,
    token_expires_at,
    joined_at,
    last_seen_at,
    progress,
    created_at,
    updated_at,
    user_agent
  )
  VALUES
    (
      gen_random_uuid(),
      v_session_id,
      'Maria Holm',
      'idle',
      'player',
      'tok-maria-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '1 hour 40 minutes',
      now() - interval '35 minutes',
      '{"score": 90, "completedGames": 1}'::jsonb,
      now() - interval '1 hour 45 minutes',
      now(),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Peter Berg',
      'idle',
      'player',
      'tok-peter-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '1 hour 38 minutes',
      now() - interval '32 minutes',
      '{"score": 110, "completedGames": 2}'::jsonb,
      now() - interval '1 hour 40 minutes',
      now(),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Lisa Ekström',
      'idle',
      'facilitator',
      'tok-lisa-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '1 hour 44 minutes',
      now() - interval '31 minutes',
      '{"score": 0, "isHost": true}'::jsonb,
      now() - interval '1 hour 45 minutes',
      now(),
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0'
    );

  -- Uppdatera participant_count för session 2
  UPDATE participant_sessions
  SET participant_count = (SELECT COUNT(*) FROM participants WHERE session_id = v_session_id),
      updated_at = now()
  WHERE id = v_session_id;

  -- ============== SESSION 3: Avslutad session ================================
  INSERT INTO participant_sessions (
    id,
    tenant_id,
    host_user_id,
    display_name,
    description,
    status,
    session_code,
    settings,
    participant_count,
    created_at,
    started_at,
    ended_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_host_user_id,
    'Morgonlek 15 dec',
    'Avslutad session från idag',
    'ended',
    'MORN' || floor(random() * 9000 + 1000)::text,
    '{"mode": "morning", "difficulty": "low"}'::jsonb,
    0,
    now() - interval '6 hours',
    now() - interval '5 hours 45 minutes',
    now() - interval '5 hours',
    now() - interval '5 hours'
  )
  RETURNING id INTO v_session_id;
  
  RAISE NOTICE 'Skapade session 3: %', v_session_id;
  
  -- Deltagare för session 3 (historiska)
  INSERT INTO participants (
    id,
    session_id,
    display_name,
    status,
    role,
    participant_token,
    token_expires_at,
    joined_at,
    last_seen_at,
    progress,
    created_at,
    updated_at,
    user_agent
  )
  VALUES
    (
      gen_random_uuid(),
      v_session_id,
      'Karin Johansson',
      'idle',
      'player',
      'tok-karin-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '5 hours 40 minutes',
      now() - interval '5 hours',
      '{"score": 250, "completedGames": 4, "winner": true}'::jsonb,
      now() - interval '5 hours 45 minutes',
      now() - interval '5 hours',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
    ),
    (
      gen_random_uuid(),
      v_session_id,
      'Oskar Nyström',
      'idle',
      'player',
      'tok-oskar-' || substr(md5(random()::text), 1, 8),
      now() + interval '7 days',
      now() - interval '5 hours 38 minutes',
      now() - interval '5 hours 2 minutes',
      '{"score": 180, "completedGames": 3}'::jsonb,
      now() - interval '5 hours 40 minutes',
      now() - interval '5 hours',
      'Mozilla/5.0 (Linux; Android 14) Chrome/120.0'
    );

  -- Uppdatera participant_count för session 3
  UPDATE participant_sessions
  SET participant_count = (SELECT COUNT(*) FROM participants WHERE session_id = v_session_id),
      updated_at = now()
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Klart! Skapade 3 sessioner med totalt 10 deltagare.';
  
END $$;

-- ============== VERIFIERING ==================================================
-- Kör dessa queries för att se resultatet:

SELECT 
  ps.id,
  ps.display_name AS session_name,
  ps.status,
  ps.session_code,
  ps.participant_count,
  ps.started_at,
  t.name AS tenant_name
FROM participant_sessions ps
JOIN tenants t ON t.id = ps.tenant_id
ORDER BY ps.created_at DESC
LIMIT 10;

SELECT 
  p.id,
  p.display_name,
  p.status,
  p.role,
  p.last_seen_at,
  ps.display_name AS session_name
FROM participants p
JOIN participant_sessions ps ON ps.id = p.session_id
ORDER BY p.created_at DESC
LIMIT 15;
