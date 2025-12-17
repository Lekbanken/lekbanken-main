# Lekbanken Auth Database Schema

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- DB (migrations):
  - `supabase/migrations/20251209120000_accounts_domain.sql` (global_role_enum, handle_new_user, membership normalization, helper functions)
  - `supabase/migrations/20251208130000_role_enum_and_permissions.sql` (tenant_role_enum + helper function consolidation)
  - `supabase/migrations/20251216000000_consolidate_roles.sql` (legacy role → global_role)
  - `supabase/migrations/20251215000000_fix_profile_sync_on_update.sql` (profile sync hardening)
- Generated DB types:
  - `lib/supabase/database.types.ts`
- Runtime role derivation:
  - `lib/auth/role.ts`
  - `lib/auth/server-context.ts`
  - `lib/supabase/auth.tsx`

## Validation checklist

- `public.global_role_enum` matches `Database["public"]["Enums"]["global_role_enum"]`.
- `public.tenant_role_enum` matches `Database["public"]["Enums"]["tenant_role_enum"]`.
- `public.handle_new_user()` exists and is wired to `auth.users` via trigger.
- Memberships are queried via `user_tenant_memberships` in code (treat `tenant_memberships` as compatibility-only).
- Helper functions (`is_system_admin`, `get_user_tenant_ids`, `has_tenant_role`) match current migrations and include system-admin bypass.

---

## Current schema (source of truth)

Den här sektionen är den **aktuella** referensen. För exakta kolumner/typer: se `lib/supabase/database.types.ts` och migrations.

### Enums

- `global_role_enum`: `system_admin`, `private_user`, `demo_private_user`, `member`
- `tenant_role_enum`: `owner`, `admin`, `editor`, `member` + (kan ha extra värden: `organisation_admin`, `organisation_user`, `demo_org_admin`, `demo_org_user`)

### Core tables

- `public.users` ("profile"/konto, synkas från `auth.users`)
  - Nyckelkolumner (se typer): `id`, `email`, `full_name`, `avatar_url`, `language`, `email_verified`, `mfa_enforced`, `global_role`.
  - `role` finns kvar för bakåtkompatibilitet men är **deprecated** (se `20251216000000_consolidate_roles.sql`).

- `public.tenants` (organisationer)
  - Många fält finns (slug, metadata, kontaktfält, status/type, etc). Undvik att duplicera schemat i text — använd genererade typer + migrations.

- `public.user_tenant_memberships` (kan vara tabell eller view beroende på äldre schema)
  - Kod ska använda namnet `user_tenant_memberships` konsekvent.
  - `public.tenant_memberships` kan existera som view + INSTEAD OF rules för kompatibilitet (se `20251209120000_accounts_domain.sql`).
  - Nyckelkolumner: `user_id`, `tenant_id`, `role` (`tenant_role_enum`), `is_primary`, `status`, `seat_assignment_id`, timestamps.

### RLS helper functions (high level)

- `is_system_admin()` (och alias `is_global_admin()`): avgör global admin via `public.users.global_role = 'system_admin'`.
- `get_user_tenant_ids()`:
  - För `system_admin`: returnerar alla tenant IDs.
  - För vanliga användare: returnerar aktiva memberships (status = `active`).
- `has_tenant_role(target_tenant, required_roles)`:
  - För `system_admin`: alltid `true`.
  - Annars: matchar membership på tenant + role (+ status = `active`).

---

## Legacy appendix (stale; pre-2025-12-17)

Det som följer var en äldre "comprehensive" dump och kan innehålla felaktiga enums/kolumner/policies. Behålls tills det är helt bortstädat.

## 1. Core Auth Tables

### 1.1 `public.users`
Synced from Supabase `auth.users` via trigger. This is the main user profile table.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,                           -- Matches auth.users.id
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',        -- ENUM: 'user' | 'admin' | 'superadmin'
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_role` on `role`

**Notes:**
- Automatically populated when users sign up via `handle_new_user()` trigger
- No direct foreign key to `auth.users` (managed by Supabase internally)

---

### 1.2 `public.tenants`
Multi-tenant organizations/schools that users belong to.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,                      -- URL-friendly identifier
  description TEXT,
  logo_url TEXT,
  type tenant_type NOT NULL DEFAULT 'school',   -- ENUM: 'school' | 'district' | 'enterprise'
  settings JSONB DEFAULT '{}',
  
  -- Subscription fields (added in migration 14)
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_tenants_type` on `type`
- `idx_tenants_slug` on `slug` (unique)

---

### 1.3 `public.user_tenant_memberships`
Many-to-many junction table linking users to tenants with role-based access.

```sql
CREATE TABLE user_tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'member',   -- ENUM: 'owner' | 'admin' | 'teacher' | 'member'
  permissions JSONB DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, tenant_id)
);
```

**Indexes:**
- `idx_user_tenant_memberships_user` on `user_id`
- `idx_user_tenant_memberships_tenant` on `tenant_id`

**Role Hierarchy:**
| Role | Permissions |
|------|-------------|
| `owner` | Full control, can delete tenant |
| `admin` | Manage users, content, settings |
| `teacher` | Create/manage own content |
| `member` | Read-only, participate in activities |

---

### 1.4 `public.payment_methods` (Migration 14)
Stores payment information per tenant.

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                           -- 'card', 'invoice', etc.
  provider TEXT NOT NULL,                       -- 'stripe', 'klarna', etc.
  provider_id TEXT,                             -- External reference
  last_four TEXT,                               -- Last 4 digits of card
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. Custom ENUM Types

```sql
-- User global roles
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');

-- Tenant/organization types
CREATE TYPE tenant_type AS ENUM ('school', 'district', 'enterprise');

-- User roles within a tenant
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'teacher', 'member');
```

---

## 3. RLS Helper Functions

### 3.1 `is_tenant_member(tenant_uuid)`
Checks if the current user is a member of a specific tenant.

```sql
CREATE OR REPLACE FUNCTION is_tenant_member(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
```

---

### 3.2 `get_user_tenant_ids()`
Returns array of all tenant IDs the current user belongs to.

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT tenant_id FROM user_tenant_memberships
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
```

---

### 3.3 `has_tenant_role(tenant_uuid, required_roles)`
Checks if user has one of the specified roles in a tenant.

```sql
CREATE OR REPLACE FUNCTION has_tenant_role(
  tenant_uuid UUID, 
  required_roles tenant_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_uuid
      AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
```

---

## 4. Auth Trigger

### `handle_new_user()` + `on_auth_user_created`
Automatically creates a `public.users` record when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 5. RLS Policies Summary

### 5.1 Users Table

| Policy | Operation | Rule |
|--------|-----------|------|
| `users_select_own` | SELECT | `auth.uid() = id` |
| `users_select_tenant_members` | SELECT | In same tenant via `get_user_tenant_ids()` |
| `users_update_own` | UPDATE | `auth.uid() = id` |
| `users_admin_all` | ALL | User has `role = 'admin'` or `'superadmin'` |

---

### 5.2 Tenants Table

| Policy | Operation | Rule |
|--------|-----------|------|
| `tenants_select_member` | SELECT | Member via `is_tenant_member(id)` |
| `tenants_insert_authenticated` | INSERT | Authenticated users |
| `tenants_update_admin` | UPDATE | `has_tenant_role(id, ARRAY['owner', 'admin'])` |
| `tenants_delete_owner` | DELETE | `has_tenant_role(id, ARRAY['owner'])` |

---

### 5.3 User Tenant Memberships Table

| Policy | Operation | Rule |
|--------|-----------|------|
| `memberships_select_member` | SELECT | `auth.uid() = user_id` OR same tenant |
| `memberships_insert_admin` | INSERT | Tenant admin/owner |
| `memberships_update_admin` | UPDATE | Tenant admin/owner |
| `memberships_delete_admin` | DELETE | Tenant admin/owner OR `auth.uid() = user_id` |

---

### 5.4 Payment Methods Table (Migration 14)

| Policy | Operation | Rule |
|--------|-----------|------|
| `payment_methods_tenant_admin` | ALL | `has_tenant_role(tenant_id, ARRAY['owner', 'admin'])` |

---

### 5.5 Other Tables with Auth-Based RLS

All domain tables follow a consistent pattern:

```sql
-- User can access their own records
CREATE POLICY {table}_user_select ON {table}
  FOR SELECT USING (auth.uid() = user_id);

-- Tenant members can access tenant resources
CREATE POLICY {table}_tenant_select ON {table}
  FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids()));

-- Admins have full access within tenant
CREATE POLICY {table}_admin_all ON {table}
  FOR ALL USING (
    has_tenant_role(tenant_id, ARRAY['owner'::tenant_role, 'admin'::tenant_role])
  );
```

**Tables following this pattern:**
- `products`, `games`, `game_sessions`, `game_scores`
- `notifications`, `notification_preferences`, `notification_templates`
- `friendships`, `friend_requests`, `user_blocks`
- `challenges`, `challenge_participants`
- `user_achievements`, `achievement_progress`
- `user_preferences`, `interest_profiles`, `content_recommendations`
- `plans`, `invoices`, `billing_events`

---

## 6. Relationships Diagram

```
┌──────────────────┐         ┌──────────────────────────┐
│   auth.users     │         │      public.tenants      │
│  (Supabase)      │         │                          │
│                  │         │  id (PK)                 │
│  id (PK)         │         │  name                    │
│  email           │         │  slug (unique)           │
│  ...             │         │  type (school|district|  │
└────────┬─────────┘         │       enterprise)        │
         │                   │  subscription_tier       │
         │ TRIGGER           │  ...                     │
         ▼                   └────────────┬─────────────┘
┌──────────────────┐                      │
│  public.users    │                      │
│                  │                      │
│  id (PK) ────────┼──────────────────────┤
│  email (unique)  │                      │
│  display_name    │     ┌────────────────┴───────────────┐
│  role (user|     │     │  user_tenant_memberships       │
│    admin|super)  │     │                                │
│  ...             │     │  id (PK)                       │
└────────┬─────────┘     │  user_id (FK) ─────────────────┤
         │               │  tenant_id (FK) ───────────────┘
         │               │  role (owner|admin|teacher|    
         └───────────────┤       member)                  │
                         │  is_primary                    │
                         │  permissions (JSONB)           │
                         └────────────────────────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────────┐
                         │  All domain tables reference   │
                         │  user_id → users(id)           │
                         │  tenant_id → tenants(id)       │
                         └────────────────────────────────┘
```

---

## 7. Security Considerations

### 7.1 SECURITY DEFINER Functions
All RLS helper functions use `SECURITY DEFINER` with locked `search_path`:
```sql
SECURITY DEFINER SET search_path = public
```
This ensures:
- Functions execute with definer's privileges (bypassing RLS internally)
- Prevents search_path injection attacks
- Only `authenticated` role is granted EXECUTE permission

### 7.2 Cascade Deletes
- Deleting a user cascades to: `user_tenant_memberships`, all user-related records
- Deleting a tenant cascades to: `user_tenant_memberships`, all tenant resources

### 7.3 Admin Bypass Pattern
Global admins (`role = 'admin'` or `'superadmin'` in `public.users`) have elevated access:
```sql
CREATE POLICY users_admin_all ON users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);
```

---

## 8. Migration Files Reference

| Migration | Description |
|-----------|-------------|
| `20251129000000_initial_schema.sql` | Core tables, ENUMs, RLS functions, trigger |
| `20251129000001_fix_rls_security.sql` | Adds `SECURITY DEFINER` + locked `search_path` |
| `20251129000014_tenant_enhancements.sql` | Adds tenant columns, payment_methods table |

---

## 9. Common Queries

### Check user's tenants
```sql
SELECT t.*, m.role 
FROM tenants t
JOIN user_tenant_memberships m ON m.tenant_id = t.id
WHERE m.user_id = auth.uid();
```

### Check if user is tenant admin
```sql
SELECT has_tenant_role('tenant-uuid-here', ARRAY['owner', 'admin']::tenant_role[]);
```

### Get user profile with primary tenant
```sql
SELECT u.*, t.name as primary_tenant_name
FROM users u
LEFT JOIN user_tenant_memberships m ON m.user_id = u.id AND m.is_primary = true
LEFT JOIN tenants t ON t.id = m.tenant_id
WHERE u.id = auth.uid();
```

---

*Generated from Supabase migrations on 2025*
