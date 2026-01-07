-- =============================================================================
-- SECURITY AUDIT QUERIES - Copy/paste each section to Supabase SQL Editor
-- =============================================================================

-- =============================================
-- 1. TABLES WITH RLS STATUS
-- =============================================
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- =============================================
-- 2. ALL RLS POLICIES (with permissive analysis)
-- =============================================
SELECT 
    tablename,
    policyname,
    CASE WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as mode,
    roles::text,
    cmd,
    CASE 
        WHEN qual::text ILIKE '%true%' THEN '⚠️ TRUE CONDITION'
        WHEN qual IS NULL THEN '⚠️ NULL (allows all)'
        ELSE LEFT(qual::text, 80)
    END as using_condition,
    CASE 
        WHEN with_check::text ILIKE '%true%' THEN '⚠️ TRUE CONDITION'
        ELSE LEFT(with_check::text, 80)
    END as check_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =============================================
-- 3. SECURITY DEFINER VIEWS
-- =============================================
SELECT 
    c.relname as view_name,
    pg_catalog.pg_get_userbyid(c.relowner) as owner,
    CASE 
        WHEN c.relrowsecurity THEN '✅ RLS ON'
        ELSE '❌ No RLS (inherits caller)'
    END as security_context
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
AND n.nspname = 'public'
ORDER BY c.relname;

-- =============================================
-- 4. SECURITY DEFINER FUNCTIONS (dangerous)
-- =============================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN '🔴 SECURITY DEFINER'
        ELSE '✅ INVOKER'
    END as security_mode,
    p.proconfig as runtime_config,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ NO search_path SET'
        WHEN EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%') THEN '✅ search_path SET'
        ELSE '⚠️ NO search_path SET'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- =============================================
-- 5. ALL FUNCTIONS - search_path check
-- =============================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.proconfig as config,
    CASE 
        WHEN p.proconfig IS NULL THEN '⚠️ MUTABLE'
        WHEN EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%') THEN '✅ IMMUTABLE'
        ELSE '⚠️ MUTABLE'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY 
    CASE WHEN p.proconfig IS NULL THEN 0 ELSE 1 END,
    p.proname;

-- =============================================
-- 6. GRANTS TO anon AND authenticated
-- =============================================
SELECT 
    grantee,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

-- =============================================
-- 7. TABLES WITHOUT RLS (security risk)
-- =============================================
SELECT 
    tablename as "❌ TABLE WITHOUT RLS"
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;

-- =============================================
-- 8. TABLES WITH RLS BUT NO POLICIES
-- =============================================
SELECT 
    t.tablename as "⚠️ RLS ENABLED BUT NO POLICIES"
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
    AND p.tablename = t.tablename
);

-- =============================================
-- 9. POLICIES WITH TRUE/NULL CONDITIONS (open access)
-- =============================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles::text,
    qual::text as using_expr,
    with_check::text as check_expr
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text ILIKE '%true%'
    OR with_check::text ILIKE '%true%'
    OR qual IS NULL
)
ORDER BY tablename, policyname;

-- =============================================
-- 10. DUPLICATE INDEXES
-- =============================================
SELECT 
    a.indexname as index1,
    b.indexname as index2,
    a.tablename,
    a.indexdef as definition
FROM pg_indexes a
JOIN pg_indexes b 
    ON a.indexdef = b.indexdef 
    AND a.indexname < b.indexname
    AND a.schemaname = b.schemaname
WHERE a.schemaname = 'public';

-- =============================================
-- 11. FOREIGN KEY INDEXES CHECK
-- =============================================
WITH fk_columns AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
)
SELECT 
    fk.table_name,
    fk.column_name,
    fk.foreign_table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes i 
            WHERE i.schemaname = 'public' 
            AND i.tablename = fk.table_name 
            AND i.indexdef LIKE '%' || fk.column_name || '%'
        ) THEN '✅ INDEXED'
        ELSE '⚠️ NO INDEX'
    END as index_status
FROM fk_columns fk
ORDER BY index_status DESC, table_name, column_name;

-- =============================================
-- 12. POLICIES COUNT PER TABLE/OPERATION
-- =============================================
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 3 THEN '⚠️ MANY POLICIES'
        WHEN COUNT(*) > 1 THEN 'Multiple'
        ELSE 'Single'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;

-- =============================================
-- 13. AUTH.UID() USAGE IN POLICIES (initplan concern)
-- =============================================
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%auth.uid()%' THEN 'auth.uid() in USING'
        ELSE 'No auth.uid() in USING'
    END as using_has_auth,
    CASE 
        WHEN with_check::text LIKE '%auth.uid()%' THEN 'auth.uid() in CHECK'
        ELSE 'No auth.uid() in CHECK'
    END as check_has_auth
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text LIKE '%auth.uid()%' 
    OR with_check::text LIKE '%auth.uid()%'
)
ORDER BY tablename, policyname;
