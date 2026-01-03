-- =============================================================================
-- Migration: 20260103120000_conversation_cards_v1.sql
-- Description: Conversation Cards (Samtalskort) library v1
-- =============================================================================

-- =============================================================================
-- 1) Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_card_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope_type TEXT NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('global', 'tenant')),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  audience TEXT,
  language TEXT,

  -- Pedagogical linking (reuse existing purposes)
  main_purpose_id UUID REFERENCES public.purposes(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT conversation_card_collections_scope_consistency
    CHECK (
      (scope_type = 'global' AND tenant_id IS NULL)
      OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_conversation_card_collections_scope
  ON public.conversation_card_collections(scope_type, tenant_id);

CREATE INDEX IF NOT EXISTS idx_conversation_card_collections_status
  ON public.conversation_card_collections(status);

CREATE INDEX IF NOT EXISTS idx_conversation_card_collections_main_purpose
  ON public.conversation_card_collections(main_purpose_id);

DROP TRIGGER IF EXISTS trg_conversation_card_collections_updated ON public.conversation_card_collections;
CREATE TRIGGER trg_conversation_card_collections_updated
  BEFORE UPDATE ON public.conversation_card_collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Secondary purposes (typically sub purposes)
CREATE TABLE IF NOT EXISTS public.conversation_card_collection_secondary_purposes (
  collection_id UUID NOT NULL REFERENCES public.conversation_card_collections(id) ON DELETE CASCADE,
  purpose_id UUID NOT NULL REFERENCES public.purposes(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, purpose_id)
);

CREATE INDEX IF NOT EXISTS idx_ccc_secondary_purposes_purpose
  ON public.conversation_card_collection_secondary_purposes(purpose_id);


-- Cards within a collection
CREATE TABLE IF NOT EXISTS public.conversation_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.conversation_card_collections(id) ON DELETE CASCADE,

  sort_order INTEGER NOT NULL DEFAULT 0,

  card_title TEXT,
  primary_prompt TEXT NOT NULL,
  followup_1 TEXT,
  followup_2 TEXT,
  followup_3 TEXT,
  leader_tip TEXT,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_cards_collection_order
  ON public.conversation_cards(collection_id, sort_order);

DROP TRIGGER IF EXISTS trg_conversation_cards_updated ON public.conversation_cards;
CREATE TRIGGER trg_conversation_cards_updated
  BEFORE UPDATE ON public.conversation_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- =============================================================================
-- 2) RLS
-- =============================================================================

ALTER TABLE public.conversation_card_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_card_collection_secondary_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_cards ENABLE ROW LEVEL SECURITY;

-- Collections: SELECT
DROP POLICY IF EXISTS conversation_card_collections_select ON public.conversation_card_collections;
CREATE POLICY conversation_card_collections_select ON public.conversation_card_collections
  FOR SELECT USING (
    (
      scope_type = 'global'
      AND status = 'published'
    )
    OR (
      auth.role() = 'authenticated'
      AND scope_type = 'tenant'
      AND tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
      )
    )
    OR public.is_global_admin()
  );

-- Collections: INSERT
DROP POLICY IF EXISTS conversation_card_collections_insert ON public.conversation_card_collections;
CREATE POLICY conversation_card_collections_insert ON public.conversation_card_collections
  FOR INSERT WITH CHECK (
    (
      scope_type = 'global'
      AND tenant_id IS NULL
      AND public.is_global_admin()
    )
    OR (
      scope_type = 'tenant'
      AND tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_tenant_memberships m
        WHERE m.user_id = auth.uid()
          AND m.tenant_id = conversation_card_collections.tenant_id
          AND m.status = 'active'
          AND m.role IN ('owner', 'admin')
      )
    )
  );

-- Collections: UPDATE
DROP POLICY IF EXISTS conversation_card_collections_update ON public.conversation_card_collections;
CREATE POLICY conversation_card_collections_update ON public.conversation_card_collections
  FOR UPDATE USING (
    (
      scope_type = 'global'
      AND tenant_id IS NULL
      AND public.is_global_admin()
    )
    OR (
      scope_type = 'tenant'
      AND tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_tenant_memberships m
        WHERE m.user_id = auth.uid()
          AND m.tenant_id = conversation_card_collections.tenant_id
          AND m.status = 'active'
          AND m.role IN ('owner', 'admin')
      )
    )
  );

-- Collections: DELETE
DROP POLICY IF EXISTS conversation_card_collections_delete ON public.conversation_card_collections;
CREATE POLICY conversation_card_collections_delete ON public.conversation_card_collections
  FOR DELETE USING (
    (
      scope_type = 'global'
      AND tenant_id IS NULL
      AND public.is_global_admin()
    )
    OR (
      scope_type = 'tenant'
      AND tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_tenant_memberships m
        WHERE m.user_id = auth.uid()
          AND m.tenant_id = conversation_card_collections.tenant_id
          AND m.status = 'active'
          AND m.role IN ('owner', 'admin')
      )
    )
  );


-- Secondary purposes: SELECT
DROP POLICY IF EXISTS ccc_secondary_purposes_select ON public.conversation_card_collection_secondary_purposes;
CREATE POLICY ccc_secondary_purposes_select ON public.conversation_card_collection_secondary_purposes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_card_collection_secondary_purposes.collection_id
        AND (
          (c.scope_type = 'global' AND c.status = 'published')
          OR (
            auth.role() = 'authenticated'
            AND c.scope_type = 'tenant'
            AND c.tenant_id IN (
              SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
            )
          )
          OR public.is_global_admin()
        )
    )
  );

-- Secondary purposes: INSERT/DELETE (managed via collection admin)
DROP POLICY IF EXISTS ccc_secondary_purposes_insert ON public.conversation_card_collection_secondary_purposes;
CREATE POLICY ccc_secondary_purposes_insert ON public.conversation_card_collection_secondary_purposes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_card_collection_secondary_purposes.collection_id
        AND (
          (c.scope_type = 'global' AND c.tenant_id IS NULL AND public.is_global_admin())
          OR (
            c.scope_type = 'tenant'
            AND c.tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = c.tenant_id
                AND m.status = 'active'
                AND m.role IN ('owner', 'admin')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS ccc_secondary_purposes_delete ON public.conversation_card_collection_secondary_purposes;
CREATE POLICY ccc_secondary_purposes_delete ON public.conversation_card_collection_secondary_purposes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_card_collection_secondary_purposes.collection_id
        AND (
          (c.scope_type = 'global' AND c.tenant_id IS NULL AND public.is_global_admin())
          OR (
            c.scope_type = 'tenant'
            AND c.tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = c.tenant_id
                AND m.status = 'active'
                AND m.role IN ('owner', 'admin')
            )
          )
        )
    )
  );


-- Cards: SELECT
DROP POLICY IF EXISTS conversation_cards_select ON public.conversation_cards;
CREATE POLICY conversation_cards_select ON public.conversation_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_cards.collection_id
        AND (
          (c.scope_type = 'global' AND c.status = 'published')
          OR (
            auth.role() = 'authenticated'
            AND c.scope_type = 'tenant'
            AND c.tenant_id IN (
              SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
            )
          )
          OR public.is_global_admin()
        )
    )
  );

-- Cards: INSERT/UPDATE/DELETE (managed via collection admin)
DROP POLICY IF EXISTS conversation_cards_insert ON public.conversation_cards;
CREATE POLICY conversation_cards_insert ON public.conversation_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_cards.collection_id
        AND (
          (c.scope_type = 'global' AND c.tenant_id IS NULL AND public.is_global_admin())
          OR (
            c.scope_type = 'tenant'
            AND c.tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = c.tenant_id
                AND m.status = 'active'
                AND m.role IN ('owner', 'admin')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS conversation_cards_update ON public.conversation_cards;
CREATE POLICY conversation_cards_update ON public.conversation_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_cards.collection_id
        AND (
          (c.scope_type = 'global' AND c.tenant_id IS NULL AND public.is_global_admin())
          OR (
            c.scope_type = 'tenant'
            AND c.tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = c.tenant_id
                AND m.status = 'active'
                AND m.role IN ('owner', 'admin')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS conversation_cards_delete ON public.conversation_cards;
CREATE POLICY conversation_cards_delete ON public.conversation_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_card_collections c
      WHERE c.id = conversation_cards.collection_id
        AND (
          (c.scope_type = 'global' AND c.tenant_id IS NULL AND public.is_global_admin())
          OR (
            c.scope_type = 'tenant'
            AND c.tenant_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.user_tenant_memberships m
              WHERE m.user_id = auth.uid()
                AND m.tenant_id = c.tenant_id
                AND m.status = 'active'
                AND m.role IN ('owner', 'admin')
            )
          )
        )
    )
  );


-- =============================================================================
-- 3) Grants
-- =============================================================================

GRANT SELECT ON public.conversation_card_collections TO anon;
GRANT SELECT ON public.conversation_card_collection_secondary_purposes TO anon;
GRANT SELECT ON public.conversation_cards TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_card_collections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.conversation_card_collection_secondary_purposes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_cards TO authenticated;

GRANT ALL ON public.conversation_card_collections TO service_role;
GRANT ALL ON public.conversation_card_collection_secondary_purposes TO service_role;
GRANT ALL ON public.conversation_cards TO service_role;

COMMENT ON TABLE public.conversation_card_collections IS 'Conversation card decks/collections (Samtalskort) - reusable across tenant/global.';
COMMENT ON TABLE public.conversation_cards IS 'Cards belonging to a conversation card collection.';
COMMENT ON TABLE public.conversation_card_collection_secondary_purposes IS 'Secondary purpose links for conversation card collections (typically sub purposes).';
