# Lekbanken Enterprise Demo - Teknisk Specifikation

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-13
- Last updated: 2026-03-21
- Last validated: -

> Draft technical specification for the enterprise demo architecture, security model, and lifecycle design.

**Version:** 1.0
**Datum:** 2026-01-13
**Status:** Design Phase - Fas 2
**Forfattare:** Claude Code Analysis

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Database Schema](#database-schema)
4. [RLS Security Model](#rls-security-model)
5. [Authentication Flow](#authentication-flow)
6. [API Specifications](#api-specifications)
7. [Content Strategy](#content-strategy)
8. [Lifecycle Management](#lifecycle-management)
9. [Security Considerations](#security-considerations)
10. [Performance & Scalability](#performance--scalability)

---

## 🎯 System Overview

### Vision
En **self-service, public-facing demo-upplevelse** där prospekt kan utforska Lekbanken utan registrering, uppleva kurerat innehåll, och enkelt konvertera till betalande kunder.

### Core Principles
1. **Isolation First** - Demo data får ALDRIG påverka production
2. **Security by Default** - Multi-layer protection (RLS + API + UI)
3. **Conversion Optimized** - Varje interaction ska leda mot signup
4. **Maintenance Free** - Auto-cleanup och self-healing
5. **Lekbanken Native** - Följ befintliga patterns (Catalyst, proxy.ts, etc.)

### Key Metrics
- **Demo Start Rate:** % av visitors som startar demo
- **Time in Demo:** Genomsnittlig session-längd
- **Feature Engagement:** Vilka features används mest
- **Conversion Rate:** % som går från demo → signup
- **Time to Convert:** Hur lång tid från demo-start till signup

---

## 🏗️ Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE DEMO ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

                          ┌──────────────┐
                          │  End User    │
                          │  (Prospekt)  │
                          └──────┬───────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Landing Page         │
                    │   lekbanken.no         │
                    │                        │
                    │  [🎮 Prova Demo] ──────┼──┐
                    └────────────────────────┘  │
                                               │
                                               ▼
                                ┌──────────────────────────┐
                                │  POST /auth/demo         │
                                │  1. Select available user │
                                │  2. Create session        │
                                │  3. Set demo cookie       │
                                └──────────┬───────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────────┐
                              │   Redirect to                │
                              │   demo.lekbanken.no/app      │
                              └─────────┬───────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────────┐
                        │   proxy.ts (Enhanced)             │
                        │   - Detect demo subdomain          │
                        │   - Verify demo cookie             │
                        │   - Set demo context               │
                        │   - Enforce 2h session timeout     │
                        └───────────┬───────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────────┐
                    │   App (/app/*)                        │
                    │   + Demo Banner (persistent)          │
                    │   + Feature Gates (premium)           │
                    │   + Conversion CTAs (strategic)       │
                    └───────────┬───────────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────────────────┐
                │   API Layer                                │
                │   - Check isDemoMode()                     │
                │   - Enforce read-only for demo tenants     │
                │   - Block sensitive endpoints              │
                │   - Rate limit demo requests               │
                └───────────┬───────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────────────────┐
        │   Supabase (Enhanced RLS)                              │
        │                                                        │
        │   Demo Tenant (UUID: xxx-demo-xxx)                    │
        │   ├─ Activities (curated, is_demo_content = true)     │
        │   ├─ Sessions (owned by demo users)                   │
        │   ├─ User Pool (5-10 pre-created demo users)          │
        │   └─ Progress (XP, badges, achievements)              │
        │                                                        │
        │   RLS Policies:                                        │
        │   ✅ Demo tenants: read-only (except system_admin)    │
        │   ✅ Content access: only is_demo_content = true      │
        │   ✅ User pool: rotation and reset                    │
        └────────────────────────────────────────────────────────┘

                            │
                            ▼
        ┌─────────────────────────────────────────────┐
        │   Supabase Edge Function (Scheduled)        │
        │   cleanup-demo-data                          │
        │   - Runs every night at 03:00 UTC            │
        │   - Deletes sessions > 24h old               │
        │   - Resets user progress                     │
        │   - Clears analytics data                    │
        └─────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Critical Path |
|-----------|---------------|---------------|
| **Landing Page** | Demo CTA, first touch | ✅ |
| **Auth Demo Endpoint** | User pool mgmt, session creation | ✅ |
| **Proxy.ts** | Subdomain routing, demo detection | ✅ |
| **Demo Banner** | Persistent reminder, upgrade CTA | ✅ |
| **Feature Gates** | Premium feature blocking | 🟡 |
| **API Layer** | Mutation protection, rate limiting | ✅ |
| **RLS Policies** | Database-level security | ✅ |
| **Cleanup Function** | Lifecycle management | 🟡 |

---

## 💾 Database Schema

### 1. Enhanced Tenants Table

```sql
-- Already exists, no changes needed
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type tenant_type_enum DEFAULT 'organization',
  status tenant_status_enum DEFAULT 'active',
  demo_flag BOOLEAN DEFAULT false,  -- ✅ Already exists
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- New index for demo queries
CREATE INDEX idx_tenants_demo_flag ON tenants(demo_flag) WHERE demo_flag = true;
```

### 2. NEW: Content Curation

```sql
-- Add is_demo_content column to activities
ALTER TABLE activities
ADD COLUMN is_demo_content BOOLEAN DEFAULT false;

-- Index for demo content queries
CREATE INDEX idx_activities_demo_content
ON activities(is_demo_content)
WHERE is_demo_content = true;

-- Seed with curated demo activities
-- See demo_curated_activities.sql for details
```

### 3. NEW: Demo User Pool

```sql
-- Extend profiles table with demo user tracking
ALTER TABLE profiles
ADD COLUMN is_demo_user BOOLEAN DEFAULT false,
ADD COLUMN demo_last_used_at TIMESTAMPTZ,
ADD COLUMN demo_session_count INTEGER DEFAULT 0;

-- Index for finding available demo users
CREATE INDEX idx_profiles_demo_users
ON profiles(is_demo_user, demo_last_used_at)
WHERE is_demo_user = true;

-- Function to get next available demo user
CREATE OR REPLACE FUNCTION get_next_demo_user()
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find least recently used demo user
  SELECT id INTO user_id
  FROM profiles
  WHERE is_demo_user = true
  ORDER BY COALESCE(demo_last_used_at, '1970-01-01'::timestamptz) ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Update usage timestamp
  UPDATE profiles
  SET
    demo_last_used_at = now(),
    demo_session_count = demo_session_count + 1
  WHERE id = user_id;

  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. NEW: Demo Session Tracking

```sql
-- Track demo sessions for analytics and cleanup
CREATE TABLE demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
  ended_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  features_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_demo_sessions_expires
ON demo_sessions(expires_at)
WHERE ended_at IS NULL;

-- Index for analytics
CREATE INDEX idx_demo_sessions_converted
ON demo_sessions(converted, created_at);
```

### 5. Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         TENANTS                              │
│  - id (PK)                                                   │
│  - demo_flag ✅                                              │
│  - type (includes 'demo') ✅                                 │
│  - status (includes 'demo') ✅                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ tenant_id (FK)
                    │
    ┌───────────────┴──────────────┬───────────────────────┐
    │                              │                        │
┌───▼────────────────────┐  ┌──────▼──────────────┐  ┌─────▼───────────┐
│    ACTIVITIES          │  │    PROFILES         │  │  DEMO_SESSIONS  │
│  - id (PK)             │  │  - id (PK)          │  │  - id (PK)      │
│  - is_demo_content 🆕  │  │  - is_demo_user 🆕  │  │  - user_id 🆕   │
│  - is_global           │  │  - demo_last_used 🆕│  │  - tenant_id 🆕 │
│  - name                │  │  - global_role      │  │  - expires_at 🆕│
└────────────────────────┘  └─────────────────────┘  └─────────────────┘

Legend:
✅ = Already exists
🆕 = Needs to be created
```

---

## 🔒 RLS Security Model

### Security Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 3: UI/UX (Soft Enforcement)                  │
│  - Demo banner warnings                              │
│  - Disabled buttons                                  │
│  - "Upgrade to unlock" messages                      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: API Routes (Hard Enforcement) ✅ EXISTS   │
│  - Check demo_flag on all mutations                  │
│  - Block unless system_admin                         │
│  - Rate limiting for demo endpoints                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 1: Database RLS (Ultimate Enforcement) 🆕    │
│  - Cannot be bypassed                                │
│  - Enforced at PostgreSQL level                      │
│  - Defense in depth                                  │
└─────────────────────────────────────────────────────┘
```

### RLS Policies - Complete Implementation

#### 1. Demo Tenant Write Protection

```sql
-- Block all modifications to demo tenants (except system_admin)
CREATE POLICY "demo_tenant_write_protection" ON tenants
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

-- Also block DELETE
CREATE POLICY "demo_tenant_delete_protection" ON tenants
  FOR DELETE
  TO authenticated
  USING (
    demo_flag = false
    OR (
      SELECT global_role FROM profiles WHERE id = auth.uid()
    ) = 'system_admin'
  );
```

#### 2. Demo Content Access Control

```sql
-- Demo users can only see curated content
CREATE POLICY "demo_content_access" ON activities
  FOR SELECT
  TO authenticated
  USING (
    -- If user is in a demo tenant
    CASE
      WHEN EXISTS (
        SELECT 1 FROM tenants t
        JOIN memberships m ON m.tenant_id = t.id
        WHERE t.demo_flag = true
          AND m.user_id = auth.uid()
      )
      THEN
        -- Only show demo-approved content
        (tenant_id = (
          SELECT m.tenant_id FROM memberships m
          WHERE m.user_id = auth.uid() LIMIT 1
        ))
        OR (is_global = true AND is_demo_content = true)
      ELSE
        -- Normal users see everything they should
        tenant_id = (
          SELECT m.tenant_id FROM memberships m
          WHERE m.user_id = auth.uid() LIMIT 1
        )
        OR is_global = true
    END
  );
```

#### 3. Demo User Pool Protection

```sql
-- Prevent manual modification of demo user flags
CREATE POLICY "demo_user_flag_protection" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update own profile (but not is_demo_user flag)
    (id = auth.uid() AND is_demo_user = OLD.is_demo_user)
    -- OR system admin can do anything
    OR (SELECT global_role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  );
```

#### 4. Demo Session Isolation

```sql
-- Demo sessions are isolated per demo tenant
CREATE POLICY "demo_session_isolation" ON sessions
  FOR ALL
  TO authenticated
  USING (
    -- Own sessions
    created_by = auth.uid()
    -- OR sessions in your tenant
    OR tenant_id = (
      SELECT m.tenant_id FROM memberships m
      WHERE m.user_id = auth.uid() LIMIT 1
    )
  );

-- Additional restriction: demo users cannot create PUBLIC sessions
CREATE POLICY "demo_no_public_sessions" ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- If user is demo user
    CASE
      WHEN EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_demo_user = true
      )
      THEN
        -- Must be private/tenant-only
        visibility != 'public'
      ELSE
        true
    END
  );
```

#### 5. Demo Data Cleanup Policy

```sql
-- Allow scheduled function to clean up old demo data
CREATE POLICY "demo_cleanup_function" ON demo_sessions
  FOR DELETE
  TO service_role
  USING (
    expires_at < now()
    OR ended_at < (now() - interval '24 hours')
  );
```

### RLS Policy Testing

```sql
-- Test script to verify RLS policies
-- Run as different users to validate enforcement

-- Test 1: Demo user tries to modify tenant
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "demo-user-uuid", "role": "authenticated"}';

UPDATE tenants SET name = 'Hacked' WHERE demo_flag = true;
-- Expected: ERROR - RLS policy violation

-- Test 2: Demo user tries to see non-demo content
SELECT * FROM activities WHERE is_demo_content = false AND is_global = true;
-- Expected: 0 rows (even if data exists)

-- Test 3: System admin can modify demo tenant
SET LOCAL "request.jwt.claims" TO '{"sub": "admin-uuid", "role": "authenticated"}';
-- (assuming admin-uuid has global_role = 'system_admin')

UPDATE tenants SET name = 'Updated Demo' WHERE demo_flag = true;
-- Expected: SUCCESS

RESET ROLE;
```

---

## 🔐 Authentication Flow

### User Journey

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Landing Page                                        │
│  URL: lekbanken.no                                           │
│  Action: User clicks "🎮 Prova Demo"                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Demo Auth Endpoint                                  │
│  POST /auth/demo                                             │
│                                                              │
│  Server Logic:                                               │
│  1. Call get_next_demo_user() → user_id                     │
│  2. Get demo tenant_id from tenants WHERE demo_flag = true   │
│  3. Create Supabase session via signInWithPassword()         │
│     (demo users have pre-shared password)                    │
│  4. Create demo_sessions record                              │
│  5. Set cookie: demo_session_id                              │
│  6. Redirect to demo.lekbanken.no/app?onboarding=true       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Subdomain Detection                                 │
│  URL: demo.lekbanken.no/app                                  │
│                                                              │
│  proxy.ts Logic:                                             │
│  1. Detect subdomain = 'demo'                                │
│  2. Verify demo_session_id cookie exists                     │
│  3. Check session not expired (< 2h)                         │
│  4. Set context: { isDemoMode: true, ... }                   │
│  5. Allow request to proceed                                 │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Demo Experience                                     │
│  Components:                                                 │
│  - <DemoBanner /> (persistent top bar)                       │
│  - <DemoOnboarding /> (first-time guided tour)               │
│  - <DemoFeatureGate /> (for premium features)                │
│  - Regular app functionality (browse, play, plan)            │
│                                                              │
│  Restrictions:                                               │
│  - No export functionality                                   │
│  - No billing pages                                          │
│  - No team invites                                           │
│  - Read-only for tenant settings                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Conversion (Optional)                               │
│  User clicks "Create Real Account"                           │
│  → Redirect to /auth/signup?source=demo&session={id}        │
│  → Pre-fill email (if collected)                             │
│  → Show "Upgrade to keep your progress" message             │
│  → Mark demo_sessions.converted = true                       │
└──────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### `/app/auth/demo/route.ts` (NEW)

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    // 1. Get next available demo user
    const { data: demoUserId, error: userError } = await supabase
      .rpc('get_next_demo_user');

    if (userError || !demoUserId) {
      return NextResponse.json(
        { error: 'Demo currently unavailable' },
        { status: 503 }
      );
    }

    // 2. Get demo tenant
    const { data: demoTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('demo_flag', true)
      .single();

    if (!demoTenant) {
      return NextResponse.json(
        { error: 'Demo tenant not configured' },
        { status: 500 }
      );
    }

    // 3. Sign in as demo user
    // Demo users have email: demo-user-{N}@demo.lekbanken.internal
    // And shared password stored in env: DEMO_USER_PASSWORD
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: `demo-user-${demoUserId}@demo.lekbanken.internal`,
      password: process.env.DEMO_USER_PASSWORD!
    });

    if (authError) {
      return NextResponse.json(
        { error: 'Auth failed' },
        { status: 500 }
      );
    }

    // 4. Create demo session tracking
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const { data: demoSession } = await supabase
      .from('demo_sessions')
      .insert({
        user_id: demoUserId,
        tenant_id: demoTenant.id,
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single();

    // 5. Set demo session cookie
    cookies().set('demo_session_id', demoSession!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      domain: '.lekbanken.no' // Allow subdomain access
    });

    // 6. Redirect to demo subdomain with onboarding
    return NextResponse.redirect(
      new URL('https://demo.lekbanken.no/app?onboarding=true')
    );

  } catch (error) {
    console.error('Demo auth error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

#### Enhanced `proxy.ts` - Demo Detection

```typescript
// Add to existing proxy.ts

// After existing tenant resolution logic...

// Check if this is demo subdomain
const isDemoSubdomain = host.startsWith('demo.');

if (isDemoSubdomain) {
  // Verify demo session
  const demoSessionId = request.cookies.get('demo_session_id')?.value;

  if (!demoSessionId) {
    // No demo session - redirect to landing
    return NextResponse.redirect(new URL('https://lekbanken.no'));
  }

  // Verify session is still valid (optional: check in DB)
  // For performance, trust the cookie expiry

  // Set demo context for downstream use
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
```

---

## 🔌 API Specifications

### Enhanced API Protection

#### Shared Middleware: `lib/api/demo-protection.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type GlobalRole = Database['public']['Enums']['global_role_enum'];

export class DemoProtectionError extends Error {
  constructor(message: string = 'Demo tenants cannot be modified') {
    super(message);
    this.name = 'DemoProtectionError';
  }
}

/**
 * Check if a tenant is a demo tenant
 */
export function isDemoTenant(tenant: Tenant | null): boolean {
  return tenant?.demo_flag === true || tenant?.type === 'demo';
}

/**
 * Check if user can modify demo tenants
 */
export function canModifyDemo(globalRole?: GlobalRole): boolean {
  return globalRole === 'system_admin';
}

/**
 * Throw error if demo tenant and user not authorized
 */
export function requireNonDemoOrAdmin(
  tenant: Tenant | null,
  globalRole?: GlobalRole
): void {
  if (isDemoTenant(tenant) && !canModifyDemo(globalRole)) {
    throw new DemoProtectionError();
  }
}

/**
 * Express-style middleware for API routes
 */
export function withDemoProtection(
  handler: Function
) {
  return async (request: Request, context: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof DemoProtectionError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'DEMO_PROTECTED'
          },
          { status: 403 }
        );
      }
      throw error;
    }
  };
}
```

#### Example Usage in Existing Routes

```typescript
// app/api/tenants/[tenantId]/route.ts

import { requireNonDemoOrAdmin } from '@/lib/api/demo-protection';

export async function PATCH(request: Request, { params }: { params: { tenantId: string } }) {
  const supabase = createClient();

  // ... existing auth logic ...

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', params.tenantId)
    .single();

  // NEW: Use shared protection
  requireNonDemoOrAdmin(tenant, globalRole);

  // ... rest of existing logic ...
}
```

### New Demo-Specific Endpoints

#### `GET /api/demo/status` - Check Demo Status

```typescript
// app/api/demo/status/route.ts

export async function GET(request: Request) {
  const supabase = createClient();
  const demoSessionId = request.cookies.get('demo_session_id')?.value;

  if (!demoSessionId) {
    return NextResponse.json({ isDemoMode: false });
  }

  // Get session details
  const { data: session } = await supabase
    .from('demo_sessions')
    .select('*, profiles(*), tenants(*)')
    .eq('id', demoSessionId)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ isDemoMode: false });
  }

  return NextResponse.json({
    isDemoMode: true,
    expiresAt: session.expires_at,
    timeRemaining: new Date(session.expires_at).getTime() - Date.now(),
    tenantName: session.tenants?.name,
    userName: session.profiles?.display_name
  });
}
```

#### `POST /api/demo/track` - Track Feature Usage

```typescript
// app/api/demo/track/route.ts

export async function POST(request: Request) {
  const { feature } = await request.json();
  const demoSessionId = request.cookies.get('demo_session_id')?.value;

  if (!demoSessionId) {
    return NextResponse.json({ success: false });
  }

  const supabase = createClient();

  // Append feature to features_used array
  await supabase.rpc('add_demo_feature_usage', {
    session_id: demoSessionId,
    feature_name: feature
  });

  return NextResponse.json({ success: true });
}
```

```sql
-- Supporting database function
CREATE OR REPLACE FUNCTION add_demo_feature_usage(
  session_id UUID,
  feature_name TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE demo_sessions
  SET features_used = features_used || jsonb_build_object(
    'feature', feature_name,
    'timestamp', now()
  )
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `POST /api/demo/convert` - Mark Conversion

```typescript
// app/api/demo/convert/route.ts

export async function POST(request: Request) {
  const demoSessionId = request.cookies.get('demo_session_id')?.value;

  if (!demoSessionId) {
    return NextResponse.json({ error: 'No demo session' }, { status: 400 });
  }

  const supabase = createClient();

  await supabase
    .from('demo_sessions')
    .update({
      converted: true,
      ended_at: new Date().toISOString()
    })
    .eq('id', demoSessionId);

  // Clear demo cookie
  cookies().delete('demo_session_id');

  return NextResponse.json({ success: true });
}
```

---

## 📚 Content Strategy

### Curated Demo Content

**Objective:** Show the best 15-20 activities that represent Lekbanken's breadth and quality.

#### Selection Criteria

1. **Diversity:** Cover all major categories
   - Icebreakers (3 lekar)
   - Energizers (3 lekar)
   - Team building (3 lekar)
   - Reflection (2 lekar)
   - Problem solving (2 lekar)
   - Creative (2 lekar)

2. **Simplicity:** Activities that are easy to understand quickly
   - Clear instructions
   - Minimal props needed
   - Universal appeal (not culture-specific)

3. **Visual Appeal:** Activities with good imagery/icons
   - Representative of quality
   - Engaging thumbnails

4. **Engagement Potential:** Activities that demonstrate features
   - QR codes
   - Gamification
   - Session planning
   - Progress tracking

#### Implementation

```sql
-- supabase/seeds/demo_curated_activities.sql

-- Step 1: Flag existing global activities as demo content
UPDATE activities
SET is_demo_content = true
WHERE name IN (
  -- Icebreakers
  'Leken om hatten',
  'Fruktsallad',
  'Två sanningar och en lögn',

  -- Energizers
  'Energi-cirkeln',
  'Klapp-kedjan',
  'Rysningen',

  -- Team building
  'Tidskapseln',
  'Byggbron',
  'Kreativ problemlösning',

  -- Reflection
  'Fem fingrar',
  'Dagboksskrivning',

  -- Problem solving
  'Escape Room Light',
  'Mysterieboxen',

  -- Creative
  'Improvisationsteater',
  'Berättelsestafett'
)
AND is_global = true;

-- Step 2: Verify count
SELECT COUNT(*) as demo_activities_count
FROM activities
WHERE is_demo_content = true;
-- Expected: 15-20

-- Step 3: Create demo-specific example sessions
INSERT INTO sessions (
  tenant_id,
  name,
  description,
  created_by,
  status,
  settings
)
SELECT
  (SELECT id FROM tenants WHERE demo_flag = true LIMIT 1),
  'Demo: Team Building Workshop',
  'En komplett workshop för teambuilding med 5 aktiviteter',
  (SELECT id FROM profiles WHERE is_demo_user = true LIMIT 1),
  'template',
  jsonb_build_object(
    'duration_minutes', 90,
    'participants_min', 5,
    'participants_max', 20,
    'is_demo', true
  )
;
```

### Content Access Matrix

| User Type | Global Content | Demo Content | Own Content |
|-----------|----------------|--------------|-------------|
| Regular User | ✅ All | N/A | ✅ Yes |
| Demo User | ❌ None | ✅ Curated 15-20 | ✅ Created in session |
| System Admin | ✅ All | ✅ All | ✅ All |

---

## ⏰ Lifecycle Management

### Auto-Cleanup Strategy

#### Nightly Cleanup Job

```typescript
// supabase/functions/cleanup-demo-data/index.ts

import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role for admin access
  );

  console.log('Starting demo cleanup...');

  // 1. Delete expired demo sessions
  const { data: expiredSessions } = await supabase
    .from('demo_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  console.log(`Deleted ${expiredSessions?.length || 0} expired sessions`);

  // 2. Delete old completed demo sessions (>24h old)
  const { data: oldSessions } = await supabase
    .from('demo_sessions')
    .delete()
    .not('ended_at', 'is', null)
    .lt('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .select('id');

  console.log(`Deleted ${oldSessions?.length || 0} old completed sessions`);

  // 3. Reset demo user progress (XP, achievements)
  // Only reset users that haven't been used in last 2 hours
  const { data: resetUsers } = await supabase
    .from('profiles')
    .update({
      experience_points: 0,
      level: 1,
      achievements: []
    })
    .eq('is_demo_user', true)
    .lt('demo_last_used_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .select('id');

  console.log(`Reset ${resetUsers?.length || 0} demo user profiles`);

  // 4. Delete demo user created sessions (keep templates)
  const { data: demoUserIds } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_demo_user', true);

  if (demoUserIds && demoUserIds.length > 0) {
    const { data: deletedSessions } = await supabase
      .from('sessions')
      .delete()
      .in('created_by', demoUserIds.map(u => u.id))
      .neq('status', 'template') // Keep templates
      .select('id');

    console.log(`Deleted ${deletedSessions?.length || 0} demo user sessions`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      cleaned: {
        expiredSessions: expiredSessions?.length || 0,
        oldSessions: oldSessions?.length || 0,
        resetUsers: resetUsers?.length || 0,
        deletedSessions: 0
      }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

#### Scheduling with Supabase Cron

```sql
-- In Supabase Dashboard: Database > Extensions
-- Enable pg_cron

-- Schedule cleanup function to run nightly at 3 AM UTC
SELECT cron.schedule(
  'cleanup-demo-data',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-demo-data',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

### Session Timeout Handling

#### Client-Side Timeout Warning

```typescript
// hooks/useDemoTimeout.ts (NEW)

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useDemoTimeout(expiresAt: string) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeRemaining(remaining);

      // Show warning at 10 minutes remaining
      if (remaining < 10 * 60 * 1000 && remaining > 0) {
        setShowWarning(true);
      }

      // Session expired
      if (remaining <= 0) {
        clearInterval(interval);
        router.push('/demo-expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, router]);

  return { timeRemaining, showWarning };
}
```

---

## 🛡️ Security Considerations

### Threat Model

| Threat | Mitigation | Priority |
|--------|------------|----------|
| **Demo data modification via Supabase client** | RLS policies | 🔴 Critical |
| **Bot abuse of demo endpoint** | Rate limiting + Captcha | 🟠 High |
| **Demo user pool exhaustion** | Rotation + monitoring | 🟠 High |
| **Content scraping** | Rate limiting | 🟡 Medium |
| **XSS via demo content** | Same as regular content (sanitization) | 🟡 Medium |
| **Session hijacking** | HttpOnly cookies + HTTPS | 🟡 Medium |

### Security Checklist

- [ ] RLS policies enforce demo restrictions at DB level
- [ ] API routes use shared demo protection middleware
- [ ] Demo cookies are HttpOnly and Secure
- [ ] Demo subdomain uses HTTPS only
- [ ] Rate limiting on `/auth/demo` endpoint (max 3 per IP per hour)
- [ ] Demo user passwords are environment variables (not in code)
- [ ] Service role key is never exposed to client
- [ ] Demo sessions auto-expire after 2 hours
- [ ] Cleanup function runs with service role (not user permissions)
- [ ] Demo content is sanitized same as regular content
- [ ] No PII (Personally Identifiable Information) in demo data
- [ ] Analytics data is anonymized

---

## 📈 Performance & Scalability

### Expected Load

| Metric | Estimated Value | Notes |
|--------|----------------|-------|
| Concurrent demo users | 100-500 | Peak during marketing campaigns |
| Demo sessions per day | 500-1000 | Assuming 5% landing page conversion |
| User pool size | 10 users | Rotate every 2 hours = 120 sessions/day per user |
| Database queries per session | ~100 | Browse activities, create session, track progress |
| Storage per demo session | <1 MB | Minimal session data |

### Scalability Considerations

#### Database Indexes (Already Specified)
```sql
-- ✅ All critical indexes defined in schema section
CREATE INDEX idx_tenants_demo_flag ON tenants(demo_flag);
CREATE INDEX idx_activities_demo_content ON activities(is_demo_content);
CREATE INDEX idx_profiles_demo_users ON profiles(is_demo_user, demo_last_used_at);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions(expires_at);
```

#### Caching Strategy

```typescript
// Cache demo tenant ID (rarely changes)
const DEMO_TENANT_CACHE_KEY = 'demo:tenant_id';
const DEMO_TENANT_TTL = 3600; // 1 hour

async function getDemoTenantId(): Promise<string> {
  // Check cache first (Redis or similar)
  const cached = await cache.get(DEMO_TENANT_CACHE_KEY);
  if (cached) return cached;

  // Query database
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('demo_flag', true)
    .single();

  // Cache result
  await cache.set(DEMO_TENANT_CACHE_KEY, data.id, DEMO_TENANT_TTL);

  return data.id;
}
```

#### Rate Limiting Implementation

```typescript
// Using Vercel Rate Limiting or Upstash Redis

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
  analytics: true,
});

// In /auth/demo route.ts
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(`demo_${ip}`);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many demo requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ... rest of logic
}
```

### Monitoring & Alerting

**Key Metrics to Monitor:**
- Demo session creation rate (should not exceed user pool capacity)
- Average session duration (low = poor UX)
- Conversion rate (demo → signup)
- Error rate on `/auth/demo` endpoint
- Database query performance (RLS policies overhead)
- Cleanup function success rate

**Alerts to Configure:**
- Alert if demo user pool exhausted (all users active)
- Alert if cleanup function fails for 2+ consecutive days
- Alert if demo session creation drops significantly (broken flow)
- Alert if demo-related errors spike

---

## 🔄 Deployment Plan

### Phase 1: Database (Week 1)
1. Run migrations to add new columns
2. Create RLS policies
3. Create database functions
4. Seed demo tenant and user pool
5. Verify with test queries

### Phase 2: Backend (Week 2)
1. Implement `/auth/demo` endpoint
2. Add demo detection to proxy.ts
3. Create shared protection middleware
4. Deploy cleanup function
5. Configure cron job

### Phase 3: Frontend (Week 3)
1. Build demo UI components
2. Add demo banner to app layout
3. Implement feature gates
4. Create onboarding flow
5. Add conversion CTAs

### Phase 4: Integration (Week 4)
1. Add demo CTA to landing page
2. Configure DNS for demo subdomain
3. Set up analytics tracking
4. Configure rate limiting
5. End-to-end testing

### Phase 5: Launch (Week 5)
1. Soft launch to internal team
2. Monitor metrics for 1 week
3. Fix any issues
4. Public launch
5. Marketing campaign

---

## 📝 Conclusion

This technical specification provides a complete blueprint for implementing an enterprise-grade demo experience in Lekbanken. The architecture prioritizes:

- **Security:** Multi-layer protection (RLS + API + UI)
- **Isolation:** Complete separation from production data
- **Conversion:** Strategic UX to drive signups
- **Maintenance:** Auto-cleanup and self-healing
- **Scalability:** Designed to handle 1000+ demo sessions/day

**Next Steps:**
1. Review and approve this specification
2. Begin implementation with Phase 1 (Database)
3. Follow the detailed implementation plan document

---

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Authors:** Claude Code Analysis Team
**Status:** Ready for Implementation Review
