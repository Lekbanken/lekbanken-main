# 🔐 Security Audit - TODO Tracker

> **Senast uppdaterad:** 2026-01-07  
> **Status:** Migration 007 KLAR ✅

---

## 📊 Övergripande Status

| Fas | Beskrivning | Status |
|-----|-------------|--------|
| Migration 000-003 | Core security (RLS, is_system_admin) | ✅ KLAR |
| Migration 004-005 | search_path hardening (33 funktioner) | ✅ KLAR |
| Migration 006 | Remaining SECURITY DEFINER (19 funktioner) | ✅ KLAR |
| Migration 007 | Critical policy fixes | ✅ KLAR |
| Migration 008 | Additional policy cleanup | 🔲 TODO |
| Migration 009 | Performance indexes | 🔲 TODO |
| Verifiering | Kör alla audit-frågor igen | 🔲 TODO |

---

## ✅ KLARA MIGRATIONER

### Migration 007 - Critical Policy Fixes ✅
**Commit:** `d433dfe`

| Åtgärd | Status |
|--------|--------|
| Ta bort `authenticated_can_insert_tenants` (WITH CHECK true) | ✅ |
| Fix `billing_history` → service_role | ✅ |
| Fix `friends` → service_role | ✅ |
| Fix `notification_log` → service_role | ✅ |
| Fix `notifications` → service_role | ✅ |
| Fix `participants` → service_role | ✅ |
| Fix `participant_activity_log` → service_role | ✅ |
| Fix `social_leaderboards` INSERT → service_role | ✅ |
| Fix `social_leaderboards` UPDATE → service_role | ✅ |
| Fix `subscriptions` → service_role | ✅ |
| Fix `trial_usage` INSERT → service_role | ✅ |
| Fix `trial_usage` UPDATE → service_role | ✅ |
| Fix `multiplayer_participants` UPDATE → service_role | ✅ |
| Ta bort `error_tracking_insert` (redundant) | ✅ |
| Ta bort `feature_usage_insert` (redundant) | ✅ |
| Ta bort `page_views_insert` (redundant) | ✅ |
| Ta bort `session_analytics_insert` (redundant) | ✅ |

**Verifiering:**
- ✅ `tenants` har nu bara EN INSERT-policy: `tenant_insert_authenticated`
- ✅ Endast `analytics_timeseries` har kvar `WITH CHECK (true)` (acceptabelt)

---

## 🔲 TODO: Migration 008 - Additional Policy Cleanup

### 8.1 Granska `tenant_insert_authenticated` policy
**Nuvarande villkor:** 
```sql
is_global_admin() OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
```

**Problem:** `auth.uid() IS NOT NULL` tillåter ALLA inloggade användare att skapa tenants.

**Förslag:** Begränsa till enbart:
- `is_global_admin()` - systemadmins
- `auth.role() = 'service_role'` - backend
- Eventuellt: Rate limiting via edge function

| Uppgift | Status |
|---------|--------|
| Beslut: Ska alla autentiserade kunna skapa tenants? | 🔲 BESLUT KRÄVS |
| Om nej: Uppdatera policy | 🔲 |

### 8.2 Redundanta SELECT-policies
Dessa tabeller har duplicerade SELECT-policies:

| Tabell | Policies | Åtgärd |
|--------|----------|--------|
| `products` | `products_select_all` (true), `authenticated_can_select_products` | 🔲 Ta bort en |
| `purposes` | `purposes_select_all` (true), `authenticated_can_select_purposes` | 🔲 Ta bort en |

### 8.3 Analytics-tabell med `true`
| Tabell | Policy | Åtgärd |
|--------|--------|--------|
| `analytics_timeseries` | `system_can_insert_timeseries` | ⚪ OK - ren analytics |

---

## 🔲 TODO: Migration 009 - Performance & Indexes

### 9.1 Kör Fråga 10 - Duplicate Indexes
```sql
SELECT a.indexname, b.indexname, a.tablename
FROM pg_indexes a
JOIN pg_indexes b ON a.indexdef = b.indexdef 
  AND a.indexname < b.indexname
WHERE a.schemaname = 'public';
```
| Uppgift | Status |
|---------|--------|
| Kör frågan | 🔲 |
| Analysera resultat | 🔲 |
| Skapa migration för att ta bort duplicat | 🔲 |

### 9.2 Kör Fråga 11 - FK utan Index
```sql
-- Se security-audit-queries.sql fråga 11
```
| Uppgift | Status |
|---------|--------|
| Kör frågan | 🔲 |
| Analysera resultat | 🔲 |
| Skapa index för viktiga FK | 🔲 |

### 9.3 Kör Fråga 8 - RLS utan policies
```sql
SELECT t.tablename FROM pg_tables t
WHERE t.schemaname = 'public' AND t.rowsecurity = true
AND NOT EXISTS (SELECT 1 FROM pg_policies p 
  WHERE p.schemaname = 'public' AND p.tablename = t.tablename);
```
| Uppgift | Status |
|---------|--------|
| Kör frågan | 🔲 |
| Analysera resultat | 🔲 |
| Lägg till policies eller inaktivera RLS | 🔲 |

---

## 🆕 FRAMTIDA FÖRSLAG

### F1. Lägg till Rate Limiting för Tenant Creation
- Edge function som begränsar antal tenants per user
- Förhindrar missbruk av tenant-skapande

### F2. Audit Logging
- Logga alla INSERT/UPDATE/DELETE på känsliga tabeller
- Använd triggers eller Supabase audit extension

### F3. Policy Performance Optimization
- Kontrollera om policies med subqueries kan optimeras
- Använd `auth.uid()` caching (initplan pattern)

### F4. Periodic Security Review
- Schemalägg månatlig körning av security-audit-queries.sql
- Sätt upp alerts för nya tabeller utan RLS

### F5. Row-Level Security för Views
- Granska alla views (fråga 3)
- Överväg SECURITY INVOKER vs DEFINER

### F6. Grant-review
- Kör fråga 6 regelbundet
- Säkerställ att `anon` role inte har för mycket access

---

## 📋 Checklista för varje Migration

Innan du markerar en migration som klar:

- [ ] Migration skapad i `supabase/migrations/`
- [ ] `npx supabase db push --linked` lyckades
- [ ] Verifieringsfrågor körda
- [ ] Git commit + push
- [ ] Denna fil uppdaterad

---

## 🔧 Kommandon

```bash
# Pusha ny migration
npx supabase db push --linked

# Visa migrationsstatus
npx supabase migration list --linked

# Git commit pattern
git add supabase/migrations/XXXXX.sql
git commit -m "security: <beskrivning>"
git push origin main
```

---

## 📝 Anteckningar

- **2026-01-07:** Migration 006 och 007 applicerade. Alla SECURITY DEFINER funktioner har nu search_path. Kritiska policy-sårbarheter fixade.
- `tenant_insert_authenticated` tillåter fortfarande alla autentiserade att skapa tenants - kräver affärsbeslut.

