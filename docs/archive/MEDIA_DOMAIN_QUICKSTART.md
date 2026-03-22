# Media Domain Quick Start Guide

## Metadata
- Status: archived
- Date: 2025-12-10
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: media
- Scope: Archived media domain quickstart

Historical quickstart retained for provenance. Use current media and database workflow docs instead of this archived guide for live setup steps.

## 🚀 Execute Migrations

You have **2 new migration files** ready to run:

1. `20251210120000_media_domain_enhancements.sql` - Core media domain updates
2. `20251210120100_achievements_media_migration.sql` - Achievement icon FK

### Option 1: Using Supabase CLI (Recommended)
```powershell
# If you have Supabase CLI installed and configured
supabase db push

# Or link to your project first
supabase link --project-ref <your-supabase-project-ref>
supabase db push
```

### Option 2: Using psql Script
```powershell
# Navigate to scripts directory
cd scripts

# Run the psql migration script (will prompt for password)
.\run-psql-migrations.ps1
```

### Option 3: Manual Execution via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/<your-supabase-project-ref>/sql/new
2. Copy content from `supabase/migrations/20251210120000_media_domain_enhancements.sql`
3. Run the query
4. Repeat with `supabase/migrations/20251210120100_achievements_media_migration.sql`

---

## 🔄 Regenerate TypeScript Types

After migrations are executed:

```powershell
# Option 1: Using npm script (linked project)
npm run db:types:remote

# Option 2: Using local script
.\scripts\regenerate-types.ps1

# Option 3: Using Supabase CLI
supabase gen types typescript --linked > types/supabase.ts

# Option 3: Manual from Supabase Studio
# Go to API Docs → TypeScript → Copy generated types → Paste into types/supabase.ts
```

---

## ✅ Verify Everything Works

1. **Check migrations ran:**
   ```powershell
   # Connect to DB and check tables exist
   psql -h db.<your-supabase-project-ref>.supabase.co -U postgres -d postgres
   \dt media*
   # Should show: media, media_templates, media_ai_generations
   ```

2. **Start dev server:**
   ```powershell
   npm run dev
   ```

3. **Test upload flow:**
   - Navigate to tenant media admin page
   - Upload a test image
   - Verify it appears in library

---

## 📦 What You Get

### New Database Tables
- ✅ `media` (enhanced with tenant_id, metadata)
- ✅ `media_templates` (standard image mappings)
- ✅ `media_ai_generations` (AI tracking)

### New API Endpoints
- ✅ `/api/media` - CRUD operations
- ✅ `/api/media/upload` - Signed URL generation
- ✅ `/api/media/fallback` - Fallback resolution
- ✅ `/api/media/templates` - Standard image management

### New UI Components
- ✅ `<MediaPicker>` - Reusable media selector
- ✅ `<TenantMediaBank>` - Tenant media library
- ✅ `<StandardImagesManager>` - Standard image mappings

### New Services
- ✅ Image optimization (Sharp)
- ✅ Fallback resolution (5-level hierarchy)

---

## 🎯 Quick Test

```tsx
// In any admin page
import { TenantMediaBank } from '@/features/admin/media'

export default function MediaPage() {
  return <TenantMediaBank tenantId="your-tenant-id" />
}
```

---

## 📚 Full Documentation

See `docs/MEDIA_DOMAIN.md` for comprehensive documentation including:
- Architecture overview
- API reference
- Integration patterns
- Best practices
- Security considerations

---

## ⚠️ Important Notes

1. **Migrations must run in order** - The script handles this automatically
2. **Type regeneration is required** - Components won't compile without updated types
3. **RLS policies are active** - All operations are tenant-isolated
4. **Existing data is preserved** - Migrations only add new columns/tables

---

**Next Steps:**
1. ✅ Run migrations (one of 3 options above)
2. ✅ Regenerate types
3. ✅ Test upload flow
4. 🎉 Start using the Media Domain!
