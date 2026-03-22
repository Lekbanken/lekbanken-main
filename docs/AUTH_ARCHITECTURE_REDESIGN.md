# Authentication & Authorization Architecture Redesign

## Metadata

- Owner: -
- Status: draft
- Date: 2025-12-15
- Last updated: 2026-03-21
- Last validated: -

> Draft auth and authorization redesign proposal for server-first auth, tenant resolution, and multi-surface role handling.

**Version:** 1.0  
**Date:** 2025-12-15  
**Status:** Proposal  

---

## Executive Summary

This document proposes a complete redesign of Lekbanken's authentication, authorization, and multi-tenant architecture. The goal is to create a **robust, scalable, and consistent** system across all product surfaces (`/app`, `/admin`, `/marketing`, `/sandbox`).

### Core Problems Being Solved

1. **Profile sync issues on page refresh** - `userProfile` returns `null` after hard refresh
2. **Race conditions** between `initAuth()` and `onAuthStateChange`
3. **Inconsistent loading states** causing "perpetual loading" or flash of wrong content
4. **Two role systems** - `public.users.role` vs `auth.users.app_metadata.role`
5. **Tenant resolution inconsistency** - cookie vs URL vs user selection

---

## 1. Ideal Target Architecture

### 1.1 Auth State: Server vs Client

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser Request                                                 │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │   Middleware    │  ← Reads session from cookies              │
│  │   (proxy.ts)    │  ← Sets x-user-id, x-tenant-id headers     │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Server Layout  │  ← Fetches user + profile via RLS client   │
│  │  (layout.tsx)   │  ← Passes data as props to client          │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Client Provider │  ← Hydrates with server data (no refetch)  │
│  │  (AuthProvider) │  ← Only listens for auth changes           │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle: **Server-First Auth**

| Responsibility | Server | Client |
|----------------|--------|--------|
| Session validation | ✅ Middleware | ❌ |
| User profile fetch | ✅ Layout/Page | Hydrate only |
| Tenant resolution | ✅ Middleware | Read from context |
| Auth state changes | ❌ | ✅ Listen only |
| Sign in/out actions | ❌ | ✅ Trigger, then redirect |

### 1.2 Provider Structure (Avoiding Perpetual Loading)

```tsx
// app/providers.tsx - SINGLE entry point for all providers
export async function Providers({ children }: { children: ReactNode }) {
  // Server-side: fetch auth data ONCE
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile: UserProfile | null = null;
  let tenants: TenantWithMembership[] = [];
  
  if (user) {
    const [profileResult, tenantsResult] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('user_tenant_memberships')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user.id)
    ]);
    profile = profileResult.data;
    tenants = tenantsResult.data ?? [];
  }

  // Pass to client as initial state - NO client-side refetch needed
  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <TenantProvider initialTenants={tenants}>
        <PreferencesProvider>
          {children}
        </PreferencesProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
```

```tsx
// lib/supabase/auth.tsx - Client provider (SIMPLIFIED)
export function AuthProvider({ 
  children, 
  initialUser, 
  initialProfile 
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false); // NOT true by default!

  // Only listen for CHANGES, don't refetch on mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          window.location.href = '/auth/login';
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Fetch profile only on actual sign-in, not on refresh
          const profile = await fetchProfile(session.user.id);
          setUserProfile(profile);
        }
        
        // TOKEN_REFRESHED - just update user, keep profile
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  // isLoading is ONLY true during explicit auth operations
  const value = {
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user,
    // ... methods
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 1.3 Route Protection Strategy

| Layer | Responsibility | When to Use |
|-------|----------------|-------------|
| **Middleware** | Fast auth check, redirects | All protected routes |
| **Server Layout** | Data fetching, role checks | Authenticated layouts |
| **Page Component** | Feature-specific guards | Granular permissions |
| **RLS Policies** | Data access control | Always (defense in depth) |

#### Middleware (proxy.ts) - Gate 1

```typescript
// proxy.ts - EXPANDED
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Surface detection
  const surface = detectSurface(pathname);
  
  // Marketing: no auth required, pass through
  if (surface === 'marketing') {
    return NextResponse.next();
  }
  
  // Sandbox: optional auth, pass through
  if (surface === 'sandbox') {
    return NextResponse.next();
  }
  
  // App/Admin: require auth
  const supabase = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirectToLogin(request);
  }
  
  // Admin: require admin role
  if (surface === 'admin') {
    const isAdmin = await checkAdminRole(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }
  
  // Tenant resolution for /app
  if (surface === 'app') {
    const tenantId = await resolveTenant(request, user.id);
    if (!tenantId) {
      return NextResponse.redirect(new URL('/app/select-tenant', request.url));
    }
    // Set tenant header for downstream
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenantId);
    return response;
  }
  
  return NextResponse.next();
}

function detectSurface(pathname: string): Surface {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/app')) return 'app';
  if (pathname.startsWith('/sandbox')) return 'sandbox';
  return 'marketing';
}
```

#### Server Layout - Gate 2

```tsx
// app/app/layout.tsx
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Middleware should have caught this, but defense in depth
  if (!user) {
    redirect('/auth/login');
  }
  
  // Fetch all data needed for app surface
  const [profile, currentTenant] = await Promise.all([
    getProfile(supabase, user.id),
    getCurrentTenant(supabase, user.id),
  ]);
  
  return (
    <AppShell user={user} profile={profile} tenant={currentTenant}>
      {children}
    </AppShell>
  );
}
```

### 1.4 Session Persistence

```
┌────────────────────────────────────────────────────────────┐
│                  SESSION FLOW                               │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Login                                                      │
│    │                                                        │
│    ▼                                                        │
│  Supabase sets cookies:                                     │
│    - sb-access-token (httpOnly, secure)                    │
│    - sb-refresh-token (httpOnly, secure)                   │
│                                                             │
│  Page Refresh                                               │
│    │                                                        │
│    ▼                                                        │
│  Middleware reads cookies → validates with Supabase        │
│    │                                                        │
│    ├─ Valid → Continue to Server Layout                    │
│    │                                                        │
│    └─ Invalid/Expired → Supabase auto-refreshes            │
│         │                                                   │
│         ├─ Refresh success → New cookies set               │
│         │                                                   │
│         └─ Refresh fail → Redirect to login                │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Key Configuration:**

```typescript
// lib/supabase/client.ts
const supabase = createBrowserClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      // Use cookies for SSR compatibility
      getItem: (key) => getCookie(key),
      setItem: (key, value) => setCookie(key, value),
      removeItem: (key) => removeCookie(key),
    },
  },
});
```

### 1.5 Multi-Tenant Resolution

```
┌─────────────────────────────────────────────────────────────┐
│              TENANT RESOLUTION STRATEGY                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request comes in                                            │
│       │                                                      │
│       ▼                                                      │
│  1. Check lb_tenant cookie                                   │
│       │                                                      │
│       ├─ Has value → Validate user has access               │
│       │     │                                                │
│       │     ├─ Valid → Use this tenant                      │
│       │     └─ Invalid → Clear cookie, go to step 2        │
│       │                                                      │
│       └─ No cookie → Step 2                                 │
│                                                              │
│  2. Check user's tenant memberships                          │
│       │                                                      │
│       ├─ Has primary tenant → Use primary                   │
│       ├─ Has exactly one → Use that one                     │
│       ├─ Has multiple → Redirect to /app/select-tenant      │
│       └─ Has none → Redirect to /app/create-tenant          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Roles & Permissions Model

### 2.1 Single Coherent Role Model

**Current Problem:** Two role systems exist:
- `public.users.role` (member, admin, etc.)
- `auth.users.app_metadata.role` (set during signup)

**Solution:** Use a **two-tier role system** with clear separation:

```typescript
// types/auth.ts

// Global roles - what the user can do system-wide
export type GlobalRole = 
  | 'system_admin'      // Full platform access
  | 'private_user'      // Regular authenticated user
  | 'demo_user';        // Limited demo access

// Tenant roles - what the user can do within a specific tenant
export type TenantRole = 
  | 'owner'             // Full tenant control
  | 'admin'             // Tenant admin (users, settings)
  | 'editor'            // Can modify content
  | 'member';           // Read + participate

// Effective permissions derived from roles
export type Permission =
  // System-level
  | 'system.admin.access'
  | 'system.tenants.manage'
  | 'system.users.manage'
  // Tenant-level
  | 'tenant.settings.edit'
  | 'tenant.members.manage'
  | 'tenant.content.edit'
  | 'tenant.content.view'
  | 'tenant.games.play';

// Role to permission mapping
export const ROLE_PERMISSIONS: Record<GlobalRole | TenantRole, Permission[]> = {
  system_admin: [
    'system.admin.access',
    'system.tenants.manage',
    'system.users.manage',
    // + all tenant permissions
  ],
  private_user: [],
  demo_user: ['tenant.games.play'],
  owner: [
    'tenant.settings.edit',
    'tenant.members.manage',
    'tenant.content.edit',
    'tenant.content.view',
    'tenant.games.play',
  ],
  admin: [
    'tenant.members.manage',
    'tenant.content.edit',
    'tenant.content.view',
    'tenant.games.play',
  ],
  editor: [
    'tenant.content.edit',
    'tenant.content.view',
    'tenant.games.play',
  ],
  member: [
    'tenant.content.view',
    'tenant.games.play',
  ],
};
```

### 2.2 Database Schema (Single Source of Truth)

```sql
-- public.users - stores global_role only
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS role;  -- Remove the old 'role' column

ALTER TABLE public.users
  ADD COLUMN global_role global_role_enum NOT NULL DEFAULT 'private_user';

-- user_tenant_memberships - stores tenant-specific role
ALTER TABLE public.user_tenant_memberships
  ALTER COLUMN role TYPE tenant_role_enum 
  USING role::tenant_role_enum;

-- Remove role from auth.users.app_metadata (handled by trigger)
-- The trigger syncs global_role to app_metadata for Supabase compatibility
```

### 2.3 Enforcement Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              PERMISSION CHECK FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Action                                                 │
│       │                                                      │
│       ▼                                                      │
│  App-Level Guard (usePermission hook)                        │
│       │                                                      │
│       ├─ Check global_role permissions                      │
│       ├─ Check tenant_role permissions (if tenant context)  │
│       │                                                      │
│       ├─ Allowed → Make API request                         │
│       └─ Denied → Show error / redirect                     │
│                                                              │
│  API Route                                                   │
│       │                                                      │
│       ▼                                                      │
│  Server-Side Permission Check                                │
│       │                                                      │
│       ├─ Verify session                                     │
│       ├─ Check permissions (same logic as client)           │
│       │                                                      │
│       ├─ Allowed → Execute query with RLS                   │
│       └─ Denied → Return 403                                │
│                                                              │
│  RLS Policy (Final gate)                                     │
│       │                                                      │
│       └─ Enforces row-level access based on user_id/tenant  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Permission Hook

```typescript
// lib/hooks/usePermission.ts
export function usePermission() {
  const { user, userProfile } = useAuth();
  const { currentTenant, membership } = useTenant();

  const can = useCallback((permission: Permission): boolean => {
    if (!user || !userProfile) return false;

    // System admin bypasses all checks
    if (userProfile.global_role === 'system_admin') return true;

    // Check global permissions
    const globalPerms = ROLE_PERMISSIONS[userProfile.global_role] ?? [];
    if (globalPerms.includes(permission)) return true;

    // Check tenant permissions (if in tenant context)
    if (membership?.role) {
      const tenantPerms = ROLE_PERMISSIONS[membership.role] ?? [];
      if (tenantPerms.includes(permission)) return true;
    }

    return false;
  }, [user, userProfile, membership]);

  return { can };
}
```

### 2.4 RLS Policy Alignment

```sql
-- Ensure RLS uses the SAME role logic as app code

-- Helper function for permission checks
CREATE OR REPLACE FUNCTION public.has_permission(
  required_permission text,
  target_tenant_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_global_role text;
  v_tenant_role text;
BEGIN
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Get global role
  SELECT global_role INTO v_global_role 
  FROM public.users WHERE id = v_user_id;
  
  -- System admin can do anything
  IF v_global_role = 'system_admin' THEN RETURN TRUE; END IF;
  
  -- Check tenant role if tenant context provided
  IF target_tenant_id IS NOT NULL THEN
    SELECT role INTO v_tenant_role
    FROM public.user_tenant_memberships
    WHERE user_id = v_user_id AND tenant_id = target_tenant_id;
    
    -- Map role to permissions (mirrors app-level logic)
    RETURN CASE v_tenant_role
      WHEN 'owner' THEN required_permission = ANY(ARRAY[
        'tenant.settings.edit', 'tenant.members.manage', 
        'tenant.content.edit', 'tenant.content.view', 'tenant.games.play'
      ])
      WHEN 'admin' THEN required_permission = ANY(ARRAY[
        'tenant.members.manage', 'tenant.content.edit', 
        'tenant.content.view', 'tenant.games.play'
      ])
      WHEN 'editor' THEN required_permission = ANY(ARRAY[
        'tenant.content.edit', 'tenant.content.view', 'tenant.games.play'
      ])
      WHEN 'member' THEN required_permission = ANY(ARRAY[
        'tenant.content.view', 'tenant.games.play'
      ])
      ELSE FALSE
    END;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 3. Multi-Tenant Strategy Options

### 3.1 Comparison Matrix

| Aspect | Domain-Based | Path-Based | Cookie-Based |
|--------|--------------|------------|--------------|
| **URL Structure** | `acme.lekbanken.no` | `/app/acme/games` | `/app/games` |
| **SEO** | ✅ Great for tenant | ⚠️ Moderate | ❌ No tenant SEO |
| **Setup Complexity** | 🔴 DNS, SSL, routing | 🟡 Routing only | 🟢 Simplest |
| **Deep Links** | ✅ Tenant-aware | ✅ Tenant-aware | ❌ Requires cookie |
| **White-labeling** | ✅ Full support | ⚠️ Partial | ❌ Not possible |
| **Sharing Links** | ✅ Works naturally | ✅ Works naturally | ❌ Requires login |
| **Tenant Switching** | 🔴 Domain change | 🟡 URL change | 🟢 Instant |
| **CDN/Caching** | 🔴 Per-domain | 🟡 Path-based | 🟢 User-based |

### 3.2 Recommended Approach for Lekbanken

**Hybrid: Cookie-based with Path Override**

```
Primary: Cookie-based (lb_tenant cookie)
Override: Path-based for explicit tenant context (/app/t/[tenantId]/...)
Future: Domain-based for white-label customers (phase 2)
```

**Rationale:**
1. Cookie-based is simplest for MVP and current scale
2. Path override allows sharing tenant-specific links
3. Domain-based can be added later for enterprise customers

### 3.3 Implementation

```typescript
// lib/tenant/resolve.ts
export async function resolveTenant(
  request: NextRequest,
  userId: string
): Promise<TenantResolution> {
  const pathname = request.nextUrl.pathname;
  
  // 1. Check for explicit tenant in path: /app/t/[tenantId]/...
  const pathMatch = pathname.match(/^\/app\/t\/([a-f0-9-]+)\//);
  if (pathMatch) {
    const tenantId = pathMatch[1];
    const hasAccess = await validateTenantAccess(userId, tenantId);
    if (hasAccess) {
      return { tenantId, source: 'path' };
    }
    // No access - will redirect to access request
    return { tenantId: null, source: 'path', error: 'no_access' };
  }
  
  // 2. Check cookie
  const cookieTenantId = request.cookies.get('lb_tenant')?.value;
  if (cookieTenantId) {
    const hasAccess = await validateTenantAccess(userId, cookieTenantId);
    if (hasAccess) {
      return { tenantId: cookieTenantId, source: 'cookie' };
    }
    // Cookie invalid - clear it
    return { tenantId: null, source: 'cookie', clearCookie: true };
  }
  
  // 3. Fall back to user's primary/default tenant
  const memberships = await getUserMemberships(userId);
  
  if (memberships.length === 0) {
    return { tenantId: null, source: 'none', redirect: '/app/create-tenant' };
  }
  
  if (memberships.length === 1) {
    return { tenantId: memberships[0].tenant_id, source: 'auto' };
  }
  
  const primary = memberships.find(m => m.is_primary);
  if (primary) {
    return { tenantId: primary.tenant_id, source: 'primary' };
  }
  
  // Multiple tenants, no primary - user must choose
  return { tenantId: null, source: 'multiple', redirect: '/app/select-tenant' };
}
```

---

## 4. Redirect Semantics (Canonical Rules)

### 4.1 Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIRECT DECISION TREE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request to /app/* or /admin/*                                   │
│       │                                                          │
│       ▼                                                          │
│  Is user authenticated?                                          │
│       │                                                          │
│       ├─ NO → /auth/login?redirect={current_path}               │
│       │                                                          │
│       └─ YES ──────────────────────────────────────────────┐    │
│                                                             │    │
│  Is this /admin/*?                                          │    │
│       │                                                     │    │
│       ├─ YES → Is user system_admin?                       │    │
│       │         │                                           │    │
│       │         ├─ NO → /app (with toast "Not authorized") │    │
│       │         └─ YES → Continue to admin                 │    │
│       │                                                     │    │
│       └─ NO (is /app/*) ───────────────────────────────────┘    │
│                                                                  │
│  Does user have tenant access?                                   │
│       │                                                          │
│       ├─ NO TENANTS → /app/create-tenant                        │
│       ├─ MULTIPLE, NONE SELECTED → /app/select-tenant           │
│       ├─ NO ACCESS TO SELECTED → /app/request-access?t={id}     │
│       └─ YES → Continue to app                                  │
│                                                                  │
│  Request to /* (marketing)                                       │
│       │                                                          │
│       └─ Always allow (no redirects)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation

```typescript
// middleware redirect helpers
const REDIRECT_RULES: RedirectRule[] = [
  {
    condition: (ctx) => !ctx.user && ctx.surface === 'app',
    redirect: (ctx) => `/auth/login?redirect=${encodeURIComponent(ctx.pathname)}`,
  },
  {
    condition: (ctx) => !ctx.user && ctx.surface === 'admin',
    redirect: () => '/auth/login?redirect=/admin',
  },
  {
    condition: (ctx) => ctx.surface === 'admin' && ctx.globalRole !== 'system_admin',
    redirect: () => '/app',
    flash: 'Du har inte behörighet till admin',
  },
  {
    condition: (ctx) => ctx.surface === 'app' && ctx.tenantCount === 0,
    redirect: () => '/app/create-tenant',
  },
  {
    condition: (ctx) => ctx.surface === 'app' && !ctx.tenantId && ctx.tenantCount > 1,
    redirect: () => '/app/select-tenant',
  },
];

export function getRedirect(ctx: RedirectContext): RedirectResult | null {
  for (const rule of REDIRECT_RULES) {
    if (rule.condition(ctx)) {
      return {
        url: rule.redirect(ctx),
        flash: rule.flash,
      };
    }
  }
  return null;
}
```

### 4.3 Marketing Route Protection

```typescript
// Marketing routes should NEVER redirect due to auth issues
// They should gracefully handle auth state

// components/marketing/header.tsx
export function Header() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Never show loading state on marketing - use skeleton or nothing
  if (isLoading) {
    return <HeaderSkeleton />;
  }
  
  return (
    <header>
      {/* ... */}
      {isAuthenticated ? (
        <ProfileMenu />  // Has internal fallbacks
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
```

---

## 5. Migration Plan (Phased, Low Risk)

### Phase 0: Preparation (Week 1)

| Task | Description | Risk |
|------|-------------|------|
| Feature flags | Add flags for new auth system | Low |
| Monitoring | Add auth-specific logging/metrics | Low |
| Backup | Document current behavior for rollback | Low |

```typescript
// lib/config/features.ts
export const FEATURES = {
  NEW_AUTH_SYSTEM: process.env.NEW_AUTH_SYSTEM === 'true',
  SERVER_FIRST_AUTH: process.env.SERVER_FIRST_AUTH === 'true',
};
```

### Phase 1: Sandbox Implementation (Week 2)

**Goal:** Create canonical reference implementation in `/sandbox`

| Task | Description |
|------|-------------|
| 1.1 | Create `/sandbox/auth-demo` with new provider structure |
| 1.2 | Implement server-first auth in sandbox layout |
| 1.3 | Add comprehensive logging for debugging |
| 1.4 | Create test cases for all auth scenarios |

```typescript
// app/sandbox/auth-demo/layout.tsx
export default async function AuthDemoLayout({ children }) {
  // This is the REFERENCE implementation
  const authData = await getServerAuthData();
  
  return (
    <NewAuthProvider initialData={authData}>
      <div className="sandbox-auth-demo">
        <AuthDebugPanel /> {/* Shows all auth state */}
        {children}
      </div>
    </NewAuthProvider>
  );
}
```

**Test Scenarios:**
- [ ] Fresh login → correct profile displayed
- [ ] Page refresh → profile persists
- [ ] Tab switch after 1 hour → token refreshes
- [ ] Multiple tabs → state syncs
- [ ] Logout in one tab → all tabs logout
- [ ] Invalid session → redirects to login

### Phase 2: App Surface Migration (Week 3)

| Task | Description | Rollback |
|------|-------------|----------|
| 2.1 | Update `/app` layout to server-first | Feature flag |
| 2.2 | Migrate AuthProvider to use initial data | Revert commit |
| 2.3 | Update TenantProvider similarly | Revert commit |
| 2.4 | Remove client-side auth refetch | Feature flag |
| 2.5 | Test all app routes | Automated tests |

```typescript
// app/app/layout.tsx - AFTER migration
export default async function AppLayout({ children }) {
  if (!FEATURES.SERVER_FIRST_AUTH) {
    // Old behavior
    return <OldAppLayout>{children}</OldAppLayout>;
  }
  
  // New behavior
  const supabase = await createServerRlsClient();
  const { user, profile, tenant } = await getAuthContext(supabase);
  
  if (!user) redirect('/auth/login');
  if (!tenant) redirect('/app/select-tenant');
  
  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <TenantProvider initialTenant={tenant}>
        <AppShell>{children}</AppShell>
      </TenantProvider>
    </AuthProvider>
  );
}
```

### Phase 3: Admin Surface Migration (Week 4)

| Task | Description |
|------|-------------|
| 3.1 | Update `/admin` layout similarly |
| 3.2 | Add system_admin role check in middleware |
| 3.3 | Test all admin routes |
| 3.4 | Verify RLS policies align |

### Phase 4: Marketing Hardening (Week 5)

| Task | Description |
|------|-------------|
| 4.1 | Ensure marketing never depends on auth loading |
| 4.2 | Add fallbacks/skeletons for auth-dependent UI |
| 4.3 | Test marketing with auth in various states |

### Phase 5: Cleanup & Documentation (Week 6)

| Task | Description |
|------|-------------|
| 5.1 | Remove feature flags |
| 5.2 | Remove old auth code |
| 5.3 | Update all documentation |
| 5.4 | Create runbook for common issues |

### Rollback Strategy

```typescript
// Each phase has independent rollback capability

// 1. Feature flag rollback (instant)
FEATURES.SERVER_FIRST_AUTH = false;

// 2. Git rollback (minutes)
git revert <commit-hash>

// 3. Database rollback (prepared scripts)
-- migrations/rollback_20251215_auth.sql
-- Reverts role changes, triggers, etc.
```

---

## 6. Documentation Plan

### 6.1 Documentation Structure

```
docs/
├── architecture/
│   ├── AUTH_SYSTEM.md           # This document
│   ├── MULTI_TENANT.md          # Tenant resolution details
│   └── PERMISSIONS.md           # Role/permission model
│
├── guides/
│   ├── ADDING_PROTECTED_ROUTE.md
│   ├── ADDING_NEW_PERMISSION.md
│   ├── DEBUGGING_AUTH_ISSUES.md
│   └── TENANT_SETUP.md
│
├── runbooks/
│   ├── AUTH_INCIDENT_RESPONSE.md
│   └── USER_LOCKED_OUT.md
│
└── api/
    └── AUTH_API.md              # Auth-related API endpoints
```

### 6.2 Key Documents

#### ADDING_PROTECTED_ROUTE.md

```markdown
# Adding a New Protected Route

## Quick Checklist
- [ ] Route is under `/app` or `/admin` (auto-protected by middleware)
- [ ] Page component checks specific permissions (if needed)
- [ ] API routes validate session
- [ ] RLS policies cover data access

## Step-by-Step

### 1. Create the Page
\`\`\`tsx
// app/app/my-feature/page.tsx
export default async function MyFeaturePage() {
  // Server component - data is already authorized by RLS
  const data = await getData();
  return <MyFeature data={data} />;
}
\`\`\`

### 2. Add Permission Check (if granular control needed)
\`\`\`tsx
// Client component with permission check
'use client';
export function MyFeatureActions() {
  const { can } = usePermission();
  
  if (!can('my-feature.edit')) {
    return null; // or disabled state
  }
  
  return <EditButton />;
}
\`\`\`

### 3. Protect API Route
\`\`\`tsx
// app/api/my-feature/route.ts
export async function POST(request: Request) {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // RLS will enforce data access
  const { data, error } = await supabase.from('my_table').insert(...);
}
\`\`\`
```

### 6.3 Maintenance

- **Review Quarterly:** Auth patterns evolve with Next.js/Supabase updates
- **Incident-Driven Updates:** Add runbook entries after each auth incident
- **Onboarding:** New developers read AUTH_SYSTEM.md in first week

---

## Appendix A: File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/supabase/auth.tsx` | Modify | Server-first hydration, remove client refetch |
| `app/providers.tsx` | Modify | Add server data fetching |
| `proxy.ts` | Modify | Add role checks, tenant resolution |
| `lib/hooks/usePermission.ts` | New | Permission checking hook |
| `lib/tenant/resolve.ts` | New | Tenant resolution logic |
| `types/auth.ts` | New | Role/permission types |
| `supabase/migrations/` | New | Role consolidation migration |

---

## Appendix B: Testing Checklist

### Auth Flow Tests
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Logout
- [ ] Session refresh after 1 hour
- [ ] Page refresh maintains session
- [ ] Multiple browser tabs sync
- [ ] Incognito window requires login

### Permission Tests
- [ ] system_admin can access /admin
- [ ] private_user cannot access /admin
- [ ] tenant owner can manage members
- [ ] tenant member cannot manage members
- [ ] RLS prevents cross-tenant data access

### Multi-Tenant Tests
- [ ] User with one tenant auto-selects
- [ ] User with multiple tenants sees picker
- [ ] Tenant switch updates cookie
- [ ] Path-based tenant override works
- [ ] No tenant access shows request page

---

**Document Owner:** Engineering Team  
**Last Updated:** 2025-12-15  
**Next Review:** 2026-01-15
