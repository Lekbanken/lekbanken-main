-- Journey v2.0 Steg 2b: Seed cosmetics from skill-trees.ts
-- Maps ~24 cosmetic nodes (6 per faction × 4 factions) into the cosmetics table.
-- Skipped nodes: root (identity), color (out of v2.0 scope), title (excluded from v2.0).
--
-- Key format: {faction}_{category}_{variant}
-- Rarity derived from requiredLevel: 2-3 = common, 4-5 = uncommon, 6 = rare, 8+ = epic

-- =============================================================================
-- Void faction (6 cosmetics)
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  -- bg1: Stjärnfält (level 2)
  ('void_scene_background_stars', 'scene_background', 'void', 'common',
   'cosmetics.void_stars.name', 'cosmetics.void_stars.description',
   'css_background', '{"className": "bg-effect-stars", "keyframes": "stars-float"}', 10),

  -- avatar → particles: Orbital (level 2)
  ('void_particles_orbit', 'particles', 'void', 'common',
   'cosmetics.void_orbit.name', 'cosmetics.void_orbit.description',
   'css_particles', '{"className": "particle-void-orbit", "count": 12}', 20),

  -- xp: Hyperspace (level 3)
  ('void_xp_bar_warp', 'xp_bar', 'void', 'common',
   'cosmetics.void_warp.name', 'cosmetics.void_warp.description',
   'xp_skin', '{"skin": "warp", "colorMode": "accent"}', 30),

  -- bg2: Meteorer (level 4)
  ('void_scene_background_meteors', 'scene_background', 'void', 'uncommon',
   'cosmetics.void_meteors.name', 'cosmetics.void_meteors.description',
   'css_background', '{"className": "bg-effect-meteors", "keyframes": "meteors-fall"}', 40),

  -- divider: Nebulosa (level 5)
  ('void_section_divider_nebula', 'section_divider', 'void', 'uncommon',
   'cosmetics.void_nebula.name', 'cosmetics.void_nebula.description',
   'css_divider', '{"variant": "nebula", "className": "divider-nebula"}', 50),

  -- header → avatar_frame: Stjärnbild (level 6)
  ('void_avatar_frame_constellation', 'avatar_frame', 'void', 'rare',
   'cosmetics.void_constellation.name', 'cosmetics.void_constellation.description',
   'svg_frame', '{"variant": "constellation", "glowColor": "rgba(124, 58, 237, 0.4)"}', 60);


-- =============================================================================
-- Sea faction (6 cosmetics)
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  -- bg1: Bubblor (level 2)
  ('sea_scene_background_bubbles', 'scene_background', 'sea', 'common',
   'cosmetics.sea_bubbles.name', 'cosmetics.sea_bubbles.description',
   'css_background', '{"className": "bg-effect-bubbles", "keyframes": "bubbles-rise"}', 10),

  -- avatar → particles: Krusning (level 2)
  ('sea_particles_ripple', 'particles', 'sea', 'common',
   'cosmetics.sea_ripple.name', 'cosmetics.sea_ripple.description',
   'css_particles', '{"className": "particle-sea-ripple", "count": 12}', 20),

  -- xp: Havsström (level 3)
  ('sea_xp_bar_current', 'xp_bar', 'sea', 'common',
   'cosmetics.sea_current.name', 'cosmetics.sea_current.description',
   'xp_skin', '{"skin": "current", "colorMode": "accent"}', 30),

  -- bg2: Vågor (level 4)
  ('sea_scene_background_waves', 'scene_background', 'sea', 'uncommon',
   'cosmetics.sea_waves.name', 'cosmetics.sea_waves.description',
   'css_background', '{"className": "bg-effect-waves", "keyframes": "waves-flow"}', 40),

  -- divider: Tidvatten (level 5)
  ('sea_section_divider_tide', 'section_divider', 'sea', 'uncommon',
   'cosmetics.sea_tide.name', 'cosmetics.sea_tide.description',
   'css_divider', '{"variant": "tide", "className": "divider-tide"}', 50),

  -- header → avatar_frame: Korallrev (level 6)
  ('sea_avatar_frame_coral', 'avatar_frame', 'sea', 'rare',
   'cosmetics.sea_coral.name', 'cosmetics.sea_coral.description',
   'svg_frame', '{"variant": "coral", "glowColor": "rgba(14, 165, 233, 0.4)"}', 60);


-- =============================================================================
-- Forest faction (6 cosmetics)
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  -- bg1: Löv (level 2)
  ('forest_scene_background_leaves', 'scene_background', 'forest', 'common',
   'cosmetics.forest_leaves.name', 'cosmetics.forest_leaves.description',
   'css_background', '{"className": "bg-effect-leaves", "keyframes": "leaves-drift"}', 10),

  -- avatar → particles: Sporer (level 2)
  ('forest_particles_spores', 'particles', 'forest', 'common',
   'cosmetics.forest_spores.name', 'cosmetics.forest_spores.description',
   'css_particles', '{"className": "particle-forest-spores", "count": 16}', 20),

  -- xp: Tillväxt (level 3)
  ('forest_xp_bar_growth', 'xp_bar', 'forest', 'common',
   'cosmetics.forest_growth.name', 'cosmetics.forest_growth.description',
   'xp_skin', '{"skin": "growth", "colorMode": "accent"}', 30),

  -- bg2: Eldflugor (level 4)
  ('forest_scene_background_fireflies', 'scene_background', 'forest', 'uncommon',
   'cosmetics.forest_fireflies.name', 'cosmetics.forest_fireflies.description',
   'css_background', '{"className": "bg-effect-fireflies", "keyframes": "fireflies-glow"}', 40),

  -- divider: Rötter (level 5)
  ('forest_section_divider_roots', 'section_divider', 'forest', 'uncommon',
   'cosmetics.forest_roots.name', 'cosmetics.forest_roots.description',
   'css_divider', '{"variant": "roots", "className": "divider-roots"}', 50),

  -- header → avatar_frame: Rankor (level 6)
  ('forest_avatar_frame_vines', 'avatar_frame', 'forest', 'rare',
   'cosmetics.forest_vines.name', 'cosmetics.forest_vines.description',
   'svg_frame', '{"variant": "vines", "glowColor": "rgba(16, 185, 129, 0.4)"}', 60);


-- =============================================================================
-- Desert faction (6 cosmetics)
-- =============================================================================

INSERT INTO public.cosmetics (key, category, faction_id, rarity, name_key, description_key, render_type, render_config, sort_order) VALUES
  -- bg1: Moln (level 2)
  ('desert_scene_background_clouds', 'scene_background', 'desert', 'common',
   'cosmetics.desert_clouds.name', 'cosmetics.desert_clouds.description',
   'css_background', '{"className": "bg-effect-clouds", "keyframes": "clouds-drift"}', 10),

  -- avatar → particles: Gloria (level 2)
  ('desert_particles_halo', 'particles', 'desert', 'common',
   'cosmetics.desert_halo.name', 'cosmetics.desert_halo.description',
   'css_particles', '{"className": "particle-desert-halo", "count": 12}', 20),

  -- xp: Regnbåge (level 3)
  ('desert_xp_bar_rainbow', 'xp_bar', 'desert', 'common',
   'cosmetics.desert_rainbow.name', 'cosmetics.desert_rainbow.description',
   'xp_skin', '{"skin": "rainbow", "colorMode": "accent"}', 30),

  -- bg2: Gudastrålar (level 4)
  ('desert_scene_background_rays', 'scene_background', 'desert', 'uncommon',
   'cosmetics.desert_rays.name', 'cosmetics.desert_rays.description',
   'css_background', '{"className": "bg-effect-rays", "keyframes": "rays-pulse"}', 40),

  -- divider: Bris (level 5)
  ('desert_section_divider_breeze', 'section_divider', 'desert', 'uncommon',
   'cosmetics.desert_breeze.name', 'cosmetics.desert_breeze.description',
   'css_divider', '{"variant": "breeze", "className": "divider-breeze"}', 50),

  -- header → avatar_frame: Norrsken (level 6)
  ('desert_avatar_frame_aurora', 'avatar_frame', 'desert', 'rare',
   'cosmetics.desert_aurora.name', 'cosmetics.desert_aurora.description',
   'svg_frame', '{"variant": "aurora", "glowColor": "rgba(245, 158, 11, 0.4)"}', 60);


-- =============================================================================
-- Unlock rules (level-based, one per cosmetic)
-- =============================================================================

INSERT INTO public.cosmetic_unlock_rules (cosmetic_id, unlock_type, unlock_config)
SELECT c.id, 'level', jsonb_build_object('required_level', CASE c.key
  -- Void
  WHEN 'void_scene_background_stars'         THEN 2
  WHEN 'void_particles_orbit'                THEN 2
  WHEN 'void_xp_bar_warp'                    THEN 3
  WHEN 'void_scene_background_meteors'       THEN 4
  WHEN 'void_section_divider_nebula'         THEN 5
  WHEN 'void_avatar_frame_constellation'     THEN 6
  -- Sea
  WHEN 'sea_scene_background_bubbles'        THEN 2
  WHEN 'sea_particles_ripple'                THEN 2
  WHEN 'sea_xp_bar_current'                  THEN 3
  WHEN 'sea_scene_background_waves'          THEN 4
  WHEN 'sea_section_divider_tide'            THEN 5
  WHEN 'sea_avatar_frame_coral'              THEN 6
  -- Forest
  WHEN 'forest_scene_background_leaves'      THEN 2
  WHEN 'forest_particles_spores'             THEN 2
  WHEN 'forest_xp_bar_growth'               THEN 3
  WHEN 'forest_scene_background_fireflies'   THEN 4
  WHEN 'forest_section_divider_roots'        THEN 5
  WHEN 'forest_avatar_frame_vines'           THEN 6
  -- Desert
  WHEN 'desert_scene_background_clouds'      THEN 2
  WHEN 'desert_particles_halo'               THEN 2
  WHEN 'desert_xp_bar_rainbow'              THEN 3
  WHEN 'desert_scene_background_rays'        THEN 4
  WHEN 'desert_section_divider_breeze'       THEN 5
  WHEN 'desert_avatar_frame_aurora'          THEN 6
END)
FROM public.cosmetics c
WHERE c.key IN (
  'void_scene_background_stars', 'void_particles_orbit', 'void_xp_bar_warp',
  'void_scene_background_meteors', 'void_section_divider_nebula', 'void_avatar_frame_constellation',
  'sea_scene_background_bubbles', 'sea_particles_ripple', 'sea_xp_bar_current',
  'sea_scene_background_waves', 'sea_section_divider_tide', 'sea_avatar_frame_coral',
  'forest_scene_background_leaves', 'forest_particles_spores', 'forest_xp_bar_growth',
  'forest_scene_background_fireflies', 'forest_section_divider_roots', 'forest_avatar_frame_vines',
  'desert_scene_background_clouds', 'desert_particles_halo', 'desert_xp_bar_rainbow',
  'desert_scene_background_rays', 'desert_section_divider_breeze', 'desert_avatar_frame_aurora'
);
