-- Journey v2.0 Steg 2a: Cosmetics schema
-- Creates: cosmetics, cosmetic_unlock_rules, user_cosmetics, user_cosmetic_loadout
-- Adds: cosmetic_id FK on shop_items
-- All tables are global (not tenant-scoped) — Journey identity is personal.

-- =============================================================================
-- 1. cosmetics (catalog)
-- =============================================================================

CREATE TABLE public.cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  faction_id TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  name_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  render_type TEXT NOT NULL,
  render_config JSONB NOT NULL DEFAULT '{}',
  preview_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cosmetics_category ON public.cosmetics(category);
CREATE INDEX idx_cosmetics_faction ON public.cosmetics(faction_id);
CREATE INDEX idx_cosmetics_rarity ON public.cosmetics(rarity);

COMMENT ON TABLE public.cosmetics IS
  'Global cosmetic catalog for Journey v2.0. Admin-managed, not tenant-scoped.';

-- =============================================================================
-- 2. cosmetic_unlock_rules
-- =============================================================================

CREATE TABLE public.cosmetic_unlock_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmetic_id UUID NOT NULL REFERENCES public.cosmetics(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,
  unlock_config JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unlock_rules_cosmetic ON public.cosmetic_unlock_rules(cosmetic_id);
CREATE INDEX idx_unlock_rules_type ON public.cosmetic_unlock_rules(unlock_type);

COMMENT ON TABLE public.cosmetic_unlock_rules IS
  'Admin-defined rules for how cosmetics are unlocked (level, achievement, shop, event, manual).';

-- =============================================================================
-- 3. user_cosmetics (ownership / collection)
-- =============================================================================

CREATE TABLE public.user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES public.cosmetics(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user ON public.user_cosmetics(user_id);

COMMENT ON TABLE public.user_cosmetics IS
  'Per-user cosmetic ownership. Global (not tenant-scoped). Grants via service role only.';

-- =============================================================================
-- 4. user_cosmetic_loadout (active configuration)
-- =============================================================================

CREATE TABLE public.user_cosmetic_loadout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  cosmetic_id UUID NOT NULL REFERENCES public.cosmetics(id) ON DELETE CASCADE,
  UNIQUE(user_id, slot)
);

CREATE INDEX idx_loadout_user ON public.user_cosmetic_loadout(user_id);

COMMENT ON TABLE public.user_cosmetic_loadout IS
  'Per-user active loadout (one cosmetic per slot). Global, not tenant-scoped.';

-- =============================================================================
-- 5. shop_items: add optional cosmetic FK
-- =============================================================================

ALTER TABLE public.shop_items
ADD COLUMN cosmetic_id UUID REFERENCES public.cosmetics(id) ON DELETE SET NULL;

-- =============================================================================
-- 6. RLS policies
-- =============================================================================

-- cosmetics: read-only for all authenticated users (active items only)
ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_select" ON public.cosmetics
  FOR SELECT TO authenticated
  USING (is_active = true);

-- cosmetic_unlock_rules: read-only for all authenticated users
ALTER TABLE public.cosmetic_unlock_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlock_rules_select" ON public.cosmetic_unlock_rules
  FOR SELECT TO authenticated
  USING (true);

-- user_cosmetics: users can only READ their own. NO client-initiated INSERT.
-- Grants happen exclusively via service role (level-up, achievement, shop, admin).
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cosmetics_select" ON public.user_cosmetics
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_cosmetic_loadout: users can read/write their own slots.
-- INSERT includes defense-in-depth ownership check via subquery.
ALTER TABLE public.user_cosmetic_loadout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loadout_select" ON public.user_cosmetic_loadout
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "loadout_insert" ON public.user_cosmetic_loadout
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND cosmetic_id IN (
      SELECT cosmetic_id FROM public.user_cosmetics
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "loadout_update" ON public.user_cosmetic_loadout
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "loadout_delete" ON public.user_cosmetic_loadout
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
