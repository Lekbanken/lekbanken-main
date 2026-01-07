-- =============================================================================
-- Migration 011: Remove duplicate indexes (Performance Advisor lint 0009)
-- =============================================================================
-- Problem: Duplicate indexes waste write performance and storage.
-- 
-- Duplicates found by Supabase Performance Advisor:
--
-- 1. session_events table:
--    - idx_session_events_session (play_runtime_schema) = idx_session_events_session_id
--    - idx_session_events_created (play_runtime_schema) = idx_session_events_session_created
--
-- 2. tenant_domains table:
--    - tenant_domains_hostname_key (auto-created?) = tenant_domains_hostname_unique_idx
--
-- Strategy: Keep the more descriptively named indexes
-- NOTE: Cannot use CONCURRENTLY in migration transactions, using regular DROP
-- =============================================================================

-- =============================================================================
-- 1. SESSION_EVENTS: Remove older/shorter-named duplicates
-- =============================================================================

-- idx_session_events_session duplicates idx_session_events_session_id
-- Both index session_id column - keep idx_session_events_session_id (more explicit name)
DROP INDEX IF EXISTS public.idx_session_events_session;

-- idx_session_events_created duplicates idx_session_events_session_created  
-- Both index (session_id, created_at DESC) - keep idx_session_events_session_created
DROP INDEX IF EXISTS public.idx_session_events_created;

-- =============================================================================
-- 2. TENANT_DOMAINS: Remove auto-generated duplicate
-- =============================================================================

-- If a UNIQUE constraint was created separately that generated tenant_domains_hostname_key,
-- we need to drop it. We keep tenant_domains_hostname_unique_idx (explicit unique index).
-- Note: This may fail if the constraint doesn't exist - that's OK

DO $$
BEGIN
  -- Try to drop the duplicate index if it exists (non-concurrent in transaction)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'tenant_domains_hostname_key' AND schemaname = 'public') THEN
    DROP INDEX public.tenant_domains_hostname_key;
    RAISE NOTICE 'Dropped index tenant_domains_hostname_key';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if it's actually a constraint rather than an index
  RAISE NOTICE 'tenant_domains_hostname_key might be a constraint, not standalone index: %', SQLERRM;
END;
$$;

-- Alternate approach: if it's a constraint name (from UNIQUE column modifier)
-- We need to handle this differently. Check if constraint exists and remove.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenant_domains_hostname_key' 
    AND conrelid = 'public.tenant_domains'::regclass
  ) THEN
    ALTER TABLE public.tenant_domains DROP CONSTRAINT tenant_domains_hostname_key;
    RAISE NOTICE 'Dropped constraint tenant_domains_hostname_key';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop tenant_domains_hostname_key constraint: %', SQLERRM;
END;
$$;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Indexes removed:
--   1. idx_session_events_session (duplicate of idx_session_events_session_id)
--   2. idx_session_events_created (duplicate of idx_session_events_session_created)
--   3. tenant_domains_hostname_key (duplicate of tenant_domains_hostname_unique_idx)
--
-- This reduces write overhead and storage for these tables.
-- =============================================================================
