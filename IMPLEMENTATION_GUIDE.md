# Steg-för-steg Guide: Fixa Type Mismatches

## Status Just Nu
✅ **Bygget fungerar** (med temporära `as any` casts)  
⏳ **30+ `as any` casts** hittade som behöver tas bort  
⏳ **Vissa migrations** är körda (`user_tenant_memberships` har rätt kolumner; `tenant_memberships` kan vara en kompatibilitets-view)  
⏳ **Okänt** vilka tabeller som saknas (väntar på SQL query resultat)

---

## Nästa Steg

### 1️⃣ Verifiera Databas Status (GÖR DETTA FÖRST)

**I Supabase SQL Editor**, kör varje query från `scripts/verify-migrations.sql`:

#### Query 1: Visa körda migrations
```sql
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC
LIMIT 50;
```
✅ **Spara resultatet** - vi behöver veta vilka migrations som saknas

#### Query 2: Kolla kritiska tabeller
```sql
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_mfa') 
    THEN '✅' ELSE '❌' END AS user_mfa,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_audit_logs') 
    THEN '✅' ELSE '❌' END AS user_audit_logs,
  -- ... etc
```
📝 **Notera vilka som är ❌**

#### Query 3: Kolla enums
```sql
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role_enum') 
    THEN '✅' ELSE '❌' END AS global_role_enum,
  -- ... etc
```
📝 **Notera vilka som är ❌**

#### Query 4 & 5: Kolla kolumner på tenants och user_tenant_memberships
Vi vet redan att `user_tenant_memberships` har rätt kolumner ✅  
Kolla `tenants` för att se om `type`, `status`, `demo_flag`, `metadata` finns.

---

### 2️⃣ Kör Saknade Migrations

Baserat på vad som saknas, kör motsvarande migrations:

| Om ❌ | Kör Migration | Fil |
|-------|--------------|-----|
| user_mfa, user_audit_logs, user_sessions, user_devices | Accounts Domain | `supabase/migrations/20251209120000_accounts_domain.sql` |
| tenant_settings, tenant_branding, tenant_invitations | Tenant Domain | `supabase/migrations/20251209100000_tenant_domain.sql` |
| billing_accounts | Billing | `supabase/migrations/20251209150000_billing_consolidation.sql` |
| global_role_enum | Roles | `supabase/migrations/20251208130000_role_enum_and_permissions.sql` |

**Hur köra:**
1. Öppna migration-filen i VS Code
2. Kopiera hela SQL-innehållet
3. Klistra in i Supabase SQL Editor
4. Kör (CTRL+Enter eller klicka Run)
5. Verifiera success ✅

---

### 3️⃣ Regenerera Types (LOKALT)

När alla migrations är körda:

```powershell
# Länka till ditt Supabase projekt (om ej gjort)
supabase link --project-ref <YOUR_PROJECT_REF>

# Regenerera types från remote
npm run db:types:remote
```

**Alternativt manuellt:**
1. Supabase Dashboard → Settings → API
2. Klicka "Generate TypeScript Types"
3. Kopiera allt
4. Ersätt innehållet i `types/supabase.ts`

---

### 4️⃣ Verifiera Type Check

```powershell
# Kör type check
npm run type-check

# Om errors kvarstår, kolla vilka
```

**Förväntad output efter regeneration:**
- Inga errors om `user_mfa`, `tenant_settings`, etc.
- Möjliga warnings om `as any` (det är OK, vi fixar snart)

---

### 5️⃣ Ta Bort 'as any' Casts (EFTER types är regenererade)

Vi hittade **30+ instanser** av `as any` som ska tas bort.

**Exempel-fix:**

**FÖRE:**
```typescript
const { data: mfaRow } = await (supabase as any)
  .from('user_mfa')
  .select('*')
```

**EFTER:**
```typescript
const { data: mfaRow } = await supabase
  .from('user_mfa')
  .select('*')
```

**Lista filer att fixa:**
```
app/utils/mfaGuard.ts
app/api/billing/tenants/[tenantId]/invoices/stripe/route.ts
app/api/billing/tenants/[tenantId]/stripe-customer/route.ts
app/api/tenants/[tenantId]/members/route.ts
app/api/tenants/[tenantId]/members/[userId]/route.ts
app/api/tenants/[tenantId]/settings/route.ts
app/api/tenants/route.ts
app/api/products/route.ts
app/api/plans/[planId]/route.ts
app/api/plans/[planId]/blocks/route.ts
app/api/plans/[planId]/blocks/[blockId]/route.ts
... och ~20 filer till
```

**Vi kan göra detta tillsammans** när types är regenererade!

---

### 6️⃣ Git Workflow

```powershell
# Kolla status
git status

# Add alla ändringar
git add .

# Kolla vad som ändrats
git diff --staged

# Commit
git commit -m "feat: fix type mismatches and remove as any casts

- Added type management documentation
- Created scripts for type regeneration and verification
- Fixed TenantAdminPage unused variable
- Added CI/CD type checks
- Added pre-commit hooks
- Updated ESLint config
- Removed all 'as any' casts after type regeneration"

# Push
git push origin main
```

---

## Sammanfattning av Vad Som Är Skapat

### ✅ Dokumentation
- `docs/reports/TYPE_MISMATCHES_ANALYSIS.md` - Fullständig analys av alla mismatches
- `docs/TYPE_MANAGEMENT.md` - Guide för type management
- `docs/MIGRATIONS.md` - Uppdaterad med type regeneration workflow
- `IMPLEMENTATION_GUIDE.md` (denna fil) - Steg-för-steg guide

### ✅ Scripts
- `scripts/verify-migrations.sql` - SQL för att verifiera databas
- `scripts/regenerate-types.ps1` - PowerShell script för type regeneration
- `scripts/find-any-casts.ps1` - Hitta alla 'as any' casts

### ✅ CI/CD & Hooks
- `.github/workflows/typecheck.yml` - GitHub Actions för type check
- `.husky/pre-commit` - Pre-commit hook för type validation
- `.husky/README.md` - Documentation för hooks

### ✅ Config Updates
- `package.json` - Nya scripts: `type-check`, `db:types:remote`, etc.
- `eslint.config.mjs` - Nya rules för att förhindra `any`

### ✅ Code Fixes
- `app/app/admin/tenant/TenantAdminPage.tsx` - Removed unused `settings` variable

---

## Checkboxes

Använd dessa för att hålla koll på progress:

### Databas Verifiering
- [ ] Kört Query 1 - Visa migrations
- [ ] Kört Query 2 - Kolla tabeller (notera ❌)
- [ ] Kört Query 3 - Kolla enums (notera ❌)
- [ ] Kört Query 4 - Kolla tenants kolumner
- [ ] Kört Query 5 - Kolla tenant_memberships kolumner

### Migrations
- [ ] Identifierat saknade migrations
- [ ] Kört `20251208130000_role_enum_and_permissions.sql` (om behövs)
- [ ] Kört `20251209100000_tenant_domain.sql` (om behövs)
- [ ] Kört `20251209120000_accounts_domain.sql` (om behövs)
- [ ] Kört `20251209150000_billing_consolidation.sql` (om behövs)
- [ ] Verifierat alla tabeller finns (alla ✅)

### Type Regeneration
- [ ] Länkat Supabase projekt (`supabase link`)
- [ ] Regenererat types (`npm run db:types:remote`)
- [ ] Kört `npm run type-check` - inga errors
- [ ] Verifierat `types/supabase.ts` innehåller nya tabeller

### Code Cleanup
- [ ] Identifierat alla 'as any' casts (~30 st)
- [ ] Tagit bort 'as any' i mfaGuard.ts
- [ ] Tagit bort 'as any' i billing routes
- [ ] Tagit bort 'as any' i tenant routes
- [ ] Tagit bort 'as any' i products routes
- [ ] Tagit bort 'as any' i plans routes
- [ ] Kört `npm run type-check` - inga errors
- [ ] Kört `npm run build` - success

### Git & Deploy
- [ ] Kört `git status`
- [ ] Kört `git add .`
- [ ] Kört `git commit` med beskrivande message
- [ ] Kört `git push origin main`
- [ ] Verifierat CI/CD pipeline går igenom

---

## Nästa Action

**DU ÄR HÄR → Kör SQL queries i Supabase Dashboard**

Dela resultaten så hjälper jag dig med nästa steg! 🚀
