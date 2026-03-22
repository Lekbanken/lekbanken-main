# /app/profile — Total Audit + Implementeringsförslag

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-05
- Last updated: 2026-03-21
- Last validated: -

> Frozen audit snapshot for the `/app/profile` cleanup initiative before implementation work started.

**Datum:** 2026-03-05  
**Forfattare:** Claude (audit, ej kod)  
**Status:** VANTAR PA GODKANNANDE - ingen kod far andras forran planen godkants

---

## Sammanfattning

`/app/profile` är Lekbankens profilcenter med **9 route-sidor** organiserade i en sidebar-layout. Systemet har byggts upp i minst 3 generationer:

1. **Gen-1:** `features/profile/ProfilePage.tsx` — en "allt-i-ett"-sida (550+ rader) med inline MFA, sessioner, avatar, organisationer, mm. **Importeras inte längre av någon route** men ligger kvar i kodbasen.
2. **Gen-2:** De nuvarande sidorna under `app/app/profile/` (overview, general, account, security, privacy, preferences, organizations) — en uppdelad, sidebar-baserad arkitektur.
3. **Mellansteg:** Ytterligare routes (`activity/`, `friends/`) som byggts men inte syns i navigationen.

Resultatet är duplicerade flöden, död kod, missade API-routes, UI-skalfunktioner utan backend-stöd, och hårdkodade strängar.

---

## Del 1: Audit Findings (P0 / P1 / P2)

### P0 — Måste fixas (säkerhet, kraschar, bruten funktionalitet)

#### P0-1: API-routes för email-ändring och lösenordsverifiering existerar inte
- **Symptom:** Account-sidan (`account/page.tsx`) anropar `POST /api/profile/email` (rad 65) och `POST /api/profile/password/verify` (rad 109). Dessa routes existerar inte.
- **Rotorsak:** Account-sidan skapades med förväntningen att API:erna skulle finnas, men de implementerades aldrig.
- **Påverkan:** Klickar man "Ändra e-post" eller "Ändra lösenord" får man ett 404-fel. Grundläggande kontofunktioner fungerar inte.
- **Rekommendation:** Skapa API-routes `/api/accounts/auth/email/change` och `/api/accounts/auth/password/change`, eller koppla om till Supabase auth-metoder direkt via server action.

#### P0-2: MFA "Aktiverat: 1970-01-01" — felaktig default
- **Symptom:** Security-sidan visar "Aktiverat: 1970-01-01" (epoch zero) i skärmdumpen.
- **Rotorsak:** `SecuritySettingsClient.tsx` (rad ~300) renderar `new Date(mfaStatus.enrolled_at!)` — när `enrolled_at` är `null`, `0`, eller en tom sträng konverterar `Date` det till Unix epoch (1 jan 1970). API:t `/api/accounts/auth/mfa/status` returnerar troligen `enrolled_at: null` eller `enrolled_at: "1970-01-01"` som defaultvärde.
- **Påverkan:** Användarna ser felaktig datum-information. Förtroendebrott.
- **Rekommendation:** (a) Bevaka `enrolled_at` nullable med fallback "Okänt datum" i UI, (b) undersök vad databasen/API:t returnerar och korrigera eventuella defaults.

#### P0-3: `features/profile/ProfilePage.tsx` — legacy-monolitisk komponent, oanvänd men kvarliggande
- **Symptom:** 550+ rader med inline MFA-enrollment, sessions, devices, avatar hantering, organisation — **importeras inte av någon route** i `app/`.
- **Rotorsak:** Gen-1-kod som ersattes av Gen-2 sidebar-arkitekturen men aldrig togs bort.
- **Påverkan:** (a) Förvirrar AI-agenter och utvecklare som ser den koden, (b) Innehåller ~10 hårdkodade svenska strängar utanför i18n, (c) Använder gamla API-mönster (`/api/accounts/sessions`, `/api/accounts/devices`) som kanske inte längre underhålls.
- **Rekommendation:** Arkivera/ta bort `features/profile/ProfilePage.tsx` och tillhörande komponenter som inte importeras av Gen-2 (`ProfileHeader.tsx`, `SettingsList.tsx`, `SettingsItem.tsx`, etc.).

---

### P1 — Bör fixas (UX-problem, inkonsistens, kvalitet)

#### P1-1: Preferanser-sidan — UI-skal utan verifierat backend-stöd
- **Symptom:** Sidan renderar 7 Cards med 13 inställningar (språk, tema, timezone, tid/datumformat, textstorlek, reducera rörelse, hög kontrast, animationer, kompakt mode, skärmläsarmode). Alla har toggle/select-kontroller.
- **Rotorsak:** `ProfileService.updatePreferences()` upsertar till `user_preferences`-tabellen, men det är inte verifierat att alla fält faktiskt påverkar appens beteende. Specifikt:
  - `compact_mode`, `screen_reader_mode` — ingen indikation att appen lyssnar på dessa.
  - `text_size` — ingen global CSS/provider som applicerar det.
  - `high_contrast` — ingen kontrast-provider.
  - `reduce_motion` — ingen `prefers-reduced-motion`-provider.
  - `timezone`, `date_format`, `time_format` — ingen global formatter som respekterar dem.
- **Påverkan:** Användare ändrar inställningar som inte gör något → förlorar förtroende.
- **Rekommendation:** Ta bort eller feature-flagga sektionerna Tid/Datum, Tillgänglighet, Animationer, Gränssnitt. Behåll Språk och Tema (dessa fungerar via PreferencesContext).

#### P1-2: Dubbel e-postvisning (Generellt + Konto)
- **Symptom:** E-post visas som read-only med "Ändra"-knapp på General-sidan (pekar till `/app/profile/account`), och som full ändra-form på Account-sidan.
- **Rotorsak:** Fragmentering — General visar e-post för kontext men kopplar till Account för ändring.
- **Påverkan:** Inte en bugg men onödigt redundant. Användare kan uppleva förvirring.
- **Rekommendation:** Antingen ta bort e-post helt från General (det är en kontofunktion), eller ha det men tydligare "read-only"-label utan "Ändra"-knapp.

#### P1-3: Översikt-sidan duplicerar sidebar-navigeringen
- **Symptom:** Overview (`page.tsx`) renderar en grid med 6 QuickLink-cards som pekar till samma sidor som sidebar.
- **Rotorsak:** Utformat som landing page men ger inget utöver navigeringen.
- **Påverkan:** Onödig dubblering → användare klickar Profil, ser kort, och klickar igen. Extra steg.
- **Rekommendation:** Omformatera till en informationsrik dashboard: visa profil-sammanfattning, säkerhetsstatus (redan delvis där), organisationsinfo, quick-actions. ELLER minska till bara den existerande säkerhetsstatusen + omedelbara åtgärdspunkter.

#### P1-4: "Animasjoner og tilbakemeldinger" — felaktig sektion
- **Symptom:** I18n-key `animationsSection.title` = "Animationer och feedback" (SV) / "Animasjoner og tilbakemeldinger" (NO). Sektionen har bara en toggle för "Animationer".
- **Rotorsak:** Titeln anger "feedback" men sektionen innehåller bara en animering-toggle. "Tilbakemeldinger" (feedback) har inget eget UI.
- **Påverkan:** Missvisande sektionsrubrik + den gör överhuvudtaget inget i appen.
- **Rekommendation:** Ta bort sektionen helt (ingen funktion). Om den ska finnas i framtiden: byt ut mot "Support & Feedback" med funktionalitet att skicka feedback, enligt PO:s önskemål.

#### P1-5: `activity/page.tsx` och `friends/page.tsx` — dolda routes utan nav-synlighet
- **Symptom:** Dessa sidor finns men visas inte i `ProfileNavigation.tsx`:s `navItems`-array.
- **Rotorsak:** `ProfileNavigation` definierar bara 7 items (overview → organizations). Activity och Friends har i18n-nycklar (`nav.activity`, `nav.friends`) men är inte tillagda i navigeringen.
- **Påverkan:** Sidorna existerar och är URL-nåbara men osynliga för användare via navigering.
- **Rekommendation:** Antingen lägg till dem i navigeringen, eller feature-flagga dem tills de är klara.

#### P1-6: Hårdkodade strängar (utanför i18n)
- **Symptom:** Flera filer har svenska/norska strängar direkt i JSX:
  - `SecuritySettingsClient.tsx`: "Inaktiverar...", "Generera nya", "Verifiera", "Aktivera", "Aktiverat:", "Senast verifierat:", window.confirm-texter.
  - `ProfilePage.tsx` (Gen-1): "Profilen är uppdaterad.", "Inga sessioner hittades.", "Okänd enhet", "Verifiera", "Avbryt" etc.
  - `preferences/page.tsx`: "Tidsformat", "Datumformat" (label-strängar ej i i18n).
- **Påverkan:** Användare som byter till engelska ser blandade språk.
- **Rekommendation:** Flytta alla hårdkodade strängar till `messages/{sv,no,en}.json`.

#### P1-7: Privacy-sidan har kvarliggande referens till GDPR self-service
- **Symptom:** I `messages/sv.json` finns fortfarande fulla i18n-nycklar för `deleteAccountSection`, `dataExportSection`, `consents` under `privacy` — men UI:t (`privacy/page.tsx`) visar bara GDPR-rättighetslista + kontakt-email.
- **Rotorsak:** Privacy omskrevs från GDPR-tooling till ren information, men i18n städades inte.
- **Påverkan:** ~60 oanvända i18n-nycklar → ökar underhållsskuld.
- **Rekommendation:** Ta bort oanvända i18n-nycklar. Behåll `gdprRights` + `contact` som används.

---

### P2 — Nice-to-have (designkonsistens, polish)

#### P2-1: Privacy-sidan saknar `p-6 lg:p-8` padding
- **Symptom:** Alla sidor utom Privacy använder `<div className="p-6 lg:p-8 space-y-8">`. Privacy har `<div className="space-y-6">`.
- **Påverkan:** Visuellt annorlunda spacing.
- **Rekommendation:** Lägg till `p-6 lg:p-8` wrapper.

#### P2-2: Inkonsistent `space-y-*` spacing
- **Symptom:** Overview/General/Account/Organizations använder `space-y-8`, Privacy `space-y-6`, Preferences `space-y-8`.
- **Rekommendation:** Standardisera till `space-y-8` överallt.

#### P2-3: Inkonsekvent header-mönster
- **Symptom:** De flesta sidor har `<h1>` med ikon + title + description. Privacy har bara `<h1>` + `<p>`.
- **Rekommendation:** Standardisera headern med ikon-mönstret.

#### P2-4: Security-sidan har hårdkodad metadata istället för i18n
- **Symptom:** `export const metadata = { title: 'Säkerhetsinställningar | Lekbanken' }` — hårdkodat SV.
- **Rotorsak:** Server component, `getTranslations` kunde ha använts (som i layout.tsx).
- **Rekommendation:** Använd `generateMetadata()` med `getTranslations`.

#### P2-5: `features/profile/types.ts` — dubblettyper
- **Symptom:** `UserSummary`, `SettingsState` i `features/profile/types.ts` duplicerar typer från `lib/profile/types.ts`.
- **Rekommendation:** Konsolidera till `lib/profile/types.ts`.

#### P2-6: Unused navItems i18n-keys
- **Symptom:** `nav.activity`, `nav.activityDesc`, `nav.friends`, `nav.friendsDesc`, `nav.notifications`, `nav.notificationsDesc` — finns i sv.json men används inte i navigeringen.
- **Rekommendation:** Rensa eller feature-flagga.

#### P2-7: Mobile back-link pekar till `/app` istället för `/app/profile`
- **Symptom:** `ProfileMobileNav` har `<Link href="/app">` som back-knapp. Om du är på en undersida borde back peka till oversikt/profil, inte appens root.
- **Rekommendation:** Ändra till `/app/profile`.

---

## Del 2: Målbild / Informationsarkitektur (IA)

### Nuvarande IA

```
/app/profile
├── (overview)       ← Samlingssida med QuickLinks
├── /general         ← Avatar, namn, visningsnamn, email (read-only), telefon
├── /account         ← Email-ändring, lösenord, kontoinformation
├── /security        ← MFA on/off, recovery codes, trusted devices
├── /privacy         ← GDPR-rättigheter, kontakt-email
├── /preferences     ← Språk, tema, datum/tid, tillgänglighet, animationer, gränssnitt
├── /organizations   ← Org-medlemskap, roller, admin-orgs
├── /activity        ← (dold) Aktivitetslogg, sessioner
└── /friends         ← (dold) Vänner
```

---

### Alt A: Minimal (konsolidera till 3–4 sidor)

```
/app/profile
├── (dashboard)      ← Profil + säkerhetsstatus + org-sammanfattning + snabbåtgärder
├── /account         ← Slår ihop: Generellt + Konto + Organisation
│                       - Profilbild (avatar)
│                       - Namn, visningsnamn
│                       - E-post (med ändring)
│                       - Lösenord
│                       - Kontoinformation
│                       - Organisationstillhörighet
├── /security        ← MFA + trusted devices + recovery codes
└── /settings        ← Slår ihop: Preferenser (bara Språk + Tema) + GDPR-info
```

**Fördelar:**
- Minimal navigation, snabbt att hitta allt
- 3 klick-djup max
- Lite att underhålla

**Nackdelar:**
- Account-sidan blir lång (~600+ rader)
- Svårare att utöka i framtiden
- Org-funktioner "gömda" under Account

**Migreringsrisk:** Medel — kräver att 4 sidor slås ihop, routes redirectas.

---

### Alt B: Balanserad (rekommenderas) ✅

```
/app/profile
├── (dashboard)      ← Profilinfo + säkerhetsstatus + org-kort + "action needed"-lista
├── /general         ← Profilbild (avatar), namn, visningsnamn, telefon
├── /account         ← E-post, lösenord, kontoinformation, GDPR-kontakt
├── /security        ← MFA, trusted devices, recovery codes
├── /preferences     ← Språk + Tema (bara det som fungerar)
└── /organizations   ← Org-medlemskap, roller
```

**Vad ändras vs nuvarande:**
- **Privacy tas bort** som separat sida → GDPR-info flyttas till Account (logical: GDPR = konto-rätt)
- **Preferenser trimmas**: Ta bort tid/datum, tillgänglighet, animationer, gränssnitt — behåll språk + tema
- **Dashboard** berikas: visa profilering, säkerhetsstatus, org, "åtgärder du borde göra" (MFA, verifiera email, etc.)
- **Activity & Friends** förblir dolda/feature-flaggade tills de behövs  
- **5 sidebar-items** istället för 7 → renare nav

**Fördelar:**
- Logisk gruppering: profil-data, konto-inställningar, säkerhet, preferenser, org
- Inget "tomt" UI-skal (allt som visas fungerar)
- Enkel att utöka (activity, friends, support/feedback kan läggas till later)
- GDPR-info lever under Account = naturligt "kontorelaterat"

**Nackdelar:**
- Account blir lite tyngre med GDPR-info
- Kräver fortfarande 5 sidor

**Migreringsrisk:** Låg — Privacy:s innehåll flyttas, Preferences trimmas. Inga stora omskrivningar.

---

### Alt C: Framtidssäker (med feature flags)

```
/app/profile
├── (dashboard)          ← Profilinfo, säkerhet, org, achievements-sammanfattning
├── /general             ← Avatar, namn, telefon
│                           [FEATURE-FLAG: unlockable-avatars via DiceCoin/level/achievements]
├── /account             ← Email, lösenord, kontoinformation
├── /security            ← MFA, trusted devices, recovery codes
│                           [FEATURE-FLAG: WebAuthn/passkeys]
├── /privacy             ← GDPR-info + kontakt
│                           [FEATURE-FLAG: self-service data export & account deletion]
│                           [FEATURE-FLAG: consent management]
├── /preferences         ← Språk, tema
│                           [FEATURE-FLAG: accessibility (textsize, contrast, motion)]
│                           [FEATURE-FLAG: tid/datum-format]
│                           [FEATURE-FLAG: gränssnittsläge (kompakt, skärmläsare)]
├── /organizations       ← Org-medlemskap, roller
├── /activity            ← [FEATURE-FLAG] Aktivitetslogg, sessioner
├── /friends             ← [FEATURE-FLAG] Vänner, förfrågningar
└── /support             ← [FEATURE-FLAG] Support & Feedback (ersätter "Animationer & Feedback")
```

**Fördelar:**
- Allt förberett — bara slå på flaggor
- Tydligt vad som är "nu" vs "framtid"
- Ingen funktionalitet behöver tas bort permanent

**Nackdelar:**
- Fler sidor att underhålla (även om dolda)
- Feature-flag-infrastructure måste finnas
- Risker att "dolda" sidor förfaller

**Migreringsrisk:** Lägst — liten förändring vs nuvarande, mestadels subtraherar inte-fungerande UI.

---

### Rekommendation

**Alt B (Balanserad)** ger bäst ROI idag. Den levererar en ren, fungerande profil utan UI-skal, och strukturen tillåter framtida utbyggnad. Feature-flags från Alt C kan läggas till inkrementellt utan att börja med dem.

---

## Del 3: Implementeringsplan + Risk + Test

### Stegvis plan (Alt B)

| Steg | Beskrivning | Done-kriterium |
|------|-------------|----------------|
| **1** | **Skapa saknade API-routes** — `/api/accounts/auth/email/change` (POST) och `/api/accounts/auth/password/change` (POST) | API-routes returnerar korrekt respons. E-postbyte triggar verifieringsemail. Lösenordsbyte kräver nuvarande lösenord. |
| **2** | **Fixa MFA-datum (1970-01-01)** — Uppdatera SecuritySettingsClient att hantera null/0/epoch enrolled_at | MFA "Aktiverat"-datumet visar korrekt datum eller "Okänt datum" om null |
| **3** | **Ta bort Gen-1 ProfilePage** — Arkivera/radera `features/profile/ProfilePage.tsx` och tillhörande döda komponenter (`ProfileHeader.tsx`, `SettingsList.tsx`, `SettingsItem.tsx`, om oanvända) | Inga importer refererar till borttagna filer. Appen bygger utan fel. |
| **4** | **Rensa Preferanser** — Ta bort sektionerna: Tid/datum, Tillgänglighet, Animationer & Feedback, Gränssnitt. Behåll Språk + Tema. | Preferences-sidan visar 2 Cards (Språk, Tema). Spara fungerar. |
| **5** | **Flytta GDPR till Account** — Flytta GDPR-info + kontakt-email till Account-sidan som en Card i botten. Ta bort `/privacy`-routen (redirect till /account). | Account-sidan har GDPR-sektion. /privacy redirectar till /account. |
| **6** | **Berika Dashboard (Översikt)** — Ersätt QuickLink-grid med: profilsammanfattning (avatar + namn + email), säkerhetsstatus (redan finns), org-kort, "Åtgärder att göra"-lista (MFA, verifiera email, etc.) | Dashboard visar sammanfattning, inte bara navigeringslänkar. |
| **7** | **Flytta hårdkodade strängar till i18n** — SecuritySettingsClient window.confirms, labels i preferences (Tidsformat, Datumformat). | `npx next-intl` visar inga saknade nycklar. Alla strängar i messages-filer. |
| **8** | **Städa i18n** — Ta bort oanvända nycklar: `deleteAccountSection.*`, `dataExportSection.*`, `consents.*`, `notifications` (om ej nav), activity/friends nav-nycklar (om dolda). | Inga dead keys i messages-filer. |
| **9** | **Designkonsistens** — Standardisera padding (p-6 lg:p-8), spacing (space-y-8), header-mönster (ikon + title + description), mobile back → /app/profile. | Alla profilsidor har identisk layout-skeleton. |
| **10** | **Uppdatera sidbar** — Byt navItems till: Översikt, Allmänt, Konto, Säkerhet, Preferanser, Organisationer (6 items). Ta bort Privacy-länken. | Sidebar visar 6 items. Alla länkar fungerar. |
| **11** | **Dölj/feature-flagga Activity & Friends** — Om inte redo: lägg till `notFound()` eller feature gate. | Sidorna är URL-nåbara bara med feature flag på. |
| **12** | **E2E test + QA** — Verifiera alla user journeys manuellt + uppdatera/skapa automatiserade tester. | Alla P0/P1-findings fixade. Manuell QA-checklista signoff. |

---

### Riskanalys

| Risk | Sannolikhet | Konsekvens | Mitigation |
|------|-------------|------------|------------|
| **Dataförlust vid privacy-borttagning** | Låg | Låg | Privacy har ingen data-logik, bara statisk info |
| **Auth/RLS-problem med nya email/password-routes** | Medel | Hög | Använd Supabase auth.updateUser() som redan hanterar RLS. Testa med icke-autentiserade requests. |
| **Regression i MFA-flödet** | Medel | Hög | MFA-ändringen är minimal (null-check). Behåll befintlig logik, lägg bara till guard. |
| **i18n-borttagningar missar nycklar** | Medel | Låg | Greppa kodbasen efter varje borttagen nyckel. CI-check. |
| **Broken redirects** | Låg | Medel | Test: `/app/profile/privacy` → 301 → `/app/profile/account` |
| **Gen-1 ProfilePage används nånstans okänt** | Låg | Medel | Full grep + CI build-verifiering innan borttagning |
| **Feature-flaggade sidor indexeras av sökmotorer** | Låg | Låg | `noindex` meta + `notFound()` för dolda sidor |

---

### Testplan

#### Kritiska User Journeys

| # | Journey | Sida | Verifiering |
|---|---------|------|-------------|
| 1 | Byta avatar (preset) | /general | Avatar uppdateras i header + dashboard |
| 2 | Skapa avatar (builder) | /general | Avatar sparas till Supabase Storage, visas korrekt |
| 3 | Ändra namn | /general | Namn uppdateras i DB, visas i header |
| 4 | Ändra e-post | /account | Verifieringsemail skickas, ny email visas efter bekräftelse |
| 5 | Ändra lösenord | /account | Lösenordet byts, man kan logga in med nytt lösenord |
| 6 | Aktivera MFA | /security | QR-kod visas, verifiering fungerar, MFA markerad som aktiv |
| 7 | Inaktivera MFA | /security | MFA stängs av, confirmation-dialog visas |
| 8 | Ta bort trusted device | /security | Device försvinner från listan |
| 9 | Byta språk | /preferences | Hela appen byter till valt språk |
| 10 | Byta tema | /preferences | Ljust/mörkt/system appliceras direkt |
| 11 | Se org-tillhörighet | /organizations | Org visas med korrekt roll och info |

#### Edge Cases

| # | Scenario | Förväntat beteende |
|---|----------|-------------------|
| 1 | Användare saknar organisation | "Ingen organisation" empty state |
| 2 | Användare utan avatar | Initialer visas överallt |
| 3 | Användare utan telefonnummer | Fältet tomt med placeholder |
| 4 | Nätverksfel vid sparande | Felmeddelande visas, data förblir osparad |
| 5 | MFA enrolled_at = null | "Okänt datum" eller dölj datumet |
| 6 | Användare med 3+ organisationer | Alla visas, korrekt scroll |
| 7 | Slow API response (>5s) | Loading state visas, timeout-retry erbjuds |
| 8 | Concurrent saves | Senaste sparningen vinner, konfirmation visas |

#### Manuell QA-checklista

- [ ] Alla 6 sidebar-items navigerar korrekt
- [ ] Mobile nav visar alla items med horisontell scroll
- [ ] Mobile back-pil pekar till `/app/profile`
- [ ] Avatar-preset selekteras och sparas → visas i header
- [ ] Avatar-builder öppnas, skapar, sparar → visas korrekt
- [ ] E-postfält på General → pekar till Account-sidan
- [ ] E-post kan ändras på Account (om API finns)
- [ ] Lösenord kan ändras med korrekt validering
- [ ] MFA: aktivera → QR → verifiera → inaktivera
- [ ] MFA-datum visar korrekt (inte 1970)
- [ ] Recovery codes kan genereras och laddas ner
- [ ] Trusted device kan tas bort
- [ ] GDPR-info visas under Account
- [ ] `/app/profile/privacy` redirectar korrekt
- [ ] Språkbyte → omedelbar effekt
- [ ] Tema-byte → omedelbar effekt
- [ ] Preferanser-sidan har INTE: tid/datum, tillgänglighet, animationer, gränssnitt
- [ ] Organisation visas med korrekt roll
- [ ] Loading states på alla sidor
- [ ] Felhantering om API misslyckas
- [ ] Ingen blandning av SV/NO/EN strängar
- [ ] `npx tsc --noEmit` → 0 errors

#### Automatiserade tester (rekommenderade)

- Unit test: MFA enrolled_at null-handling
- Unit test: Password validation logic
- Integration test: Profile API PATCH (happy path + unauthorized)
- E2E test: Ändra namn → verifiera att header uppdateras
- E2E test: MFA enrollment flow (om möjligt)

---

### No-Go kriterier

Deploy stoppas om:

1. `npx tsc --noEmit` har errors
2. Befintliga tester failar
3. API-routes för email/password returnerar 500 vid happy path
4. MFA enrollment/disablement ger ohanterliga fel
5. Språkbyte slutar fungera
6. Redirects ger 404 istället för 301

---

### Metrics / Telemetri (valfritt)

- Antal profil-sparanden per dag (lyckade vs misslyckade)
- MFA enrollment rate pre/post fix
- Errors per profilsida (Sentry/logging)
- Time-to-first-byte per profilsida
- Andel användare som faktiskt byter preferens

---

## Del 4: Frågor till Product Owner

1. **Activity & Friends**: Ska dessa sidor vara synliga i navigeringen eller fortsätta vara dolda? Behöver de uppgraderas först?

2. **Achievements**: Det finns referens till achievement-showcase i kodbasen — ska detta vara del av profil-dashboarden?

3. **Profilbildsupplåsning**: Du nämnde att lekledare ska kunna få fler profilbilder via DiceCoin/level/achievements. Finns det redan en reward-infrastruktur vi ska koppla mot, eller behöver den byggas?

4. **Support & Feedback**: Du föreslog att "Animationer & Feedback" kan ersättas med en Support/Feedback-sida. Finns det ett existerande support-system (ticketing, helpdesk) att integrera mot?

5. **GDPR Self-Service**: Tidshorisont för att implementera riktigt self-service (data export + account deletion med org-admin-workflow)? Ska vi förbereda databas-/API-stöd nu, eller bara behålla info-sidan?

6. **Notifications-sida**: Det finns full i18n för notifications-inställningar. Ska Lekbanken få pushnotiser i framtiden, eller kan vi permanent ta bort denna sektion?

7. **Privacy-redirect**: Är du OK med att ta bort Privacy som separat sida och flytta GDPR-info till Account? Eller föredrar du att behålla den som separat (men korrigerad)?

8. **Feature Flags**: Använder Lekbanken något feature-flag-system (LaunchDarkly, egna flags i DB, environment variables)? Behöver vi bygga ett?

9. **Email-ändring**: Ska email-ändring kräva password-verifiering (som nuvarande UI antyder), eller räcker re-authentication via Supabase?

10. **Organisationsvisning**: Ska org-sidan bara visa medlemskap, eller ska användare kunna lämna/byta organisation direkt därifrån?
