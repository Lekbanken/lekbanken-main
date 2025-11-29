# Supabase Migration Execution Guide

## Overview

This project has **14 database migrations** (created: Nov 29, 2025) that need to be executed to set up the complete MVP schema with all 15 domains.

### Migration Files
```
✅ 20251129000000_initial_schema.sql        - Base schema, tenants, users, auth
✅ 20251129000001_fix_rls_security.sql      - RLS policy corrections
✅ 20251129000002_play_domain.sql           - Game progress, scores, rewards
✅ 20251129000003_support_domain.sql        - Support tickets, responses, categories
✅ 20251129000004_analytics_domain.sql      - Events, metrics, dashboards
✅ 20251129000005_billing_domain.sql        - Invoices, subscriptions, products
✅ 20251129000006_seed_billing_plans.sql    - Seed billing plans data
✅ 20251129000007_notifications_domain.sql  - User notifications, preferences
✅ 20251129000008_social_domain.sql         - Friends, leaderboards, multiplayer
✅ 20251129000009_content_planner_domain.sql - Content calendar, events
✅ 20251129000010_marketplace_domain.sql    - Shop items, transactions, inventory
✅ 20251129000011_moderation_domain.sql     - Moderation actions, reports, content
✅ 20251129000012_achievements_advanced_domain.sql - Advanced achievements, badges
✅ 20251129000013_personalization_domain.sql - User preferences, recommendations
```

**Total**: ~4,000+ lines of SQL, 60+ tables, 110+ indexes, comprehensive RLS policies

---

## Execution Methods (Choose One)

### Method 1: Supabase Dashboard (Recommended for Testing) ⭐

**Easiest method - No CLI installation required**

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your Lekbanken project

2. **Open SQL Editor**
   - Left sidebar → "SQL Editor"
   - Click "+ New Query"

3. **Execute Migrations in Order**
   - Open each migration file from `supabase/migrations/`
   - Copy the entire SQL content
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - **Execute in exact order** (00, 01, 02, ... 13)

4. **Verify Execution**
   - After each migration, check "Schema" or "Table Editor" to verify tables were created
   - Look for success message (green checkmark)

**Why This Order Matters:**
- Migration 00: Creates base tables
- Migration 01: Fixes RLS policies
- Migration 02-13: Add domain-specific tables
- Each subsequent migration may reference tables from previous ones

---

### Method 2: Supabase CLI (Recommended for Production) 🚀

**Better for automated deployments and version control**

#### Step 1: Install Supabase CLI

**Windows (using Winget - Recommended):**
```powershell
winget install Supabase.supabase
```

**Windows (using Choco):**
```powershell
choco install supabase-cli
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Verify Installation:**
```bash
supabase --version
```

#### Step 2: Link Your Supabase Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Get `YOUR_PROJECT_REF` from:
1. Supabase Dashboard → Project settings
2. Or from your project URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`

#### Step 3: Set Environment Variables (Local Development)

Create `.env.local` in project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Get these from Supabase Dashboard → Project settings → API keys

#### Step 4: Execute Migrations

```bash
# Push all migrations to remote database
supabase db push

# Or pull remote schema (if already exists):
supabase db pull
```

#### Step 5: Verify

```bash
# Check migration status
supabase migration list

# View local schema changes
supabase migration new verify_schema
```

---

### Method 3: Direct psql Connection (Advanced) 🔧

**For when you need full control or scripted execution**

#### Step 1: Get Connection String

1. Supabase Dashboard → Project settings → Database → Connection string
2. Select "Connection pooler" or "Session" (use Session for migrations)
3. Copy the connection string

#### Step 2: Install psql

**Windows:**
```powershell
# Using PostgreSQL installer
# Or using Chocolatey:
choco install postgresql

# Or using Winget:
winget install PostgreSQL.PostgreSQL
```

**Verify:**
```bash
psql --version
```

#### Step 3: Execute Each Migration

```bash
# Single migration
psql "your_connection_string" < supabase/migrations/20251129000000_initial_schema.sql

# Or all migrations (requires bash/git bash on Windows)
for file in supabase/migrations/*.sql; do
  echo "Executing: $file"
  psql "your_connection_string" < "$file"
done
```

#### Step 4: Verify

```bash
psql "your_connection_string" -c "\dt"  # List all tables
psql "your_connection_string" -c "\di"  # List all indexes
```

---

## Method 4: Automated Script (Using Node.js) 📝

**If you need to automate from your application**

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Use Node.js with `pg` library:

```bash
npm install pg dotenv
```

Create `scripts/auto-migrate.js`:
```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || 
    `postgres://postgres:${process.env.SUPABASE_PASSWORD}@${process.env.SUPABASE_HOST}:5432/postgres`
});

async function runMigrations() {
  await client.connect();
  
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Executing: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await client.query(sql);
    console.log(`✅ Completed: ${file}`);
  }

  await client.end();
}

runMigrations().catch(console.error);
```

Run:
```bash
node scripts/auto-migrate.js
```

---

## Troubleshooting

### ❌ Error: "relation does not exist"
**Cause**: Migrations not executed in order
**Solution**: Execute migrations sequentially (00, 01, 02, etc.)

### ❌ Error: "permission denied for schema public"
**Cause**: Service role key doesn't have permissions
**Solution**: Use `SUPABASE_SERVICE_ROLE_KEY`, not `SUPABASE_ANON_KEY`

### ❌ Error: "column already exists"
**Cause**: Migration already executed
**Solution**: Check if tables exist in Dashboard → Table Editor; skip that migration

### ❌ Error: "constraint violation"
**Cause**: RLS policies or foreign keys not properly set
**Solution**: Run migration 01 first to fix RLS

### ❌ Tables exist but service errors occur
**Cause**: Type definitions not updated after schema changes
**Solution**: 
```bash
supabase gen types typescript --local > lib/supabase/types.ts
```

---

## Verification Checklist

After executing all migrations, verify:

- [ ] **14 Migrations executed** (0-13)
- [ ] **60+ Tables created** - Check in Dashboard → Table Editor
  - [ ] Initial: tenants, users, user_tenant_memberships
  - [ ] Play: game_progress, scores, rewards
  - [ ] Support: support_tickets, ticket_responses
  - [ ] Analytics: events, analytics_dashboards
  - [ ] Billing: invoices, subscriptions, products
  - [ ] Notifications: user_notifications, notification_preferences
  - [ ] Social: friends, friend_requests, social_leaderboards
  - [ ] Content: content_calendar, planner_events
  - [ ] Marketplace: marketplace_items, transactions
  - [ ] Moderation: moderation_actions, reported_content
  - [ ] Achievements: advanced_achievements, user_achievements_advanced
  - [ ] Personalization: user_preferences, recommendations

- [ ] **110+ Indexes created** - Performance optimization
- [ ] **RLS Policies enabled** - Row-level security active
  - [ ] All tables have tenant isolation
  - [ ] User-scoped queries properly protected

- [ ] **Seed Data inserted** - Billing plans
- [ ] **No errors in logs** - Check Supabase Dashboard → Logs

---

## Post-Migration Steps

### 1. Update Type Definitions

After migrations execute, regenerate TypeScript types:

```bash
# Using Supabase CLI
supabase gen types typescript --local > lib/supabase/types.ts

# Or manually via Dashboard:
# 1. Go to SQL Editor
# 2. Run: SELECT * FROM information_schema.columns;
# 3. Use to verify schema
```

### 2. Test Service Layer Functions

Run the service functions against real database:

```bash
# In app - test each domain's service:
import { createMultiplayerSession } from '@/lib/services/socialService';
const session = await createMultiplayerSession('game-123', 'user-456');
console.log(session);
```

### 3. Verify RLS Policies

Test that multi-tenancy works:

```bash
# Create two test users in different tenants
# Query as User A - should only see User A's data
# Query as User B - should only see User B's data
# Query as admin (service role) - should see all data
```

### 4. Performance Monitoring

After schema is live:
```bash
# Check index performance
supabase postgres health

# Monitor slow queries
# Dashboard → Logs → PostgreSQL logs
```

---

## Support & Debugging

If migrations fail:

1. **Check Supabase Logs**
   - Dashboard → Logs → PostgreSQL
   - Look for specific error messages

2. **Verify Migration Files**
   - All files in `supabase/migrations/` should be valid SQL
   - Check for syntax errors before execution

3. **Reset (Development Only)**
   ```sql
   -- WARNING: This deletes everything!
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   -- Then re-run all migrations
   ```

4. **Get Help**
   - Supabase Docs: https://supabase.com/docs
   - Discord: https://discord.supabase.io
   - GitHub Issues: https://github.com/Lekbanken/lekbanken-main/issues

---

## Quick Reference

| Task | Command |
|------|---------|
| Install Supabase CLI | `winget install Supabase.supabase` |
| Link project | `supabase link --project-ref YOUR_REF` |
| Push migrations | `supabase db push` |
| View status | `supabase migration list` |
| Generate types | `supabase gen types typescript --local > lib/supabase/types.ts` |
| Check health | `supabase postgres health` |

---

**Last Updated**: Nov 29, 2025  
**Total Migrations**: 14  
**Total Tables**: 60+  
**Total Indexes**: 110+  
**Estimated Execution Time**: 2-5 minutes
