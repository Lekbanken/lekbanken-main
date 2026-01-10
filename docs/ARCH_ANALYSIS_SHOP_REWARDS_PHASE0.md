# Phase 0: Architecture & Reality Analysis — Shop Rewards Admin

**Document Status:** Complete  
**Feature:** `/admin/gamification/shop-rewards`  
**Date:** 2026-01-10  
**Purpose:** READ-ONLY ANALYSIS — Surface facts, risks, and constraints before Phase 1/2

---

## Executive Summary

Shop Rewards is a **tenant-scoped** feature with existing database schema, partial admin UI (mock data), and a functional participant-facing shop. Unlike Achievements (which has hybrid global+tenant scope), shop items are **always tenant-specific**.

### Key Findings

| Aspect | Current State | Risk Level |
|--------|---------------|------------|
| Admin UI | Mocked data, no CRUD | 🔴 High |
| Database Schema | Complete, production-ready | 🟢 Low |
| Participant Shop | Fully functional | 🟢 Low |
| Server Actions | **None exist** | 🔴 High |
| API Routes | Exist for participant, partial for admin | 🟡 Medium |
| RLS Policies | Well-designed | 🟢 Low |
| Status Lifecycle | Missing in shop_items | 🟡 Medium |

---

## Section A — Routes & Access Model

### A.1 Route Inventory

| File Path | Generated URL | Intended Audience | Access Control | Reachable? |
|-----------|---------------|-------------------|----------------|------------|
| [app/admin/gamification/shop-rewards/page.tsx](app/admin/gamification/shop-rewards/page.tsx) | `/admin/gamification/shop-rewards` | System Admin + Tenant Admin | Layout auth check | ✅ Yes |
| [app/admin/marketplace/page.tsx](app/admin/marketplace/page.tsx) | `/admin/marketplace` | Redirect only | Redirect to shop-rewards | ✅ Redirect |
| [app/admin/marketplace/_legacy-page.tsx](app/admin/marketplace/_legacy-page.tsx) | N/A (legacy backup) | Tenant Admin | Not exposed | ❌ Dead |
| [app/app/shop/page.tsx](app/app/shop/page.tsx) | `/app/shop` | Authenticated Participants | Tenant membership | ✅ Yes |
| [app/api/shop/route.ts](app/api/shop/route.ts) | `GET/POST /api/shop` | Participants | Tenant membership + RLS | ✅ Yes |
| [app/api/shop/powerups/consume/route.ts](app/api/shop/powerups/consume/route.ts) | `POST /api/shop/powerups/consume` | Participants | Tenant membership + service_role | ✅ Yes |
| [app/api/admin/marketplace/items/route.ts](app/api/admin/marketplace/items/route.ts) | `POST/PATCH /api/admin/marketplace/items` | Tenant Admin+ | `assertTenantAdminOrSystem` | ✅ Yes |

### A.2 Admin Layout Access Control

From [app/admin/layout.tsx](app/admin/layout.tsx):

```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'
const allowedTenantRoles = new Set(['owner', 'admin', 'editor'])
const hasTenantAdminAccess = (authContext.memberships ?? []).some((m) =>
  allowedTenantRoles.has((m.role ?? 'member') as string)
)

if (!isSystemAdmin && !hasTenantAdminAccess) {
  redirect('/app')
}
```

**Evidence:** The admin layout allows both system_admin AND tenant owner/admin/editor.

### A.3 Route Truth Table

| Route | system_admin | tenant_admin (owner/admin/editor) | member |
|-------|--------------|-----------------------------------|--------|
| `/admin/gamification/shop-rewards` | ✅ | ✅ | ❌ |
| `/api/admin/marketplace/items` | ✅ | ✅ | ❌ |
| `/app/shop` | ✅ | ✅ | ✅ |
| `/api/shop` (GET) | ✅ | ✅ | ✅ |
| `/api/shop` (POST purchase) | ✅ | ✅ | ✅ |

### A.4 Scope Question — CRITICAL FINDING

**Is `/admin/gamification/shop-rewards` system-admin-only?**

**NO.** The route is accessible to tenant admins (owner/admin/editor) per the layout check. However, the current UI implementation:
- Does NOT use `currentTenant` for filtering
- Displays hardcoded mock data
- Has no real CRUD operations

**Is there a tenant-scoped variant?**

**NO.** There is only one route. The design intent (per [ADMIN_GAMIFICATION_HUB_IA.md](docs/ADMIN_GAMIFICATION_HUB_IA.md)) is that tenant admins manage their own shop items.

**Is this feature global, tenant-scoped, or mixed?**

**Tenant-scoped only.** Unlike achievements:
- `shop_items.tenant_id` is **NOT NULL** (required)
- There is no `scope` column on shop_items
- All shop items belong to exactly one tenant

---

## Section B — Navigation & IA

### B.1 Navigation Configuration

From [lib/admin/nav.ts](lib/admin/nav.ts) lines 100-107:

```typescript
{
  id: 'gamification',
  label: 'Gamification',
  icon: 'leaderboard',
  items: [
    { id: 'gamification-hub', label: 'Översikt', href: '/admin/gamification', icon: 'leaderboard' },
    { id: 'dicecoin-xp', label: 'DiceCoin & XP', href: '/admin/gamification/dicecoin-xp', icon: 'leaderboard' },
    { id: 'achievements', label: 'Achievements', href: '/admin/gamification/achievements', icon: 'achievements' },
    { id: 'shop-rewards', label: 'Shop & Rewards', href: '/admin/gamification/shop-rewards', icon: 'marketplace' },
  ],
},
```

**Observations:**
- ✅ Shop & Rewards is correctly grouped under Gamification
- ⚠️ No `permission` key defined (unlike some other items)
- ⚠️ No `systemAdminOnly` or `tenantOnly` flag
- ✅ Visible to all admin users (system and tenant)

### B.2 Hub Landing Page

From [app/admin/gamification/page.tsx](app/admin/gamification/page.tsx) lines 84-88:

```typescript
{
  id: "shop-rewards",
  title: "Shop & Rewards",
  description: "Butik, belöningar, priser och tillgänglighetsregler.",
  href: "/admin/gamification/shop-rewards",
  // ...
}
```

**Status:** The hub landing links to shop-rewards correctly.

### B.3 Dead Navigation Check

| Navigation Element | Status | Notes |
|--------------------|--------|-------|
| Nav sidebar → Shop & Rewards | ✅ Works | Links to functional page |
| Hub landing → Shop & Rewards card | ✅ Works | Links correctly |
| `/admin/marketplace` redirect | ✅ Works | Redirects to shop-rewards |
| Legacy `_legacy-page.tsx` | ⚠️ Dead | Orphaned file, not exposed |

---

## Section C — Database & Economy Model

### C.1 Core Tables Inventory

#### Table: `shop_items`

**Migration:** [20251129000010_marketplace_domain.sql](supabase/migrations/20251129000010_marketplace_domain.sql)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | **NO** | FK to tenants, always required |
| `name` | TEXT | NO | Item name |
| `description` | TEXT | YES | Optional description |
| `category` | TEXT | NO | 'cosmetic', 'powerup', 'bundle', 'season_pass' |
| `image_url` | TEXT | YES | Optional image |
| `price` | DECIMAL(10,2) | NO | Price in virtual currency |
| `currency_id` | UUID | NO | FK to virtual_currencies |
| `quantity_limit` | INTEGER | YES | NULL = unlimited |
| `quantity_sold` | INTEGER | YES | Defaults to 0 |
| `is_available` | BOOLEAN | YES | Defaults to true |
| `is_featured` | BOOLEAN | YES | Defaults to false |
| `sort_order` | INTEGER | YES | For ordering |
| `created_by_user_id` | UUID | YES | Audit field |
| `metadata` | JSONB | YES | Extensible config |
| `created_at` | TIMESTAMPTZ | YES | |
| `updated_at` | TIMESTAMPTZ | YES | |

**⚠️ MISSING COLUMN: `status`** — Unlike achievements, shop_items has NO status column (draft/active/archived).

#### Table: `virtual_currencies`

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID NOT NULL | Always tenant-scoped |
| `name` | TEXT | e.g., "DiceCoin" |
| `code` | TEXT UNIQUE | e.g., "dicecoin:tenant-uuid" |
| `symbol` | TEXT | e.g., "🪙" |
| `is_premium` | BOOLEAN | Requires real money |

#### Table: `user_purchases`

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID NOT NULL | |
| `user_id` | UUID NOT NULL | |
| `shop_item_id` | UUID NOT NULL | |
| `quantity` | INTEGER | |
| `price_paid` | DECIMAL(10,2) | **Historical price preserved** ✅ |
| `currency_id` | UUID | |
| `idempotency_key` | TEXT | Added in later migration |
| `coin_transaction_id` | UUID | Links to coin ledger |

**✅ Historical price preserved:** `price_paid` stores the price at purchase time.

#### Table: `player_cosmetics`

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID NOT NULL | |
| `user_id` | UUID NOT NULL | |
| `shop_item_id` | UUID NOT NULL | |
| `is_equipped` | BOOLEAN | |
| `equipped_at` | TIMESTAMPTZ | |

**Unique constraint:** `(user_id, tenant_id, shop_item_id)` — One cosmetic per user per item.

#### Table: `user_powerup_inventory`

**Migration:** [20251231235500_shop_powerup_inventory_v1.sql](supabase/migrations/20251231235500_shop_powerup_inventory_v1.sql)

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID NOT NULL | |
| `user_id` | UUID NOT NULL | |
| `shop_item_id` | UUID NOT NULL | |
| `quantity` | INTEGER | Remaining count |

Supports consumable powerups with quantity tracking.

### C.2 V2 Burn Foundation (Future-Ready)

**Migration:** [20260108200000_gamification_v2_core_extensions.sql](supabase/migrations/20260108200000_gamification_v2_core_extensions.sql)

#### Table: `gamification_burn_sinks`

A **generalized** coin sink registry for future shop extensibility:

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID | **NULLABLE** — Can be global or tenant |
| `sink_type` | TEXT | 'shop_item', 'boost', 'cosmetic', 'donation', 'custom' |
| `cost_coins` | INTEGER | |
| `is_available` | BOOLEAN | |
| `total_stock` | INTEGER | NULL = unlimited |
| `remaining_stock` | INTEGER | |
| `per_user_limit` | INTEGER | |

**This is a parallel architecture** to `shop_items` intended for future use. It supports nullable `tenant_id` (global sinks possible).

#### Function: `burn_coins_v1`

Atomic coin burning with:
- Advisory lock for race-condition protection
- Idempotency key support
- Balance validation before deduction

### C.3 Scope Architecture Summary

| Table | tenant_id | Can be global? | Notes |
|-------|-----------|----------------|-------|
| `shop_items` | **NOT NULL** | ❌ No | Strictly tenant-scoped |
| `virtual_currencies` | **NOT NULL** | ❌ No | Per-tenant currencies |
| `gamification_burn_sinks` | NULLABLE | ✅ Yes | Future v2 architecture |
| `achievements` | NULLABLE | ✅ Yes | Global + tenant hybrid |

### C.4 RLS Policies Summary

From the migrations:

| Table | Select Policy | Write Policy |
|-------|--------------|--------------|
| `shop_items` | `is_available = true OR created_by_user_id = auth.uid()` | tenant admin/editor via `has_tenant_role` |
| `user_purchases` | Own user OR tenant membership | Own user OR tenant membership |
| `player_cosmetics` | Own user OR tenant membership | Own user only |
| `gamification_burn_sinks` | Authenticated + visible + tenant match | System admin OR tenant admin |

**✅ Well-designed RLS** — Participant-facing tables restrict to own data; admin tables use role checks.

---

## Section D — Current Admin UI Behavior

### D.1 Implementation Analysis

From [app/admin/gamification/shop-rewards/page.tsx](app/admin/gamification/shop-rewards/page.tsx):

**File is 312 lines total.**

```typescript
'use client';
// ...
const mockItems: ShopItem[] = [
  {
    id: "1",
    name: "Guldram",
    // ... hardcoded mock data
  },
  // 5 mock items total
];

export default function ShopRewardsPage() {
  useAuth();
  const { currentTenant: _currentTenant } = useTenant();
  // Note: _currentTenant is destructured but NEVER USED
```

### D.2 Feature Status Table

| Feature | Implemented? | Notes |
|---------|--------------|-------|
| Data source | ❌ Mock only | 5 hardcoded items |
| Tenant filtering | ❌ Missing | `_currentTenant` unused |
| List items (read) | ❌ No API call | Uses mock array |
| Create item | ❌ Button exists, no handler | `onClick: () => {}` |
| Update item | ❌ No edit UI | |
| Delete item | ❌ No delete UI | |
| Status toggle | ❌ No status column | |
| Search | ✅ Client-side | Filters mock data |
| Category filter | ✅ Client-side | Filters mock data |
| Bulk actions | ❌ None | |
| Stats cards | ✅ Calculated from mock | Not real data |

### D.3 UX Gaps vs Achievements Admin

| Pattern | Achievements | Shop Rewards | Gap |
|---------|--------------|--------------|-----|
| Real data | ✅ Server actions | ❌ Mock data | 🔴 Critical |
| CRUD drawer | ✅ `AchievementEditorDrawer` | ❌ None | 🔴 Critical |
| Status workflow | ✅ draft/active/archived | ❌ Only `is_available` | 🟡 Schema gap |
| Award/redeem modal | ✅ `AwardAchievementModal` | ❌ N/A (shop is self-serve) | ⚪ N/A |
| Tenant selector | ✅ System admin can filter | ❌ Not implemented | 🟡 Missing |
| Pagination | ✅ Server-side | ❌ None (mock) | 🔴 Critical |
| Server actions | ✅ `achievements-admin.ts` | ❌ **None exist** | 🔴 Critical |

### D.4 Technical Debt

1. **No server actions file** — Unlike achievements, there is no `shop-admin.ts` or similar
2. **Unused tenant context** — The hook is called but the value is ignored
3. **Dead legacy page** — `_legacy-page.tsx` has CRUD but is unreachable
4. **Inconsistent with design system** — No drawer, no status badges, no bulk select

---

## Section E — APIs & Server Actions

### E.1 API Inventory

| File | Method | Purpose | Auth Model | Tenant Validation | Idempotency |
|------|--------|---------|------------|-------------------|-------------|
| [app/api/shop/route.ts](app/api/shop/route.ts) | GET | List shop items for participant | User auth + tenant membership | ✅ Required query param | N/A |
| [app/api/shop/route.ts](app/api/shop/route.ts) | POST | Purchase item | User auth + tenant membership | ✅ In body | ✅ Required key |
| [app/api/shop/powerups/consume/route.ts](app/api/shop/powerups/consume/route.ts) | POST | Use powerup | User auth + tenant membership | ✅ In body | ✅ Required key |
| [app/api/admin/marketplace/items/route.ts](app/api/admin/marketplace/items/route.ts) | POST | Create shop item | `assertTenantAdminOrSystem` | ✅ In body | ❌ None |
| [app/api/admin/marketplace/items/route.ts](app/api/admin/marketplace/items/route.ts) | PATCH | Update shop item | `assertTenantAdminOrSystem` | ✅ In body | ❌ None |

### E.2 Server Actions Status

**⚠️ NO SERVER ACTIONS EXIST FOR SHOP ADMIN**

Achievements has:
- `app/actions/achievements-admin.ts` (594 lines)
- `app/actions/tenant-achievements-admin.ts` (568 lines)

Shop has: **Nothing.**

The legacy page uses direct API calls, not server actions.

### E.3 Security Analysis

#### Can a malicious user redeem rewards they shouldn't?

**NO.** The purchase flow uses:

```typescript
// From purchase_shop_item_v1 function
if auth.role() <> 'service_role' then
  raise exception 'service role only';
end if;
```

All writes go through `service_role` RPC functions, not RLS client.

#### Can coins be spent twice?

**NO.** Protected by:

1. **Advisory lock:**
   ```sql
   v_lock_key := hashtextextended(p_user_id::text || ':' || p_tenant_id::text || ':' || p_idempotency_key, 0);
   perform pg_advisory_xact_lock(v_lock_key);
   ```

2. **Idempotency check:**
   ```sql
   select up.id, up.coin_transaction_id
     into v_existing_purchase_id, v_existing_tx_id
     from public.user_purchases up
     where up.user_id = p_user_id
       and up.idempotency_key = p_idempotency_key
   ```

3. **Unique index:**
   ```sql
   create unique index idx_user_purchases_idempotency
     on public.user_purchases(user_id, tenant_id, idempotency_key)
   ```

**✅ Race-condition protection is solid.**

#### Admin API security

From [app/api/admin/marketplace/items/route.ts](app/api/admin/marketplace/items/route.ts):

```typescript
const allowed = await assertTenantAdminOrSystem(tenantId, user)
if (!allowed) return { ok: false as const, status: 403 as const }
// ...
const admin = createServiceRoleClient()
```

**✅ Writes use service_role after auth check.**

---

## Section F — Participant-Facing Flow

### F.1 Current Implementation

The participant shop at `/app/shop` is **fully functional**:

| Feature | Status | Evidence |
|---------|--------|----------|
| View items | ✅ | `GET /api/shop` |
| See prices | ✅ | From shop_items |
| Check balance | ✅ | From user_coins |
| Purchase cosmetic | ✅ | `POST /api/shop` → `purchase_shop_item_v1` |
| Purchase powerup | ✅ | Same flow, increments inventory |
| Consume powerup | ✅ | `POST /api/shop/powerups/consume` |
| Level-gating | ✅ | `metadata.minLevel` check |
| Owned items display | ✅ | Prevents re-purchase of cosmetics |

### F.2 Entry Points to Shop

| Source | Link |
|--------|------|
| [features/gamification/GamificationPage.tsx](features/gamification/GamificationPage.tsx) | "Butik" card → `/app/shop` |
| [features/journey/AppDashboardPage.tsx](features/journey/AppDashboardPage.tsx) | Dashboard link |
| [app/app/profile/coins/page.tsx](app/app/profile/coins/page.tsx) | Coin history page |

### F.3 Missing Pieces for Future

| Feature | Status | Implication |
|---------|--------|-------------|
| Inventory limits | ⚠️ Stock tracking exists but no admin UI | Can't manage stock |
| Promo codes | ❌ Table exists, no UI | Dead schema |
| Gifting | ❌ `is_gift` column exists, no flow | Dead column |
| Bundles | ⚠️ Category exists, no bundle logic | Category renders but no unpacking |
| Season pass | ❌ Category exists, no implementation | Cosmetic only |

### F.4 Security Risks

1. **Client-side level check can be bypassed** — Server validates in `purchase_shop_item_v1` ✅
2. **No rate limiting** — Potential for spam purchases (mitigated by balance check)
3. **No refund mechanism** — Once purchased, cannot be undone (design decision?)

---

## Section G — Consistency with Achievements

### G.1 Architecture Comparison

| Aspect | Achievements | Shop Rewards | Should Match? |
|--------|--------------|--------------|---------------|
| **Scope model** | Hybrid (global + tenant) | Tenant-only | ❌ Keep different |
| **tenant_id nullable** | ✅ Yes | ❌ No | ❌ Keep different |
| **Status lifecycle** | draft/active/archived | `is_available` only | 🟡 Consider adding |
| **Admin server actions** | ✅ 2 files | ❌ None | 🔴 Must add |
| **Editor drawer** | ✅ `AchievementEditorDrawer` | ❌ None | 🔴 Must add |
| **Tenant selector (system admin)** | ✅ Can view all | ❌ Missing | 🔴 Must add |
| **RLS pattern** | Service role writes | Service role writes | ✅ Same |
| **Audit columns** | created_by, updated_by | created_by_user_id only | 🟡 Consider adding |
| **Participant API** | `/api/gamification/achievements` | `/api/shop` | ✅ Different endpoints |

### G.2 What Shop SHOULD Mirror from Achievements

1. **Server actions pattern** — Create `app/actions/shop-admin.ts` following the same structure
2. **CRUD drawer component** — Create `ShopItemEditorDrawer.tsx`
3. **Pagination** — Use same server-side pagination pattern
4. **Tenant filtering** — For system admin, allow cross-tenant view
5. **Status management** — Add status column or use `is_available` consistently

### G.3 What Shop SHOULD NOT Mirror

1. **Scope column** — Shop items are always tenant-scoped, no need for global
2. **Award modal** — Shop is self-serve purchase, not admin-granted
3. **condition_type/condition_value** — Shop uses price, not conditions

---

## Section H — Risk & Decision Matrix

### Option A: Tenant-Managed Shops Only (Current Design)

**Description:** Each tenant manages their own shop items. No global catalog.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟢 Low — RLS already enforces tenant isolation |
| Complexity | 🟢 Low — No scope logic needed |
| Alignment with code | 🟢 High — Schema already enforces this |
| Migration impact | 🟢 None — No schema change |

**Pros:**
- Simplest to implement
- No scope ambiguity
- Tenants have full control

**Cons:**
- No shared catalog across tenants
- Each tenant must create items from scratch

### Option B: Global Catalog + Tenant Overrides

**Description:** System admin creates global items; tenants can enable/customize.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟡 Medium — Need careful RLS for global visibility |
| Complexity | 🔴 High — Requires scope column, override logic |
| Alignment with code | 🔴 Low — Would require schema migration |
| Migration impact | 🔴 High — Add scope column, migrate existing data |

**Pros:**
- Consistent catalog across tenants
- Easier for tenants (pre-made items)

**Cons:**
- More complex RLS
- Override conflict resolution
- Schema migration required

### Option C: System-Admin-Only Global Shop

**Description:** Only system admin can create items; all tenants see same shop.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟢 Low — Centralized control |
| Complexity | 🟡 Medium — Need tenant visibility rules |
| Alignment with code | 🔴 Low — Schema has NOT NULL tenant_id |
| Migration impact | 🔴 High — Major redesign |

**Pros:**
- Full control over economy
- Consistent experience

**Cons:**
- Tenants lose customization
- Doesn't match current schema
- Against product intent

### Option D: Use V2 Burn Sinks for Global Items

**Description:** Keep shop_items tenant-only; use `gamification_burn_sinks` for global sinks.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟡 Medium — Two systems to maintain |
| Complexity | 🟡 Medium — Parallel architectures |
| Alignment with code | 🟡 Medium — V2 tables exist but unused |
| Migration impact | 🟢 Low — No change to shop_items |

**Pros:**
- Preserves existing shop design
- Adds future global capability

**Cons:**
- Two systems to maintain
- Participant UI would need to merge sources

### Recommendation (Analysis Only)

**Option A is the clear choice** for Phase 1/2:
- Matches current schema
- Matches product intent (per ADMIN_GAMIFICATION_HUB_IA.md)
- Lowest risk
- Option D can be explored later for global boosts/sinks

---

## Section I — Phase 1 Constraints Contract

### MUST NOT Change

| Item | Reason |
|------|--------|
| `shop_items.tenant_id NOT NULL` | Breaking change; production data exists |
| Purchase flow (`purchase_shop_item_v1`) | Working, battle-tested |
| Participant shop UI | Functional, no regression allowed |
| RLS policies on marketplace tables | Already correct |
| `virtual_currencies` table | Working, seed data exists |

### CAN Be Changed (No Migration)

| Item | Scope |
|------|-------|
| Admin UI (`shop-rewards/page.tsx`) | Full rewrite allowed |
| Navigation labels | Cosmetic changes |
| Mock data removal | Required |
| Add server actions file | New file |

### REQUIRES Migration

| Item | Impact |
|------|--------|
| Add `status` column to shop_items | Low risk, defaults to 'active' |
| Add `updated_at` trigger | Low risk |
| Add `updated_by` column | Low risk, optional |

### REQUIRES Product Decision

| Decision | Options | Blocker For |
|----------|---------|-------------|
| Status lifecycle | `is_available` only vs draft/active/archived | Admin UI design |
| Tenant selector | System admin can view all vs only own | Navigation logic |
| Promo codes | Implement or remove dead schema | Scope of Phase 2 |
| Gifting | Implement or remove dead column | Scope of Phase 2 |
| Bundle unpacking | Define behavior or defer | Phase 3+ |

---

## Appendix: File References

### Admin UI
- [app/admin/gamification/shop-rewards/page.tsx](app/admin/gamification/shop-rewards/page.tsx) — Current mock UI

### APIs
- [app/api/shop/route.ts](app/api/shop/route.ts) — Participant GET/POST
- [app/api/admin/marketplace/items/route.ts](app/api/admin/marketplace/items/route.ts) — Admin CRUD

### Database
- [supabase/migrations/20251129000010_marketplace_domain.sql](supabase/migrations/20251129000010_marketplace_domain.sql) — Core schema
- [supabase/migrations/20251231230000_shop_mvp_purchase_v1.sql](supabase/migrations/20251231230000_shop_mvp_purchase_v1.sql) — Purchase function
- [supabase/migrations/20260108200000_gamification_v2_core_extensions.sql](supabase/migrations/20260108200000_gamification_v2_core_extensions.sql) — V2 burn sinks

### Navigation
- [lib/admin/nav.ts](lib/admin/nav.ts) — Nav config
- [docs/ADMIN_GAMIFICATION_HUB_IA.md](docs/ADMIN_GAMIFICATION_HUB_IA.md) — IA design doc

### Comparable Feature (Achievements)
- [app/actions/achievements-admin.ts](app/actions/achievements-admin.ts) — Server actions pattern
- [app/admin/gamification/achievements/AchievementEditorDrawer.tsx](app/admin/gamification/achievements/AchievementEditorDrawer.tsx) — Drawer pattern

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | Initial Phase 0 analysis |
