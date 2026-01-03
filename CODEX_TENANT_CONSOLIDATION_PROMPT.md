# CODEX PROMPT: Tenant/Membership Naming Consolidation & RLS Audit

## BAKGRUND

Det finns en historisk inkonsistens i namngivningen av tenant-relaterade tabeller och funktioner i projektet. Detta orsakar RLS-problem och förvirring. Vissa migrations refererar till `tenant_memberships` (som är en VIEW) medan koden använder `user_tenant_memberships` (som är den faktiska tabellen).

## UPPGIFT

Gör en **fullständig kartläggning och konsolidering** av alla tenant/membership-relaterade namn i:
1. Supabase migrations (SQL)
2. TypeScript/React-kod
3. Supabase-genererade typer
4. RLS policies

## STEG 1: KARTLÄGGNING

### 1.1 Databas-strukturer (kör dessa queries i Supabase SQL Editor)

```sql
-- Lista alla tabeller och vyer med tenant/membership i namnet
SELECT 
  schemaname,
  tablename,
  tableowner,
  CASE 
    WHEN schemaname = 'public' THEN 
      (SELECT relkind FROM pg_class WHERE relname = tablename LIMIT 1)
    ELSE 'unknown'
  END as type
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE '%tenant%' OR tablename LIKE '%membership%')
ORDER BY tablename;

-- Lista alla vyer
SELECT schemaname, viewname 
FROM pg_views 
WHERE schemaname = 'public'
AND (viewname LIKE '%tenant%' OR viewname LIKE '%membership%');

-- Lista alla RLS policies på tenant-relaterade tabeller
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (tablename LIKE '%tenant%' OR tablename LIKE '%membership%')
ORDER BY tablename, policyname;

-- Lista alla funktioner som refererar till tenant/membership
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
  p.proname LIKE '%tenant%' 
  OR p.proname LIKE '%membership%'
  OR pg_get_functiondef(p.oid) LIKE '%tenant_memberships%'
  OR pg_get_functiondef(p.oid) LIKE '%user_tenant_memberships%'
);

-- Kontrollera is_system_admin funktionen
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_system_admin';

-- Kontrollera get_user_tenant_ids funktionen  
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_user_tenant_ids';

-- Kontrollera has_tenant_role funktionen
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'has_tenant_role';

-- Kontrollera is_tenant_member funktionen
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_tenant_member';
```

### 1.2 Kodbas-sökning

Sök i följande mappar och filer:

```bash
# Migrations
grep -r "tenant_memberships\|user_tenant_memberships" supabase/migrations/ --include="*.sql"

# TypeScript/TSX
grep -r "tenant_memberships\|user_tenant_memberships" app/ lib/ features/ components/ --include="*.ts" --include="*.tsx"

# Types
grep -r "tenant_memberships\|user_tenant_memberships" types/ --include="*.ts"
```

## STEG 2: IDENTIFIERA PROBLEMOMRÅDEN

Baserat på kartläggningen, identifiera:

1. **Namninkonsistenser**: Var används `tenant_memberships` vs `user_tenant_memberships`?
2. **RLS-luckor**: Vilka tabeller saknar policies för `is_system_admin()`?
3. **Funktionsreferenser**: Refererar funktioner till fel tabellnamn?
4. **Typ-mismatchar**: Stämmer TypeScript-typer med faktiska databasstrukturer?

## STEG 3: KONSOLIDERINGSPLAN

### 3.1 Bestäm kanoniskt namn

Rekommendation: Använd `user_tenant_memberships` som det kanoniska namnet eftersom:
- Det är mer beskrivande (visar att det är en M:M mellan users och tenants)
- Det används i 64 ställen i koden vs 9 för `tenant_memberships`
- Det är den faktiska tabellen (inte vyn)

### 3.2 Skapa konsolideringsmigration

Skapa en migration som:
1. Säkerställer att `user_tenant_memberships` är den faktiska tabellen
2. Säkerställer att `tenant_memberships` är en vy som pekar på tabellen
3. Lägger till saknade RLS policies för `is_system_admin()`
4. Uppdaterar alla funktioner att referera till rätt tabellnamn

## STEG 4: RLS POLICY AUDIT

Kontrollera att följande tabeller har korrekta policies:

### Tabeller som MÅSTE ha `is_system_admin()` bypass:

| Tabell | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `users` | ✓ system_admin | - | - | - |
| `tenants` | ✓ system_admin | ✓ system_admin | ✓ system_admin | ✓ system_admin |
| `user_tenant_memberships` | ✓ system_admin | ✓ system_admin | ✓ system_admin | ✓ system_admin |
| `games` | ✓ (via admins_can_read_all_games) | - | - | - |
| `products` | ✓ system_admin | ✓ system_admin | ✓ system_admin | - |
| `purposes` | Public read | - | - | - |

### Policies att skapa/verifiera:

```sql
-- Template för system_admin policies
CREATE POLICY "system_admin_full_access_{TABLE}"
ON {TABLE} FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());
```

## STEG 5: IMPLEMENTATION

### 5.1 Skapa konsolideringsmigration

Filnamn: `supabase/migrations/YYYYMMDDHHMMSS_consolidate_tenant_naming.sql`

Innehåll ska:
1. Dokumentera alla ändringar
2. Vara idempotent (säker att köra flera gånger)
3. Hantera edge cases (tabellen vs vy)
4. Uppdatera alla relaterade funktioner
5. Lägga till alla saknade RLS policies

### 5.2 Uppdatera TypeScript-typer

Om nödvändigt, regenerera Supabase-typer:
```bash
npx supabase gen types typescript --local > types/supabase.ts
```

### 5.3 Testa

1. Logga in som system_admin
2. Verifiera access till:
   - `/admin/organisations` (tenants)
   - `/admin/users` (user_tenant_memberships + users)
   - `/admin/licenses` (tenants + user_tenant_memberships)
3. Kör befintliga e2e-tester:
   ```bash
   npx playwright test tests/e2e/admin-auth.spec.ts
   ```

## FILER ATT GRANSKA

### Migrations (prioritetsordning):
1. `supabase/migrations/20251129000000_initial_schema.sql` - Grundschema
2. `supabase/migrations/20251209120000_accounts_domain.sql` - Skapar view-logiken
3. `supabase/migrations/20251209103000_tenant_rls_hardening.sql` - RLS policies
4. `supabase/migrations/20251209100000_tenant_domain.sql` - Fler tenant-tabeller
5. `supabase/migrations/20260103150000_fix_is_system_admin_jwt_check.sql` - Nyligen skapad
6. `supabase/migrations/20260103160000_fix_orphaned_user_profiles.sql` - Nyligen skapad
7. `supabase/migrations/20260103170000_fix_admin_rls_policies.sql` - Nyligen skapad (FEL - refererar till tabell som är vy)

### Kodfiler:
1. `lib/utils/tenantAuth.ts` - isSystemAdmin implementation
2. `lib/auth/server-context.ts` - Hämtar memberships
3. `lib/context/TenantContext.tsx` - Tenant state management
4. `app/actions/tenant.ts` - Server actions för tenant
5. `features/admin/users/UserAdminPage.tsx` - Användaradmin
6. `features/admin/organisations/OrganisationAdminPage.tsx` - Organisationsadmin
7. `features/admin/shared/hooks/useRbac.ts` - Permission checking

### Typfiler:
1. `types/supabase.ts` - Auto-genererade typer
2. `types/tenant.ts` - Manuella tenant-typer
3. `types/auth.ts` - Auth-relaterade typer

## FÖRVÄNTAD OUTPUT

Efter att Codex kört denna prompt ska följande finnas:

1. **Kartläggningsdokument** - Fullständig lista över alla inkonsekvenser
2. **Konsolideringsmigration** - SQL-fil som löser alla databasrelaterade problem
3. **Eventuella kodändringar** - Om TypeScript-filer behöver uppdateras
4. **Testplan** - Steg för att verifiera att allt fungerar

## VIKTIGT

- **Ingen genvägar** - Varje ändring ska vara genomtänkt
- **Idempotens** - Migrations ska kunna köras flera gånger utan problem
- **Bakåtkompatibilitet** - Befintlig kod ska fortsätta fungera
- **Dokumentation** - Alla ändringar ska vara väldokumenterade i migrationsfilen
