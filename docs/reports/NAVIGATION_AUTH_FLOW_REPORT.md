# 🔗 Navigation & Auth Flow Report

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-12
- Last updated: 2026-03-21
- Last validated: -

> Historisk flödesrapport för navigation och auth mellan ytor. Behåll som analysbakgrund, inte som aktuell routing- eller authkarta.

## Connections between /marketing, /app and /admin

**Datum:** 2025-12-12  
**Undersökt av:** GitHub Copilot (Claude Opus 4.5)

---

## 📋 Executive Summary

| Område | Status | Kommentar |
|--------|--------|-----------|
| **Login → App redirect** | ⚠️ Potentiellt problem | Race condition med userRole |
| **Login → Admin redirect** | ⚠️ Potentiellt problem | Samma race condition |
| **Middleware (proxy.ts)** | ⚠️ Varning | Endast auth-check, ingen roll-check |
| **Marketing → Login/Signup** | ✅ Fungerar | Alla CTA-knappar pekar rätt |
| **App → Admin navigation** | ✅ Fungerar | Admin badge + ProfileMenu |
| **Admin → App navigation** | ✅ Fungerar | Sidebar + ProfileMenu |
| **OAuth callback** | ✅ Fungerar | Redirectar till /app som standard |
| **Logout flow** | ✅ Fungerar | Server-side signout med cookie cleanup |

---

## 1️⃣ Login Flow Analysis

### Fil: [app/(marketing)/auth/login/page.tsx](app/(marketing)/auth/login/page.tsx)

**Hur redirect bestäms:**
```typescript
const redirectParam = searchParams.get('redirect')
const redirectTo = redirectParam || (userRole === 'admin' ? '/admin' : '/app')
```

**Flöde vid inloggning:**
```
1. Användare fyller i formulär
2. signIn() kallas
3. router.push(redirectTo)
4. useEffect lyssnar på isAuthenticated och kör router.replace(redirectTo)
```

### ⚠️ Potentiellt Problem: Race Condition

**Problem beskrivning:**
- `userRole` kommer från `useAuth()` som prioriterar `userProfile?.role`
- `userProfile` laddas asynkront EFTER att `isAuthenticated` blir true
- Detta betyder att vid inloggning:
  1. `isAuthenticated = true`
  2. `userRole = null` (profil inte laddad ännu)
  3. `redirectTo = '/app'` (fallback)
  4. Admin-användare redirectas till `/app` istället för `/admin`

**Påverkan:**  
Admin-användare kan behöva navigera manuellt till `/admin` efter inloggning.

**Rekommendation:**  
Vänta tills `userRole !== null` innan redirect körs:
```typescript
useEffect(() => {
  if (!isLoading && isAuthenticated && userRole !== null) {
    router.replace(userRole === 'admin' ? '/admin' : '/app')
  }
}, [isAuthenticated, isLoading, userRole, router])
```

---

## 2️⃣ OAuth Callback Flow

### Fil: [app/auth/callback/route.ts](app/auth/callback/route.ts)

**Hur det fungerar:**
```typescript
const redirectTo = requestUrl.searchParams.get('next') || '/app'
// ... exchange code for session ...
return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
```

**Observation:**
- ✅ Stödjer `?next=` parameter för att redirecta till annan sida
- ⚠️ Standardredirect är alltid `/app`, oavsett om användaren är admin
- ℹ️ Recovery-flödet redirectar korrekt till `/auth/recovery`

**Rekommendation:**  
Om admin-användare ska redirectas till `/admin` efter OAuth-login, behöver callback kontrollera användarens roll efter session exchange.

---

## 3️⃣ Middleware (Proxy)

### Fil: [proxy.ts](proxy.ts)

**Skyddade rutter:**
```typescript
function isProtectedPath(pathname: string) {
  return pathname.startsWith("/app") || pathname.startsWith("/admin");
}
```

**Vad middleware gör:**
1. Kontrollerar om sökvägen är skyddad (/app eller /admin)
2. Om skyddad: kontrollerar om användaren är inloggad
3. Om INTE inloggad: redirectar till `/auth/login?redirect=<original-path>`
4. Om inloggad: släpper igenom

**⚠️ Observation:**
- Middleware kontrollerar ENDAST om användaren är inloggad
- INGEN kontroll av admin-roll görs i middleware
- Admin-åtkomst kontrolleras senare i `AdminShell` komponenten

**Konsekvens:**
- En icke-admin användare kan navigera till `/admin` URL
- De blockeras av `AdminShell` och ser "Ingen admin-åtkomst" meddelande
- Detta är OK men inte optimalt (onödig rendering)

---

## 4️⃣ Marketing → Auth Navigation

### Alla CTA-knappar och länkar:

| Komponent | Länk | Status |
|-----------|------|--------|
| `components/marketing/header.tsx` | `/auth/login`, `/auth/signup` | ✅ |
| `components/marketing/footer.tsx` | `/auth/login`, `/auth/signup` | ✅ |
| `components/marketing/login-cta.tsx` | `/auth/login`, `/auth/signup` | ✅ |
| `components/marketing/feature-grid.tsx` | `/auth/login` | ✅ |
| `app/(marketing)/components/marketing-header.tsx` | `/auth/login`, `/auth/signup` | ✅ |
| `app/(marketing)/components/marketing-footer.tsx` | `/auth/login`, `/auth/signup` | ✅ |

**Alla marketing CTA-knappar pekar på korrekta auth-sidor.**

---

## 5️⃣ App ↔ Admin Navigation

### App → Admin

| Plats | Implementation | Status |
|-------|---------------|--------|
| **App Topbar** ([app/app/components/app-topbar.tsx](app/app/components/app-topbar.tsx#L67)) | Admin Badge som klickbar länk till `/admin` | ✅ |
| **ProfileMenu** ([components/navigation/ProfileMenu.tsx](components/navigation/ProfileMenu.tsx#L93-L98)) | "Go to Admin" menyval (endast för admin-användare) | ✅ |

**Kod från ProfileMenu:**
```typescript
const isAdmin = userRole === "admin" || userRole === "superadmin";
// ...
{isAdmin && (
  <DropdownMenuItem onClick={() => handleNavigate("/admin")}>
    {copy.goToAdmin}
  </DropdownMenuItem>
)}
```

### Admin → App

| Plats | Implementation | Status |
|-------|---------------|--------|
| **AdminSidebar** ([components/admin/AdminSidebar.tsx](components/admin/AdminSidebar.tsx#L181)) | "Tillbaka till appen" länk i footer | ✅ |
| **ProfileMenu** (context="admin") | "Go to App" menyval | ✅ |
| **ProfileMenu** | "Go to Marketing" menyval (utom i marketing context) | ✅ |

---

## 6️⃣ Logout Flow

### Fil: [app/auth/signout/route.ts](app/auth/signout/route.ts)

**Vad som händer vid logout:**
1. Server-side endpoint anropas (POST /auth/signout)
2. Supabase session rensas
3. `lb_tenant` cookie raderas
4. Alla `sb-*-auth-token` cookies raderas
5. Response returneras (eller redirect)

**Klient-sidan** ([lib/supabase/auth.tsx](lib/supabase/auth.tsx)):
- `signOut()` funktion anropar POST `/auth/signout`
- Rensar client-side state
- Eventuell redirect hanteras av komponenten som anropar

---

## 7️⃣ Auth State Management

### Fil: [lib/supabase/auth.tsx](lib/supabase/auth.tsx)

**userRole bestämning:**
```typescript
const fallbackRole = userProfile?.role 
  || (user?.app_metadata?.role as string | undefined) 
  || null
```

**Prioritetsordning:**
1. `userProfile?.role` (från public.users tabellen)
2. `user?.app_metadata?.role` (från JWT/Supabase Auth)
3. `null`

**⚠️ Konsekvens:**  
Om `public.users.role` är "member" men `app_metadata.role` är "admin", blir `userRole = "member"`.

---

## 8️⃣ Protected Route Guards

### AdminShell Guard
**Fil:** [components/admin/AdminShell.tsx](components/admin/AdminShell.tsx#L52-L56)

```typescript
const isGlobalAdmin = userRole === "admin" || userRole === "superadmin";
// ...
if (!user || noAdminRole || needsTenant) {
  // Visar "Ingen admin-åtkomst" meddelande
}
```

### System Admin Layout Guard
**Fil:** [app/admin/(system)/layout.tsx](app/admin/(system)/layout.tsx)

```typescript
if (!isLoading && !isSystemAdmin) {
  router.replace('/admin?error=unauthorized');
}
```

### Tenant Admin Layout Guard
**Fil:** [app/admin/tenant/[tenantId]/layout.tsx](app/admin/tenant/[tenantId]/layout.tsx)

```typescript
const hasAccess = isSystemAdmin || (isTenantAdmin && currentTenantId === tenantId);
if (!isLoading && !hasAccess) {
  router.replace('/admin?error=tenant_access_denied');
}
```

---

## 📊 Sammanfattning

### ✅ Fungerar Korrekt

1. **Marketing CTA-knappar** → Alla pekar på `/auth/login` eller `/auth/signup`
2. **App → Admin navigation** → Admin badge och ProfileMenu fungerar
3. **Admin → App navigation** → Sidebar footer och ProfileMenu fungerar
4. **OAuth callback** → Byter kod mot session och redirectar
5. **Logout** → Rensar cookies och session korrekt
6. **Protected routes** → Blockerar icke-autentiserade användare

### ⚠️ Potentiella Problem

1. **Race condition vid login**
   - `userRole` kan vara `null` när redirect körs
   - Admin-användare hamnar på `/app` istället för `/admin`
   - **Fix:** Vänta tills `userRole !== null` innan redirect

2. **Middleware kontrollerar inte admin-roll**
   - Icke-admin kan navigera till `/admin` URL
   - Blockeras av AdminShell men renderas först
   - **Minor issue:** Onödig rendering

3. **OAuth callback alltid → /app**
   - Oavsett om användaren är admin
   - **Fix:** Kontrollera roll i callback och redirecta därefter

4. **public.users.role prioriteras över app_metadata.role**
   - Om dessa är inkonsekventa kan fel roll användas
   - **Fix:** Se tidigare rapport om admin-åtkomst

### ℹ️ Rekommenderade Förbättringar

1. **Uppdatera login redirect:**
   ```typescript
   useEffect(() => {
     if (!isLoading && isAuthenticated && userRole !== null) {
       const target = userRole === 'admin' || userRole === 'superadmin' 
         ? '/admin' 
         : '/app';
       router.replace(redirectParam || target);
     }
   }, [isAuthenticated, isLoading, userRole, router, redirectParam])
   ```

2. **Förbättra OAuth callback:**
   ```typescript
   // Efter session exchange, kontrollera roll
   const { data: { user } } = await rlsClient.auth.getUser();
   const isAdmin = user?.app_metadata?.role === 'admin' 
                || user?.app_metadata?.role === 'system_admin';
   const finalRedirect = isAdmin && !redirectTo.startsWith('/admin') 
     ? '/admin' 
     : redirectTo;
   ```

3. **Lägg till roll-check i middleware (valfritt):**
   ```typescript
   if (pathname.startsWith('/admin')) {
     const role = user.app_metadata?.role;
     if (role !== 'admin' && role !== 'system_admin' && role !== 'superadmin') {
       return NextResponse.redirect(new URL('/app', request.url));
     }
   }
   ```

---

**Vill du att jag implementerar någon av dessa förbättringar?**
