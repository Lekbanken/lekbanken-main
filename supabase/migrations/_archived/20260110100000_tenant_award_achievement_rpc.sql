-- Tenant Award Achievement RPC v1
-- Purpose: SECURITY DEFINER function for tenant admins to award achievements
-- Date: 2026-01-10
-- Phase 2: Tenant Achievements Admin

BEGIN;

--------------------------------------------------------------------------------
-- 1) TENANT AWARD ACHIEVEMENT FUNCTION
-- Allows tenant admins (owner/admin/editor) to award tenant-scoped achievements
-- to users who are members of their tenant.
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tenant_award_achievement_v1(
  p_tenant_id UUID,
  p_achievement_id UUID,
  p_user_ids UUID[],
  p_message TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_invalid_member_count INTEGER := 0;
  v_lock_key BIGINT;
  v_final_idempotency_key TEXT;
  v_recipient_ids UUID[] := '{}';
  v_duplicate_ids UUID[] := '{}';
  v_invalid_member_ids UUID[] := '{}';
BEGIN
  -- Get actor from auth context
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;
  
  -- Validate inputs
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  
  IF p_achievement_id IS NULL THEN
    RAISE EXCEPTION 'p_achievement_id is required';
  END IF;
  
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL OR array_length(p_user_ids, 1) = 0 THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one user';
  END IF;
  
  -- SECURITY CHECK: Caller must be system_admin OR tenant admin (owner/admin/editor)
  IF NOT (
    public.is_system_admin()
    OR public.has_tenant_role(p_tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  ) THEN
    RAISE EXCEPTION 'Forbidden: requires tenant admin (owner/admin/editor) or system_admin role for tenant %', p_tenant_id;
  END IF;
  
  -- Generate idempotency key if not provided
  v_final_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);
  
  -- Validate achievement exists, belongs to this tenant, and is awardable
  SELECT id, name, status, scope, tenant_id
  INTO v_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;
  
  IF v_achievement IS NULL THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_id;
  END IF;
  
  -- Achievement must belong to the specified tenant
  IF v_achievement.tenant_id IS NULL OR v_achievement.tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Achievement % does not belong to tenant %', p_achievement_id, p_tenant_id;
  END IF;
  
  IF v_achievement.status = 'archived' THEN
    RAISE EXCEPTION 'Cannot award archived achievement';
  END IF;
  
  IF v_achievement.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot award draft achievement - activate it first';
  END IF;
  
  -- Validate all recipients are active members of this tenant
  SELECT ARRAY(
    SELECT uid FROM unnest(p_user_ids) AS uid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = p_tenant_id 
        AND tm.user_id = uid 
        AND tm.status = 'active'
    )
  ) INTO v_invalid_member_ids;
  
  IF array_length(v_invalid_member_ids, 1) > 0 THEN
    RAISE EXCEPTION 'Users not members of tenant %: %', p_tenant_id, v_invalid_member_ids;
  END IF;
  
  -- Advisory lock for idempotency
  v_lock_key := hashtextextended(p_tenant_id::text || ':' || v_final_idempotency_key, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Check for existing award with same idempotency key for this tenant
  SELECT id INTO v_existing_award_id
  FROM public.achievement_awards
  WHERE idempotency_key = v_final_idempotency_key
    AND tenant_id = p_tenant_id
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
    'tenant_id', p_tenant_id,
    'achievement_id', p_achievement_id,
    'awarded_count', v_inserted_count,
    'duplicate_count', v_duplicate_count,
    'total_processed', v_inserted_count + v_duplicate_count,
    'recipient_ids', v_recipient_ids,
    'duplicate_ids', v_duplicate_ids,
    'idempotency_key', v_final_idempotency_key
  );
END;
$$;

--------------------------------------------------------------------------------
-- 2) GRANT EXECUTE TO AUTHENTICATED
--------------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.tenant_award_achievement_v1(UUID, UUID, UUID[], TEXT, TEXT) 
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.tenant_award_achievement_v1(UUID, UUID, UUID[], TEXT, TEXT) 
  FROM anon, public;

--------------------------------------------------------------------------------
-- 3) UPDATE RLS POLICIES FOR TENANT ADMIN INSERT
-- Allow tenant admins to insert awards for their tenant
--------------------------------------------------------------------------------

-- achievement_awards: tenant admins can INSERT for their tenant
DROP POLICY IF EXISTS achievement_awards_tenant_admin_insert ON public.achievement_awards;
CREATE POLICY achievement_awards_tenant_admin_insert
  ON public.achievement_awards
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  );

-- achievement_award_recipients: tenant admins can INSERT via awards they created
DROP POLICY IF EXISTS achievement_award_recipients_tenant_admin_insert ON public.achievement_award_recipients;
CREATE POLICY achievement_award_recipients_tenant_admin_insert
  ON public.achievement_award_recipients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.achievement_awards aa
      WHERE aa.id = achievement_award_recipients.award_id
        AND aa.tenant_id IS NOT NULL
        AND public.has_tenant_role(aa.tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
    )
  );

--------------------------------------------------------------------------------
-- 4) UPDATE ACHIEVEMENTS RLS FOR TENANT ADMIN MANAGEMENT
-- Allow tenant admins to manage achievements for their tenant
--------------------------------------------------------------------------------

-- Tenant admins can SELECT their tenant's achievements
DROP POLICY IF EXISTS achievements_tenant_admin_select ON public.achievements;
CREATE POLICY achievements_tenant_admin_select
  ON public.achievements
  FOR SELECT
  USING (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  );

-- Tenant admins can INSERT achievements for their tenant
DROP POLICY IF EXISTS achievements_tenant_admin_insert ON public.achievements;
CREATE POLICY achievements_tenant_admin_insert
  ON public.achievements
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  );

-- Tenant admins can UPDATE achievements for their tenant
DROP POLICY IF EXISTS achievements_tenant_admin_update ON public.achievements;
CREATE POLICY achievements_tenant_admin_update
  ON public.achievements
  FOR UPDATE
  USING (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  )
  WITH CHECK (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  );

-- Tenant admins can DELETE (soft-delete via archive) achievements for their tenant
DROP POLICY IF EXISTS achievements_tenant_admin_delete ON public.achievements;
CREATE POLICY achievements_tenant_admin_delete
  ON public.achievements
  FOR DELETE
  USING (
    tenant_id IS NOT NULL 
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin', 'editor']::public.tenant_role_enum[])
  );

--------------------------------------------------------------------------------
-- 5) COMMENTS
--------------------------------------------------------------------------------

COMMENT ON FUNCTION public.tenant_award_achievement_v1 IS 
  'Award a tenant-scoped achievement to users. Caller must be tenant admin (owner/admin/editor) or system_admin. '
  'Validates: achievement belongs to tenant, all recipients are tenant members, achievement is active. '
  'Idempotent via idempotency_key.';

COMMIT;
