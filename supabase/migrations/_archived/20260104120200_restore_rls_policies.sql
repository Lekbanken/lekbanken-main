-- ============================================================================
-- RESTORE RLS POLICIES DROPPED BY CASCADE
-- ============================================================================
-- The previous consolidation migration dropped functions with CASCADE,
-- which removed many RLS policies. This migration restores all critical
-- RLS policies across the database.
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_read_own" ON public.users;
DROP POLICY IF EXISTS "system_admin_can_select_all_users" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;

CREATE POLICY "users_can_read_own"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "system_admin_can_select_all_users"
ON public.users FOR SELECT
USING (is_system_admin());

CREATE POLICY "users_can_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_member" ON public.tenants;
DROP POLICY IF EXISTS "system_admin_can_select_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "system_admin_can_manage_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "authenticated_can_insert_tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_admins_can_update" ON public.tenants;

-- Members can see tenants they belong to
CREATE POLICY "tenants_select_member"
ON public.tenants FOR SELECT
USING (id = ANY(get_user_tenant_ids()));

-- System admin can see all tenants
CREATE POLICY "system_admin_can_select_all_tenants"
ON public.tenants FOR SELECT
USING (is_system_admin());

-- System admin can manage all tenants
CREATE POLICY "system_admin_can_manage_all_tenants"
ON public.tenants FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

-- Authenticated users can create tenants
CREATE POLICY "authenticated_can_insert_tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Tenant admins/owners can update their tenant
CREATE POLICY "tenant_admins_can_update"
ON public.tenants FOR UPDATE
USING (
  has_tenant_role(id, 'admin'::public.tenant_role_enum)
  OR has_tenant_role(id, 'owner'::public.tenant_role_enum)
)
WITH CHECK (
  has_tenant_role(id, 'admin'::public.tenant_role_enum)
  OR has_tenant_role(id, 'owner'::public.tenant_role_enum)
);

-- ============================================================================
-- USER_TENANT_MEMBERSHIPS TABLE
-- ============================================================================
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_select_own" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_select_system_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "membership_all_system_admin" ON public.user_tenant_memberships;

CREATE POLICY "membership_select_own"
ON public.user_tenant_memberships FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "membership_select_tenant_admin"
ON public.user_tenant_memberships FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids()) 
  AND (
    has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum) 
    OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
  )
);

CREATE POLICY "membership_select_system_admin"
ON public.user_tenant_memberships FOR SELECT
USING (is_system_admin());

CREATE POLICY "membership_all_system_admin"
ON public.user_tenant_memberships FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

-- ============================================================================
-- GAMES TABLE
-- ============================================================================
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select_member" ON public.games;
DROP POLICY IF EXISTS "games_select_system_admin" ON public.games;
DROP POLICY IF EXISTS "games_insert_leader" ON public.games;
DROP POLICY IF EXISTS "games_update_leader" ON public.games;
DROP POLICY IF EXISTS "games_delete_admin" ON public.games;

-- Members can see games in their tenants
CREATE POLICY "games_select_member"
ON public.games FOR SELECT
USING (owner_tenant_id = ANY(get_user_tenant_ids()));

-- System admin can see all games
CREATE POLICY "games_select_system_admin"
ON public.games FOR SELECT
USING (is_system_admin());

-- Leaders can insert games
CREATE POLICY "games_insert_leader"
ON public.games FOR INSERT
WITH CHECK (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (
    has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum)
  )
);

-- Leaders can update their games
CREATE POLICY "games_update_leader"
ON public.games FOR UPDATE
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (
    has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum)
  )
)
WITH CHECK (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (
    has_tenant_role(owner_tenant_id, 'editor'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum)
  )
);

-- Admins can delete games
CREATE POLICY "games_delete_admin"
ON public.games FOR DELETE
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (
    has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
    OR has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum)
  )
);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "products_select_all" ON public.products;
    DROP POLICY IF EXISTS "products_system_admin_manage" ON public.products;
    
    -- Everyone can see products
    CREATE POLICY "products_select_all"
    ON public.products FOR SELECT
    USING (true);
    
    -- System admin can manage products
    CREATE POLICY "products_system_admin_manage"
    ON public.products FOR ALL
    USING (is_system_admin())
    WITH CHECK (is_system_admin());
  END IF;
END $$;

-- ============================================================================
-- PURPOSES TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
    ALTER TABLE public.purposes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "purposes_select_all" ON public.purposes;
    
    -- Everyone can see purposes
    CREATE POLICY "purposes_select_all"
    ON public.purposes FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================================================
-- GAME_PHASES TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_phases') THEN
    ALTER TABLE public.game_phases ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "game_phases_select" ON public.game_phases;
    DROP POLICY IF EXISTS "game_phases_insert" ON public.game_phases;
    DROP POLICY IF EXISTS "game_phases_update" ON public.game_phases;
    DROP POLICY IF EXISTS "game_phases_delete" ON public.game_phases;
    
    CREATE POLICY "game_phases_select"
    ON public.game_phases FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = game_phases.game_id 
        AND g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
    );
    
    CREATE POLICY "game_phases_insert"
    ON public.game_phases FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_phases.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
    
    CREATE POLICY "game_phases_update"
    ON public.game_phases FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_phases.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
    
    CREATE POLICY "game_phases_delete"
    ON public.game_phases FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_phases.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'owner')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- GAME_ROLES TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_roles') THEN
    ALTER TABLE public.game_roles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "game_roles_select" ON public.game_roles;
    DROP POLICY IF EXISTS "game_roles_manage" ON public.game_roles;
    
    CREATE POLICY "game_roles_select"
    ON public.game_roles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = game_roles.game_id 
        AND g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
    );
    
    CREATE POLICY "game_roles_manage"
    ON public.game_roles FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_roles.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- GAME_BOARD_CONFIG TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_board_config') THEN
    ALTER TABLE public.game_board_config ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "game_board_config_select" ON public.game_board_config;
    DROP POLICY IF EXISTS "game_board_config_manage" ON public.game_board_config;
    
    CREATE POLICY "game_board_config_select"
    ON public.game_board_config FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = game_board_config.game_id 
        AND g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
    );
    
    CREATE POLICY "game_board_config_manage"
    ON public.game_board_config FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_board_config.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- GAME_TRIGGERS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_triggers') THEN
    ALTER TABLE public.game_triggers ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "game_triggers_select" ON public.game_triggers;
    DROP POLICY IF EXISTS "game_triggers_manage" ON public.game_triggers;
    
    CREATE POLICY "game_triggers_select"
    ON public.game_triggers FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = game_triggers.game_id 
        AND g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
    );
    
    CREATE POLICY "game_triggers_manage"
    ON public.game_triggers FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_triggers.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- PLAY_SESSIONS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'play_sessions') THEN
    ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "play_sessions_select" ON public.play_sessions;
    DROP POLICY IF EXISTS "play_sessions_insert" ON public.play_sessions;
    DROP POLICY IF EXISTS "play_sessions_update" ON public.play_sessions;
    
    CREATE POLICY "play_sessions_select"
    ON public.play_sessions FOR SELECT
    USING (
      is_system_admin()
      OR tenant_id = ANY(get_user_tenant_ids())
    );
    
    CREATE POLICY "play_sessions_insert"
    ON public.play_sessions FOR INSERT
    WITH CHECK (
      tenant_id = ANY(get_user_tenant_ids())
      AND (
        has_tenant_role(tenant_id, 'editor'::public.tenant_role_enum)
        OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
        OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
      )
    );
    
    CREATE POLICY "play_sessions_update"
    ON public.play_sessions FOR UPDATE
    USING (
      is_system_admin()
      OR (
        tenant_id = ANY(get_user_tenant_ids())
        AND (
          has_tenant_role(tenant_id, 'editor'::public.tenant_role_enum)
          OR has_tenant_role(tenant_id, 'admin'::public.tenant_role_enum)
          OR has_tenant_role(tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
    );
  END IF;
END $$;

-- ============================================================================
-- CONVERSATION_CARD_DECKS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_card_decks') THEN
    ALTER TABLE public.conversation_card_decks ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "conversation_card_decks_select" ON public.conversation_card_decks;
    DROP POLICY IF EXISTS "conversation_card_decks_manage" ON public.conversation_card_decks;
    
    CREATE POLICY "conversation_card_decks_select"
    ON public.conversation_card_decks FOR SELECT
    USING (
      owner_tenant_id IS NULL 
      OR owner_tenant_id = ANY(get_user_tenant_ids())
    );
    
    CREATE POLICY "conversation_card_decks_manage"
    ON public.conversation_card_decks FOR ALL
    USING (
      is_system_admin()
      OR (
        owner_tenant_id IS NOT NULL 
        AND owner_tenant_id = ANY(get_user_tenant_ids())
        AND (
          has_tenant_role(owner_tenant_id, 'admin'::public.tenant_role_enum)
          OR has_tenant_role(owner_tenant_id, 'owner'::public.tenant_role_enum)
        )
      )
    );
  END IF;
END $$;

-- ============================================================================
-- GAME_TOOLS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_tools') THEN
    ALTER TABLE public.game_tools ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "game_tools_select" ON public.game_tools;
    DROP POLICY IF EXISTS "game_tools_manage" ON public.game_tools;
    
    CREATE POLICY "game_tools_select"
    ON public.game_tools FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        WHERE g.id = game_tools.game_id 
        AND g.owner_tenant_id = ANY(get_user_tenant_ids())
      )
    );
    
    CREATE POLICY "game_tools_manage"
    ON public.game_tools FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.games g 
        JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
        WHERE g.id = game_tools.game_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('editor', 'admin', 'owner')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
COMMENT ON TABLE public.user_tenant_memberships IS 'CANONICAL table for user-tenant membership. tenant_memberships is a VIEW pointing to this table. Consolidation completed 2026-01-04.';
