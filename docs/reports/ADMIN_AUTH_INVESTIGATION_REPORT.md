# 🔐 Admin Authentication Investigation Report

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-02
- Last updated: 2026-03-21
- Last validated: -

> Historisk undersökningsrapport för adminautentisering. Behåll som incident- och felsökningshistorik, inte som nuvarande auth-spec.

**Datum:** 2025-12-02  
**Undersökt av:** GitHub Copilot (Claude Opus 4.5)

---

## 📋 Sammanfattning

Admin-inloggningen har **flera kritiska problem** som förhindrar åtkomst till `/admin`. Det viktigaste problemet är att **middleware-filen inte är korrekt konfigurerad** för Next.js.

---

## 🚨 Kritiska Problem

### 1. ❌ `proxy.ts` är INTE en aktiv middleware

**Fil:** `proxy.ts` (i projekt-root)

Next.js kräver att middleware-filen heter **exakt** `middleware.ts` (eller `middleware.js`) och ligger i projekt-root. Filen `proxy.ts` exporterar en funktion och config, men Next.js ignorerar den helt eftersom den har fel namn.

```typescript
// proxy.ts - IGNORERAS av Next.js!
export async function proxy(req: NextRequest) { ... }

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Resultat:** Ingen serversides-autentisering sker för admin-routes. Vem som helst kan tekniskt sett nå `/admin` (även om klient-sidan kan blockera).

---

### 2. ⚠️ Admin Layout saknar auth-guard

**Fil:** `app/admin/layout.tsx`

Layouten laddar `AuthProvider` och `TenantProvider`, men gör **ingen kontroll** av om användaren är inloggad eller har admin-roll innan innehållet visas:

```tsx
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProviderWithAuth>
        <AdminShell>{children}</AdminShell>  // ← Ingen auth-check här!
      </TenantProviderWithAuth>
    </AuthProvider>
  );
}
```

Jämför med individuella admin-sidor som `billing/page.tsx` som har:
```tsx
if (!user || !currentTenant) {
  return <div>Du måste vara admin...</div>;
}
```

Men detta är **inkonsekvent** - vissa sidor har guards, andra inte.

---

### 3. 🔄 Race condition i login-redirect

**Fil:** `app/(marketing)/auth/login/page.tsx`

Login-sidan försöker redirecta baserat på `userRole`:

```tsx
const { signIn, signInWithGoogle, isLoading, isAuthenticated, userRole } = useAuth()
const redirectTo = redirectParam || (userRole === 'admin' ? '/admin' : '/app')
```

**Problem:** `userRole` hämtas från `userProfile?.role` eller `user?.app_metadata?.role`. Men:

1. `userProfile` laddas **asynkront** efter inloggning
2. Om profilen inte laddats ännu är `userRole = null`
3. Redirect sker till `/app` istället för `/admin`

---

### 4. 🗄️ Rollhantering är fragmenterad

Rollen kan finnas på **tre olika ställen**:

| Källa | Fil som läser | Prioritet |
|-------|---------------|-----------|
| `user.app_metadata.role` | proxy.ts, auth.tsx | 1 |
| `user.user_metadata.role` | proxy.ts, app-topbar.tsx | 2 |
| `userProfile.role` (databas) | auth.tsx | 3 |

```typescript
// proxy.ts
const role = (user?.app_metadata?.role ?? user?.user_metadata?.role) as string | undefined;

// auth.tsx
userRole: userProfile?.role || (user?.app_metadata?.role as string | undefined) || null,
```

**Fråga:** Var sätts egentligen admin-rollen? I Supabase Dashboard → Authentication → Users → app_metadata? Eller i `users`-tabellen?

---

## 🔧 Rekommenderade Åtgärder

### Steg 1: Byt namn på `proxy.ts` till `middleware.ts`

```bash
# I projekt-root
mv proxy.ts middleware.ts
```

Och uppdatera export-funktionens namn:

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  // ... samma kod som proxy()
}
```

### Steg 2: Verifiera användarens roll i Supabase

Kontrollera i Supabase Dashboard:
1. Gå till **Authentication → Users**
2. Hitta din användare (johan@formgiver.no)
3. Klicka på användaren och kontrollera **Raw User Meta Data** och **Raw App Meta Data**

Rollen ska se ut så här:
```json
// app_metadata
{
  "role": "admin"
}
```

Om den saknas, lägg till den manuellt eller via SQL:
```sql
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'johan@formgiver.no';
```

### Steg 3: Lägg till auth-guard i AdminShell

**Fil:** `components/admin/AdminShell.tsx`

```tsx
'use client';

import { useAuth } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminShell({ children }: AdminShellProps) {
  const { user, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || userRole !== 'admin')) {
      router.replace('/auth/login?redirect=/admin');
    }
  }, [user, userRole, isLoading, router]);

  if (isLoading) {
    return <div>Laddar...</div>;
  }

  if (!user || userRole !== 'admin') {
    return null; // Kommer redirectas av useEffect
  }

  // ... resten av komponenten
}
```

### Steg 4: Fixa race condition i login

Vänta tills profilen har laddats innan redirect:

```tsx
useEffect(() => {
  if (!isLoading && isAuthenticated && userRole !== null) {
    router.replace(userRole === 'admin' ? '/admin' : '/app');
  }
}, [isAuthenticated, isLoading, userRole, router]);
```

---

## 📁 Relevanta Filer

| Fil | Syfte | Status |
|-----|-------|--------|
| `proxy.ts` | Middleware för admin-auth | ❌ Fel namn - ignoreras |
| `middleware.ts` | - | ❌ Finns inte |
| `app/admin/layout.tsx` | Admin shell wrapper | ⚠️ Ingen auth-guard |
| `app/admin/layout-client.tsx` | Admin UI struktur | ⚠️ Ingen auth-guard |
| `components/admin/AdminShell.tsx` | Sidebar + topbar + content | ⚠️ Ingen auth-guard |
| `lib/supabase/auth.tsx` | AuthContext + useAuth | ✅ Fungerar |
| `app/(marketing)/auth/login/page.tsx` | Login-sida | ⚠️ Race condition |
| `app/auth/callback/route.ts` | OAuth callback | ✅ Fungerar |

---

## 🧪 Test-checklista

Efter åtgärder, verifiera:

1. [ ] Kan logga in med e-post/lösenord
2. [ ] Kan logga in med Google
3. [ ] Admin-användare redirectas till `/admin` efter inloggning
4. [ ] Icke-admin redirectas till `/app` efter inloggning
5. [ ] Ej inloggad användare som går till `/admin` redirectas till login
6. [ ] Inloggad icke-admin som går till `/admin` redirectas till login/app
7. [ ] Utloggning fungerar och rensar session

---

## 💡 Snabb-fix (för att testa nu)

Om du vill testa snabbt innan fullständig fix:

1. **Byt namn på filen:**
   ```powershell
   Rename-Item -Path ".\proxy.ts" -NewName "middleware.ts"
   ```

2. **Ändra funktionsnamnet i filen:**
   ```typescript
   // Ändra från:
   export async function proxy(req: NextRequest) {
   // Till:
   export async function middleware(req: NextRequest) {
   ```

3. **Starta om dev-servern:**
   ```powershell
   npm run dev
   ```

---

## 📞 Kontakta mig

Om Codex behöver mer information, specificera:

1. Vad som händer när du försöker logga in (felmeddelande? redirect-loop?)
2. Vad som finns i Supabase → Authentication → Users för din användare
3. Output från browser console (F12 → Console)
4. Output från terminal där `npm run dev` körs

---

*Rapport genererad av GitHub Copilot*
