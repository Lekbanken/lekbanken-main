# 🔐 Lekbanken Authorization System – Complete Report

**Datum:** 2025-12-02  
**Undersökt av:** GitHub Copilot (Claude Opus 4.5)

---

## 📋 Executive Summary

Lekbanken har ett **flerskiktat auktoriseringssystem** som kontrollerar åtkomst på tre nivåer:

1. **Applikationsnivå** (Next.js middleware/proxy)
2. **Klientnivå** (React Context + useAuth hook)
3. **Databasnivå** (Supabase RLS policies)

Det finns **två typer av admin-roller** som är viktiga att förstå:

| Roll-typ | Lagras i | Kontrollerar |
|----------|----------|--------------|
| **Global Admin** | `auth.users.app_metadata.role = "admin"` | Åtkomst till `/admin` dashboard |
| **Tenant Admin** | `user_tenant_memberships.role = "admin"` | Åtkomst till tenant-specifik data via RLS |

---

## 1️⃣ Applikationsnivå – Middleware

### Fil: `proxy.ts` (⚠️ OBS: Bör heta `middleware.ts`)

```typescript
// Kontrollerar åtkomst till /admin/*
const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined;
const isAdmin = role === "admin";

if (!isAdmin) {
  return NextResponse.redirect("/auth/login");
}
```

**Nuvarande status:**
- ✅ Logik finns för att kontrollera admin-roll
- ⚠️ Filen heter `proxy.ts` – Next.js kräver `middleware.ts` för att den ska köras automatiskt
- ⚠️ Om `user` är `null` släpps requesten igenom (fallback till klient-sida)

**Hur rollen läses:**
1. Först: `user.app_metadata.role`
2. Fallback: `user.user_metadata.role`

---

## 2️⃣ Klientnivå – React Auth Context

### Fil: `lib/supabase/auth.tsx`

```typescript
interface AuthContextType {
  user: User | null                    // Supabase auth.users
  userProfile: UserProfile | null      // public.users tabell
  userRole: string | null              // Kombinerad roll
  isLoading: boolean
  isAuthenticated: boolean
  // ... metoder
}
```

**Hur `userRole` bestäms:**
```typescript
userRole: userProfile?.role || (user?.app_metadata?.role as string | undefined) || null
```

Prioritetsordning:
1. `public.users.role` (från databas-profil)
2. `auth.users.app_metadata.role` (från Supabase Auth)
3. `null`

**Profil-synk vid inloggning:**
```typescript
// ensureProfile() skapar/uppdaterar public.users
const baseProfile = {
  id: currentUser.id,
  email: currentUser.email,
  full_name: currentUser.user_metadata?.full_name,
  role: currentUser.app_metadata?.role ?? currentUser.user_metadata?.role
}
```

---

## 3️⃣ Databasnivå – Supabase Schema & RLS

### Relevanta tabeller:

#### `auth.users` (Supabase-hanterad)
```sql
-- Innehåller användarens inloggningsdata
id              uuid PRIMARY KEY
email           text
raw_app_meta_data   jsonb  -- { "role": "admin", "provider": "email" }
raw_user_meta_data  jsonb  -- { "full_name": "...", "email_verified": true }
```

#### `public.users`
```sql
CREATE TABLE users (
  id          uuid PRIMARY KEY,           -- Samma som auth.users.id
  email       text NOT NULL UNIQUE,
  full_name   text,
  role        text NOT NULL DEFAULT 'member',  -- 'member', 'admin', etc.
  language    language_code_enum DEFAULT 'NO',
  created_at  timestamptz,
  updated_at  timestamptz
);
```

#### `public.tenants`
```sql
CREATE TABLE tenants (
  id              uuid PRIMARY KEY,
  tenant_key      text UNIQUE,
  name            text NOT NULL,
  type            text NOT NULL,           -- 'school', 'club', 'personal', etc.
  status          text DEFAULT 'active',
  main_language   language_code_enum,
  created_at      timestamptz,
  updated_at      timestamptz
);
```

#### `public.user_tenant_memberships`
```sql
CREATE TABLE user_tenant_memberships (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  tenant_id   uuid REFERENCES tenants(id),
  role        text DEFAULT 'member',      -- 'owner', 'admin', 'editor', 'member'
  is_primary  boolean DEFAULT false,
  created_at  timestamptz,
  updated_at  timestamptz,
  deleted_at  timestamptz,                -- Soft delete
  UNIQUE (user_id, tenant_id)
);
```

---

## 4️⃣ RLS Helper Functions

### `is_tenant_member(tenant_id)`
```sql
CREATE FUNCTION is_tenant_member(tenant_id uuid) RETURNS boolean AS $$
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = $1
    AND deleted_at IS NULL
  );
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `get_user_tenant_ids()`
```sql
CREATE FUNCTION get_user_tenant_ids() RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(tenant_id), ARRAY[]::uuid[])
  FROM user_tenant_memberships
  WHERE user_id = auth.uid()
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
```

### `has_tenant_role(tenant_id, required_role)`
```sql
CREATE FUNCTION has_tenant_role(tenant_id uuid, required_role text) RETURNS boolean AS $$
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND tenant_id = $1
    AND role = required_role
    AND deleted_at IS NULL
  );
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5️⃣ RLS Policies (Exempel)

### public.users
```sql
-- Användare kan se användare i sina tenants
CREATE POLICY "tenant_members_can_select_users" ON users FOR SELECT
USING (
  id = auth.uid()  -- Alltid sin egen profil
  OR id IN (
    SELECT user_id FROM user_tenant_memberships
    WHERE tenant_id = ANY(get_user_tenant_ids())
  )
);

-- Användare kan uppdatera sin egen profil
CREATE POLICY "users_can_update_own_profile" ON users FOR UPDATE
USING (id = auth.uid());
```

### public.tenants
```sql
-- Endast medlemmar kan se sina tenants
CREATE POLICY "tenant_members_can_select" ON tenants FOR SELECT
USING (id = ANY(get_user_tenant_ids()));
```

### public.games
```sql
-- Användare kan se spel från sina tenants eller publika spel
CREATE POLICY "users_can_select_games" ON games FOR SELECT
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  OR (owner_tenant_id IS NULL AND status = 'published')
  OR (owner_tenant_id IS NULL)
);

-- Endast tenant-admins kan ta bort spel
CREATE POLICY "tenant_admins_can_delete_games" ON games FOR DELETE
USING (
  owner_tenant_id = ANY(get_user_tenant_ids())
  AND (has_tenant_role(owner_tenant_id, 'admin') OR has_tenant_role(owner_tenant_id, 'owner'))
);
```

---

## 6️⃣ Auth Trigger – Automatisk Profil-synk

```sql
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'member',  -- ⚠️ Alltid 'member', ignorerar app_metadata.role!
    COALESCE((new.raw_user_meta_data->>'language')::language_code_enum, 'NO')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**⚠️ Problem:** Triggern sätter alltid `role = 'member'` oavsett vad `app_metadata.role` innehåller.

---

## 7️⃣ Roll-hierarki i tenant-context

| Roll | Behörigheter |
|------|-------------|
| `owner` | Full kontroll, kan ta bort tenant |
| `admin` | Kan hantera medlemmar, innehåll, inställningar |
| `editor` | Kan skapa/redigera innehåll |
| `moderator` | Kan moderera innehåll |
| `member` | Grundläggande läsåtkomst |

Dessa roller kontrolleras via RLS policies med `has_tenant_role()`.

---

## 8️⃣ Nuvarande Status för `admin@lekbanken.no`

Efter att ha kört `scripts/set-admin-role.js`:

| Plats | Värde | Status |
|-------|-------|--------|
| `auth.users.app_metadata.role` | `"admin"` | ✅ Korrekt |
| `public.users.role` | `"admin"` | ✅ Korrekt |
| `user_tenant_memberships` | ? | ❓ Behöver kontrolleras |

---

## 9️⃣ Identifierade Problem

### 🔴 Kritiskt: `proxy.ts` körs inte
Next.js kräver att middleware-filen heter `middleware.ts`. Eftersom filen heter `proxy.ts` ignoreras den helt.

**Fix:** Byt namn och uppdatera funktionsnamnet:
```bash
Rename-Item proxy.ts middleware.ts
# Ändra "export async function proxy" till "export async function middleware"
```

### 🟡 Varning: Trigger synkar inte admin-roll
`handle_new_user()` sätter alltid `role = 'member'`, vilket betyder att även om `app_metadata.role = "admin"` så får `public.users.role = "member"`.

**Fix:** Uppdatera triggern:
```sql
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_app_meta_data->>'role', 'member'),  -- Synka roll från app_metadata
    COALESCE((new.raw_user_meta_data->>'language')::language_code_enum, 'NO')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', ''),
    role = COALESCE(new.raw_app_meta_data->>'role', users.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 🟡 Varning: Två separata roll-koncept
- **Global admin** (`app_metadata.role`) – för /admin dashboard
- **Tenant admin** (`user_tenant_memberships.role`) – för tenant-specifik data

Dessa är oberoende! En användare kan vara global admin utan att vara admin i någon tenant.

---

## 🔟 Sammanfattning – Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HTTP Request till /admin                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. MIDDLEWARE (proxy.ts → bör vara middleware.ts)                        │
│    • Läser session från cookies                                          │
│    • Kontrollerar user.app_metadata.role === "admin"                     │
│    • Om ej admin → redirect till /auth/login                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ (om admin)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. REACT CONTEXT (AuthProvider + TenantProvider)                         │
│    • Laddar user från supabase.auth.getSession()                         │
│    • Laddar userProfile från public.users                                │
│    • Laddar userTenants från user_tenant_memberships                     │
│    • Exponerar useAuth() och useTenant() hooks                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. SUPABASE RLS (vid varje databasförfrågan)                             │
│    • auth.uid() = nuvarande användares ID                                │
│    • get_user_tenant_ids() = användarens tenant-IDs                      │
│    • has_tenant_role(tenant_id, 'admin') = roll-check                    │
│    • Policies avgör vilken data som returneras                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Relevanta Filer

| Fil | Syfte |
|-----|-------|
| `proxy.ts` | Middleware för admin-routes (❌ fel namn) |
| `lib/supabase/auth.tsx` | AuthContext + useAuth hook |
| `lib/supabase/client.ts` | Supabase browser client |
| `lib/supabase/server.ts` | Supabase service role client |
| `lib/context/TenantContext.tsx` | Tenant-hantering |
| `app/auth/callback/route.ts` | OAuth callback handler |
| `supabase/migrations/20251129000000_initial_schema.sql` | Schema + RLS |
| `supabase/migrations/20251129000001_fix_rls_security.sql` | RLS helper functions |
| `scripts/set-admin-role.js` | Script för att sätta admin-roll |

---

*Rapport genererad av GitHub Copilot*
