-- Fix Award Achievement RPC recursion issue
-- Purpose: Replace is_system_admin() with is_system_admin_jwt_only() 
-- to prevent infinite recursion when checking admin status.
-- 
-- Problem: is_system_admin() tries to SELECT from users table,
-- which triggers RLS policies that call is_system_admin() again.
-- Solution: Use is_system_admin_jwt_only() which only checks JWT claims.

BEGIN;

--------------------------------------------------------------------------------
-- 1) FIX admin_award_achievement_v1 FUNCTION
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_award_achievement_v1(
  p_achievement_id UUID,
  p_user_ids UUID[],
  p_message TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id UUID;
  v_award_id UUID;
  v_existing_award_id UUID;
  v_achievement RECORD;
  v_user_id UUID;
  v_user_achievement_id UUID;
  v_existing_ua_id UUID;
  v_inserted_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_lock_key BIGINT;
  v_final_idempotency_key TEXT;
  v_recipient_ids UUID[] := '{}';
  v_duplicate_ids UUID[] := '{}';
BEGIN
  -- Get actor from auth context
  v_actor_id := auth.uid();
  
  -- Validate caller is system_admin (using JWT-only version to avoid recursion)
  IF NOT public.is_system_admin_jwt_only() THEN
    RAISE EXCEPTION 'Forbidden: only system_admin can award achievements';
  END IF;
  
  -- Validate inputs
  IF p_achievement_id IS NULL THEN
    RAISE EXCEPTION 'p_achievement_id is required';
  END IF;
  
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one user';
  END IF;
  
  -- Generate idempotency key if not provided
  v_final_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);
  
  -- Validate achievement exists and is awardable
  SELECT id, name, status, scope, tenant_id
  INTO v_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;
  
  IF v_achievement IS NULL THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_id;
  END IF;
  
  IF v_achievement.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot award archived achievement';
  END IF;
  
  -- For tenant-scoped achievements, validate tenant context
  IF v_achievement.scope = 'tenant' AND v_achievement.tenant_id IS NOT NULL THEN
    IF p_tenant_id IS NULL OR p_tenant_id != v_achievement.tenant_id THEN
      RAISE EXCEPTION 'Tenant context mismatch for tenant-scoped achievement';
    END IF;
  END IF;
  
  -- Advisory lock for idempotency
  v_lock_key := hashtextextended(
    COALESCE(p_tenant_id::text, 'global') || ':' || v_final_idempotency_key, 
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check for existing award with same idempotency key
  SELECT id INTO v_existing_award_id
  FROM public.achievement_awards
  WHERE idempotency_key = v_final_idempotency_key
    AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = 
        COALESCE(p_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  IF v_existing_award_id IS NOT NULL THEN
    -- Return existing award summary
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'award_id', v_existing_award_id,
      'message', 'Award already processed with this idempotency key'
    );
  END IF;
  
  -- Create award event
  INSERT INTO public.achievement_awards (
    tenant_id,
    achievement_id,
    awarded_by,
    message,
    recipient_count,
    idempotency_key
  ) VALUES (
    p_tenant_id,
    p_achievement_id,
    v_actor_id,
    p_message,
    array_length(p_user_ids, 1),
    v_final_idempotency_key
  )
  RETURNING id INTO v_award_id;
  
  -- Process each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Check if user already has this achievement
    SELECT id INTO v_existing_ua_id
    FROM public.user_achievements
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id
    LIMIT 1;
    
    IF v_existing_ua_id IS NOT NULL THEN
      -- User already has achievement - record as duplicate
      INSERT INTO public.achievement_award_recipients (
        award_id,
        user_id,
        user_achievement_id,
        was_duplicate
      ) VALUES (
        v_award_id,
        v_user_id,
        v_existing_ua_id,
        TRUE
      );
      
      v_duplicate_count := v_duplicate_count + 1;
      v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
    ELSE
      -- Insert new user_achievement
      INSERT INTO public.user_achievements (
        achievement_id,
        user_id,
        tenant_id,
        unlocked_at
      ) VALUES (
        p_achievement_id,
        v_user_id,
        p_tenant_id,
        NOW()
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING id INTO v_user_achievement_id;
      
      -- Handle race condition where ON CONFLICT triggered
      IF v_user_achievement_id IS NULL THEN
        SELECT id INTO v_user_achievement_id
        FROM public.user_achievements
        WHERE user_id = v_user_id AND achievement_id = p_achievement_id;
        
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          TRUE
        );
        
        v_duplicate_count := v_duplicate_count + 1;
        v_duplicate_ids := array_append(v_duplicate_ids, v_user_id);
      ELSE
        -- Successfully created new unlock
        INSERT INTO public.achievement_award_recipients (
          award_id,
          user_id,
          user_achievement_id,
          was_duplicate
        ) VALUES (
          v_award_id,
          v_user_id,
          v_user_achievement_id,
          FALSE
        );
        
        v_inserted_count := v_inserted_count + 1;
        v_recipient_ids := array_append(v_recipient_ids, v_user_id);
      END IF;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'status', 'success',
    'award_id', v_award_id,
    'achievement_id', p_achievement_id,
    'achievement_name', v_achievement.name,
    'total_targeted', array_length(p_user_ids, 1),
    'inserted_count', v_inserted_count,
    'duplicate_count', v_duplicate_count,
    'awarded_user_ids', v_recipient_ids,
    'duplicate_user_ids', v_duplicate_ids,
    'message', p_message,
    'idempotency_key', v_final_idempotency_key
  );
END;
$$;

--------------------------------------------------------------------------------
-- 2) FIX get_tenant_user_ids FUNCTION
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_tenant_user_ids(p_tenant_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Validate caller is system_admin (using JWT-only version to avoid recursion)
  IF NOT public.is_system_admin_jwt_only() THEN
    RAISE EXCEPTION 'Forbidden: only system_admin can list tenant users';
  END IF;
  
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  
  SELECT array_agg(user_id)
  INTO v_user_ids
  FROM public.user_tenant_memberships
  WHERE tenant_id = p_tenant_id
    AND status = 'active';
  
  RETURN COALESCE(v_user_ids, '{}');
END;
$$;

--------------------------------------------------------------------------------
-- 3) UPDATE COMMENTS
--------------------------------------------------------------------------------

COMMENT ON FUNCTION public.admin_award_achievement_v1 IS 
'Award an achievement to one or more users. System admin only (checked via JWT claims). Idempotent via idempotency_key.
Returns JSON with: status, award_id, inserted_count, duplicate_count, awarded_user_ids, duplicate_user_ids';

COMMENT ON FUNCTION public.get_tenant_user_ids IS 
'Get all active user IDs for a tenant. System admin only (checked via JWT claims). Used for "award to all users in tenant" feature.';

COMMIT;
