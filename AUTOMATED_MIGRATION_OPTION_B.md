# 🚀 Automated Migration Execution - Option B

## Quick Start

```powershell
# Step 1: Allow scripts to run (run once)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Step 2: Install PostgreSQL client (if needed)
& .\scripts\install-postgres.ps1

# Step 3: Setup and execute migrations
& .\scripts\migrate.ps1
```

**Total Time**: ~10-15 minutes (including PostgreSQL installation)

---

## Detailed Steps

### Step 1: Enable PowerShell Scripts

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows you to run local scripts. You'll only need to do this once.

### Step 2: Get Your Supabase Connection String

1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database
2. Look for "Connection string" section
3. Select **"Session"** mode (NOT "Connection pooler")
4. Click the copy button
5. Keep it handy - you'll paste it in the next step

**Example format:**
```
postgresql://postgres:[PASSWORD]@db.supabase.co:5432/postgres
```

### Step 3: Install PostgreSQL Client (if needed)

Run:
```powershell
& .\scripts\install-postgres.ps1
```

This script:
- ✅ Checks if `psql` is already installed
- ✅ Installs it via Chocolatey if available
- ✅ Or guides you to manual installation

**What it installs**: PostgreSQL client tools only (not the full database server)

### Step 4: Run the Migration

```powershell
& .\scripts\migrate.ps1
```

The script will:
1. Ask for your Supabase connection string
2. Verify it can connect to your database
3. List all 14 migration files
4. Ask for confirmation
5. Execute each migration in order
6. Show success/failure for each

---

## What Happens

### During Execution

```
🔄 Supabase Migration Executor

📄 Found 14 migration files:
   • 20251129000000_initial_schema.sql
   • 20251129000001_fix_rls_security.sql
   • ...
   • 20251129000013_personalization_domain.sql

Execute all migrations? (y/n): y

⏳ Executing migrations...

[1/14] Executing: 20251129000000_initial_schema.sql
   ✅ Success
[2/14] Executing: 20251129000001_fix_rls_security.sql
   ✅ Success
...
```

### After Completion

```
============================================================
✅ Migrations Complete
   Successful: 14/14

🎉 All migrations executed successfully!

📝 Next steps:
   1. Verify tables in Supabase Dashboard → Table Editor
   2. Check that 60+ tables were created
   3. Ready for testing and deployment!
```

---

## Verification Steps

After migrations complete successfully, verify everything worked:

### 1. Check Tables in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg
2. Click **"Table Editor"** in left sidebar
3. You should see 60+ tables like:
   - `tenants`
   - `users`
   - `user_tenant_memberships`
   - `game_progress`
   - `support_tickets`
   - `notifications`
   - `social_leaderboards`
   - `marketplace_items`
   - etc.

### 2. Check Indexes

In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
```

Should show: **~110 indexes**

### 3. Check RLS Policies

Go to **"Authentication"** → **"Policies"** in Supabase Dashboard

You should see multiple RLS policies enabled on tables

### 4. Check Seed Data

Go to **Table Editor** → **`billing_products`**

Should see the billing plans data

---

## Troubleshooting

### ❌ "psql is not recognized"

**Solution**: PostgreSQL client not in PATH
1. Run: `& .\scripts\install-postgres.ps1`
2. Restart PowerShell
3. Try again

### ❌ "Cannot connect to database"

**Possible causes**:
- ❌ Wrong connection string
- ❌ Project is paused
- ❌ Network firewall blocking

**Solution**:
1. Verify connection string from Dashboard
2. Make sure Supabase project is active
3. Try copying connection string again

### ❌ "Table already exists" error

**Cause**: Migration was already run

**Solution**: Skip that migration or start fresh by dropping the schema (dev only)

### ❌ "Permission denied"

**Cause**: Using wrong role/credentials

**Solution**: Make sure you're using the PostgreSQL connection string (not Supabase API key)

### ⏱️ "Migration timed out"

**Solution**: 
- Check your internet connection
- Try running smaller migrations first
- Some migrations (05_billing, 08_social) are larger and may take 1-2 seconds

---

## Manual Execution (if scripts fail)

If the automated script doesn't work, you can run migrations manually:

```powershell
# Connect to your database
psql "your_connection_string"

# Then in psql, execute each migration file:
\i supabase/migrations/20251129000000_initial_schema.sql
\i supabase/migrations/20251129000001_fix_rls_security.sql
# ... etc for all 14 files
```

Or use the Supabase Dashboard SQL Editor (see `EXECUTE_MIGRATIONS_NOW.md`)

---

## Environment Variable (Optional)

If you want to save your connection string:

```powershell
# Set for current session only
$env:DATABASE_URL = "postgresql://..."

# Or run migration with it directly
$env:DATABASE_URL = "postgresql://..." ; & .\scripts\migrate.ps1
```

---

## Success Checklist

After migrations complete:

- [ ] All 14 migration files executed
- [ ] No errors reported
- [ ] 60+ tables visible in Table Editor
- [ ] 110+ indexes created
- [ ] Billing plans data in `billing_products` table
- [ ] Ready for senior AI code review
- [ ] Ready for testing

---

## Next Steps

Once migrations are complete:

1. **Tell me "Done!"** in the chat
2. I'll verify the schema
3. I'll invoke a senior AI agent for comprehensive code review:
   - Architecture audit
   - Performance optimization
   - Security assessment
   - Code quality analysis
4. You'll get recommendations for improvements
5. Ready for production deployment!

---

## Files Used

| Script | Purpose |
|--------|---------|
| `scripts/migrate.ps1` | Main migration runner |
| `scripts/setup-connection.ps1` | Connection string helper |
| `scripts/install-postgres.ps1` | PostgreSQL client installer |
| `supabase/migrations/*.sql` | 14 migration files |

All scripts are in your project - no external downloads needed!

---

**Ready?** Run: `& .\scripts\migrate.ps1`

Let me know when it's done! 🚀
