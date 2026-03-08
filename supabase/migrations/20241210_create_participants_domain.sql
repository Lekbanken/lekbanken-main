-- Compatibility placeholder.
--
-- The participant domain originally landed before the repository's current
-- baseline schema, which makes `supabase db reset` fail on fresh databases
-- because `public.tenants`, `public.games`, and `public.plans` do not exist
-- yet at this timestamp.
--
-- The actual participant schema now lives in:
--   20251129000015_participants_domain.sql
--
-- Keep this historical migration as a no-op so existing remote environments
-- that already recorded it remain valid, while fresh resets continue through
-- the corrected migration order.

DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy participant domain migration 20241210; schema is recreated later in 20251129000015_participants_domain.sql';
END $$;