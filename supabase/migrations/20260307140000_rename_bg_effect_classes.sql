-- Rename scene_background CSS class names from bg-effect-* to scene-*
-- Reason: tailwind-merge interprets bg-* as Tailwind background utilities
-- and strips the existing bg-gradient-to-b from JourneyScene, breaking layout.

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-stars"')
WHERE key = 'void_scene_background_stars';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-meteors"')
WHERE key = 'void_scene_background_meteors';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-bubbles"')
WHERE key = 'sea_scene_background_bubbles';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-waves"')
WHERE key = 'sea_scene_background_waves';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-leaves"')
WHERE key = 'forest_scene_background_leaves';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-fireflies"')
WHERE key = 'forest_scene_background_fireflies';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-clouds"')
WHERE key = 'desert_scene_background_clouds';

UPDATE public.cosmetics
SET render_config = jsonb_set(render_config, '{className}', '"scene-rays"')
WHERE key = 'desert_scene_background_rays';
