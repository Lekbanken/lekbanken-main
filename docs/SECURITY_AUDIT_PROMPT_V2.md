# Supabase Security & Performance Advisor - Verifieringsprompt

## Bakgrund

Vi har applicerat migrationer 010-022 för att åtgärda säkerhets- och prestandavarningar från Supabase Performance Advisor. Nu behöver vi verifiera att alla åtgärder fungerat och identifiera eventuella kvarvarande problem.

## Kör följande queries i Supabase SQL Editor

### 1. Tabeller med RLS men utan policies

```sql
SELECT 
    t.tablename as "Tabell utan policies"
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
    AND p.tablename = t.tablename
)
ORDER BY t.tablename;
```

### 2. SECURITY DEFINER funktioner utan search_path

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%')
)
ORDER BY p.proname;
```

### 3. Policies som fortfarande använder auth.uid() utan initplan-wrapper

```sql
SELECT 
    tablename,
    policyname,
    cmd,
    LEFT(qual::text, 100) as using_clause
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    -- Letar efter auth.uid() som INTE är wrappat i (SELECT auth.uid())
    (qual::text ~ 'auth\.uid\(\)' AND qual::text NOT LIKE '%SELECT auth.uid()%')
    OR (with_check::text ~ 'auth\.uid\(\)' AND with_check::text NOT LIKE '%SELECT auth.uid()%')
)
ORDER BY tablename, policyname;
```

### 4. Tabeller med multipla permissive policies (samma operation)

```sql
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 2
ORDER BY policy_count DESC, tablename;
```

### 5. Policies med USING (true) eller NULL

```sql
SELECT 
    tablename,
    policyname,
    cmd,
    roles::text,
    qual::text as using_expr
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text = 'true'
    OR qual IS NULL
)
ORDER BY tablename, policyname;
```

### 6. Sammanfattning av RLS-status

```sql
SELECT 
    'Tabeller med RLS' as metric,
    COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
    'Tabeller utan RLS',
    COUNT(*)::text
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false
UNION ALL
SELECT 
    'Totalt antal policies',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'SECURITY DEFINER funktioner',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true;
```

---

## Förväntade resultat efter migrationer 010-022

| Query | Förväntat resultat |
|-------|-------------------|
| 1. Tabeller utan policies | 0 rader (alla RLS-tabeller har policies) |
| 2. SECURITY DEFINER utan search_path | 0 rader (alla har search_path) |
| 3. auth.uid() utan wrapper | 0 rader (alla använder SELECT auth.uid()) |
| 4. Multipla permissive policies | Max 1-2 per tabell/operation |
| 5. USING (true) policies | Endast för specifika admin/service-tabeller |

---

## Applicerade migrationer

| # | Fil | Åtgärd |
|---|-----|--------|
| 010 | security_definer_search_path.sql | Lade till search_path på alla SECURITY DEFINER funktioner |
| 011 | rls_force_all_tables.sql | Aktiverade RLS på alla tabeller |
| 012 | anon_restrictive_policies.sql | Begränsade anon-åtkomst |
| 013 | auth_uid_initplan_core.sql | Wrappade auth.uid() i core-tabeller |
| 014 | auth_uid_initplan_extended.sql | Wrappade auth.uid() i fler tabeller |
| 015 | consolidate_permissive_policies.sql | Konsoliderade dubbla policies |
| 016 | fix_to_text_array_safe_search_path.sql | Fixade to_text_array_safe search_path |
| 017 | ensure_rls_policies.sql | Lade till policies på 21 tabeller |
| 018 | auth_uid_initplan_batch1.sql | Wrappade auth.uid() batch 1 |
| 019 | auth_uid_initplan_batch2.sql | Wrappade auth.uid() batch 2 |
| 020 | auth_uid_initplan_batch3.sql | Wrappade auth.uid() batch 3 |
| 021 | consolidate_permissive_final.sql | Final konsolidering av policies |
| 022 | unused_index_review.sql | Dokumenterade unused index-beslut |

---

## Om du hittar kvarvarande problem

Kopiera resultatet från varje query och skicka det till mig. Inkludera:

1. **Query-nummer** (1-6)
2. **Antal rader** som returnerades
3. **Första 10 raderna** om det finns många resultat
4. **Eventuella felmeddelanden**

Jag kommer då skapa ytterligare migrationer för att åtgärda kvarvarande problem.
