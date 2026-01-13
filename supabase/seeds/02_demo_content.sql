-- ============================================================================
-- Seed: Demo Content Curation
-- Purpose: Flag activities for demo visibility
-- Author: Demo Implementation Team
-- Date: 2026-01-14
-- ============================================================================

BEGIN;

\echo 'Curating demo content...'

-- ============================================================================
-- APPROACH: Manual Curation
-- This seed provides TWO approaches for flagging demo content
-- ============================================================================

-- ============================================================================
-- OPTION 1: Flag by Activity Name (Requires Manual Selection)
-- Uncomment and modify with actual activity names from your database
-- ============================================================================

/*
-- Example: Flag specific activities by name
UPDATE activities
SET is_demo_content = true
WHERE name IN (
  -- Icebreakers (3)
  'Leken om hatten',
  'Fruktsallad',
  'Två sanningar och en lögn',

  -- Energizers (3)
  'Energi-cirkeln',
  'Klapp-kedjan',
  'Rysningen',

  -- Team building (4)
  'Tidskapseln',
  'Byggbron',
  'Kreativ problemlösning',
  'Förtroendecirkel',

  -- Reflection (2)
  'Fem fingrar',
  'Dagboksskrivning',

  -- Problem solving (3)
  'Escape Room Light',
  'Mysterieboxen',
  'Logik-utmaningen',

  -- Creative (3)
  'Improvisationsteater',
  'Berättelsestafett',
  'Konst-skapande'
)
AND is_global = true;
*/

-- ============================================================================
-- OPTION 2: Flag by Criteria (Automated Selection)
-- Selects top activities based on usage or other metrics
-- ============================================================================

-- Step 1: Find most used global activities
-- (Assumes you have usage/engagement data)

DO $$
DECLARE
  flagged_count INTEGER := 0;
BEGIN
  -- Strategy: Flag top 20 most recently created global activities
  -- This ensures we have some content to work with in demo
  -- TODO: Replace this with actual curation logic based on your metrics

  UPDATE activities
  SET is_demo_content = true
  WHERE id IN (
    SELECT id
    FROM activities
    WHERE is_global = true
      AND is_demo_content = false -- Don't re-flag
      AND deleted_at IS NULL -- Exclude deleted
    ORDER BY created_at DESC -- Most recent first
    LIMIT 20
  );

  GET DIAGNOSTICS flagged_count = ROW_COUNT;

  IF flagged_count > 0 THEN
    RAISE NOTICE '✓ Flagged % activities as demo content (automated selection)', flagged_count;
  ELSE
    RAISE NOTICE '⚠ No activities were flagged. Database may be empty or all activities already flagged.';
  END IF;
END $$;

-- ============================================================================
-- OPTION 3: Flag All Global Activities (Quick Start - NOT RECOMMENDED)
-- Only use this for initial development/testing
-- ============================================================================

-- WARNING: This gives demo users access to ALL global content
-- Uncomment ONLY for initial testing

/*
UPDATE activities
SET is_demo_content = true
WHERE is_global = true
  AND is_demo_content = false;
*/

-- ============================================================================
-- Content Curation Guidelines
-- For manual curation, consider these criteria:
-- ============================================================================

-- 1. Diversity: Cover all major categories
--    - Icebreakers, Energizers, Team Building, Reflection, etc.

-- 2. Simplicity: Choose activities that are easy to understand quickly
--    - Clear instructions
--    - Minimal props needed
--    - Universal appeal

-- 3. Visual Appeal: Activities with good imagery/descriptions
--    - Representative of quality
--    - Engaging thumbnails

-- 4. Feature Showcase: Activities that demonstrate platform features
--    - QR codes
--    - Gamification potential
--    - Session planning
--    - Progress tracking

-- 5. Age Range: Cover different age groups
--    - Kids (6-12)
--    - Teens (13-17)
--    - Adults (18+)

-- 6. Duration: Mix of quick (5-10 min) and longer (30+ min) activities

-- 7. Group Size: Activities for different group sizes
--    - Small (3-8 people)
--    - Medium (9-20 people)
--    - Large (20+ people)

-- ============================================================================
-- Create Demo Activity Collections (Future Enhancement)
-- For when you migrate to collections-based curation
-- ============================================================================

-- Placeholder for future collections table
-- See demo_technical_spec.md for full collections schema

/*
-- Future: Create demo collections
INSERT INTO demo_collections (id, name, slug, target_audience, is_active)
VALUES
  (gen_random_uuid(), 'General Demo', 'general-demo', 'general', true),
  (gen_random_uuid(), 'Enterprise Demo', 'enterprise-demo', 'enterprise', true),
  (gen_random_uuid(), 'Education Demo', 'education-demo', 'education', true)
ON CONFLICT (slug) DO NOTHING;
*/

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  total_global_activities INTEGER;
  demo_flagged_activities INTEGER;
  demo_percentage NUMERIC;
BEGIN
  -- Count total global activities
  SELECT COUNT(*) INTO total_global_activities
  FROM activities
  WHERE is_global = true
    AND deleted_at IS NULL;

  -- Count demo-flagged activities
  SELECT COUNT(*) INTO demo_flagged_activities
  FROM activities
  WHERE is_global = true
    AND is_demo_content = true
    AND deleted_at IS NULL;

  -- Calculate percentage
  IF total_global_activities > 0 THEN
    demo_percentage := ROUND((demo_flagged_activities::NUMERIC / total_global_activities::NUMERIC) * 100, 1);
  ELSE
    demo_percentage := 0;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Content Curation Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total global activities: %', total_global_activities;
  RAISE NOTICE 'Demo-flagged activities: %', demo_flagged_activities;
  RAISE NOTICE 'Demo content percentage: %%', demo_percentage;
  RAISE NOTICE '========================================';

  -- Warnings
  IF demo_flagged_activities = 0 THEN
    RAISE WARNING 'NO activities are flagged for demo! Demo users will see nothing.';
    RAISE WARNING 'Review this seed file and manually curate activities.';
  ELSIF demo_flagged_activities < 10 THEN
    RAISE WARNING 'Only % demo activities. Recommended: 15-20 for good demo experience.', demo_flagged_activities;
  ELSIF demo_flagged_activities > 30 THEN
    RAISE WARNING '% demo activities seems high. Consider curating to 15-20 best activities.', demo_flagged_activities;
  ELSE
    RAISE NOTICE '✓ Good demo content volume (15-20 recommended)';
  END IF;
END $$;

-- Show which activities are flagged
\echo ''
\echo 'Activities flagged for demo:'
SELECT
  id,
  name,
  category,
  created_at
FROM activities
WHERE is_demo_content = true
ORDER BY category, name
LIMIT 25;

COMMIT;

-- ============================================================================
-- MANUAL CURATION SCRIPT
-- Run this query to find good candidates for demo content
-- ============================================================================

-- Query to help with manual curation:
/*
SELECT
  id,
  name,
  category,
  description,
  age_range,
  duration_minutes,
  group_size_min,
  group_size_max,
  created_at,
  -- Add usage metrics if available
  -- view_count,
  -- session_count,
  -- rating,
  is_demo_content
FROM activities
WHERE is_global = true
  AND deleted_at IS NULL
ORDER BY
  category,
  created_at DESC
LIMIT 50;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- Default Strategy (Option 2):
-- - Automatically flags top 20 most recent global activities
-- - Quick start for development
-- - SHOULD BE REPLACED with manual curation before production launch

-- Recommended Process for Production:
-- 1. Run query above to see all global activities
-- 2. Review activities with team/product owner
-- 3. Select 15-20 best activities covering:
--    - Different categories
--    - Different age ranges
--    - Different group sizes
--    - Different durations
-- 4. Update Option 1 with selected activity names
-- 5. Comment out Option 2 (automated selection)
-- 6. Re-run this seed

-- To reset demo content flags:
-- UPDATE activities SET is_demo_content = false WHERE is_demo_content = true;
