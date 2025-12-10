# COMPONENT INVENTORY

**Date:** YYYY-MM-DD  
**Project:** Lekbanken  
**Purpose:** Complete inventory of all code artifacts categorized by domain

---

## Inventory Summary

| Category | Total | Documented | Undocumented | Legacy | Orphaned |
|----------|-------|------------|--------------|--------|----------|
| Components | XXX | XX | XX | XX | XX |
| Hooks | XXX | XX | XX | XX | XX |
| Services | XXX | XX | XX | XX | XX |
| API Routes | XXX | XX | XX | XX | XX |
| Utilities | XXX | XX | XX | XX | XX |
| Types | XXX | XX | XX | XX | XX |

---

## Domain: Accounts

### Components (`features/accounts/components/`)

| File | Type | Domain | Status | Usage Count | Notes |
|------|------|--------|--------|-------------|-------|
| LoginForm.tsx | Form Component | Accounts | ✅ ACTIVE | 3 | Used in auth flow |
| RegisterForm.tsx | Form Component | Accounts | ✅ ACTIVE | 2 | - |
| ProfileEditor.tsx | Form Component | Accounts | ⚠️ LEGACY | 1 | Replace with Catalyst |
| OldLoginWidget.tsx | Legacy | Accounts | ❌ UNUSED | 0 | DELETE |

### Hooks (`features/accounts/hooks/`)

| File | Purpose | Domain | Status | Usage Count | Notes |
|------|---------|--------|--------|-------------|-------|
| useAuth.ts | Auth state management | Accounts | ✅ ACTIVE | 15 | Core hook |
| useUser.ts | User data fetching | Accounts | ✅ ACTIVE | 12 | - |
| useOldAuth.ts | ??? | Accounts | ❌ UNUSED | 0 | DELETE |

### Services (`features/accounts/services/`)

| File | Purpose | Domain | Status | Usage Count | Notes |
|------|---------|--------|--------|-------------|-------|
| authService.ts | Auth API calls | Accounts | ✅ ACTIVE | 8 | - |
| userService.ts | User CRUD | Accounts | ✅ ACTIVE | 6 | - |

### API Routes (`app/api/auth/`)

| Route | Method | Purpose | Status | Tests | Notes |
|-------|--------|---------|--------|-------|-------|
| login/route.ts | POST | User login | ✅ ACTIVE | ✓ | - |
| register/route.ts | POST | User registration | ✅ ACTIVE | ✓ | - |
| logout/route.ts | POST | User logout | ✅ ACTIVE | ✓ | - |
| forgot-password/route.ts | POST | Password reset | ✅ ACTIVE | ✗ | Needs tests |

### Types (`features/accounts/types.ts`)

| Type | Purpose | Status | Notes |
|------|---------|--------|-------|
| User | User entity | ✅ ACTIVE | - |
| AuthState | Auth state shape | ✅ ACTIVE | - |
| LoginCredentials | Login payload | ✅ ACTIVE | - |

---

## Domain: Tenant

### Components (`features/tenant/components/`)

| File | Type | Domain | Status | Usage Count | Notes |
|------|------|--------|--------|-------------|-------|
| TenantSelector.tsx | UI Component | Tenant | ✅ ACTIVE | 4 | - |
| TenantSettings.tsx | Form Component | Tenant | ✅ ACTIVE | 2 | - |

### Hooks (`features/tenant/hooks/`)

| File | Purpose | Domain | Status | Usage Count | Notes |
|------|---------|--------|--------|-------------|-------|
| useTenant.ts | Tenant context | Tenant | ✅ ACTIVE | 25 | Core hook |
| useTenantUsers.ts | Tenant user list | Tenant | ✅ ACTIVE | 5 | - |

### API Routes (`app/api/tenants/`)

| Route | Method | Purpose | Status | Tests | Notes |
|-------|--------|---------|--------|-------|-------|
| [id]/route.ts | GET | Get tenant | ✅ ACTIVE | ✓ | - |
| [id]/route.ts | PATCH | Update tenant | ✅ ACTIVE | ✗ | Needs tests |
| [id]/users/route.ts | GET | List tenant users | ✅ ACTIVE | ✓ | - |

---

## Domain: Billing

### Components (`features/billing/components/`)

| File | Type | Domain | Status | Usage Count | Notes |
|------|------|--------|--------|-------------|-------|
| SubscriptionCard.tsx | Display Component | Billing | ✅ ACTIVE | 3 | - |
| PaymentForm.tsx | Form Component | Billing | ✅ ACTIVE | 2 | Stripe integration |
| InvoiceList.tsx | List Component | Billing | ✅ ACTIVE | 1 | - |

### Hooks (`features/billing/hooks/`)

| File | Purpose | Domain | Status | Usage Count | Notes |
|------|---------|--------|--------|-------------|-------|
| useSubscription.ts | Subscription data | Billing | ✅ ACTIVE | 8 | - |
| useStripe.ts | Stripe integration | Billing | ✅ ACTIVE | 4 | - |

### API Routes (`app/api/billing/`)

| Route | Method | Purpose | Status | Tests | Notes |
|-------|--------|---------|--------|-------|-------|
| subscription/route.ts | GET | Get subscription | ✅ ACTIVE | ✓ | - |
| webhook/route.ts | POST | Stripe webhook | ✅ ACTIVE | ✓ | - |

---

## Domain: Product

[Same structure as above...]

---

## Domain: Browse

[Same structure as above...]

---

## Domain: Games

[Same structure as above...]

---

## Domain: Play

[Same structure as above...]

---

## Domain: Planner

[Same structure as above...]

---

## Domain: Gamification

[Same structure as above...]

---

## Domain: Media

[Same structure as above...]

---

## Domain: Operations

[Same structure as above...]

---

## Domain: Participants

[Same structure as above...]

---

## Shared Components (`components/`)

### UI Components

| File | Type | Status | Usage Count | Notes |
|------|------|--------|-------------|-------|
| Button.tsx | Button | ❌ LEGACY | 5 | Replace with Catalyst |
| Card.tsx | Container | ⚠️ MIXED | 12 | Some use Catalyst, some custom |
| Modal.tsx | Overlay | ❌ LEGACY | 3 | Replace with Catalyst Dialog |

### Layout Components

| File | Type | Status | Usage Count | Notes |
|------|------|--------|-------------|-------|
| Navbar.tsx | Navigation | ✅ ACTIVE | 1 | - |
| Sidebar.tsx | Navigation | ✅ ACTIVE | 1 | - |
| Footer.tsx | Layout | ✅ ACTIVE | 1 | - |

---

## Shared Utilities (`lib/utils/`)

| File | Purpose | Status | Usage Count | Notes |
|------|---------|--------|-------------|-------|
| cn.ts | Class name merging | ✅ ACTIVE | 50+ | Core utility |
| formatDate.ts | Date formatting | ✅ ACTIVE | 20 | - |
| oldHelper.ts | ??? | ⚠️ UNCLEAR | 2 | INVESTIGATE |
| deprecated.ts | Legacy utils | ❌ UNUSED | 0 | DELETE |

---

## Shared Services (`lib/services/`)

| File | Purpose | Status | Usage Count | Notes |
|------|---------|--------|-------------|-------|
| supabase.ts | Supabase client | ✅ ACTIVE | 100+ | Core service |
| analytics.ts | Analytics tracking | ✅ ACTIVE | 15 | - |

---

## Orphaned Code (No Clear Domain)

### Components

| File | Location | Status | Notes |
|------|----------|--------|-------|
| MysteryWidget.tsx | `components/` | ⚠️ ORPHANED | No clear purpose, investigate |
| OldThing.tsx | `components/legacy/` | ❌ UNUSED | Delete |

### Utilities

| File | Location | Status | Notes |
|------|----------|--------|-------|
| randomHelper.ts | `lib/utils/` | ⚠️ ORPHANED | Used once, unclear purpose |

---

## Duplicate Components

### Button Implementations

| File | Location | Usage | Recommendation |
|------|----------|-------|----------------|
| components/Button.tsx | Root | 5 uses | DELETE, use Catalyst |
| components/ui/button.tsx | UI folder | 3 uses | DELETE, use Catalyst |
| catalyst-ui-kit/button.tsx | Catalyst | 20 uses | ✅ KEEP |

### Card Implementations

| File | Location | Usage | Recommendation |
|------|----------|-------|----------------|
| components/Card.tsx | Root | 8 uses | DELETE, use Catalyst |
| components/ui/card.tsx | UI folder | 4 uses | DELETE, use Catalyst |
| catalyst-ui-kit/card.tsx | Catalyst | 15 uses | ✅ KEEP |

---

## API Routes by Domain

### Accounts Domain
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/users/me/route.ts`

### Tenant Domain
- `app/api/tenants/[id]/route.ts`
- `app/api/tenants/[id]/users/route.ts`
- `app/api/tenants/[id]/settings/route.ts`

### Billing Domain
- `app/api/billing/subscription/route.ts`
- `app/api/billing/webhook/route.ts`
- `app/api/billing/invoices/route.ts`

### Games Domain
- `app/api/games/route.ts`
- `app/api/games/[id]/route.ts`
- `app/api/games/[id]/steps/route.ts`
- `app/api/games/[id]/roles/route.ts`

[Continue for all domains...]

---

## Undocumented Components

### High Priority (Active but Undocumented)

| File | Domain | Usage Count | Action |
|------|--------|-------------|--------|
| SpecialWidget.tsx | ??? | 8 | Document purpose |
| CustomHook.ts | ??? | 5 | Document + add to domain |

### Low Priority (Low Usage)

| File | Domain | Usage Count | Action |
|------|--------|-------------|--------|
| RareComponent.tsx | ??? | 1 | Document or delete |

---

## Legacy Code Candidates

### Components to Replace

| File | Replace With | Effort | Priority |
|------|--------------|--------|----------|
| components/Button.tsx | Catalyst Button | 2h | P0 |
| components/Modal.tsx | Catalyst Dialog | 4h | P1 |
| components/CustomTable.tsx | Catalyst Table | 6h | P1 |

### Hooks to Refactor

| File | Issue | Effort | Priority |
|------|-------|--------|----------|
| useOldDataFetch.ts | Replace with SWR | 3h | P1 |
| useDeprecatedAuth.ts | Remove | 1h | P0 |

### API Routes to Modernize

| Route | Issue | Effort | Priority |
|-------|-------|--------|----------|
| app/api/old-auth/route.ts | Replace with new auth | 4h | P0 |
| app/api/legacy-games/route.ts | Migrate to new structure | 6h | P1 |

---

## Action Items

### Immediate (P0)

- [ ] Delete all unused files (0 usage count)
- [ ] Replace Button.tsx with Catalyst (5 uses)
- [ ] Remove deprecated API routes
- [ ] Document orphaned components

### Short Term (P1)

- [ ] Replace all legacy UI components with Catalyst
- [ ] Refactor duplicate code
- [ ] Add tests to untested API routes
- [ ] Organize orphaned code into domains

### Long Term (P2)

- [ ] Optimize bundle size (remove unused dependencies)
- [ ] Add JSDoc to all exports
- [ ] Create component library documentation

---

## Metrics

### Before Cleanup

- Total files: XXX
- Components: XXX
- Hooks: XXX
- API routes: XXX
- Legacy code: XX files
- Unused code: XX files
- Duplicate code: XX files

### After Cleanup (Target)

- Total files: XXX (-XX%)
- Components: XXX (-XX%)
- Hooks: XXX (-XX%)
- API routes: XXX (-XX%)
- Legacy code: 0
- Unused code: 0
- Duplicate code: 0

---

## Notes

### Inventory Process

**Discovery:**
```bash
# Find all TypeScript/TSX files
file_search "**/*.tsx"
file_search "**/*.ts"

# Find usage count
list_code_usages "ComponentName"
```

**Classification Criteria:**

- **ACTIVE:** Used in codebase, follows current patterns
- **LEGACY:** Used but old pattern (pre-Catalyst, old API structure)
- **UNUSED:** 0 usage count, safe to delete
- **ORPHANED:** Unclear domain, needs investigation
- **DUPLICATE:** Same functionality exists elsewhere

### Decision Matrix

| Usage Count | Pattern | Action |
|-------------|---------|--------|
| 0 | Any | DELETE |
| 1-3 | Legacy | REFACTOR or DELETE |
| 1-3 | Modern | KEEP |
| 4+ | Legacy | REFACTOR (high priority) |
| 4+ | Modern | KEEP |

---

**Inventory Completed:** [DATE]  
**Last Updated:** [DATE]  
**Next Review:** [DATE]
