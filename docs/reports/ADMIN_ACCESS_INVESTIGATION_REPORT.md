# 🔍 Admin Access Investigation Report
## Användare: johan@formgiver.no

**Datum:** 2025-12-12  
**Undersökt av:** GitHub Copilot (Claude Opus 4.5)  

---

## 📋 Executive Summary

Undersökningen visar att **admin-åtkomst bestäms av tre olika rollvärden** som måste stämma:

| Plats | Förväntad roll för admin-åtkomst | Prioritet |
|-------|----------------------------------|-----------|
| `auth.users.raw_app_meta_data.role` | `"system_admin"` eller `"admin"` | Använd av useRbac |
| `public.users.role` | `"admin"` eller `"superadmin"` | Använd av useAuth |
| Tenant membership | N/A för system admin | Sekundär |

**Din användare (johan@formgiver.no) har troligtvis ett av följande problem:**

1. ❌ `app_metadata.role` är inte satt eller har fel värde
2. ❌ `public.users.role` är `"member"` istället för `"admin"`
3. ❌ Båda ovanstående

---

## 🔐 Hur Admin-åtkomst Kontrolleras

### Steg 1: AdminShell Guard (Blockerar åtkomst)

**Fil:** [components/admin/AdminShell.tsx](components/admin/AdminShell.tsx#L52-L56)

```typescript
// Superadmin/admin har alltid tillgång
const isGlobalAdmin = userRole === "admin" || userRole === "superadmin";
```

`userRole` kommer från `useAuth()` och bestäms så här:

**Fil:** [lib/supabase/auth.tsx](lib/supabase/auth.tsx#L287)

```typescript
const fallbackRole = userProfile?.role 
  || (user?.app_metadata?.role as string | undefined) 
  || null
```

**Prioritetsordning:**
1. **Först:** `userProfile?.role` (från `public.users.role`)
2. **Sedan:** `user?.app_metadata?.role` (från Supabase Auth JWT)
3. **Annars:** `null`

### Steg 2: useRbac Hook (Bestämmer isSystemAdmin)

**Fil:** [features/admin/shared/hooks/useRbac.ts](features/admin/shared/hooks/useRbac.ts#L147)

```typescript
const appMetaRole = user?.app_metadata?.role as string | undefined;
const isSystemAdmin = 
  appMetaRole === 'system_admin' || 
  userRole === 'admin' || 
  userRole === 'superadmin';
```

Denna hook accepterar **tre olika rollvärden** som system_admin:
- `app_metadata.role === 'system_admin'`
- `userRole === 'admin'` (från profil/app_metadata)
- `userRole === 'superadmin'` (från profil/app_metadata)

---

## 🚨 Identifierade Orsaker Till Problemet

### Orsak 1: Database Trigger Sätter Alltid role='member'

**Problemet:**  
När en ny användare skapas i Supabase Auth körs triggern `handle_new_user()` som skapar en rad i `public.users`. Denna trigger sätter **alltid** `role = 'member'`:

```sql
-- Förenklad version av triggern
INSERT INTO public.users (id, email, role)
VALUES (
  new.id,
  new.email,
  'member'  -- ⚠️ Ignorerar app_metadata.role!
);
```

Även om du har satt `app_metadata.role = 'admin'` i Supabase Auth, så kommer `public.users.role` att vara `'member'`.

Eftersom `userRole` prioriterar `userProfile?.role` (dvs `public.users.role`), så returneras `'member'` istället för `'admin'`.

### Orsak 2: proxy.ts Kontrollerar Inte Admin-roll

**Fil:** [proxy.ts](proxy.ts)

Middleware-filen kontrollerar endast om användaren är **inloggad**, inte om de har admin-roll:

```typescript
if (user) {
  return response;  // Släpper igenom alla inloggade användare
}
```

Admin-kontrollen sker endast i klient-komponenten `AdminShell`, som förlitar sig på `userRole`.

### Orsak 3: Rollvärden Är Inkonsekventa

Systemet använder **olika rollvärden** på olika ställen:

| Plats | Accepterade värden | Problem |
|-------|-------------------|---------|
| `lib/utils/tenantAuth.ts` | `'system_admin'` | Endast en variant |
| `features/admin/shared/hooks/useRbac.ts` | `'system_admin'`, `'admin'`, `'superadmin'` | Tre varianter |
| `components/admin/AdminShell.tsx` | `'admin'`, `'superadmin'` | Två varianter |
| `scripts/set-admin-role.js` | `'admin'` | Sätter denna |

---

## 🔎 Vad Du Behöver Kontrollera

### 1. Kontrollera app_metadata i Supabase Dashboard

1. Gå till Supabase Dashboard → Authentication → Users
2. Hitta `johan@formgiver.no`
3. Klicka för att se detaljer
4. Kontrollera `raw_app_meta_data`:
   ```json
   {
     "role": "admin"  // eller "system_admin"
   }
   ```

**Om rollen saknas eller är fel:** Detta är huvudproblemet.

### 2. Kontrollera public.users tabellen

Kör denna SQL i Supabase SQL Editor:

```sql
SELECT id, email, role, full_name, created_at 
FROM public.users 
WHERE email = 'johan@formgiver.no';
```

**Förväntat resultat:**
```
role = 'admin' (eller 'superadmin')
```

**Om role = 'member':** Detta är problemet. Triggern har satt fel roll.

### 3. Kontrollera i webbläsarens DevTools

När du är på /admin, öppna Console och leta efter:

```
[AdminShell] access check: { user: true, userRole: "member", isGlobalAdmin: false, ... }
```

Om `userRole: "member"` visas, bekräftar detta att rollen är fel i databasen.

---

## ✅ Lösning

### Alternativ A: Uppdatera via Supabase Dashboard (Enklast)

**Steg 1:** Uppdatera `app_metadata` i Authentication → Users:

```json
{
  "role": "admin"
}
```

**Steg 2:** Uppdatera `public.users.role` via SQL Editor:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'johan@formgiver.no';
```

**Steg 3:** Logga ut och in igen i Lekbanken.

### Alternativ B: Kör ett modifierat skript

Skapa ett skript specifikt för din användare:

```javascript
// scripts/set-johan-admin.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setJohanAdmin() {
  // 1. Hitta användaren
  const { data: authData } = await supabase.auth.admin.listUsers();
  const user = authData.users.find(u => u.email === 'johan@formgiver.no');
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log('✅ Found user:', user.id);
  console.log('   Current app_metadata:', user.app_metadata);

  // 2. Uppdatera app_metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: { ...user.app_metadata, role: 'admin' } }
  );

  if (authError) {
    console.error('❌ Error updating app_metadata:', authError);
    return;
  }
  console.log('✅ app_metadata.role set to "admin"');

  // 3. Uppdatera public.users
  const { error: profileError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id);

  if (profileError) {
    console.error('❌ Error updating profile:', profileError);
    return;
  }
  console.log('✅ public.users.role set to "admin"');

  console.log('\n🎉 Done! Logga ut och in igen.');
}

setJohanAdmin();
```

Kör med:
```bash
node scripts/set-johan-admin.js
```

### Alternativ C: Fixa triggern (Långsiktig lösning)

Uppdatera `handle_new_user()` triggern för att respektera `app_metadata.role`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    -- Respektera app_metadata.role om den finns
    COALESCE(new.raw_app_meta_data->>'role', 'member'),
    COALESCE((new.raw_user_meta_data->>'language')::language_code_enum, 'NO')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 Sammanfattning

| Komponent | Status | Åtgärd |
|-----------|--------|--------|
| `app_metadata.role` | ⚠️ Troligtvis saknas/fel | Sätt till `"admin"` |
| `public.users.role` | ⚠️ Troligtvis `"member"` | Uppdatera till `"admin"` |
| `handle_new_user()` trigger | ❌ Ignorerar admin-roll | Fixa (långsiktigt) |
| AdminShell guard | ✅ Fungerar korrekt | Ingen åtgärd |
| useRbac hook | ✅ Fungerar korrekt | Ingen åtgärd |

---

## 🔜 Nästa Steg

1. **Bekräfta problemet** - Kontrollera värdena i Supabase Dashboard
2. **Kör fix** - Använd Alternativ A eller B ovan
3. **Testa** - Logga ut och in, gå till /admin
4. **Långsiktig fix** - Uppdatera triggern (Alternativ C)

Vill du att jag hjälper dig genomföra någon av dessa lösningar?
