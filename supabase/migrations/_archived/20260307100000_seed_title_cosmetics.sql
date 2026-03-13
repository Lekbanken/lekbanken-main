-- Seed title cosmetics — 4 titles per faction × 4 factions = 16 titles
-- Unlocked at levels 1, 5, 10, 20 per faction.
-- render_config.label holds the display text; i18n name_key/description_key for admin UI.

-- =============================================================================
-- Forest titles
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  ('forest_title_lv1', 'title', 'forest', 'common',
   'cosmetics.forest_title_lv1.name', 'cosmetics.forest_title_lv1.description',
   'title', '{"label": "Skogens lärling"}', 100),

  ('forest_title_lv5', 'title', 'forest', 'uncommon',
   'cosmetics.forest_title_lv5.name', 'cosmetics.forest_title_lv5.description',
   'title', '{"label": "Skogsväktare"}', 101),

  ('forest_title_lv10', 'title', 'forest', 'rare',
   'cosmetics.forest_title_lv10.name', 'cosmetics.forest_title_lv10.description',
   'title', '{"label": "Lövsångens mästare"}', 102),

  ('forest_title_lv20', 'title', 'forest', 'epic',
   'cosmetics.forest_title_lv20.name', 'cosmetics.forest_title_lv20.description',
   'title', '{"label": "Skogens uråldriga"}', 103);

-- =============================================================================
-- Sea titles
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  ('sea_title_lv1', 'title', 'sea', 'common',
   'cosmetics.sea_title_lv1.name', 'cosmetics.sea_title_lv1.description',
   'title', '{"label": "Strandvandrare"}', 100),

  ('sea_title_lv5', 'title', 'sea', 'uncommon',
   'cosmetics.sea_title_lv5.name', 'cosmetics.sea_title_lv5.description',
   'title', '{"label": "Tidvattnets väktare"}', 101),

  ('sea_title_lv10', 'title', 'sea', 'rare',
   'cosmetics.sea_title_lv10.name', 'cosmetics.sea_title_lv10.description',
   'title', '{"label": "Korallernas herre"}', 102),

  ('sea_title_lv20', 'title', 'sea', 'epic',
   'cosmetics.sea_title_lv20.name', 'cosmetics.sea_title_lv20.description',
   'title', '{"label": "Djupens härskare"}', 103);

-- =============================================================================
-- Desert titles
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  ('desert_title_lv1', 'title', 'desert', 'common',
   'cosmetics.desert_title_lv1.name', 'cosmetics.desert_title_lv1.description',
   'title', '{"label": "Sandens novis"}', 100),

  ('desert_title_lv5', 'title', 'desert', 'uncommon',
   'cosmetics.desert_title_lv5.name', 'cosmetics.desert_title_lv5.description',
   'title', '{"label": "Solens budbärare"}', 101),

  ('desert_title_lv10', 'title', 'desert', 'rare',
   'cosmetics.desert_title_lv10.name', 'cosmetics.desert_title_lv10.description',
   'title', '{"label": "Ökenstormen"}', 102),

  ('desert_title_lv20', 'title', 'desert', 'epic',
   'cosmetics.desert_title_lv20.name', 'cosmetics.desert_title_lv20.description',
   'title', '{"label": "Solens arvinge"}', 103);

-- =============================================================================
-- Void titles
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  ('void_title_lv1', 'title', 'void', 'common',
   'cosmetics.void_title_lv1.name', 'cosmetics.void_title_lv1.description',
   'title', '{"label": "Rymdens vandrare"}', 100),

  ('void_title_lv5', 'title', 'void', 'uncommon',
   'cosmetics.void_title_lv5.name', 'cosmetics.void_title_lv5.description',
   'title', '{"label": "Stjärnvävare"}', 101),

  ('void_title_lv10', 'title', 'void', 'rare',
   'cosmetics.void_title_lv10.name', 'cosmetics.void_title_lv10.description',
   'title', '{"label": "Nebulans väktare"}', 102),

  ('void_title_lv20', 'title', 'void', 'epic',
   'cosmetics.void_title_lv20.name', 'cosmetics.void_title_lv20.description',
   'title', '{"label": "Kosmisk överherre"}', 103);

-- =============================================================================
-- Unlock rules (level-based)
-- =============================================================================

INSERT INTO public.cosmetic_unlock_rules (cosmetic_id, unlock_type, unlock_config)
SELECT c.id, 'level', jsonb_build_object('required_level', CASE c.key
  -- Forest
  WHEN 'forest_title_lv1'   THEN 1
  WHEN 'forest_title_lv5'   THEN 5
  WHEN 'forest_title_lv10'  THEN 10
  WHEN 'forest_title_lv20'  THEN 20
  -- Sea
  WHEN 'sea_title_lv1'      THEN 1
  WHEN 'sea_title_lv5'      THEN 5
  WHEN 'sea_title_lv10'     THEN 10
  WHEN 'sea_title_lv20'     THEN 20
  -- Desert
  WHEN 'desert_title_lv1'   THEN 1
  WHEN 'desert_title_lv5'   THEN 5
  WHEN 'desert_title_lv10'  THEN 10
  WHEN 'desert_title_lv20'  THEN 20
  -- Void
  WHEN 'void_title_lv1'     THEN 1
  WHEN 'void_title_lv5'     THEN 5
  WHEN 'void_title_lv10'    THEN 10
  WHEN 'void_title_lv20'    THEN 20
END)
FROM public.cosmetics c
WHERE c.key IN (
  'forest_title_lv1', 'forest_title_lv5', 'forest_title_lv10', 'forest_title_lv20',
  'sea_title_lv1', 'sea_title_lv5', 'sea_title_lv10', 'sea_title_lv20',
  'desert_title_lv1', 'desert_title_lv5', 'desert_title_lv10', 'desert_title_lv20',
  'void_title_lv1', 'void_title_lv5', 'void_title_lv10', 'void_title_lv20'
);
