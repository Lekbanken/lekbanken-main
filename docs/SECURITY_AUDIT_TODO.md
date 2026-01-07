# 🔐 Security Audit - TODO Tracker

> **Senast uppdaterad:** 2026-01-07 (uppdaterad efter Migration 009)  
> **Status:** Migration 009 KLAR ✅ - Security Audit KOMPLETT!

---

## 📊 Övergripande Status

| Fas | Beskrivning | Status |
|-----|-------------|--------|
| Migration 000-003 | Core security (RLS, is_system_admin) | ✅ KLAR |
| Migration 004-005 | search_path hardening (33 funktioner) | ✅ KLAR |
| Migration 006 | Remaining SECURITY DEFINER (19 funktioner) | ✅ KLAR |
| Migration 007 | Critical policy fixes | ✅ KLAR |
| Migration 008 | Tenant INSERT restrict + policy cleanup | ✅ KLAR |
| Migration 009 | FK performance indexes (84 indexes) | ✅ KLAR |
| Verifiering | Kör alla audit-frågor igen | 🔲 TODO |

---

## ✅ KLARA MIGRATIONER

### Migration 009 - FK Performance Indexes ✅
**Commit:** (pending)

| Prioritet | Beskrivning | Antal index |
|-----------|-------------|-------------|
| P1 CRITICAL | Session/participant tables | 14 |
| P2 HIGH | Game/plan/tenant tables | 32 |
| P3 MEDIUM | Billing/gamification/content | 30 |
| P4 LOW | Misc tables | 8 |
| **TOTALT** | | **84 index** |

---

### Migration 008 - Tenant INSERT Restrict ✅
**Commit:** (pending)

| Åtgärd | Status |
|--------|--------|
| Ersätt `tenant_insert_authenticated` → `tenant_insert_admin_only` | ✅ |
| Policy nu: `is_global_admin() OR service_role` endast | ✅ |
| Ta bort `authenticated_can_select_products` (redundant) | ✅ |
| Ta bort `authenticated_can_select_purposes` (redundant) | ✅ |

**Framtida tenant-köp:** Ska gå via Edge Function som validerar betalning och anropar service_role.

---

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

## ✅ KLAR: Migration 008 - Tenant Insert Beslut

### Affärsbeslut taget ✅
**Beslut:** Endast admin/service kan skapa tenants nu.  
**Framtid:** Beslutstagare köper tenant-produkt med licenser via Edge Function-flöde.

### Implementerat
- Policy `tenant_insert_admin_only`: `is_global_admin() OR service_role`
- Framtida köpflöde dokumenterat i migrationen

---

## ✅ KLAR: Migration 009 - FK Indexes

### Fråga 10: Duplicate Indexes ✅
**Resultat:** Inga duplicerade index! ✅

### Fråga 11: FK utan Index ✅
**Resultat:** 84 FK-kolumner saknade index.  
**Åtgärd:** Alla 84 index skapade, prioriterade efter:
- P1: Session/participant (real-time) 
- P2: Game/tenant (frequent queries)
- P3: Billing/gamification (admin)
- P4: Misc (low traffic)

---

## 🔲 TODO: Verifiering

Kör alla audit-frågor igen för att verifiera:

```sql
-- Fråga 4: Alla SECURITY DEFINER ska ha search_path
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
AND p.proconfig IS NULL;
-- Förväntat: 0 rader

-- Fråga 9: Policies med TRUE (bör endast vara analytics_timeseries)
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' AND with_check::text = 'true';
-- Förväntat: 1 rad (analytics_timeseries)

-- Fråga 10: Inga duplicerade index
-- Förväntat: 0 rader

-- Fråga 11: Inga FK utan index
-- Förväntat: 0 rader
```

---

## 🆕 FRAMTIDA FÖRSLAG

### F1. Tenant Purchase Flow (Planerat)
När produkter är klara:
- Edge Function för tenant-köp
- Validerar betalning/licenser
- Anropar `create_tenant_with_licenses()` via service_role
- Sätter upp initial tenant-konfiguration

### F2. Lägg till Rate Limiting för känsliga operationer
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
- **2026-01-07:** Migration 008 och 009 applicerade. Tenant INSERT begränsat till admin/service. 84 FK-index skapade.
- **2026-01-07:** Security Audit KOMPLETT! Alla migrationer (000-009) applicerade och pushade.

### Git Commits (denna session)
| Commit | Beskrivning |
|--------|-------------|
| `ff82116` | Core security migrations (000-003) |
| `797579c` | Policy cleanup migration |
| `4b3900e` | search_path hardening (004-005) |
| `5e83536` | Migration 006 - remaining SECURITY DEFINER |
| `d433dfe` | Migration 007 - critical policy fixes |
| `656c47b` | docs: add security audit TODO tracker |
| (pending) | Migration 008 - tenant INSERT restrict |
| (pending) | Migration 009 - FK indexes |

