# Supabase Database Migration Guide

## Metadata
- Status: archived
- Date: 2025-11-30
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: database
- Scope: Archived manual migration guide

Historical migration guide retained for provenance. Use current database environment and migration docs instead of this archived manual guide for live execution steps.

## Status
- ✅ Completed: 3/14 migrations
  - 00: initial_schema.sql
  - 01: fix_rls_security.sql
  - 02: play_domain.sql
  - 03: support_domain.sql

- ⏳ Remaining: 11/14 migrations (04-13)

## Quick Links
- **Supabase Dashboard**: https://supabase.com/dashboard
- **SQL Editor**: https://supabase.com/dashboard → your project → SQL Editor
- **Table Editor**: https://supabase.com/dashboard → your project → Table Editor

## How to Continue

### Method 1: Manual Execution via Dashboard (EASIEST)

1. Go to: https://supabase.com/dashboard → your project → SQL Editor
2. Click **New Query**
3. Copy entire content from `supabase/migrations/20251129000004_analytics_domain.sql`
4. Paste into the SQL editor
5. Click **Run** button
6. Wait for completion (should show 0 errors)
7. Repeat for remaining files (05-13)

**Migration Order:**
```
supabase/migrations/
├── 20251129000000_initial_schema.sql          ✅ DONE
├── 20251129000001_fix_rls_security.sql        ✅ DONE
├── 20251129000002_play_domain.sql             ✅ DONE
├── 20251129000003_support_domain.sql          ✅ DONE
├── 20251129000004_analytics_domain.sql        ⏳ NEXT
├── 20251129000005_billing_domain.sql          ⏳ TODO
├── 20251129000006_seed_billing_plans.sql      ⏳ TODO
├── 20251129000007_notifications_domain.sql    ⏳ TODO
├── 20251129000008_social_domain.sql           ⏳ TODO
├── 20251129000009_content_planner_domain.sql  ⏳ TODO
├── 20251129000010_marketplace_domain.sql      ⏳ TODO
├── 20251129000011_moderation_domain.sql       ⏳ TODO
├── 20251129000012_achievements_advanced_domain.sql ⏳ TODO
└── 20251129000013_personalization_domain.sql  ⏳ TODO
```

### Method 2: Verify After Each Migration

After each migration, verify it worked:

1. Go to **Table Editor** tab
2. Refresh and scroll to bottom to see new tables
3. Check for any ⚠️ warnings in the left sidebar

### Post-Migration Checklist

After all 14 migrations are complete:

```sql
-- 1. Verify table count (should be 60+)
SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Verify RLS is enabled on key tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'tenants', 'user_tenant_memberships')
AND rowsecurity = true;

-- 3. Verify functions
SELECT count(*) FROM pg_proc WHERE proname LIKE 'get_%' AND pronamespace = 'public'::regnamespace;

-- 4. Verify indexes
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
```

## Troubleshooting

### Error: "operator does not exist: uuid = uuid[]"
✅ **FIXED** - This was the NULL array issue in `get_user_tenant_ids()` function.
The fix has been applied to migration 00.

### Error: "Permission denied"
- Check that you're using a Supabase user with appropriate permissions
- Use the project admin account (default: postgres)

### Query takes too long
- Migrations are normal, some take 10-30 seconds
- Be patient, don't refresh or navigate away

## Code Repository Status

All 15 domain code is complete and committed:
- ✅ Git: All code pushed (commit 90211ff)
- ✅ TypeScript: 300+ functions, 20+ UI pages
- ✅ SQL: 14 migration files ready
- 🔄 Database: 3/14 migrations executed (21% complete)

## Next Steps After Migrations

1. ✅ Execute remaining 11 migrations (04-13)
2. 🚀 Run verification queries
3. 📊 Senior AI code review of 15-domain architecture
4. 🔒 Verify RLS security policies
5. 📈 Performance optimization
6. 🧪 Integration testing
7. 📋 Technical debt assessment
8. 🚀 Production deployment preparation
