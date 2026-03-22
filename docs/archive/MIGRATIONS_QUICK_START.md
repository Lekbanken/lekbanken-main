# Quick Start: Execute Migrations Now

## Metadata
- Status: archived
- Date: 2025-11-29
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: database
- Scope: Archived migrations quick start

Historical migration quickstart retained for provenance. Use current database environment and migration docs instead of this archived guide for live execution steps.

## ⚡ Fastest Way (2 minutes)

### Step 1: Get Your Credentials
1. Go to https://supabase.com/dashboard
2. Open your Lekbanken project
3. Go to **Settings** → **API**
4. Copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role Key)

### Step 2: Open SQL Editor
1. In Supabase Dashboard
2. Left sidebar → **SQL Editor**
3. Click **"+ New Query"**

### Step 3: Execute Migrations in Order

**Migration 1 of 14:**
1. Open: `supabase/migrations/20251129000000_initial_schema.sql`
2. Copy entire content
3. Paste into SQL Editor
4. Click **Run** (Ctrl+Enter)
5. ✅ Wait for success message

**Repeat for each file (01-13):**
- 20251129000001_fix_rls_security.sql
- 20251129000002_play_domain.sql
- 20251129000003_support_domain.sql
- 20251129000004_analytics_domain.sql
- 20251129000005_billing_domain.sql
- 20251129000006_seed_billing_plans.sql
- 20251129000007_notifications_domain.sql
- 20251129000008_social_domain.sql
- 20251129000009_content_planner_domain.sql
- 20251129000010_marketplace_domain.sql
- 20251129000011_moderation_domain.sql
- 20251129000012_achievements_advanced_domain.sql
- 20251129000013_personalization_domain.sql

### Step 4: Verify
Go to **Table Editor** - you should see 60+ new tables ✅

### Step 4b: Verify + migration registry (recommended)

If you run migrations manually in **SQL Editor**, the schema can be updated while the migration registry table
`supabase_migrations.schema_migrations` is still missing entries.

To sanity-check both schema and registry:
- Run `scripts/verify-migrations.sql` in Supabase SQL Editor.
- If the schema checks are ✅ but `schema_migrations` is missing versions, you can register them manually.

Example (only run after you have verified the schema objects exist):

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
   ('20251217120000', 'planner_total_time_trigger'),
   ('20251219090000', 'play_chat_messages')
ON CONFLICT (version) DO NOTHING;
```

---

## 🤖 Automated Way (Using CLI)

### Install CLI
```powershell
winget install Supabase.supabase
```

### Link Project
```bash
supabase link --project-ref YOUR_PROJECT_ID
# Get PROJECT_ID from: https://supabase.com/dashboard/project/[PROJECT_ID]
```

### Push All Migrations at Once
```bash
supabase db push
```

### Done! ✅
All 14 migrations executed automatically

---

## 📋 What Gets Created

- ✅ **60+ Tables** across 15 domains
- ✅ **110+ Indexes** for performance
- ✅ **Complete RLS** for multi-tenant security
- ✅ **Foreign Keys** for data integrity
- ✅ **Seed Data** for billing plans

---

## ❌ Troubleshooting

**Q: "Table already exists" error?**  
A: You've already run this migration. Skip to the next one.

**Q: "Permission denied" error?**  
A: Make sure you're using `SUPABASE_SERVICE_ROLE_KEY`, not the anon key

**Q: Can't connect to database?**  
A: Check your credentials and make sure the project is active on Supabase

---

## 📚 Full Guide

See `docs/MIGRATIONS.md` for detailed instructions, troubleshooting, and advanced options.

---

**Estimated Time**: 2-5 minutes  
**Status**: Ready to execute ✅
