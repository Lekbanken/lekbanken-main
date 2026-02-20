-- =============================================================================
-- FIX: Timestamp columns → TIMESTAMPTZ (timezone-aware)
-- =============================================================================
--
-- Root cause: notification tables use bare TIMESTAMP columns. PostgreSQL now()
-- stores UTC but PostgREST returns the value WITHOUT a timezone suffix.
-- JavaScript `new Date("2026-02-20T14:30:00")` then interprets it as local
-- time instead of UTC, causing a 1-hour offset in CET (UTC+1).
--
-- Fix: ALTER to TIMESTAMPTZ. PostgreSQL preserves the stored UTC values during
-- the cast. PostgREST will then return "+00:00" so JS parses correctly.
--
-- Also covers the same issue in notification_log and notification_preferences,
-- and re-creates the get_user_notifications RPC with TIMESTAMPTZ return types.
-- =============================================================================

-- =============================================================================
-- 1. notifications table
-- =============================================================================

ALTER TABLE public.notifications
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN read_at    TYPE TIMESTAMPTZ USING read_at    AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

-- sent_at was added later (may not exist on very old deploys — guard it)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'sent_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.notifications ALTER COLUMN sent_at TYPE TIMESTAMPTZ USING sent_at AT TIME ZONE ''UTC''';
  END IF;
END $$;

-- schedule_at
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'schedule_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.notifications ALTER COLUMN schedule_at TYPE TIMESTAMPTZ USING schedule_at AT TIME ZONE ''UTC''';
  END IF;
END $$;

-- =============================================================================
-- 2. notification_deliveries table
-- =============================================================================

ALTER TABLE public.notification_deliveries
  ALTER COLUMN delivered_at  TYPE TIMESTAMPTZ USING delivered_at  AT TIME ZONE 'UTC',
  ALTER COLUMN read_at       TYPE TIMESTAMPTZ USING read_at       AT TIME ZONE 'UTC',
  ALTER COLUMN dismissed_at  TYPE TIMESTAMPTZ USING dismissed_at  AT TIME ZONE 'UTC',
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'UTC';

-- =============================================================================
-- 3. notification_log table (if it exists)
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notification_log'
  ) THEN
    EXECUTE '
      ALTER TABLE public.notification_log
        ALTER COLUMN sent_at    TYPE TIMESTAMPTZ USING sent_at    AT TIME ZONE ''UTC'',
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''
    ';
  END IF;
END $$;

-- =============================================================================
-- 4. notification_preferences table
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notification_preferences'
  ) THEN
    EXECUTE '
      ALTER TABLE public.notification_preferences
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC'',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''
    ';
  END IF;
END $$;

-- =============================================================================
-- 5. Re-create get_user_notifications with TIMESTAMPTZ return types
--    Must DROP first — PG cannot change return type via CREATE OR REPLACE.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_notifications(integer);

CREATE FUNCTION public.get_user_notifications(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  notification_id UUID,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  title TEXT,
  message TEXT,
  type TEXT,
  category TEXT,
  action_url TEXT,
  action_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nd.id,
    nd.notification_id,
    nd.delivered_at,
    nd.read_at,
    nd.dismissed_at,
    n.title,
    n.message,
    n.type,
    n.category,
    n.action_url,
    n.action_label
  FROM notification_deliveries nd
  JOIN notifications n ON n.id = nd.notification_id
  WHERE nd.user_id = auth.uid()
    AND nd.dismissed_at IS NULL
  ORDER BY nd.delivered_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;

-- =============================================================================
-- DONE — PostgREST will now include "+00:00" in all timestamp responses,
-- and JavaScript new Date() will parse them correctly regardless of timezone.
-- =============================================================================
