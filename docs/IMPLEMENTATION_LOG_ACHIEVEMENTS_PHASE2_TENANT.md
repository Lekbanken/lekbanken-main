# Phase 2 Implementation Log: Tenant Achievements Admin

**Date:** 2026-01-10  
**Phase:** 2 of 3 (Tenant Achievements Admin)  
**Status:** ✅ Completed

---

## Overview

This phase implements the Tenant Achievements Admin UI, allowing tenant owners/admins/editors
to create, manage, and award tenant-scoped achievements within their organization.

### Route Contract

```
/admin/tenant/[tenantId]/gamification/             → Gamification hub
/admin/tenant/[tenantId]/gamification/achievements → Achievements list & CRUD
```

---

## Files Created

### 1. Navigation Update
**File:** `lib/admin/nav.ts`

Added Gamification category to `organisationAdminCategories`:
```typescript
{
  id: 'org-gamification',
  label: 'Gamification',
  icon: 'achievements',
  items: [
    { 
      id: 'org-achievements', 
      label: 'Utmärkelser', 
      href: '/admin/tenant/[tenantId]/gamification/achievements', 
      icon: 'achievements' 
    },
  ],
},
```

### 2. Database Migration (RPC)
**File:** `supabase/migrations/20260110100000_tenant_award_achievement_rpc.sql`

Created `tenant_award_achievement_v1` RPC function with:
- Tenant validation (caller must have `owner`, `admin`, or `editor` role OR be system_admin)
- Achievement tenant ownership check (achievement.tenant_id = p_tenant_id)
- Recipient membership validation (all user_ids must be active tenant members)
- Idempotency via advisory lock + unique key
- Returns `{ inserted_count, duplicate_count }`

Also includes RLS policies for:
- `achievement_awards` INSERT by tenant admins
- `achievement_award_recipients` INSERT by tenant admins
- `achievements` SELECT for tenant admins

### 3. Server Actions
**File:** `app/actions/tenant-achievements-admin.ts`

Complete CRUD + awarding server actions:

| Action | Description |
|--------|-------------|
| `listTenantAchievements` | List achievements with pagination, search, status filter |
| `getTenantAchievement` | Get single achievement by ID |
| `createTenantAchievement` | Create new tenant achievement |
| `updateTenantAchievement` | Update existing achievement |
| `setTenantAchievementStatus` | Change status (draft/active/archived) |
| `bulkSetTenantAchievementStatus` | Bulk status change |
| `deleteTenantAchievement` | Delete achievement |
| `listTenantMembers` | List tenant members for awarding |
| `awardTenantAchievement` | Award via RPC |
| `getTenantAchievementStats` | Get stats (total, active, draft, archived) |

All actions use `assertTenantAdminOrSystem(tenantId, user)` for authorization.

### 4. Gamification Hub Page
**File:** `app/admin/tenant/[tenantId]/gamification/page.tsx`

Simple hub page with links to sub-sections:
- Utmärkelser (achievements) - links to achievements list
- Placeholder for future: Poäng, Leaderboards

### 5. Achievements List Page
**File:** `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx`

Full-featured admin page with:
- Data table with sorting and selection
- Search and status filtering
- Bulk actions (activate, archive)
- Stats cards (total, active, draft, archived)
- Empty states with call-to-action
- Inline actions per row (edit, award, status change, delete)
- Confirm dialogs for destructive actions
- Toast notifications for feedback

Uses existing shared admin components:
- `AdminDataTable`, `AdminTableToolbar`, `AdminPagination`
- `AdminBulkActions`, `AdminEmptyState`, `AdminConfirmDialog`
- `AdminPageHeader`, `AdminPageLayout`
- `useTableSelection`

### 6. Achievement Editor Drawer
**File:** `app/admin/tenant/[tenantId]/gamification/achievements/TenantAchievementEditorDrawer.tsx`

Sheet-based editor for creating/editing achievements:
- Name (required)
- Description
- Achievement key (optional, for programmatic reference)
- Condition type (manual, games_played, score_reached, etc.)
- Condition value (threshold)
- Status (draft, active, archived)

Uses key prop pattern to reset form state when switching between achievements.

### 7. Award Modal
**File:** `app/admin/tenant/[tenantId]/gamification/achievements/TenantAwardModal.tsx`

Modal for awarding achievements to tenant members:
- Member search with filtering
- Select all / clear selection
- Optional message to recipients
- Idempotent submission (handles duplicates gracefully)
- Feedback on inserted vs duplicate counts

---

## API Patterns Used

### Selection Hook
```typescript
const selection = useTableSelection<TenantAchievementRow>(achievements, 'id');
// Returns: selectedItems, selectedKeys, isSelected, toggle, toggleAll, 
//          selectAll, clearSelection, allSelected, someSelected, selectedCount
```

### Bulk Actions
```typescript
const bulkActions = useMemo(() => [
  bulkActionPresets.activate<TenantAchievementRow>(() => handleBulkStatusChange('active')),
  bulkActionPresets.archive<TenantAchievementRow>(() => handleBulkStatusChange('archived')),
], [handleBulkStatusChange]);
```

### Column Definition
```typescript
const columns = [
  {
    header: 'Name',
    accessor: 'name' as const,  // or accessor function
    cell: (row) => <CustomRenderer row={row} />,
  },
];
```

---

## Authorization Model

All endpoints enforce:
```typescript
const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
if (!hasAccess) {
  throw new Error('Åtkomst nekad: kräver organisationsadmin eller systemadmin');
}
```

Database RPC enforces:
```sql
IF NOT (
  has_tenant_role(p_tenant_id, ARRAY['owner','admin','editor']) 
  OR is_system_admin()
) THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

---

## Testing Checklist

### Manual Testing Required

- [ ] Navigate to `/admin/tenant/[tenantId]/gamification`
- [ ] See hub page with Achievements link
- [ ] Navigate to achievements list
- [ ] Create new achievement (draft status)
- [ ] Edit achievement
- [ ] Change status to active
- [ ] Award to tenant members
- [ ] Verify duplicate handling
- [ ] Archive achievement
- [ ] Delete achievement
- [ ] Verify search filter works
- [ ] Verify status filter works
- [ ] Test bulk select + activate/archive
- [ ] Test as tenant admin (not system admin)
- [ ] Verify non-tenant user cannot access

### Database Verification

```sql
-- Run migration
supabase db push

-- Verify RPC exists
SELECT proname FROM pg_proc WHERE proname = 'tenant_award_achievement_v1';

-- Verify policies
SELECT tablename, policyname FROM pg_policies 
WHERE policyname LIKE '%tenant_admin%';
```

---

## Dependencies

### Pre-existing (no changes needed)
- `lib/utils/tenantAuth.ts` - `assertTenantAdminOrSystem`
- `components/admin/shared/*` - Admin UI components
- `lib/context/TenantContext` - Tenant context hook

### New Database Requirements
- RPC: `tenant_award_achievement_v1`
- RLS policies for tenant admin INSERT

---

## Known Limitations

1. **Member List Limit**: `listTenantMembers` limited to 100 members. For large organizations,
   consider adding pagination or async search.

2. **No Achievement Icons**: Icon configuration exists in schema but UI doesn't support
   uploading/selecting icons yet.

3. **No Auto-Award**: Automatic awarding based on condition_type not implemented.
   All awards are currently manual via RPC.

---

## Next Steps (Phase 3)

Phase 3 will implement:
- Participant-facing badge showcase
- Progressive disclosure in user profile
- Real-time award notifications
- API for programmatic awarding from game completion

---

## Commit Message

```
feat(achievements): implement Phase 2 Tenant Achievements Admin

- Add Gamification category to tenant nav
- Create tenant_award_achievement_v1 RPC with tenant validation
- Implement server actions with assertTenantAdminOrSystem
- Create gamification hub and achievements list pages
- Add editor drawer and award modal components
- Follow existing admin UI patterns
```
