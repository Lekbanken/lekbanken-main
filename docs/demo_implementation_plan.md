# Lekbanken Demo-läge - Detaljerad Implementeringsplan
**Version:** 1.0
**Datum:** 2026-01-13
**Estimerad tid:** 136 timmar (17 arbetsdagar)
**Team:** 1 Senior Full-Stack Developer

---

## 📋 Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Sprint 1: Foundation & Database](#sprint-1-foundation--database)
3. [Sprint 2: Authentication & Security](#sprint-2-authentication--security)
4. [Sprint 3: User Experience & UI](#sprint-3-user-experience--ui)
5. [Sprint 4: Content Curation & Polish](#sprint-4-content-curation--polish)
6. [Sprint 5: Monitoring & Launch](#sprint-5-monitoring--launch)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## 🎯 Implementation Overview

### Delivery Schedule

| Sprint | Focus | Duration | Deliverables |
|--------|-------|----------|-------------|
| Sprint 1 | Database & Infrastructure | 1 vecka (40h) | Migrations, RLS, Seeds |
| Sprint 2 | Auth & Security | 1 vecka (32h) | Demo auth flow, API protection |
| Sprint 3 | UI/UX | 1 vecka (24h) | Components, banner, gates |
| Sprint 4 | Content & Polish | 1 vecka (24h) | Curated content, onboarding |
| Sprint 5 | Monitoring & Launch | 1 vecka (16h) | Analytics, deploy, QA |

### File Creation Summary

**New Files to Create:** 31
**Existing Files to Modify:** 6
**Total LOC (Lines of Code):** ~2,500

---

## 🗄️ Sprint 1: Foundation & Database

**Duration:** 40 hours (5 days)
**Objective:** Create database infrastructure for demo functionality

### Day 1-2: Database Migrations (16h)

#### File 1: Add `is_demo_content` Column

**Path:** `supabase/migrations/20260113100000_add_demo_content_flag.sql`

```sql
-- Migration: Add demo content flag to activities
-- Purpose: Mark activities that should be visible in demo mode
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Add is_demo_content column to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS is_demo_content BOOLEAN DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_activities_demo_content
ON activities(is_demo_content)
WHERE is_demo_content = true;

-- Add comment for documentation
COMMENT ON COLUMN activities.is_demo_content IS
'Indicates if this activity should be shown in demo mode. Only activities with this flag set to true are visible to demo users.';

COMMIT;
```

**Testing:**
```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'activities' AND column_name = 'is_demo_content';

-- Verify index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'activities' AND indexname = 'idx_activities_demo_content';
```

#### File 2: Demo User Pool Enhancement

**Path:** `supabase/migrations/20260113110000_demo_user_pool.sql`

```sql
-- Migration: Enhance profiles for demo user pool
-- Purpose: Track demo user usage and enable rotation
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Add demo user tracking columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_demo_user BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_session_count INTEGER DEFAULT 0;

-- Create index for finding available demo users
CREATE INDEX IF NOT EXISTS idx_profiles_demo_users
ON profiles(is_demo_user, demo_last_used_at)
WHERE is_demo_user = true;

-- Add comments
COMMENT ON COLUMN profiles.is_demo_user IS
'Indicates if this profile is part of the demo user pool';

COMMENT ON COLUMN profiles.demo_last_used_at IS
'Timestamp of when this demo user was last assigned to a demo session';

COMMENT ON COLUMN profiles.demo_session_count IS
'Total number of times this demo user has been used';

-- Create function to get next available demo user
CREATE OR REPLACE FUNCTION get_next_demo_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find least recently used demo user with row-level locking
  SELECT id INTO user_id
  FROM profiles
  WHERE is_demo_user = true
  ORDER BY COALESCE(demo_last_used_at, '1970-01-01'::timestamptz) ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no user found, return NULL
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Update usage metadata
  UPDATE profiles
  SET
    demo_last_used_at = now(),
    demo_session_count = demo_session_count + 1,
    updated_at = now()
  WHERE id = user_id;

  RETURN user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_demo_user() TO authenticated;

COMMIT;
```

**Testing:**
```sql
-- Test the function
SELECT get_next_demo_user();

-- Verify it updates the timestamp
SELECT id, demo_last_used_at, demo_session_count
FROM profiles
WHERE is_demo_user = true
ORDER BY demo_last_used_at DESC;
```

#### File 3: Demo Session Tracking Table

**Path:** `supabase/migrations/20260113120000_demo_sessions_table.sql`

```sql
-- Migration: Create demo_sessions table
-- Purpose: Track demo sessions for analytics and cleanup
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Create demo_sessions table
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  ended_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  conversion_plan TEXT,
  features_used JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_demo_sessions_user_id ON demo_sessions(user_id);
CREATE INDEX idx_demo_sessions_tenant_id ON demo_sessions(tenant_id);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions(expires_at) WHERE ended_at IS NULL;
CREATE INDEX idx_demo_sessions_converted ON demo_sessions(converted, created_at);
CREATE INDEX idx_demo_sessions_ended ON demo_sessions(ended_at) WHERE ended_at IS NOT NULL;

-- Enable RLS
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own demo sessions
CREATE POLICY "Users can view own demo sessions"
ON demo_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Service role can do anything (for cleanup)
CREATE POLICY "Service role has full access"
ON demo_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to add feature usage
CREATE OR REPLACE FUNCTION add_demo_feature_usage(
  session_id UUID,
  feature_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE demo_sessions
  SET
    features_used = features_used || jsonb_build_object(
      'feature', feature_name,
      'timestamp', now()
    ),
    updated_at = now()
  WHERE id = session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_demo_feature_usage(UUID, TEXT) TO authenticated;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_demo_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER demo_sessions_updated_at
BEFORE UPDATE ON demo_sessions
FOR EACH ROW
EXECUTE FUNCTION update_demo_sessions_updated_at();

COMMIT;
```

**Testing:**
```sql
-- Verify table exists
SELECT * FROM demo_sessions LIMIT 0;

-- Test feature tracking function
INSERT INTO demo_sessions (user_id, tenant_id)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM tenants LIMIT 1)
)
RETURNING id;

-- Use the returned ID
SELECT add_demo_feature_usage('<session-id>', 'browse_activities');

-- Verify it was added
SELECT features_used FROM demo_sessions WHERE id = '<session-id>';
```

### Day 3: RLS Policies (8h)

#### File 4: Demo RLS Policies

**Path:** `supabase/migrations/20260113130000_demo_rls_policies.sql`

```sql
-- Migration: RLS policies for demo protection
-- Purpose: Enforce demo restrictions at database level
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- ============================================================================
-- TENANT PROTECTION
-- ============================================================================

-- Policy: Block updates to demo tenants (except system_admin)
DROP POLICY IF EXISTS "demo_tenant_write_protection" ON tenants;
CREATE POLICY "demo_tenant_write_protection"
ON tenants
FOR UPDATE
TO authenticated
USING (
  -- Allow if NOT a demo tenant
  demo_flag = false
  -- OR if user is system_admin
  OR (
    SELECT global_role FROM profiles WHERE id = auth.uid()
  ) = 'system_admin'
);

-- Policy: Block deletes of demo tenants (except system_admin)
DROP POLICY IF EXISTS "demo_tenant_delete_protection" ON tenants;
CREATE POLICY "demo_tenant_delete_protection"
ON tenants
FOR DELETE
TO authenticated
USING (
  demo_flag = false
  OR (
    SELECT global_role FROM profiles WHERE id = auth.uid()
  ) = 'system_admin'
);

-- ============================================================================
-- CONTENT ACCESS CONTROL
-- ============================================================================

-- Policy: Demo users can only see curated content
DROP POLICY IF EXISTS "demo_content_access" ON activities;
CREATE POLICY "demo_content_access"
ON activities
FOR SELECT
TO authenticated
USING (
  -- Check if user is in a demo tenant
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM tenants t
      JOIN memberships m ON m.tenant_id = t.id
      WHERE t.demo_flag = true
        AND m.user_id = auth.uid()
    )
    THEN
      -- Demo users: Only show demo-approved global content or own tenant content
      (
        (is_global = true AND is_demo_content = true)
        OR
        tenant_id IN (
          SELECT m.tenant_id
          FROM memberships m
          WHERE m.user_id = auth.uid()
        )
      )
    ELSE
      -- Normal users: Show all content they have access to
      (
        tenant_id IN (
          SELECT m.tenant_id
          FROM memberships m
          WHERE m.user_id = auth.uid()
        )
        OR is_global = true
      )
  END
);

-- ============================================================================
-- DEMO USER PROTECTION
-- ============================================================================

-- Policy: Prevent modification of is_demo_user flag
DROP POLICY IF EXISTS "demo_user_flag_protection" ON profiles;
CREATE POLICY "demo_user_flag_protection"
ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Can update own profile EXCEPT is_demo_user flag
  (
    id = auth.uid()
    AND is_demo_user = (SELECT is_demo_user FROM profiles WHERE id = auth.uid())
  )
  -- OR system admin can do anything
  OR (
    SELECT global_role FROM profiles WHERE id = auth.uid()
  ) = 'system_admin'
);

-- ============================================================================
-- SESSION ISOLATION
-- ============================================================================

-- Assuming you have a 'sessions' table for game/workshop sessions
-- (Adjust table name if different)

-- Policy: Demo users cannot create public sessions
DROP POLICY IF EXISTS "demo_no_public_sessions" ON sessions;
CREATE POLICY "demo_no_public_sessions"
ON sessions
FOR INSERT
TO authenticated
WITH CHECK (
  -- If user is demo user
  CASE
    WHEN EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_demo_user = true
    )
    THEN
      -- Must NOT be public visibility
      visibility != 'public'
    ELSE
      true
  END
);

COMMIT;
```

**Testing:**
```sql
-- Test 1: Demo user tries to modify demo tenant
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<demo-user-uuid>", "role": "authenticated"}';

UPDATE tenants SET name = 'Hacked' WHERE demo_flag = true;
-- Expected: ERROR - policy violation

RESET ROLE;

-- Test 2: Demo user tries to see non-demo content
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<demo-user-uuid>", "role": "authenticated"}';

SELECT COUNT(*) FROM activities WHERE is_demo_content = false AND is_global = true;
-- Expected: 0

RESET ROLE;

-- Test 3: System admin can modify demo tenant
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin-uuid>", "role": "authenticated"}';
-- Where admin-uuid has global_role = 'system_admin'

UPDATE tenants SET name = 'Demo Tenant Updated' WHERE demo_flag = true;
-- Expected: SUCCESS

RESET ROLE;
```

### Day 4: Seed Data (12h)

#### File 5: Create Demo Tenant

**Path:** `supabase/seeds/01_demo_tenant.sql`

```sql
-- Seed: Create demo tenant
-- Purpose: Initialize the main demo tenant
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Create demo tenant (idempotent)
INSERT INTO tenants (
  id,
  name,
  slug,
  type,
  status,
  demo_flag,
  settings,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for consistency
  'Lekbanken Demo',
  'demo',
  'demo',
  'demo',
  true,
  jsonb_build_object(
    'is_demo', true,
    'content_access', 'curated',
    'max_users', 10,
    'features_enabled', ARRAY['browse', 'play', 'planner', 'gamification'],
    'restrictions', ARRAY['no_export', 'no_billing', 'no_invites', 'readonly_settings']
  ),
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  demo_flag = EXCLUDED.demo_flag,
  settings = EXCLUDED.settings,
  updated_at = now();

-- Verify
SELECT id, name, slug, demo_flag
FROM tenants
WHERE id = '00000000-0000-0000-0000-000000000001';

COMMIT;
```

#### File 6: Create Demo User Pool

**Path:** `supabase/seeds/02_demo_users.sql`

```sql
-- Seed: Create demo user pool
-- Purpose: Pre-create demo users for rotation
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Note: This script creates users in auth.users and profiles
-- Passwords should be stored in environment variables

-- Create demo users (10 users)
DO $$
DECLARE
  demo_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
  demo_user_password TEXT := current_setting('app.demo_user_password', true);
  user_record RECORD;
  i INTEGER;
BEGIN
  -- Loop to create 10 demo users
  FOR i IN 1..10 LOOP
    -- Insert into auth.users (requires service role or admin)
    -- This should ideally be done via Supabase Auth API
    -- For seed purposes, we'll create profiles and assume auth users exist

    -- Create profile
    INSERT INTO profiles (
      id,
      email,
      display_name,
      is_demo_user,
      global_role,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'demo-user-' || i || '@demo.lekbanken.internal',
      'Demo User ' || i,
      true,
      'demo_private_user',
      now(),
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      is_demo_user = true,
      updated_at = now()
    RETURNING * INTO user_record;

    -- Create membership in demo tenant
    INSERT INTO memberships (
      user_id,
      tenant_id,
      role,
      created_at
    )
    VALUES (
      user_record.id,
      demo_tenant_id,
      'demo_org_user',
      now()
    )
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    RAISE NOTICE 'Created demo user %: % (%)', i, user_record.email, user_record.id;
  END LOOP;
END $$;

-- Verify
SELECT id, email, display_name, is_demo_user
FROM profiles
WHERE is_demo_user = true;

COMMIT;
```

**Note:** For actual auth user creation, you'll need to use Supabase Admin API:

**Path:** `scripts/create-demo-auth-users.ts`

```typescript
// Script to create demo auth users via Supabase Admin API
// Run with: npx tsx scripts/create-demo-auth-users.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key
);

async function createDemoAuthUsers() {
  const demoPassword = process.env.DEMO_USER_PASSWORD!;

  for (let i = 1; i <= 10; i++) {
    const email = `demo-user-${i}@demo.lekbanken.internal`;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: demoPassword,
      email_confirm: true, // Auto-confirm
      user_metadata: {
        display_name: `Demo User ${i}`,
        is_demo_user: true
      }
    });

    if (error) {
      console.error(`Error creating ${email}:`, error);
    } else {
      console.log(`✅ Created ${email} (${data.user?.id})`);
    }
  }
}

createDemoAuthUsers();
```

#### File 7: Curate Demo Content

**Path:** `supabase/seeds/03_demo_content.sql`

```sql
-- Seed: Curate demo activities
-- Purpose: Flag selected activities as demo-visible
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Strategy: Select best activities from each category
-- Total: 18 activities (adjust based on your data)

UPDATE activities
SET is_demo_content = true
WHERE name IN (
  -- Icebreakers (3)
  'Leken om hatten',
  'Fruktsallad',
  'Två sanningar och en lögn',

  -- Energizers (3)
  'Energi-cirkeln',
  'Klapp-kedjan',
  'Rysningen',

  -- Team building (4)
  'Tidskapseln',
  'Byggbron',
  'Kreativ problemlösning',
  'Förtroendecirkel',

  -- Reflection (2)
  'Fem fingrar',
  'Dagboksskrivning',

  -- Problem solving (3)
  'Escape Room Light',
  'Mysterieboxen',
  'Logik-utmaningen',

  -- Creative (3)
  'Improvisationsteater',
  'Berättelsestafett',
  'Konst-skapande'
)
AND is_global = true;

-- Verify count
SELECT COUNT(*) as demo_activities_count
FROM activities
WHERE is_demo_content = true;
-- Expected: 18

-- Show what was selected
SELECT name, category, is_demo_content
FROM activities
WHERE is_demo_content = true
ORDER BY category, name;

COMMIT;
```

**Manual Curation Needed:**
Replace the activity names with actual names from your database:

```sql
-- Find top activities by usage
SELECT name, category, COUNT(*) as usage_count
FROM activities
WHERE is_global = true
GROUP BY name, category
ORDER BY usage_count DESC
LIMIT 20;
```

#### File 8: Demo Session Templates

**Path:** `supabase/seeds/04_demo_sessions.sql`

```sql
-- Seed: Create demo session templates
-- Purpose: Pre-made sessions for demo users to explore
-- Author: Demo Implementation Team
-- Date: 2026-01-13

BEGIN;

-- Create a demo facilitator user
INSERT INTO profiles (
  id,
  email,
  display_name,
  is_demo_user,
  global_role,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'demo-facilitator@demo.lekbanken.internal',
  'Demo Facilitator',
  true,
  'demo_private_user',
  now()
)
ON CONFLICT (email) DO NOTHING;

-- Session 1: Teambuilding Workshop
INSERT INTO sessions (
  id,
  tenant_id,
  name,
  description,
  created_by,
  status,
  visibility,
  settings
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001', -- Demo tenant
  'Team Building Workshop',
  'En komplett 90-minuters workshop för teambuilding med 5 aktiviteter',
  '00000000-0000-0000-0000-000000000099', -- Demo facilitator
  'template',
  'private',
  jsonb_build_object(
    'duration_minutes', 90,
    'participants_min', 5,
    'participants_max', 20,
    'is_demo', true,
    'tags', ARRAY['teambuilding', 'workshop', 'demo']
  )
);

-- Session 2: Icebreaker Collection
INSERT INTO sessions (
  id,
  tenant_id,
  name,
  description,
  created_by,
  status,
  visibility,
  settings
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'Icebreaker Collection',
  '5 snabba icebreakers för att komma igång',
  '00000000-0000-0000-0000-000000000099',
  'template',
  'private',
  jsonb_build_object(
    'duration_minutes', 30,
    'participants_min', 3,
    'participants_max', 30,
    'is_demo', true,
    'tags', ARRAY['icebreaker', 'quick', 'demo']
  )
);

-- Session 3: Energizers
INSERT INTO sessions (
  id,
  tenant_id,
  name,
  description,
  created_by,
  status,
  visibility,
  settings
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'Energy Boost Session',
  '3 energizers för att höja energin i gruppen',
  '00000000-0000-0000-0000-000000000099',
  'template',
  'private',
  jsonb_build_object(
    'duration_minutes', 15,
    'participants_min', 5,
    'participants_max', 50,
    'is_demo', true,
    'tags', ARRAY['energizer', 'quick', 'demo']
  )
);

-- Verify
SELECT name, status, settings->>'duration_minutes' as duration
FROM sessions
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

COMMIT;
```

### Day 5: Environment & Configuration (4h)

#### File 9: Environment Variables

**Path:** `.env.example` (MODIFY)

```bash
# ... existing variables ...

# ============================================================================
# DEMO MODE CONFIGURATION
# ============================================================================

# Demo user shared password (use strong password in production)
DEMO_USER_PASSWORD=your-secure-demo-password-here

# Demo tenant ID (should match seed data)
DEMO_TENANT_ID=00000000-0000-0000-0000-000000000001

# Demo session timeout in milliseconds (default: 2 hours)
DEMO_SESSION_TIMEOUT_MS=7200000

# Demo user pool size (should match number of created users)
DEMO_USER_POOL_SIZE=10

# Enable/disable demo mode entirely (for testing)
DEMO_ENABLED=true

# Demo subdomain (without domain, e.g., 'demo')
DEMO_SUBDOMAIN=demo

# Rate limiting for demo endpoint (requests per hour per IP)
DEMO_RATE_LIMIT_PER_HOUR=3
```

#### File 10: Environment Config Types

**Path:** `lib/config/env.ts` (MODIFY)

Add to existing file:

```typescript
// ... existing imports ...

// Add demo config interface
interface DemoConfig {
  enabled: boolean;
  tenantId: string;
  userPoolSize: number;
  sessionTimeoutMs: number;
  subdomain: string;
  rateLimitPerHour: number;
}

// Add to existing EnvironmentConfig interface
export interface EnvironmentConfig {
  // ... existing fields ...

  demo: DemoConfig;
}

// Add to parseEnvironmentVariables()
export function parseEnvironmentVariables(): EnvironmentConfig {
  // ... existing parsing ...

  const demo: DemoConfig = {
    enabled: process.env.DEMO_ENABLED === 'true',
    tenantId: process.env.DEMO_TENANT_ID || '',
    userPoolSize: parseInt(process.env.DEMO_USER_POOL_SIZE || '10', 10),
    sessionTimeoutMs: parseInt(process.env.DEMO_SESSION_TIMEOUT_MS || '7200000', 10),
    subdomain: process.env.DEMO_SUBDOMAIN || 'demo',
    rateLimitPerHour: parseInt(process.env.DEMO_RATE_LIMIT_PER_HOUR || '3', 10),
  };

  return {
    // ... existing return ...
    demo,
  };
}
```

---

## 🔐 Sprint 2: Authentication & Security

**Duration:** 32 hours (4 days)
**Objective:** Implement demo authentication flow and security

### Day 1-2: Demo Authentication (16h)

#### File 11: Demo Auth Endpoint

**Path:** `app/auth/demo/route.ts` (NEW)

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/lib/config/env';

/**
 * POST /auth/demo
 * Creates a demo session by assigning a user from the demo pool
 */
export async function POST(request: Request) {
  // Check if demo is enabled
  if (!env.demo.enabled) {
    return NextResponse.json(
      { error: 'Demo mode is not enabled' },
      { status: 503 }
    );
  }

  const supabase = createClient();

  try {
    // 1. Get next available demo user from pool
    const { data: demoUserId, error: userError } = await supabase
      .rpc('get_next_demo_user');

    if (userError) {
      console.error('Error getting demo user:', userError);
      return NextResponse.json(
        { error: 'Demo is currently unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!demoUserId) {
      console.error('No demo user available (pool exhausted)');
      return NextResponse.json(
        { error: 'All demo slots are currently in use. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    // 2. Get demo user details
    const { data: demoUser, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', demoUserId)
      .single();

    if (profileError || !demoUser) {
      console.error('Error fetching demo user profile:', profileError);
      return NextResponse.json(
        { error: 'Demo setup error' },
        { status: 500 }
      );
    }

    // 3. Get demo tenant
    const { data: demoTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', env.demo.tenantId)
      .single();

    if (tenantError || !demoTenant) {
      console.error('Error fetching demo tenant:', tenantError);
      return NextResponse.json(
        { error: 'Demo tenant not configured' },
        { status: 500 }
      );
    }

    // 4. Sign in as demo user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: demoUser.email,
      password: process.env.DEMO_USER_PASSWORD!,
    });

    if (authError || !authData.session) {
      console.error('Demo auth failed:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }

    // 5. Create demo session tracking record
    const expiresAt = new Date(Date.now() + env.demo.sessionTimeoutMs);

    const { data: demoSession, error: sessionError } = await supabase
      .from('demo_sessions')
      .insert({
        user_id: demoUser.id,
        tenant_id: demoTenant.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (sessionError || !demoSession) {
      console.error('Error creating demo session:', sessionError);
      // Continue anyway, session tracking is not critical
    }

    // 6. Set demo session cookie
    if (demoSession) {
      cookies().set('demo_session_id', demoSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        domain: process.env.NODE_ENV === 'production' ? '.lekbanken.no' : undefined,
        path: '/',
      });
    }

    // 7. Redirect to demo subdomain with onboarding flag
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const demoUrl = new URL(
      `${protocol}://${env.demo.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN || 'lekbanken.no'}/app?onboarding=true`
    );

    return NextResponse.redirect(demoUrl);

  } catch (error) {
    console.error('Unexpected error in demo auth:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /auth/demo
 * Check if demo is available (for UI to show/hide demo button)
 */
export async function GET() {
  return NextResponse.json({
    available: env.demo.enabled,
    subdomain: env.demo.subdomain,
  });
}
```

#### File 12: Demo Detection Utilities

**Path:** `lib/utils/demo-detection.ts` (NEW)

```typescript
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/config/env';

/**
 * Check if current request is in demo mode
 * Can be called from Server Components or API routes
 */
export async function isDemoMode(): Promise<boolean> {
  // Check if demo is enabled
  if (!env.demo.enabled) {
    return false;
  }

  // Check for demo session cookie
  const demoSessionId = cookies().get('demo_session_id')?.value;
  if (!demoSessionId) {
    return false;
  }

  // Optionally verify session is still valid
  // (Can skip this check for performance - rely on cookie expiry)
  const supabase = createClient();
  const { data: session } = await supabase
    .from('demo_sessions')
    .select('expires_at, ended_at')
    .eq('id', demoSessionId)
    .single();

  if (!session) {
    return false;
  }

  // Check if expired or ended
  if (session.ended_at || new Date(session.expires_at) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Check if current request is from demo subdomain
 */
export function isDemoSubdomain(): boolean {
  const host = headers().get('host') || '';
  return host.startsWith(`${env.demo.subdomain}.`);
}

/**
 * Get demo session details
 */
export async function getDemoSession() {
  const demoSessionId = cookies().get('demo_session_id')?.value;
  if (!demoSessionId) {
    return null;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('demo_sessions')
    .select('*, profiles(*), tenants(*)')
    .eq('id', demoSessionId)
    .single();

  return data;
}
```

#### File 13: Demo Client Hook

**Path:** `hooks/useIsDemo.ts` (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DemoStatus {
  isDemoMode: boolean;
  expiresAt?: string;
  timeRemaining?: number;
  tenantName?: string;
  userName?: string;
}

/**
 * Client-side hook to check if user is in demo mode
 * Also handles session timeout warnings
 */
export function useIsDemo() {
  const router = useRouter();
  const [demoStatus, setDemoStatus] = useState<DemoStatus>({
    isDemoMode: false,
  });
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    // Fetch demo status from API
    async function checkDemoStatus() {
      try {
        const res = await fetch('/api/demo/status');
        const data = await res.json();
        setDemoStatus(data);
      } catch (error) {
        console.error('Error checking demo status:', error);
      }
    }

    checkDemoStatus();

    // Re-check every minute
    const interval = setInterval(checkDemoStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!demoStatus.expiresAt) return;

    // Check time remaining and show warning
    const interval = setInterval(() => {
      const remaining = new Date(demoStatus.expiresAt!).getTime() - Date.now();

      // Show warning at 10 minutes
      if (remaining < 10 * 60 * 1000 && remaining > 0) {
        setShowTimeoutWarning(true);
      }

      // Redirect when expired
      if (remaining <= 0) {
        clearInterval(interval);
        router.push('/demo-expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [demoStatus.expiresAt, router]);

  return {
    ...demoStatus,
    showTimeoutWarning,
  };
}
```

### Day 3: Enhanced Proxy (8h)

#### File 14: Proxy.ts Enhancement (MODIFY)

**Path:** `proxy.ts`

Add demo detection logic to existing file:

```typescript
// ... existing imports ...
import { env } from '@/lib/config/env';

export async function middleware(request: NextRequest) {
  // ... existing code ...

  // NEW: Demo subdomain detection (add after host extraction)
  const host = request.headers.get('host') || '';
  const isDemoSubdomain = host.startsWith(`${env.demo.subdomain}.`);

  if (isDemoSubdomain) {
    // Verify demo session exists
    const demoSessionId = request.cookies.get('demo_session_id')?.value;

    if (!demoSessionId) {
      // No demo session - redirect to landing page
      const mainUrl = new URL(
        `${protocol}://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'lekbanken.no'}`
      );
      return NextResponse.redirect(mainUrl);
    }

    // Set headers for downstream detection
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-demo-mode', 'true');
    requestHeaders.set('x-demo-session-id', demoSessionId);

    // Continue with request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // ... rest of existing proxy logic ...
}
```

### Day 4: API Protection Layer (8h)

#### File 15: Demo Protection Middleware

**Path:** `lib/api/demo-protection.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type GlobalRole = Database['public']['Enums']['global_role_enum'];

/**
 * Custom error for demo protection violations
 */
export class DemoProtectionError extends Error {
  public readonly statusCode: number;

  constructor(message: string = 'Demo tenants cannot be modified', statusCode: number = 403) {
    super(message);
    this.name = 'DemoProtectionError';
    this.statusCode = statusCode;
  }
}

/**
 * Check if a tenant is a demo tenant
 */
export function isDemoTenant(tenant: Tenant | null | undefined): boolean {
  if (!tenant) return false;
  return tenant.demo_flag === true || tenant.type === 'demo' || tenant.status === 'demo';
}

/**
 * Check if user has permission to modify demo tenants
 */
export function canModifyDemo(globalRole?: GlobalRole | null): boolean {
  return globalRole === 'system_admin';
}

/**
 * Require that tenant is NOT a demo tenant, or user is system_admin
 * Throws DemoProtectionError if validation fails
 */
export function requireNonDemoOrAdmin(
  tenant: Tenant | null | undefined,
  globalRole?: GlobalRole | null
): void {
  if (isDemoTenant(tenant) && !canModifyDemo(globalRole)) {
    throw new DemoProtectionError(
      'Demo tenants can only be modified by system administrators'
    );
  }
}

/**
 * Express-style middleware wrapper for API routes
 * Automatically catches DemoProtectionError and returns proper response
 */
export function withDemoProtection<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof DemoProtectionError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'DEMO_PROTECTED',
          },
          { status: error.statusCode }
        );
      }
      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Check if current request is from demo mode (via headers)
 */
export function isRequestFromDemo(request: Request): boolean {
  return request.headers.get('x-demo-mode') === 'true';
}

/**
 * Get demo session ID from request headers (if available)
 */
export function getDemoSessionId(request: Request): string | null {
  return request.headers.get('x-demo-session-id');
}
```

#### File 16: Demo API Endpoints

**Path:** `app/api/demo/status/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const supabase = createClient();
  const demoSessionId = cookies().get('demo_session_id')?.value;

  if (!demoSessionId) {
    return NextResponse.json({ isDemoMode: false });
  }

  // Get session details
  const { data: session, error } = await supabase
    .from('demo_sessions')
    .select(`
      *,
      profiles!demo_sessions_user_id_fkey (display_name),
      tenants!demo_sessions_tenant_id_fkey (name)
    `)
    .eq('id', demoSessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ isDemoMode: false });
  }

  // Check if expired
  const expiresAt = new Date(session.expires_at);
  const now = new Date();

  if (expiresAt < now || session.ended_at) {
    return NextResponse.json({ isDemoMode: false });
  }

  return NextResponse.json({
    isDemoMode: true,
    expiresAt: session.expires_at,
    timeRemaining: expiresAt.getTime() - now.getTime(),
    tenantName: session.tenants?.name,
    userName: session.profiles?.display_name,
  });
}
```

**Path:** `app/api/demo/track/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { feature } = await request.json();

    if (!feature || typeof feature !== 'string') {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    const demoSessionId = cookies().get('demo_session_id')?.value;

    if (!demoSessionId) {
      return NextResponse.json({ success: false });
    }

    const supabase = createClient();

    // Track feature usage
    const { error } = await supabase.rpc('add_demo_feature_usage', {
      session_id: demoSessionId,
      feature_name: feature,
    });

    if (error) {
      console.error('Error tracking demo feature:', error);
      return NextResponse.json({ success: false });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in demo track:', error);
    return NextResponse.json({ success: false });
  }
}
```

---

## 🎨 Sprint 3: User Experience & UI

**Duration:** 24 hours (3 days)
**Objective:** Build demo-specific UI components

### Day 1: Core Components (8h)

#### File 17: Demo Banner Component

**Path:** `components/demo/DemoBanner.tsx` (NEW)

```typescript
'use client';

import { useIsDemo } from '@/hooks/useIsDemo';
import { XMarkIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/catalyst/button';
import { useState } from 'react';

export function DemoBanner() {
  const { isDemoMode, timeRemaining, showTimeoutWarning } = useIsDemo();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode || dismissed) {
    return null;
  }

  const minutes = Math.floor((timeRemaining || 0) / 1000 / 60);
  const showWarning = showTimeoutWarning && minutes < 10;

  return (
    <div
      className={`
        relative w-full px-4 py-3 flex items-center justify-between gap-4
        ${showWarning ? 'bg-amber-500' : 'bg-blue-600'}
        text-white shadow-md
      `}
    >
      {/* Left side: Icon + Message */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {showWarning ? (
            <ClockIcon className="h-5 w-5" />
          ) : (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <div>
          <p className="font-semibold">
            {showWarning ? `Demo ending in ${minutes} minutes` : 'Demo Mode'}
          </p>
          <p className="text-sm opacity-90">
            {showWarning
              ? 'Create an account to save your progress'
              : 'You're exploring Lekbanken in demo mode with limited functionality.'
            }
          </p>
        </div>
      </div>

      {/* Right side: CTA + Dismiss */}
      <div className="flex items-center gap-3">
        <Button
          href="/auth/signup?source=demo"
          className="bg-white text-blue-600 hover:bg-gray-100 flex items-center gap-2"
        >
          Create Account
          <ArrowRightIcon className="h-4 w-4" />
        </Button>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition"
          aria-label="Dismiss banner"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
```

#### File 18: Demo Feature Gate

**Path:** `components/demo/DemoFeatureGate.tsx` (NEW)

```typescript
'use client';

import { useIsDemo } from '@/hooks/useIsDemo';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { Button } from '@/catalyst/button';
import { ReactNode } from 'react';

interface DemoFeatureGateProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  message?: string;
}

/**
 * Wraps premium features and shows upgrade message in demo mode
 */
export function DemoFeatureGate({
  children,
  feature,
  fallback,
  message = 'This feature is not available in demo mode.',
}: DemoFeatureGateProps) {
  const { isDemoMode } = useIsDemo();

  if (!isDemoMode) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state
  return (
    <div className="relative">
      {/* Blurred/disabled content */}
      <div className="pointer-events-none opacity-50 blur-sm">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center max-w-md px-6 py-8">
          <LockClosedIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Premium Feature
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {message}
          </p>
          <Button href="/auth/signup?source=demo" color="blue">
            Upgrade to Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Simpler version for buttons/links
 */
export function DemoButtonGate({ children, feature }: { children: ReactNode; feature: string }) {
  const { isDemoMode } = useIsDemo();

  if (!isDemoMode) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <LockClosedIcon className="h-4 w-4 text-gray-500" />
      </div>
    </div>
  );
}
```

### Day 2: Onboarding & Conversion (8h)

#### File 19: Demo Onboarding

**Path:** `components/demo/DemoOnboarding.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/catalyst/button';

interface OnboardingStep {
  title: string;
  description: string;
  target?: string; // CSS selector for highlight
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Lekbanken Demo!',
    description: 'Take a quick tour to see how Lekbanken can transform your workshops and team activities.',
  },
  {
    title: 'Browse Activities',
    description: 'Explore 18 curated activities from icebreakers to team building exercises.',
    target: '[data-demo-target="browse"]',
  },
  {
    title: 'Create a Session',
    description: 'Build your own workshop by combining multiple activities.',
    target: '[data-demo-target="planner"]',
  },
  {
    title: 'Track Progress',
    description: 'See how gamification features motivate participants with XP and badges.',
    target: '[data-demo-target="gamification"]',
  },
  {
    title: 'Ready to Get Started?',
    description: 'Create a real account to unlock all features and save your work.',
  },
];

export function DemoOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('demo_onboarding_seen');

    // Check if onboarding query param is present
    const params = new URLSearchParams(window.location.search);
    const shouldShow = params.get('onboarding') === 'true';

    if (shouldShow && !hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('demo_onboarding_seen', 'true');
  };

  if (!isVisible) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {step.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-700 mb-6">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition ${
                  index === currentStep ? 'bg-blue-600 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={handleClose}
              color="zinc"
              outline
            >
              Skip Tour
            </Button>

            {isLastStep ? (
              <Button
                href="/auth/signup?source=demo"
                color="blue"
              >
                Create Account
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                color="blue"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Highlight target element (if specified) */}
      {step.target && (
        <style jsx global>{`
          ${step.target} {
            position: relative;
            z-index: 45;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
            border-radius: 8px;
          }
        `}</style>
      )}
    </>
  );
}
```

### Day 3: Layout Integration (8h)

#### File 20: Modify App Layout

**Path:** `app/app/layout.tsx` (MODIFY)

Add demo banner to existing layout:

```typescript
// ... existing imports ...
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoOnboarding } from '@/components/demo/DemoOnboarding';
import { isDemoMode } from '@/lib/utils/demo-detection';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ... existing logic ...

  // Check if demo mode
  const isDemo = await isDemoMode();

  return (
    <html lang={locale}>
      <body>
        {/* NEW: Demo Banner */}
        {isDemo && <DemoBanner />}

        {/* Existing layout */}
        <div className="flex h-screen">
          {/* ... existing sidebar/nav ... */}

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* NEW: Demo Onboarding */}
        {isDemo && <DemoOnboarding />}
      </body>
    </html>
  );
}
```

#### File 21: Landing Page CTA

**Path:** `app/(marketing)/page.tsx` (MODIFY)

Add demo button to hero section:

```typescript
// ... existing imports ...

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1>Transform Your Workshops with Lekbanken</h1>
        <p>The ultimate platform for facilitators...</p>

        {/* NEW: CTAs */}
        <div className="flex items-center gap-4">
          <Button href="/auth/signup" size="lg" color="blue">
            Get Started Free
          </Button>

          {/* NEW: Demo Button */}
          <form action="/auth/demo" method="POST">
            <Button type="submit" size="lg" color="zinc" outline>
              🎮 Try Demo
              <span className="text-sm text-gray-500">(No signup required)</span>
            </Button>
          </form>
        </div>
      </section>

      {/* ... rest of page ... */}
    </div>
  );
}
```

---

## 📚 Sprint 4: Content Curation & Polish

**Duration:** 24 hours (3 days)
**Objective:** Finalize demo content and user experience

### Day 1: Content Curation (8h)

**Manual Tasks:**
1. Review activities database and select best 18-20
2. Update seed file with actual activity names
3. Test content visibility in demo mode
4. Create demo session templates with real activities

### Day 2-3: Polish & Edge Cases (16h)

#### File 22: Demo Expired Page

**Path:** `app/demo-expired/page.tsx` (NEW)

```typescript
import { Button } from '@/catalyst/button';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function DemoExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <ClockIcon className="h-16 w-16 mx-auto mb-6 text-gray-400" />

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Demo Session Expired
        </h1>

        <p className="text-gray-600 mb-8">
          Your 2-hour demo session has ended. Create a free account to continue exploring Lekbanken with unlimited access.
        </p>

        <div className="flex flex-col gap-3">
          <Button href="/auth/signup" color="blue" size="lg">
            Create Free Account
          </Button>

          <form action="/auth/demo" method="POST">
            <Button type="submit" color="zinc" outline>
              Start Another Demo
            </Button>
          </form>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
```

#### File 23: Rate Limiting (if using Upstash)

**Path:** `lib/rate-limit.ts` (NEW)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/config/env';

// Create rate limiter instance
export const demoRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(
    env.demo.rateLimitPerHour,
    '1 h'
  ),
  analytics: true,
  prefix: 'ratelimit:demo',
});

/**
 * Check rate limit for demo endpoint
 * Returns { success: boolean, limit: number, remaining: number, reset: Date }
 */
export async function checkDemoRateLimit(identifier: string) {
  return await demoRateLimit.limit(`demo_${identifier}`);
}
```

Update `/auth/demo/route.ts` to use rate limiting:

```typescript
// At the top of POST handler:
const ip = request.headers.get('x-forwarded-for') ||  request.headers.get('x-real-ip') || 'unknown';
const { success, limit, remaining, reset } = await checkDemoRateLimit(ip);

if (!success) {
  return NextResponse.json(
    {
      error: `Too many demo requests. You can try ${limit} times per hour. Try again after ${reset.toLocaleTimeString()}.`,
      code: 'RATE_LIMIT_EXCEEDED',
      reset: reset.toISOString(),
    },
    { status: 429 }
  );
}
```

---

## 📊 Sprint 5: Monitoring & Launch

**Duration:** 16 hours (2 days)
**Objective:** Deploy, monitor, and launch

### Day 1: Cleanup Function & Monitoring (8h)

#### File 24: Cleanup Supabase Function

**Path:** `supabase/functions/cleanup-demo-data/index.ts` (NEW)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client with service role
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role for admin access
);

interface CleanupResult {
  expiredSessions: number;
  oldSessions: number;
  resetUsers: number;
  deletedUserSessions: number;
  errors: string[];
}

Deno.serve(async (req) => {
  console.log('🧹 Starting demo data cleanup...');

  const result: CleanupResult = {
    expiredSessions: 0,
    oldSessions: 0,
    resetUsers: 0,
    deletedUserSessions: 0,
    errors: [],
  };

  try {
    // 1. Delete expired demo sessions
    const { data: expiredSessions, error: expiredError } = await supabase
      .from('demo_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .is('ended_at', null)
      .select('id');

    if (expiredError) {
      result.errors.push(`Expired sessions: ${expiredError.message}`);
    } else {
      result.expiredSessions = expiredSessions?.length || 0;
      console.log(`✅ Deleted ${result.expiredSessions} expired sessions`);
    }

    // 2. Delete old completed demo sessions (>24h old)
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: oldSessions, error: oldError } = await supabase
      .from('demo_sessions')
      .delete()
      .not('ended_at', 'is', null)
      .lt('ended_at', cutoffDate)
      .select('id');

    if (oldError) {
      result.errors.push(`Old sessions: ${oldError.message}`);
    } else {
      result.oldSessions = oldSessions?.length || 0;
      console.log(`✅ Deleted ${result.oldSessions} old completed sessions`);
    }

    // 3. Reset demo user progress
    // Only reset users that haven't been used in last 2 hours
    const lastUsedCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: resetUsers, error: resetError } = await supabase
      .from('profiles')
      .update({
        experience_points: 0,
        level: 1,
        // Reset other gamification fields as needed
      })
      .eq('is_demo_user', true)
      .lt('demo_last_used_at', lastUsedCutoff)
      .select('id');

    if (resetError) {
      result.errors.push(`Reset users: ${resetError.message}`);
    } else {
      result.resetUsers = resetUsers?.length || 0;
      console.log(`✅ Reset ${result.resetUsers} demo user profiles`);
    }

    // 4. Delete demo user created sessions (except templates)
    const { data: demoUserIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_demo_user', true);

    if (demoUserIds && demoUserIds.length > 0) {
      const { data: deletedSessions, error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .in('created_by', demoUserIds.map(u => u.id))
        .neq('status', 'template')
        .lt('created_at', cutoffDate)
        .select('id');

      if (deleteError) {
        result.errors.push(`User sessions: ${deleteError.message}`);
      } else {
        result.deletedUserSessions = deletedSessions?.length || 0;
        console.log(`✅ Deleted ${result.deletedUserSessions} demo user sessions`);
      }
    }

    console.log('✨ Cleanup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Cleanup failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

Deploy function:
```bash
supabase functions deploy cleanup-demo-data
```

Schedule with pg_cron (run in Supabase SQL Editor):
```sql
SELECT cron.schedule(
  'cleanup-demo-data-nightly',
  '0 3 * * *', -- Every day at 3 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-demo-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

### Day 2: Testing & Launch (8h)

#### File 25: E2E Test

**Path:** `tests/e2e/demo-flow.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Demo Flow', () => {
  test('should complete full demo journey', async ({ page }) => {
    // 1. Land on homepage
    await page.goto('/');

    // 2. Click demo button
    await page.getByRole('button', { name: /try demo/i }).click();

    // 3. Should redirect to demo subdomain
    await expect(page).toHaveURL(/demo\./);

    // 4. Should show demo banner
    await expect(page.getByText(/demo mode/i)).toBeVisible();

    // 5. Should show onboarding
    await expect(page.getByText(/welcome to lekbanken demo/i)).toBeVisible();

    // 6. Complete onboarding
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /create account/i }).click();

    // 7. Should land on signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should only show curated content to demo users', async ({ page }) => {
    // Start demo session
    await page.goto('/auth/demo', { method: 'POST' });

    // Browse activities
    await page.goto('/app/activities');

    // Count activities (should be ~18-20)
    const activityCount = await page.getByTestId('activity-card').count();
    expect(activityCount).toBeGreaterThanOrEqual(15);
    expect(activityCount).toBeLessThanOrEqual(25);
  });

  test('should block premium features in demo', async ({ page }) => {
    // Start demo
    await page.goto('/auth/demo', { method: 'POST' });

    // Try to access export (example)
    await page.goto('/app/sessions/123/export');

    // Should show locked message
    await expect(page.getByText(/premium feature/i)).toBeVisible();
  });

  test('should expire after timeout', async ({ page }) => {
    // This test would need to manipulate time or check expiry logic
    // Simplified version:

    await page.goto('/auth/demo', { method: 'POST' });

    // Check that demo status includes expiry
    const response = await page.request.get('/api/demo/status');
    const data = await response.json();

    expect(data.isDemoMode).toBe(true);
    expect(data.expiresAt).toBeDefined();
  });
});
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] `isDemoTenant()` function
- [ ] `requireNonDemoOrAdmin()` validation
- [ ] `get_next_demo_user()` SQL function
- [ ] Demo session expiry logic

### Integration Tests
- [ ] Demo auth flow (`/auth/demo`)
- [ ] API protection middleware
- [ ] RLS policies (using different user roles)
- [ ] Cleanup function

### E2E Tests
- [ ] Complete demo journey (land → demo → signup)
- [ ] Content filtering (demo users see only curated)
- [ ] Feature gates (premium features blocked)
- [ ] Session timeout handling

### Manual QA Checklist
- [ ] Demo button on landing page works
- [ ] Redirects to demo subdomain correctly
- [ ] Demo banner appears and is dismissable
- [ ] Onboarding shows on first visit only
- [ ] Only 18-20 activities visible
- [ ] Premium features show locked state
- [ ] Timeout warning shows at 10 min remaining
- [ ] Session expires after 2h
- [ ] Cleanup function runs successfully
- [ ] Rate limiting blocks excessive requests
- [ ] Demo user pool rotates correctly
- [ ] System admin can modify demo tenants
- [ ] Regular users cannot modify demo data

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All migrations tested in staging
- [ ] Demo users created in auth.users
- [ ] Demo tenant seeded with ID matching env
- [ ] Environment variables set in production
- [ ] DNS configured for demo subdomain
- [ ] SSL certificate for demo subdomain
- [ ] Rate limiting configured (Upstash/Vercel)

### Deployment Steps
1. [ ] Run database migrations
2. [ ] Run seed files
3. [ ] Create demo auth users (script)
4. [ ] Deploy Supabase Edge Function
5. [ ] Schedule cleanup cron job
6. [ ] Deploy Next.js app
7. [ ] Verify demo subdomain resolves
8. [ ] Test complete demo flow
9. [ ] Monitor error logs

### Post-Deployment
- [ ] Create monitoring dashboard
- [ ] Set up alerts (demo user pool exhausted, cleanup failures)
- [ ] Document runbook for common issues
- [ ] Train support team on demo functionality
- [ ] Announce demo availability (marketing)

---

## 📈 Success Metrics

Track these KPIs after launch:

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Demo Start Rate | >5% of visitors | Landing page analytics |
| Avg Session Duration | >15 minutes | `demo_sessions.ended_at - started_at` |
| Feature Engagement | >3 features per session | `features_used` array length |
| Conversion Rate | >10% demo → signup | `demo_sessions.converted = true` |
| Time to Convert | <30 minutes | From `started_at` to signup timestamp |
| User Pool Utilization | <80% | Active sessions / pool size |
| Cleanup Success Rate | 100% | Cron job logs |

---

## 🎓 Lessons Learned Template

After each sprint, document:
- What went well
- What could be improved
- Unexpected challenges
- Technical debt incurred
- Performance findings

---

## 📚 Resources

- [Current State Report](./demo_current_state.md)
- [Technical Specification](./demo_technical_spec.md)
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Catalyst UI Kit: (your internal docs)

---

**Document Status:** Ready for Implementation
**Last Updated:** 2026-01-13
**Total Estimated Effort:** 136 hours
**Next Step:** Begin Sprint 1 - Foundation & Database
