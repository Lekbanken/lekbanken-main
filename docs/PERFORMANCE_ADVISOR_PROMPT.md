# Supabase Performance Advisor - Analysrapport

## Bakgrund

Security Advisor är nu tom (alla säkerhetsvarningar åtgärdade ✅), men Performance Advisor visar fortfarande ~300 varningar. Vi behöver analysera och kategorisera dessa.

## Kör följande queries i Supabase SQL Editor

### 1. Policies med auth.uid() (lint 0003 - initplan)

```sql
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%SELECT auth.uid()%' THEN '✅ Wrapped'
        WHEN qual::text LIKE '%auth.uid()%' THEN '❌ Not wrapped'
        ELSE '—'
    END as using_status,
    CASE 
        WHEN with_check::text LIKE '%SELECT auth.uid()%' THEN '✅ Wrapped'
        WHEN with_check::text LIKE '%auth.uid()%' THEN '❌ Not wrapped'
        ELSE '—'
    END as check_status
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text LIKE '%auth.uid()%' 
    OR with_check::text LIKE '%auth.uid()%'
)
ORDER BY 
    CASE WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%SELECT auth.uid()%' THEN 0 ELSE 1 END,
    tablename;
```

### 2. Unused indexes (lint 0005)

```sql
SELECT 
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan < 50
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
LIMIT 50;
```

### 3. Multiple permissive policies (lint 0006)

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
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename
LIMIT 30;
```

### 4. Tables without RLS policies (lint 0008)

```sql
SELECT 
    t.tablename,
    CASE WHEN t.rowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END as rls_status,
    COALESCE(p.policy_count, 0) as policy_count
FROM pg_tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND (NOT t.rowsecurity OR COALESCE(p.policy_count, 0) = 0)
ORDER BY t.tablename;
```

### 5. Functions without search_path (lint 0011)

```sql
SELECT 
    p.proname as function_name,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'INVOKER' END as security,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ No config'
        WHEN EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%') THEN '✅ Has search_path'
        ELSE '❌ No search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%')
)
ORDER BY p.prosecdef DESC, p.proname
LIMIT 50;
```

### 6. Tables with bloat (lint för table/index bloat)

```sql
SELECT
    schemaname,
    relname as table_name,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    CASE WHEN n_live_tup > 0 
        THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) 
        ELSE 0 
    END as dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND n_dead_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### 7. Missing indexes on foreign keys (lint 0009)

```sql
WITH fk_columns AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
)
SELECT 
    fk.table_name,
    fk.column_name,
    fk.foreign_table_name
FROM fk_columns fk
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes i 
    WHERE i.schemaname = 'public' 
    AND i.tablename = fk.table_name 
    AND i.indexdef LIKE '%' || fk.column_name || '%'
)
ORDER BY fk.table_name, fk.column_name
LIMIT 50;
```

### 8. Sammanfattning - Advisor varningar per kategori

```sql
WITH policy_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%SELECT auth.uid()%') as unwrapped_auth_uid,
        COUNT(*) FILTER (WHERE with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%SELECT auth.uid()%') as unwrapped_auth_uid_check
    FROM pg_policies WHERE schemaname = 'public'
),
multipolicy_stats AS (
    SELECT COUNT(*) as tables_with_multiple_policies
    FROM (
        SELECT tablename, cmd
        FROM pg_policies 
        WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
        GROUP BY tablename, cmd
        HAVING COUNT(*) > 1
    ) sub
),
function_stats AS (
    SELECT COUNT(*) as functions_without_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'))
),
index_stats AS (
    SELECT COUNT(*) as unused_indexes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' AND idx_scan < 50
)
SELECT 'auth.uid() utan wrapper (USING)' as category, unwrapped_auth_uid as count FROM policy_stats
UNION ALL
SELECT 'auth.uid() utan wrapper (CHECK)', unwrapped_auth_uid_check FROM policy_stats
UNION ALL
SELECT 'Tabeller med >1 permissive policy', tables_with_multiple_policies FROM multipolicy_stats
UNION ALL
SELECT 'Funktioner utan search_path', functions_without_search_path FROM function_stats
UNION ALL
SELECT 'Oanvända index (<50 scans)', unused_indexes FROM index_stats;
```

---

## Skicka tillbaka resultaten

Kopiera output från **Query 8** först (sammanfattningen), sedan relevanta detaljer från de andra queries om någon kategori har höga siffror.

Jag kommer sedan:
1. Analysera vilka varningar som är verkliga problem vs acceptabla
2. Skapa migrationer för de som behöver åtgärdas
3. Dokumentera de som ska ignoreras (t.ex. oanvända index för framtida features)
