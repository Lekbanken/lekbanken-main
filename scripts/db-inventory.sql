-- =============================================================================
-- DATABASE INVENTORY - READ ONLY
-- =============================================================================

-- 1. TABLES WITH RLS STATUS
SELECT 'TABLES_RLS' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. ALL RLS POLICIES
SELECT 'RLS_POLICIES' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text,
    cmd,
    qual as using_expr,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3. VIEWS WITH SECURITY CONTEXT
SELECT 'VIEWS' as section;
SELECT 
    n.nspname as schema,
    c.relname as view_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_rewrite r
            WHERE r.ev_class = c.oid
            AND r.ev_type = '1'
        ) THEN 'EXISTS'
        ELSE 'NONE'
    END as has_rules,
    pg_get_viewdef(c.oid, true) as view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
AND n.nspname = 'public'
ORDER BY c.relname;

-- 4. FUNCTIONS WITH SECURITY SETTINGS
SELECT 'FUNCTIONS' as section;
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosecdef as security_definer,
    p.proconfig as config,
    CASE 
        WHEN p.proconfig IS NULL THEN 'NOT_SET'
        WHEN 'search_path=' = ANY(p.proconfig) THEN 'EMPTY'
        WHEN EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%') THEN 'SET'
        ELSE 'NOT_SET'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 5. GRANTS ON PUBLIC SCHEMA OBJECTS
SELECT 'GRANTS' as section;
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 6. FOREIGN KEYS
SELECT 'FOREIGN_KEYS' as section;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. ALL INDEXES
SELECT 'INDEXES' as section;
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. TABLES WITH RLS ENABLED BUT NO POLICIES
SELECT 'RLS_NO_POLICY' as section;
SELECT 
    t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.schemaname = 'public' 
    AND p.tablename = t.tablename
);

-- 9. POLICIES WITH TRUE CONDITIONS (potential security issue)
SELECT 'PERMISSIVE_TRUE_POLICIES' as section;
SELECT 
    tablename,
    policyname,
    cmd,
    roles::text,
    qual as using_expr,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text ILIKE '%true%'
    OR with_check::text ILIKE '%true%'
)
ORDER BY tablename, policyname;

-- 10. SECURITY DEFINER FUNCTIONS
SELECT 'SECURITY_DEFINER_FUNCTIONS' as section;
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- 11. DUPLICATE INDEXES (same definition)
SELECT 'DUPLICATE_INDEXES' as section;
SELECT 
    a.indexname as index1,
    b.indexname as index2,
    a.tablename,
    a.indexdef
FROM pg_indexes a
JOIN pg_indexes b ON a.indexdef = b.indexdef AND a.indexname < b.indexname
WHERE a.schemaname = 'public';

-- 12. TABLES WITHOUT RLS (in public schema)
SELECT 'TABLES_WITHOUT_RLS' as section;
SELECT 
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;
