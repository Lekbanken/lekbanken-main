# Profile Cleanup — Implementeringsplan

**Startdatum:** 2026-03-05  
**Baseras på:** [PROFILE_AUDIT_2026-03-05.md](PROFILE_AUDIT_2026-03-05.md)  
**Godkänd IA:** Alt B (Balanserad — 6 sidebar-items)  
**Status:** ✅ KLAR

---

## Regler för denna PR

1. **Ingen i18n-nyckel-radering** — oanvända nycklar rensas i separat PR
2. **Safe delete** — filer raderas bara om grep + tsc bekräftar noll importer
3. **Inga `/api/profile/*` compat-routes** — nya auth-routes under `/api/accounts/auth/`
4. **Redirects istället för 404** — borttagna sidor redirectar till närmaste aktiva sida
5. **Commitmeddelanden** — prefixade med `profile:` + kort beskrivning
6. **Typ-safety** — `npx tsc --noEmit` måste passera efter varje commit
7. **Bevarade i18n-nycklar** — även om vi tar bort UI som använder dem

---

## Commits

### Commit 1 — Auth Routes + Account UI Fix (P0) ✅ KLAR (2026-03-05)

**Problem:** `account/page.tsx` anropar `POST /api/profile/email` och `POST /api/profile/password/verify` — dessa routes existerar inte → 404.

**Uppgifter:**

- [x] Skapa `app/api/accounts/auth/email/change/route.ts`
  - POST, input: `{ new_email, password }`
  - Verifierar lösenord → anropar `supabase.auth.updateUser({ email })`
  - Output: `{ ok, errorCode?, message? }`
- [x] Skapa `app/api/accounts/auth/password/change/route.ts`
  - POST, input: `{ current_password, new_password }`
  - Verifierar current via signInWithPassword → anropar `supabase.auth.updateUser({ password })`
  - Output: `{ ok, errorCode?, message? }`
- [x] Uppdatera `app/app/profile/account/page.tsx`
  - Rad 65: `POST /api/profile/email` → `/api/accounts/auth/email/change`
  - Rad 98–108: Tvåstegs verify+client-update → enkelt server-anrop till `/api/accounts/auth/password/change`
  - Tog bort `updatePassword` från `useAuth()`-destrukturering (ej längre behövd)

**Noteringar:**
- Lösenordsflödet ändrades från tvåsteg (verify-endpoint + client-side `updatePassword`) till ett enda server-anrop
- `updatePassword` togs bort från `useAuth()`-destrukturering + `useCallback`-deps
- Båda routes använder `signInWithPassword` på RLS-klienten för att verifiera lösenord (session refresh för samma user — säkert)
- Response inkluderar `errorCode` + `field` (per GPT:s rekommendation) för framtida UI-highlighting
- `npx tsc --noEmit` → 0 errors

**Filer som skapas:**
- `app/api/accounts/auth/email/change/route.ts`
- `app/api/accounts/auth/password/change/route.ts`

**Filer som ändras:**
- `app/app/profile/account/page.tsx`

**Verifiering:** API returnerar korrekt JSON. Account-sidan ger inte 404.

---

### Commit 2 — MFA Date Guard (P0) ✅ KLAR (2026-03-05)

**Problem:** `SecuritySettingsClient.tsx` rad 307 renderar `new Date(mfaStatus.enrolled_at!)` → visar "1970-01-01" när enrolled_at är null.

**Uppgifter:**

- [x] Lägg till null/epoch-guard i `SecuritySettingsClient.tsx` rad 307
  - Fångar: `null`, `undefined`, tom sträng, `0`, epoch (`getTime() === 0`), ogiltigt datum (`isNaN`)
- [x] Ersatte hårdkodade "Aktiverat:" och "Senast verifierat:" med `t('enrolledAt')` och `t('lastUsed')` (redan existerande i18n-nycklar)
- [x] Lägg till i18n-nyckel `unknownDate` i sv/no/en.json under `auth.mfa.settings`
- [x] Kodkommentar som förklarar varifrån enrolled_at kommer och vad som räknas som ogiltigt

**Noteringar:**
- Guard-funktionen: IIFE som returnerar `t('unknownDate')` för alla invalid states, annars `toLocaleDateString('sv-SE')`
- Två hårdkodade svenska strängar eliminerade (bonus)
- `npx tsc --noEmit` → 0 errors

**Filer som ändras:**
- `app/app/profile/security/SecuritySettingsClient.tsx`
- `messages/sv.json`
- `messages/no.json`
- `messages/en.json`

**Verifiering:** MFA-datum visar korrekt datum eller "Okänt datum" — aldrig "1970-01-01".

---

### Commit 3 — Delete Gen-1 ProfilePage Cluster (P0) ✅ KLAR (2026-03-05)

**Problem:** `features/profile/ProfilePage.tsx` (550+ rader) importeras inte längre. Tillhörande komponenter är också döda.

**Uppgifter:**

- [x] Radera `features/profile/ProfilePage.tsx`
- [x] Radera `features/profile/components/ProfileHeader.tsx`
- [x] Radera `features/profile/components/SettingsList.tsx`
- [x] Radera `features/profile/components/SettingsItem.tsx`
- [x] Radera `features/profile/components/AchievementHistory.tsx`
- [x] Radera `features/profile/components/LogoutButton.tsx`
- [x] Radera `features/profile/components/LanguageSelector.tsx`
- [x] Radera `features/profile/components/ProfileAchievementsShowcase.tsx`
- [x] Radera `features/profile/types.ts`
- [x] Rensade dead string-refs i `app/sandbox/config/sandbox-modules.ts` (ProfileHeader + AchievementList)
- [x] Verifiera med grep att inga importer kvarstår
- [x] Verifiera `npx tsc --noEmit` passerar

**Noteringar:**
- Inga barrel-filer hittades — inga extra index.ts att rensa
- `avatarPresets.ts` behölls (aktiv import i general/page.tsx)
- `components/`-mappen raderades helt (tom efter filborttagning)
- Sandbox-metadata rensad: tog bort dead component-refs + `/app/profile/achievements`-route
- `npx tsc --noEmit` → 0 errors

**Filer som raderas:**
- `features/profile/ProfilePage.tsx`
- `features/profile/components/ProfileHeader.tsx`
- `features/profile/components/SettingsList.tsx`
- `features/profile/components/SettingsItem.tsx`
- `features/profile/components/AchievementHistory.tsx`
- `features/profile/components/LogoutButton.tsx`
- `features/profile/components/LanguageSelector.tsx`
- `features/profile/components/ProfileAchievementsShowcase.tsx`
- `features/profile/types.ts`

**Filer som ändras:**
- `app/sandbox/config/sandbox-modules.ts`

**Verifiering:** Appen bygger utan fel. Inga broken imports.

---

### Commit 4 — Trim Preferences till Language + Theme (P1) ✅ KLAR (2026-03-05)

**Problem:** Preferences-sidan visar 13 inställningar varav 11 är UI-skal utan backend-effekt.

**Uppgifter:**

- [x] Ta bort sektionerna Tid/Datum, Tillgänglighet, Animationer & Feedback, Gränssnitt från `preferences/page.tsx`
- [x] Behåll Språk + Tema (dessa fungerar via PreferencesContext)
- [x] Inga i18n-nycklar raderas

**Noteringar:**
- Borttagna sektioner: Timezone & Date/Time, Accessibility (font size, reduced motion, high contrast), Animations & Feedback, UI Preferences (compact mode, screen reader mode)
- Borttagna imports: `Switch`, `Select`, `EyeIcon`, `SpeakerWaveIcon`, `ClockIcon`
- Borttagna konstanter: `timezones`, `fontSizes`
- `defaultPreferences` trimmad till bara `language` + `theme`
- Sidan har nu exakt 2 Cards
- `npx tsc --noEmit` → 0 errors

**Filer som ändras:**
- `app/app/profile/preferences/page.tsx`

**Verifiering:** Preferences visar exakt 2 Cards: Språk och Tema. Sparfunktion fungerar.

---

### Commit 5 — GDPR till Account + Privacy Redirect (P1) ✅ KLAR (2026-03-05)

**Problem:** Privacy-sidan har minimal info (GDPR-rättigheter + email). Bättre under Account.

**Uppgifter:**

- [x] Lägg till GDPR-info Card i botten av `account/page.tsx`
- [x] Ersätt `privacy/page.tsx` med `redirect('/app/profile/account')`
- [x] Ta bort `privacy` från `navItems` i `ProfileNavigation.tsx`
- [x] Inga i18n-nycklar raderas

**Noteringar:**
- GDPR-kortet använder enbart befintliga i18n-nycklar (`sections.privacy.gdprRights.*`, `sections.privacy.contact.*`)
- Enda hårdkodade strängen: `privacy@lekbanken.se` (samma som i originalet)
- `LockClosedIcon` togs bort från ProfileNavigation-imports (ej längre behövd)
- `ShieldCheckIcon` + `EnvelopeIcon` tillagda i account/page.tsx imports
- `npx tsc --noEmit` → 0 errors

**Filer som ändras:**
- `app/app/profile/account/page.tsx`
- `app/app/profile/privacy/page.tsx`
- `components/profile/ProfileNavigation.tsx`

**Verifiering:** Account har GDPR-sektion. `/app/profile/privacy` redirectar. Sidebar visar 6 items.

---

### Commit 6 — Redirect Orphan Routes (P1) ✅ KLAR (2026-03-05)

**Problem:** `activity/page.tsx` och `friends/page.tsx` är URL-nåbara men dolda i nav.

**Uppgifter:**

- [x] Ersätt `activity/page.tsx` med `redirect('/app/profile')` + TODO-kommentar
- [x] Ersätt `friends/page.tsx` med `redirect('/app/profile')` + TODO-kommentar

**Noteringar:**
- Båda filer helt ersatta med server-side `redirect()` (ej `'use client'`)
- TODO-kommentar: `// TODO(profile): route temporarily disabled until feature is reintroduced`
- `npx tsc --noEmit` → 0 errors

**Filer som ändras:**
- `app/app/profile/activity/page.tsx`
- `app/app/profile/friends/page.tsx`

**Verifiering:** Båda URL:er redirectar till profilöversikten.

---

### Commit 7 — Design Consistency (P2) ✅ KLAR (2026-03-05)

**Problem:** Inkonsistent spacing, mobile back-link pekar fel, hårdkodad metadata.

**Uppgifter:**

- [x] Mobile back-link: `/app` → `/app/profile` i `ProfileNavigation.tsx`
- [x] Security metadata → `generateMetadata()` med `getTranslations`
- [x] Standardisera padding till `p-6 lg:p-8` på alla profilsidor
- [x] Standardisera spacing till `space-y-8` på alla profilsidor
- [x] Ingen i18n-rensning i denna PR

**Noteringar:**
- Mobile back-link ändrad rad 133: `/app` → `/app/profile`
- `export const metadata` (hårdkodad svenska) → `export async function generateMetadata()` med `getTranslations`
- Security page: kollapsat nästlad `<div className="space-y-8">` till yttre wrapper `<div className="p-6 lg:p-8 space-y-8">`
- 5 av 6 aktiva sidor hade redan korrekt skeleton — bara security behövde fix
- Redirect-sidor (privacy, activity, friends) behöver inga wrappers
- `npx tsc --noEmit` → 0 errors
- `npx next build` → green

**Filer som ändras:**
- `components/profile/ProfileNavigation.tsx`
- `app/app/profile/security/page.tsx`

**Verifiering:** Alla profilsidor har identisk layout-skeleton. Mobile back pekar rätt.

---

## PR-krav

### Endpoints (nya)

| Method | Path | Input | Output |
|--------|------|-------|--------|
| POST | `/api/accounts/auth/email/change` | `{ new_email, password }` | `{ ok, errorCode?, message? }` |
| POST | `/api/accounts/auth/password/change` | `{ current_password, new_password }` | `{ ok, errorCode?, message? }` |

### QA-checklista (11 journeys)

1. Byta avatar (preset) → sparas + visas i header
2. Skapa avatar (builder) → sparas till Storage
3. Ändra namn → uppdateras i DB + header
4. Ändra e-post → verifieringsemail skickas
5. Ändra lösenord → kan logga in med nytt
6. Aktivera MFA → QR + verifiering
7. Inaktivera MFA → confirmation dialog
8. Ta bort trusted device → försvinner från lista
9. Byta språk → omedelbar effekt
10. Byta tema → omedelbar effekt
11. Se org-tillhörighet → korrekt roll visas

### Out of scope

- Dashboard-berikande (overview-sidan) — separat PR
- i18n-nyckelrensning — separat PR
- Feature flags-infrastruktur — separat PR
- Hårdkodade strängar → i18n — separat PR (efter denna cleanup)
- Activity/Friends funktionalitet — framtida arbete
