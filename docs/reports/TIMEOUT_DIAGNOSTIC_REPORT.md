# Lekbanken — Fullständig Diagnostikrapport: Systemvida Timeouts

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-02-20
- Last updated: 2026-03-21
- Last validated: -

> Fryst diagnostikrapport för systemvida timeout-problem. Behåll som incidentunderlag, men återverifiera timeoutkedjor mot nuvarande kod innan operativa beslut tas.

> **Datum:** 2025-02-20  
> **Syfte:** Complete forensic analysis of timeout issues affecting the entire Supabase-backed application — notifications, marketing pages, and navigation. Intended to be shared for collaborative fixing.

---

## TL;DR — Kärnproblem

Systemet har **tre separata men sammankopplade timeout-problem**:

1. **Middleware (`proxy.ts`) har INGEN timeout** — varje request passerar genom middleware som skapar en Supabase-klient utan `createFetchWithTimeout`. Om Supabase svarar långsamt blockeras ALLA requests tills de naturligt timeout:ar (potentiellt 30-60s+).

2. **Service Role-klienten har ingen timeout** — Admin-queries via `createServiceRoleClient()` kan hänga för evigt.

3. **Marketing-sidor saknar caching** — Varje anrop till `fetchPublishedFeaturesAction()` och `fetchPublishedUpdatesAction()` gör fräscha DB-queries utan `unstable_cache`, vilket multiplicerar lasten.

Resultatet: En dominoeffekt där långsamma middleware-requests blockerar browser connection pool (6 per origin), som i sin tur blockerar alla efterföljande requests inklusive notifications.

---

## 1. Arkitektur — Supabase-klienter

Systemet har **fyra distinkta Supabase-klienter**:

| Klient | Fil | Fetch Wrapper | Timeout | Caching |
|--------|-----|---------------|---------|---------|
| **Server RLS** | `lib/supabase/server.ts` L37-55 | ✅ `createFetchWithTimeout` | 15s REST / 15s Auth | React `cache()` per request |
| **Browser** | `lib/supabase/client.ts` L117-145 | ✅ `createFetchWithTimeout` | 15s REST / 15s Auth | Singleton |
| **Service Role** | `lib/supabase/server.ts` L85-90 | ❌ **INGEN** | **Ingen timeout** | Lazy singleton |
| **Middleware** | `proxy.ts` L210-232 | ❌ **INGEN** | **Ingen timeout** | Ingen |

### Timeout-konfiguration (`lib/supabase/fetch-with-timeout.ts`)

```typescript
const defaultTimeouts: TimeoutConfig = {
  defaultMs: 30_000,     // Okänt endpoint
  restMs: 15_000,        // PostgREST queries (.from())
  authMs: 15_000,        // Auth endpoints (getUser, token refresh)
  functionsMs: 30_000,   // Edge Functions
  storageMs: 60_000,     // File upload/download
}
```

Timeout-routen bestäms av URL-path:
- `/rest/v1/*` → 15 000ms
- `/auth/v1/*` → 15 000ms  
- `/functions/v1/*` → 30 000ms
- `/storage/v1/*` → 60 000ms

---

## 2. Kritiskt Problem #1: Middleware utan timeout

### Plats: `proxy.ts` rad 210–232

```typescript
// PROXY.TS — SKAPAR SUPABASE-KLIENT UTAN TIMEOUT-WRAPPER!
const supabase = createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) { /* ... */ },
    },
    // ⚠️ NOTERA: INGET `global: { fetch: createFetchWithTimeout(...) }`
})
```

Denna klient utan timeout-wrapper används sedan för:

1. **`supabase.auth.getUser()`** (rad 282) — körs på VARJE request till skyddade sidor
2. **`resolveTenantByHostname()`** (rad 262-263) — RPC-anrop för custom domains/subdomäner
3. **`checkMFAStatus()`** (rad 360) — MFA-kontroll för skyddade sidor
4. **`resolveTenantForMiddlewareRequest()`** (rad 413) — Tenant-resolution för `/app`-sidor

### Konsekvens

Middleware körs **innan** allt annat (layout, components, server actions). Om `getUser()` tar 10 sekunder, blockeras HELA page loaden i 10 sekunder — och det finns inget tak alls. Utan timeout kan requests hänga i 30+ sekunder eller tills TCP mot Supabase naturligt stängs.

### Request-flöde per sidladdning (worst case)

```
┌─────────────────────────────────────────────────────────┐
│  MIDDLEWARE (proxy.ts) - INGEN TIMEOUT                  │
│                                                         │
│  1. supabase.auth.getUser()        → /auth/v1/user     │
│  2. resolveTenantByHostname()      → RPC call           │
│  3. checkMFAStatus()               → DB queries         │
│  4. resolveTenantForMiddlewareRequest() → cookies/DB    │
│                                                         │
│  ⏱️  Totalt: OBEGRÄNSAT → kan blockera 30-60+ sekunder │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  SERVER LAYOUT (getServerAuthContext) - 15s timeout     │
│                                                         │
│  5. supabase.auth.getUser()        → 15s timeout        │
│  6. supabase.from('users')         → 15s timeout        │
│  7. supabase.from('memberships')   → 15s timeout        │
│  8. getPendingLegalDocuments()     → 15s timeout        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  CLIENT-SIDE RENDERING                                  │
│                                                         │
│  9. Notification fetch (RPC)       → 15s timeout        │
│  10. Marketing features            → 15s timeout        │
│  11. Marketing updates             → 15s timeout        │
└─────────────────────────────────────────────────────────┘
```

**Om steg 1 tar 15s → steg 5-11 startar aldrig förrän efter 15 sekunder.**

---

## 3. Kritiskt Problem #2: Service Role utan timeout

### Plats: `lib/supabase/server.ts` rad 85–90

```typescript
export function createServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  // ⚠️ INGEN createFetchWithTimeout() — kan hänga obegränsat!
  return createServiceRoleSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey)
}
```

Används av admin-funktioner, bakgrundsuppgifter, marketing admin-API:er, etc. Ingen timeout alls.

---

## 4. Problem #3: Marketing-API utan caching

### Plats: `lib/marketing/api.ts`

```typescript
export async function getPublishedFeatures(filters?: FeatureFilters): Promise<FeaturesResponse> {
  const supabase = await createServerRlsClient() as AnySupabaseClient;
  
  // ⚠️ INGEN unstable_cache, INGEN React cache() utöver klientens request-scope
  // Varje server action-anrop gör en ny DB-query!
  let query = supabase
    .from('marketing_features')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('priority', { ascending: false });
  // ...
}
```

Anropas från `components/marketing/actions.ts` som server actions. Varje invokation:
1. Skapar en ny `createServerRlsClient()` (cachad per request-scope, men server actions ÄR separata requests)
2. Kör en fräsch PostgREST-query mot Supabase
3. Om Supabase är långsam → 15s timeout per anrop

Marketing-sidan gör minst 2 sådana anrop (features + updates), som tillsammans med middleware-anropen kan skapa 4-6 Supabase-requests per sidladdning.

### RLS-policies för marketing (INTE problemet)

De publika SELECT-policies är enkla och effektiva:
```sql
CREATE POLICY marketing_features_public_select
  ON public.marketing_features FOR SELECT
  USING (status = 'published');
```

Ingen `auth.uid()`, ingen dyr funktion. **RLS är INTE flaskhalsen.**

---

## 5. Connection Pool — Dominoeffekten

### Browser Connection Pool
Webbläsare tillåter max **6 simultana HTTP-anslutningar per origin** (till `qohhnufxididbmzqnjwg.supabase.co`).

Vid normal drift:
```
Slot 1: middleware getUser()        → /auth/v1/user
Slot 2: layout getUser()           → /auth/v1/user  
Slot 3: layout users query         → /rest/v1/users
Slot 4: layout memberships query   → /rest/v1/user_tenant_memberships
Slot 5: notification RPC           → /rest/v1/rpc/get_user_notifications
Slot 6: marketing features         → /rest/v1/marketing_features
--- BLOCKERAD: marketing updates måste vänta ---
```

**När en request tar 15s timeout:**
```
Slot 1: middleware getUser()        → HÄNGER...
Slot 2: layout getUser()           → HÄNGER...
Slot 3: [BLOCKERAD - väntar på slot]
Slot 4: [BLOCKERAD - väntar på slot]
Slot 5: [BLOCKERAD - väntar på slot]
Slot 6: [BLOCKERAD - väntar på slot]

→ ALLT fryser. Notifications, marketing, navigation — allt väntar.
```

### Server-side Connection Pool
Supabase Free/Pro-plan har typiskt:
- Direct connections: 60 (Pro) / 15 (Free)
- Pooled connections (Supavisor): 200

Ingen explicit connection pool-konfiguration hittades i projektet — använder Supabase-plattformens standardinställningar.

---

## 6. Notifikationssystemet — Redan åtgärdade problem

Under utredningen hittades och fixades dessa problem i notifikationssystemet:

### Fix 1: `read_at NOT NULL DEFAULT now()` (✅ Fixat via migration)
**Problem:** Alla notifikationer skapades som "redan lästa" — `read_at` hade `NOT NULL DEFAULT now()`.  
**Lösning:** Migration `20260220200000_fix_notification_system_consolidated.sql` — ändrade till nullable, resetade felaktiga rader.

### Fix 2: RLS initplan-pattern (✅ Fixat via migration)
**Problem:** `notification_deliveries` SELECT-policy använde `auth.uid()` direkt istället för `(SELECT auth.uid())`, vilket tvingar PostgreSQL att evaluera per rad istället för en gång.  
**Lösning:** Samma migration — `USING (user_id = (SELECT auth.uid()))`.

### Fix 3: Duplicerade SELECT-policies (✅ Fixat via migration)
**Problem:** `notifications`-tabellen hade två SELECT-policies som evaluerades med OR-logik.  
**Lösning:** Borttagna i migration.

### Fix 4: `createTicketNotification` skapade inga delivery-rader (✅ Fixat i kod)
**Problem:** `app/actions/notifications-user.ts` — ticket-notifikationer skapade bara `notifications`-rad, men inte `notification_deliveries`-rad. Användare såg aldrig dessa notifikationer.  
**Lösning:** Koden uppdaterad att skapa båda raderna.

### Fix 5: TIMESTAMP → TIMESTAMPTZ (✅ Fixat via migration)
**Problem:** Alla timestamp-kolumner i notifications använde `TIMESTAMP` (utan timezone). PostgREST returnerar dessa utan `Z`-suffix → JS tolkar som lokal tid → 1 timmes offset i CET.  
**Lösning:** Migration `20260220210000_fix_timestamp_timezone.sql` konverterade till `TIMESTAMPTZ`. JS-utility `parseDbTimestamp` och alla formatRelativeTime-anrop uppdaterade.

### Fix 6: Hook med delat globalt state (✅ Fixat i kod)
**Problem:** `useAppNotifications` hade module-level shared state → NotificationBell och /app/notifications-sidan delade samma data, men rendered conditions skilde sig.  
**Lösning:** Omskriven med `useRef` per instans.

### Fix 7: AbortController för HTTP requests (✅ Fixat i kod)
**Problem:** `withTimeout` race:ar men avbryter aldrig den underliggande HTTP-requesten → gamla requests äter connection pool-slots.  
**Lösning:** `fetchNotifications` i hooken omskriven med `AbortController` — nya fetches avbryter pågående.

### Fix 8: Navigeringsuppdatering (✅ Fixat i kod)
**Problem:** Notifikationer försvann vid navigering admin → app.  
**Lösning:** `usePathname` trigger + `visibilitychange` listener.

---

## 7. Kvarvarande problem — STATUS 2026-02-20

### ✅ P0: Middleware timeout (proxy.ts) — FIXAT
Timeout-wrapper tillagd i proxy.ts med `restMs: 4_000`, `authMs: 4_000`.
Dessutom tillagd top-level try/catch (D-5) och malformed redirect protection (D-2).

### ✅ P0: Service Role timeout — FIXAT
`createServiceRoleClient()` har nu `createFetchWithTimeout` med standardtider.

### ✅ P1: Marketing API caching — FIXAT
`unstable_cache` tillagd med tags `marketing-features` och `marketing-updates`.
Revalidering via admin-actions och `revalidateTag` veriferad (Audit E: CLEAN).

### ✅ P1: Sänk timeout-värden — FIXAT
```typescript
const defaultTimeouts: TimeoutConfig = {
  defaultMs: 15_000,
  restMs: 8_000,    // Var 15_000
  authMs: 5_000,    // Var 15_000
  functionsMs: 30_000,
  storageMs: 60_000,
}
```

### 🟢 P2: Döda funktioner i notifications-user.ts — KVARSTÅR
`getUserNotifications`, `getUnreadNotificationCount`, `markNotificationAsRead`, `markAllNotificationsAsRead` refererar till borttagen `notification_read_status`-tabell. Bör tas bort vid tillfälle.

### 🟢 P2: `withTimeout` avbryter inte HTTP — KVARSTÅR
`lib/utils/withTimeout.ts` använder `Promise.race` utan `AbortController`. Redan fixat specifikt i notification-hooken, men kvarstår globalt.

---

## 8. Komplett fillista med ändringar under sessionen

| Fil | Status | Ändring |
|-----|--------|---------|
| `hooks/useAppNotifications.ts` | ✅ Uppdaterad | Per-instans state, realtime, polling, AbortController, pathname-trigger, visibility-listener |
| `components/app/NotificationBell.tsx` | ✅ Uppdaterad | Webp-ikoner, formatRelativeTime |
| `app/actions/notifications-admin.ts` | ✅ Uppdaterad | delivered_at null fix |
| `app/actions/notifications-user.ts` | ✅ Uppdaterad | createTicketNotification skapar delivery-rader |
| `lib/utils/parseDbTimestamp.ts` | ✅ Ny fil | Defensiv UTC-parsing |
| `lib/i18n/format-utils.ts` | ✅ Uppdaterad | Timezone-fix i formatRelativeTime |
| `components/admin/SyncStatusBadge.tsx` | ✅ Uppdaterad | Timezone-fix |
| `features/profile/components/AchievementHistory.tsx` | ✅ Uppdaterad | Timezone-fix |
| `supabase/migrations/20260220200000_fix_notification_system_consolidated.sql` | ✅ Körd | read_at nullable, RLS, duplikat-policys, RPC |
| `supabase/migrations/20260220210000_fix_timestamp_timezone.sql` | ✅ Körd | TIMESTAMP → TIMESTAMPTZ |
| `proxy.ts` | ✅ Fixat | `createFetchWithTimeout` tillagd, top-level try/catch, malformed redirect protection |
| `lib/supabase/server.ts` | ✅ Fixat | createServiceRoleClient har timeout |
| `lib/marketing/api.ts` | ✅ Fixat | `unstable_cache` med tags |
| `lib/supabase/fetch-with-timeout.ts` | ✅ Justerad | restMs=8s, authMs=5s |
| `app/actions/notifications-user.ts` | 🟡 Bör städas | Döda funktioner kvar |

---

## 9. Databas-status

### Migreringar körda:

**Migration 1: `20260220200000_fix_notification_system_consolidated.sql`**
- ✅ `read_at` → nullable, default NULL
- ✅ RLS initplan-pattern på notification_deliveries
- ✅ Duplicerad SELECT-policy borttagen från notifications
- ✅ Auto-read rader resetade (WHERE read_at ≈ delivered_at)
- ✅ RPCs återskapade (`get_user_notifications`, `mark_notification_read`, `mark_all_notifications_read`, `dismiss_notification`)
- ✅ Realtime publication för notification_deliveries

**Migration 2: `20260220210000_fix_timestamp_timezone.sql`**
- ✅ `notifications.created_at` → TIMESTAMPTZ
- ✅ `notification_deliveries.delivered_at` → TIMESTAMPTZ
- ✅ `notification_deliveries.read_at` → TIMESTAMPTZ
- ✅ `notification_deliveries.dismissed_at` → TIMESTAMPTZ
- ✅ `notification_log.created_at` → TIMESTAMPTZ
- ✅ RPC return types uppdaterade till TIMESTAMPTZ

### Kända RLS-policies:

| Tabell | Policy | Problem? |
|--------|--------|----------|
| `notification_deliveries` | SELECT `user_id = (SELECT auth.uid())` | ✅ Initplan-fix applied |
| `notification_deliveries` | INSERT/UPDATE/DELETE för admin | ✅ OK |
| `notifications` | SELECT (en policy) | ✅ Duplikat borttagen |
| `marketing_features` | SELECT `status = 'published'` | ✅ Effektiv, ingen auth.uid() |
| `marketing_updates` | SELECT `status = 'published'` | ✅ Effektiv, ingen auth.uid() |

---

## 10. Teknisk stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL + Realtime + RLS + RPC + pg_cron)
- **Supabase SDKs:** `@supabase/supabase-js` ^2.86.0, `@supabase/ssr` ^0.8.0
- **Supabase URL:** `qohhnufxididbmzqnjwg.supabase.co`
- **Middleware:** `proxy.ts` — matchar alla routes utom static assets
- **Connection Pool:** Supabase platform defaults (ingen explicit konfiguration)

---

## 11. Rekommenderad åtgärdsordning

1. **🔴 Lägg till timeout i middleware** (`proxy.ts`) — Mest kritisk. Stoppar dominoeffekten.
2. **🔴 Lägg till timeout i service role client** (`lib/supabase/server.ts`) — Förhindrar att admin-queries hänger.
3. **🟡 Cacha marketing-queries** (`lib/marketing/api.ts`) — Minskar antalet DB-queries.
4. **🟡 Sänk timeout-värden** (`lib/supabase/fetch-with-timeout.ts`) — Fail fast istället för 15s väntan.
5. **🟢 Städa döda funktioner** (`app/actions/notifications-user.ts`) — Kodhygien.
6. **🟢 Gör `withTimeout` AbortController-medveten** (`lib/utils/withTimeout.ts`) — Förhindrar resource leak globalt.

---

## 12. Sammanfattning

Det verkliga grundproblemet är **middleware utan timeout** i `proxy.ts`. Denna gateway körs på varje request och gör 1-4 Supabase-anrop utan någon tidsbegränsning. När Supabase (eller nätverket) är långsam, blockeras alla efterföljande requests — layouts, components, notifications, marketing. Det ser ut som att "allt" är sönder, men orsaken är en enda fil: **proxy.ts saknar `createFetchWithTimeout`-wrappern som alla andra klienter redan har**.

Sekundärt saknar service role-klienten och marketing-API:et caching/timeout, men det primära fixet är punkt 1 ovan.
