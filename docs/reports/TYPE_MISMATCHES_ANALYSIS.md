# TypeScript Type Mismatches - Detaljerad Analys & Lösningar

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-10
- Last updated: 2026-03-21
- Last validated: -

> Historisk analys av tidigare typmismatchar. Behåll som felsöknings- och bakgrundsreferens, inte som aktuell typstatus utan ny kontroll mot genererade typer.

**Datum:** 2024-12-10  
**Status:** Temporärt fixat med `as any` casts  
**Långsiktig lösning:** Regenerera Supabase types efter migrations

---

## 🔍 Problemanalys

### Root Cause
Supabase type-filen (`types/supabase.ts`) är **genererad från en databas som INTE har alla migrations körda**. Detta orsakar mismatchar mellan:
- Kod som använder tabeller/kolumner som finns i migrations
- TypeScript-typer som saknar dessa tabeller/kolumner

### Saknade Tabeller i Generated Types

| Tabell | Migrations-fil | Används i | Status |
|--------|---------------|-----------|---------|
| `user_mfa` | `20251209120000_accounts_domain.sql` | MFA endpoints, mfaGuard | ❌ Saknas i types |
| `user_audit_logs` | `20251209120000_accounts_domain.sql` | userAudit service | ❌ Saknas i types |
| `user_sessions` | `20251209120000_accounts_domain.sql` | Session tracking | ❌ Saknas i types |
| `user_devices` | `20251209120000_accounts_domain.sql` | Device management | ❌ Saknas i types |
| `user_profiles` | `20251209120000_accounts_domain.sql` | Profile extensions | ❌ Saknas i types |
| `tenant_settings` | `20251209100000_tenant_domain.sql` | Tenant settings API | ❌ Saknas i types |
| `tenant_features` | `20251209100000_tenant_domain.sql` | Feature flags | ❌ Saknas i types |
| `tenant_branding` | `20251209100000_tenant_domain.sql` | Tenant branding API | ❌ Saknas i types |
| `tenant_invitations` | `20251209100000_tenant_domain.sql` | Tenant invites | ❌ Saknas i types |
| `tenant_audit_logs` | `20251209100000_tenant_domain.sql` | Tenant audit | ❌ Saknas i types |
| `billing_accounts` | `20251209150000_billing_consolidation.sql` | Billing system | ❌ Saknas i types |
| `tenant_seat_assignments` | Billing domain | Seat management | ❌ Saknas i types |

### Saknade Enums

| Enum | Migrations-fil | Används för | Status |
|------|---------------|------------|---------|
| `global_role_enum` | `20251208130000_role_enum_and_permissions.sql` | User roles | ❌ Saknas i types |
| `tenant_type_enum` | `20251209100000_tenant_domain.sql` | Tenant types | ❌ Saknas i types |
| `tenant_status_enum` | `20251209100000_tenant_domain.sql` | Tenant status | ❌ Saknas i types |

### Saknade/Ändrade Kolumner

| Tabell | Kolumn | Migrations-fil | Status |
|--------|--------|---------------|---------|
| `tenant_memberships` | `status` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenant_memberships` | `is_primary` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenant_memberships` | `seat_assignment_id` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenants` | `type` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenants` | `status` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenants` | `demo_flag` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenants` | `trial_ends_at` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `tenants` | `metadata` | `20251209100000_tenant_domain.sql` | ❌ Saknas |
| `users` | `global_role` | `20251208130000_role_enum_and_permissions.sql` | ❌ Saknas |
| `games` | `short_description` | Game domain | ⚠️ Nullable mismatch |

---

## 📋 Alla `as any` Casts (24 instanser)

### 1. **MFA & Auth (4 casts)**

**Fil:** `lib/utils/mfaGuard.ts`
```typescript
// Line 18: User query
const { data: userRow } = await (supabase as any)
  .from('users')
  .select('id, global_role')
  .eq('id', userId)
  .single()

// Line 27: MFA query
const { data: mfaRow } = await (supabase as any)
  .from('user_mfa')
  .select('*')
  .eq('user_id', userId)
  .single()
```

**Problem:** Tabellen `user_mfa` och kolumnen `global_role` finns inte i generated types.

---

### 2. **Tenant API Routes (10 casts)**

**Fil:** `app/api/tenants/route.ts`
```typescript
// Line 40: Tenant insert
.insert({
  name: body.name,
  type: body.type,
  status: body.status,
  // ... more fields
} as any)
```

**Fil:** `app/api/tenants/[tenantId]/route.ts`
```typescript
// Line 68: Metadata update
metadata: body.metadata as any,
```

**Fil:** `app/api/tenants/[tenantId]/settings/route.ts`
```typescript
// Line 61: Settings upsert
{
  tenant_id: tenantId,
  modules: body.modules,
  product_access: body.product_access,
} as any
```

**Fil:** `app/api/tenants/[tenantId]/members/route.ts`
```typescript
// Line 75: Membership insert
{
  tenant_id: tenantId,
  user_id: userId,
  role: body.role,
  status: 'active',
  is_primary: body.is_primary ?? false,
} as any
```

**Fil:** `app/api/tenants/[tenantId]/members/[userId]/route.ts`
```typescript
// Line 50-51: Role/status update
role: body.role as any,
status: body.status as any,
```

**Fil:** `app/api/tenants/invitations/[token]/accept/route.ts`
```typescript
// Line 50: Membership creation
{
  tenant_id: invitation.tenant_id,
  user_id: user.id,
  role: invitation.role,
  status: 'active',
  is_primary: false,
} as any
```

**Fil:** `app/api/tenants/[tenantId]/audit-logs/route.ts`
```typescript
// Line 16: System admin check
isSystemAdmin(user as any)
```

**Problem:** Tabeller `tenant_settings`, `tenant_branding` saknas. Kolumner som `type`, `status`, `is_primary`, `metadata` saknas på `tenants`/`tenant_memberships`.

---

### 3. **Billing API Routes (3 casts)**

**Fil:** `app/api/billing/tenants/[tenantId]/invoices/stripe/route.ts`
```typescript
// Line 71: Billing account query
const { data: billingAccount, error: acctError } = await (supabase as any)
  .from('billing_accounts')
  .select('*')
```

**Fil:** `app/api/billing/tenants/[tenantId]/stripe-customer/route.ts`
```typescript
// Line 54: Check existing
const { data: existing } = await (supabase as any)
  .from('billing_accounts')
  .select('stripe_customer_id')

// Line 74: Insert billing account
const { error } = await (supabase as any)
  .from('billing_accounts')
  .insert({ ... })
```

**Problem:** Tabellen `billing_accounts` saknas i types.

---

### 4. **Products API (2 casts)**

**Fil:** `app/api/products/route.ts`
```typescript
// Line 28: Validation
const validation = validateProductPayload(body as any, { mode: 'create' })

// Line 44: Product insert
.insert(payload as any)
```

**Problem:** Product schema mismatch mellan validation och generated types.

---

### 5. **Plans API (5 casts)**

**Fil:** `app/api/plans/[planId]/route.ts`
```typescript
// Line 53: Validation
const validation = validatePlanPayload(body as any, { mode: 'update' })

// Line 63: Metadata update
metadata: (body.metadata ?? undefined) as any,
```

**Fil:** `app/api/plans/[planId]/blocks/route.ts`
```typescript
// Line 41: Validation
const validation = validatePlanBlockPayload(body as any, { mode: 'create' })

// Line 85: Metadata in block
metadata: (body.metadata ?? {}) as any,

// Line 89: Block insert
} as any

// Line 104: Order update
.upsert(updates as any)
```

**Fil:** `app/api/plans/[planId]/blocks/[blockId]/route.ts`
```typescript
// Line 42: Validation
const validation = validatePlanBlockPayload(body as any, { mode: 'update' })

// Line 106: Reorder payload
.upsert(reorderPayload as any)

// Line 180: Another reorder
.upsert(reorderPayload as any)
```

**Problem:** Plan/block metadata fields och validation schemas mismatch.

---

## 🔧 Temporära Fixes (Redan Applicerade)

### Component Fixes
- **Toggle Components:** `onPressedChange` → `onClick` (Radix UI API change)
- **Table Components:** Lade till `onClearFilters` prop
- **Validation:** Null checks för `short_description` i games validation

### Type Definition Fixes
```typescript
// types/admin.ts
export type MfaStatus = {
  user_mfa: { enrolled_at: string | null } | null
  totp: { id: string } | null
  recovery_codes_count: number
}

export type MembershipRow = {
  user_id: string
  role: string
  status?: string
  is_primary?: boolean
  created_at?: string
}

export type GlobalRole = 'system_admin' | 'tenant_admin' | 'user' | null
```

### Suspense Boundary Fix
```typescript
// app/app/admin/tenant/page.tsx
export default function Page() {
  return (
    <Suspense fallback={<div>Laddar...</div>}>
      <TenantAdminPage />
    </Suspense>
  )
}
```

---

## ✅ Långsiktig Lösning (MÅSTE GÖRAS)

### Steg 1: Kör Alla Migrations

#### Option A: Supabase Dashboard (Rekommenderas)
```bash
# 1. Gå till Supabase Dashboard
https://supabase.com/dashboard → SQL Editor

# 2. Kör migrations i ordning (viktigt!)
# Kör ALLA .sql filer från supabase/migrations/ i timestamp-ordning:
20251129000000_initial_schema.sql
20251129000001_fix_rls_security.sql
...
20251208120000_planner_modernization.sql
20251208130000_role_enum_and_permissions.sql
20251209100000_tenant_domain.sql
20251209120000_accounts_domain.sql
20251209130000_product_domain_hardening.sql
20251209133000_gamification_core.sql
20251209150000_billing_consolidation.sql
... (alla filer)
```

#### Option B: Supabase CLI (Kräver Docker)
```bash
# Start Supabase locally
supabase start

# Apply all migrations
supabase db push

# Alternativt: länka till remote
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --linked
```

### Steg 2: Regenerera TypeScript Types

#### Efter alla migrations är körda:
```bash
# Option A: Från lokal databas
npx supabase gen types typescript --local > types/supabase.ts

# Option B: Från länkad remote databas
npx supabase gen types typescript --linked > types/supabase.ts

# Option C: Manuellt från Dashboard
# 1. Gå till Settings → API → Generate TypeScript Types
# 2. Kopiera output
# 3. Ersätt innehållet i types/supabase.ts
```

### Steg 3: Ta Bort Alla `as any` Casts

#### Skapa ett script för att hitta och fixa:
```bash
# Hitta alla 'as any' användningar
npx grep -r "as any" --include="*.ts" --include="*.tsx" app/ lib/

# Manual fix per fil eller använd multi_replace_string_in_file
```

#### Exempel på fix:
```typescript
// FÖRE (Temporär fix)
const { data: mfaRow } = await (supabase as any)
  .from('user_mfa')
  .select('*')
  .eq('user_id', userId)
  .single()

// EFTER (Med korrekt types)
const { data: mfaRow } = await supabase
  .from('user_mfa')
  .select('*')
  .eq('user_id', userId)
  .single()
```

---

## 🛡️ Förebyggande Åtgärder

### 1. **CI/CD Type Check**
Lägg till i GitHub Actions:
```yaml
# .github/workflows/typecheck.yml
name: Type Check
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run type-check
      - name: Verify no 'as any' in production code
        run: |
          if grep -r "as any" app/ lib/ --include="*.ts" --include="*.tsx"; then
            echo "❌ Found 'as any' casts in production code"
            exit 1
          fi
```

### 2. **Pre-commit Hook**
```bash
# .husky/pre-commit
#!/bin/sh
npm run type-check || exit 1

# Check for 'as any' in staged files
if git diff --cached --name-only | xargs grep -l "as any" 2>/dev/null; then
  echo "⚠️  Warning: 'as any' found in staged files"
  echo "Please ensure types are properly defined"
fi
```

### 3. **Package.json Scripts**
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "db:types": "supabase gen types typescript --local > types/supabase.ts",
    "db:types:remote": "supabase gen types typescript --linked > types/supabase.ts"
  }
}
```

### 4. **Documentation Updates**
Uppdatera `docs/MIGRATIONS.md`:
```markdown
## ⚠️ VIKTIGT: Efter Varje Migration

**ALLTID** regenerera types efter migration changes:

1. Kör migration
2. Regenerera types: `npm run db:types`
3. Commit båda filerna tillsammans
4. Verifiera: `npm run type-check`

Detta förhindrar type mismatches!
```

### 5. **ESLint Rule**
Lägg till i `.eslintrc.js`:
```javascript
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn'
  }
}
```

### 6. **Development Workflow**

#### Ny Migration Workflow:
```bash
# 1. Skapa migration
supabase migration new feature_name

# 2. Skriv SQL
# Edit: supabase/migrations/TIMESTAMP_feature_name.sql

# 3. Apply migration
supabase db push --local  # Test lokalt först

# 4. Regenerera types OMEDELBART
npm run db:types

# 5. Fix TypeScript errors
npm run type-check

# 6. Commit tillsammans
git add supabase/migrations/TIMESTAMP_feature_name.sql
git add types/supabase.ts
git commit -m "feat: add feature_name with type regeneration"

# 7. Push till remote
supabase db push --linked
```

---

## 📊 Migration Status

### Migrations Körda i Remote DB (Antagande)
✅ De flesta initiala migrations från November  
❓ `20251208130000_role_enum_and_permissions.sql`  
❓ `20251209100000_tenant_domain.sql`  
❓ `20251209120000_accounts_domain.sql`  
❓ `20251209130000_product_domain_hardening.sql`  
❓ `20251209133000_gamification_core.sql`  
❓ `20251209150000_billing_consolidation.sql`  

### Verifiera Migrations
```sql
-- Kör i SQL Editor för att se körda migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC;

-- Kolla om tabeller finns
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_mfa',
  'user_audit_logs',
  'tenant_settings',
  'tenant_branding',
  'billing_accounts'
);

-- Kolla om enums finns
SELECT typname 
FROM pg_type 
WHERE typname IN (
  'global_role_enum',
  'tenant_type_enum',
  'tenant_status_enum'
);
```

---

## 🎯 Action Items (Prioritet)

### Omedelbart (P0)
1. ✅ Temporära fixes applicerade (`as any` casts)
2. ✅ Build fungerar (`npm run build` successful)
3. ⏳ **Verifiera vilka migrations som är körda i remote DB**
4. ⏳ **Kör saknade migrations i korrekt ordning**
5. ⏳ **Regenerera types från uppdaterad databas**

### Kort Sikt (P1) - Nästa Sprint
1. Ta bort alla `as any` casts systematiskt
2. Implementera CI/CD type checks
3. Lägg till pre-commit hooks
4. Uppdatera development documentation

### Lång Sikt (P2) - Maintenance
1. Etablera migration → type regeneration som standard workflow
2. Code review checklist: "Types regenerated after schema changes?"
3. Överväg type generation i CI pipeline efter varje deploy

---

## 📝 Checklist: Rätta Till Type Mismatches

```markdown
### Pre-requisites
- [ ] Docker Desktop installerat (för lokal Supabase)
- [ ] Supabase CLI installerat (`npm i -g supabase`)
- [ ] Tillgång till Supabase Dashboard

### Execution Steps
- [ ] **Steg 1:** Identifiera saknade migrations i remote DB
- [ ] **Steg 2:** Kör saknade migrations (via Dashboard eller CLI)
- [ ] **Steg 3:** Verifiera att alla tabeller/enums finns
- [ ] **Steg 4:** Regenerera `types/supabase.ts`
- [ ] **Steg 5:** Kör `npm run type-check` → förvänta 24 errors
- [ ] **Steg 6:** Ta bort alla `as any` casts (24 instanser)
- [ ] **Steg 7:** Kör `npm run type-check` → 0 errors
- [ ] **Steg 8:** Kör `npm run build` → successful
- [ ] **Steg 9:** Test runtime functionality
- [ ] **Steg 10:** Commit & push

### Post-Implementation
- [ ] Uppdatera documentation med nya workflows
- [ ] Implementera CI/CD checks
- [ ] Team training på nya workflows
```

---

## 🔗 Relaterade Filer

- **Type Definitions:** `types/supabase.ts`, `types/admin.ts`
- **Migrations:** `supabase/migrations/*.sql`
- **Affected APIs:** All tenant/billing/auth endpoints
- **Utilities:** `lib/utils/mfaGuard.ts`, `lib/services/userAudit.server.ts`
- **Documentation:** `docs/MIGRATIONS.md`

---

## 💡 Key Takeaways

1. **Schema Changes → Type Regeneration är obligatoriskt**
2. **`as any` är ALDRIG en permanent lösning**
3. **Migrations måste köras i rätt ordning**
4. **CI/CD måste validera types**
5. **Documentation måste uppdateras med workflows**

---

**Status:** Dokumentet färdigt ✅  
**Nästa Steg:** Kör migrations och regenerera types
