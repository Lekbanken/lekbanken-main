-- =============================================================================
-- Seed categories + backfill products.category_slug
-- =============================================================================
--
-- 1. Upserts the 9 canonical categories from the product taxonomy
-- 2. Creates 3 legacy categories (sports/education/family) as NOT public
-- 3. Backfills products.category_slug based on existing products.category text
--
-- Idempotent: safe to run multiple times (ON CONFLICT DO UPDATE).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Seed canonical categories (9 active target audiences)
-- ─────────────────────────────────────────────────────────────────────────────
-- Slug mapping rule: lowercase, spaces→hyphens, å→a, ä→a, ö→o, &→och

INSERT INTO public.categories (slug, name, description_short, icon_key, sort_order, is_public)
VALUES
  ('specialpedagog',       'Specialpedagog',       'Aktiviteter anpassade för specialpedagogisk verksamhet.',  'HeartIcon',            1,  true),
  ('arbetsplatsen',        'Arbetsplatsen',         'Aktiviteter för arbetsplatsen – kickoff, teambuilding och mer.', 'BriefcaseIcon',  2,  true),
  ('digitala-aktiviteter', 'Digitala aktiviteter',  'Aktiviteter för digitala möten och distansarbete.',        'ComputerDesktopIcon',  3,  true),
  ('ungdomsverksamhet',    'Ungdomsverksamhet',     'Aktiviteter för läger, scouter och ungdomsledare.',        'UsersIcon',            4,  true),
  ('foraldrar',            'Föräldrar',             'Lekar och aktiviteter för familjen.',                      'HomeIcon',             5,  true),
  ('event-och-hogtider',   'Event & högtider',      'Säsongsaktiviteter för jul, midsommar, påsk och mer.',     'CalendarDaysIcon',     6,  true),
  ('festligheter',         'Festligheter',          'Aktiviteter för bröllop, fester och firanden.',            'GiftIcon',             7,  true),
  ('pedagoger',            'Pedagoger',             'Aktiviteter för dagis, förskola, grundskola och gymnasium.', 'AcademicCapIcon',   8,  true),
  ('tranare',              'Tränare',               'Aktiviteter och uppvärmningar för fotboll, innebandy och mer.', 'TrophyIcon',      9,  true)
ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  description_short = EXCLUDED.description_short,
  icon_key          = EXCLUDED.icon_key,
  sort_order        = EXCLUDED.sort_order,
  is_public         = EXCLUDED.is_public,
  updated_at        = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Legacy categories — hidden from marketing
-- ─────────────────────────────────────────────────────────────────────────────
-- These come from early seed migrations (product_keys: trainer, pedagog, parent)
-- with English category names. We keep them for FK integrity but hide them.

INSERT INTO public.categories (slug, name, description_short, icon_key, sort_order, is_public)
VALUES
  ('sports',    'Sports',    'Legacy category – do not use.',    'TrophyIcon',       100, false),
  ('education', 'Education', 'Legacy category – do not use.',    'AcademicCapIcon',  101, false),
  ('family',    'Family',    'Legacy category – do not use.',    'HomeIcon',          102, false)
ON CONFLICT (slug) DO UPDATE SET
  is_public  = false,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill products.category_slug from products.category (text)
-- ─────────────────────────────────────────────────────────────────────────────
-- Maps the free-text category values to the corresponding category slugs.
-- Case-insensitive matching. Unknown categories are left NULL (no match).

UPDATE public.products SET category_slug = CASE lower(trim(category))
  -- Canonical categories
  WHEN 'specialpedagog'       THEN 'specialpedagog'
  WHEN 'arbetsplatsen'        THEN 'arbetsplatsen'
  WHEN 'digitala aktiviteter' THEN 'digitala-aktiviteter'
  WHEN 'ungdomsverksamhet'    THEN 'ungdomsverksamhet'
  WHEN 'föräldrar'            THEN 'foraldrar'
  WHEN 'event & högtider'     THEN 'event-och-hogtider'
  WHEN 'festligheter'         THEN 'festligheter'
  WHEN 'pedagoger'            THEN 'pedagoger'
  WHEN 'tränare'              THEN 'tranare'
  -- Legacy English categories
  WHEN 'sports'               THEN 'sports'
  WHEN 'education'            THEN 'education'
  WHEN 'family'               THEN 'family'
  WHEN 'familie'              THEN 'family'
  ELSE NULL
END
WHERE category_slug IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Mark legacy products as not marketing-visible
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.products
SET is_marketing_visible = false
WHERE category_slug IN ('sports', 'education', 'family');

COMMIT;
