# Gamification Hub - Testplan

> **Status**: Redo för testning
> **Version**: 1.0
> **Datum**: 2026-01-04

---

## 1. Navigationstest

### 1.1 Menystruktur

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till Admin | "Gamification hub" visas som menygrupp | ⬜ |
| Kontrollera "Översikt" | Länk till `/admin/gamification` | ⬜ |
| Kontrollera "DiceCoin & XP" | Länk till `/admin/gamification/dicecoin-xp` | ⬜ |
| Kontrollera "Achievements" | Länk till `/admin/gamification/achievements` | ⬜ |
| Kontrollera "Shop & Rewards" | Länk till `/admin/gamification/shop-rewards` | ⬜ |
| Kontrollera "Library Exports" | Länk till `/admin/gamification/library-exports` | ⬜ |
| Verifiera att "Leaderboard" inte finns top-level | Ska inte synas separat | ⬜ |
| Verifiera att "Levels" inte finns top-level | Ska inte synas separat | ⬜ |
| Verifiera att "Butik" inte finns top-level | Ska inte synas separat | ⬜ |

### 1.2 Route highlighting

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Besök `/admin/gamification` | "Översikt" highlightad i menyn | ⬜ |
| Besök `/admin/gamification/dicecoin-xp` | "DiceCoin & XP" highlightad | ⬜ |
| Besök `/admin/gamification/achievements` | "Achievements" highlightad | ⬜ |

---

## 2. Hub Landing (`/admin/gamification`)

### 2.1 Grundläggande laddning

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till `/admin/gamification` | Sidan laddas utan fel | ⬜ |
| Kontrollera breadcrumbs | "Admin > Gamification hub" | ⬜ |
| Kontrollera sidtitel | "Gamification hub" | ⬜ |
| Kontrollera statistik-kort | 4 statistik-kort visas | ⬜ |

### 2.2 Module cards

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| 4 module cards visas | DiceCoin & XP, Achievements, Shop & Rewards, Library Exports | ⬜ |
| Varje card har status badge | Implemented/Partial/Planned | ⬜ |
| Varje card har features lista | Feature tags visas | ⬜ |
| Varje card har stats | Relevanta nyckeltal visas | ⬜ |
| Klicka på card | Navigerar till rätt modul | ⬜ |
| Hover-effekt | Border och shadow ändras | ⬜ |

---

## 3. DiceCoin & XP (`/admin/gamification/dicecoin-xp`)

### 3.1 Grundläggande laddning

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till sidan | Laddas utan fel | ⬜ |
| Breadcrumbs | "Admin > Gamification hub > DiceCoin & XP" | ⬜ |
| Statistik-kort | 4 kort: XP, Regler, Nivåer, Högsta poäng | ⬜ |

### 3.2 Tabs

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Default tab | "XP & DiceCoin" är vald | ⬜ |
| Klicka "Nivåer" | Tab byter, URL uppdateras till `?tab=levels` | ⬜ |
| Klicka "Leaderboards" | Tab byter, URL uppdateras till `?tab=leaderboards` | ⬜ |
| Direkt-URL `?tab=levels` | Nivåer-tab är vald vid laddning | ⬜ |
| Direkt-URL `?tab=leaderboards` | Leaderboards-tab är vald | ⬜ |

### 3.3 XP-regler tab

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Tabell visas | Regler med namn, trigger, XP, multiplier, status | ⬜ |
| Sök funktion | Filtrerar regler i realtid | ⬜ |
| "Lägg till regel" knapp | Knappen visas | ⬜ |

### 3.4 Nivåer tab

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Nivå-kort visas | Grid med nivåkort | ⬜ |
| Varje kort visar | Nivånummer, namn, XP-krav, belöning | ⬜ |

### 3.5 Leaderboards tab

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Tabell visas | Rank, namn, typ, poäng, DiceCoin | ⬜ |
| Rank-styling | Guld/silver/brons för top 3 | ⬜ |
| Typ-badge | Användare/Organisation | ⬜ |

---

## 4. Achievements (`/admin/gamification/achievements`)

### 4.1 Grundläggande

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till sidan | Laddas utan fel | ⬜ |
| Breadcrumbs | "Admin > Gamification hub > Achievements" | ⬜ |
| Statistik-kort | Total, Aktiva, Utkast, Upplåsta | ⬜ |

### 4.2 Filter och sök

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Sök achievement | Filtrerar på namn/beskrivning | ⬜ |
| Filter "Alla" | Visar alla | ⬜ |
| Filter "Aktiv" | Visar endast aktiva | ⬜ |
| Filter "Utkast" | Visar endast utkast | ⬜ |
| Filter "Arkiverad" | Visar endast arkiverade | ⬜ |

### 4.3 Achievement cards

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Kort visas i grid | 3 kolumner på desktop | ⬜ |
| Varje kort visar | Namn, status, beskrivning, tier, upplåsta, belöning | ⬜ |
| Tier progress bar | Visar nuvarande/max tier | ⬜ |
| Hover-effekt | Border och shadow | ⬜ |

---

## 5. Shop & Rewards (`/admin/gamification/shop-rewards`)

### 5.1 Grundläggande

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till sidan | Laddas utan fel | ⬜ |
| Breadcrumbs | "Admin > Gamification hub > Shop & Rewards" | ⬜ |
| Statistik-kort | Items, Aktiva, Sålt, Intäkter | ⬜ |

### 5.2 Filter

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Sök item | Filtrerar på namn/beskrivning | ⬜ |
| Filter "Alla" | Visar alla kategorier | ⬜ |
| Filter per kategori | Cosmetic, Power-up, Paket, Belöning | ⬜ |

### 5.3 Item cards

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Grid-layout | 4 kolumner på desktop | ⬜ |
| Pris visas | DiceCoin/XP med ikon | ⬜ |
| Status badge | Aktiv/Utkast/Slutsåld | ⬜ |
| Lager-indikator | Progress bar om stock finns | ⬜ |
| Featured ikon | Stjärna för featured items | ⬜ |

---

## 6. Library Exports (`/admin/gamification/library-exports`)

### 6.1 Grundläggande

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till sidan | Laddas utan fel | ⬜ |
| Breadcrumbs | "Admin > Gamification hub > Library Exports" | ⬜ |
| Statistik-kort | Mallar, Aktiva, Exports, Framgångsgrad | ⬜ |

### 6.2 Tabs

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Default tab | "Exportmallar" är vald | ⬜ |
| Klicka "Exportlogg" | Tab byter | ⬜ |

### 6.3 Empty states

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Mallar empty state | "Inga exportmallar ännu" + CTA | ⬜ |
| Logg empty state | "Ingen exporthistorik" | ⬜ |

---

## 7. Legacy Redirects

### 7.1 Redirect-test

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| `/admin/leaderboard` | Redirect till `/admin/gamification/dicecoin-xp?tab=leaderboards` | ⬜ |
| `/admin/gamification/levels` | Redirect till `/admin/gamification/dicecoin-xp?tab=levels` | ⬜ |
| `/admin/marketplace` | Redirect till `/admin/gamification/shop-rewards` | ⬜ |

### 7.2 Bokmärken

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Gammalt bokmärke till `/admin/leaderboard` | Fungerar via redirect | ⬜ |
| Gammalt bokmärke till `/admin/marketplace` | Fungerar via redirect | ⬜ |

---

## 8. Responsivitet

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Desktop (1920px) | Full layout, grids anpassade | ⬜ |
| Tablet (768px) | 2 kolumner i grids | ⬜ |
| Mobil (375px) | Enkelkolumn, stackad layout | ⬜ |

---

## 9. Prestanda

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Hub landing laddning | < 2 sekunder | ⬜ |
| Tab-byte | Instant (< 100ms) | ⬜ |
| Sökning/filtrering | Realtid utan fördröjning | ⬜ |

---

## 10. Tillgänglighet

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Tangentbordsnavigering | Alla element nåbara med Tab | ⬜ |
| Tab-knappar | Korrekta ARIA-attribut | ⬜ |
| Module cards | Klickbara med Enter | ⬜ |
| Kontrast | Uppfyller WCAG 2.1 AA | ⬜ |

---

## 11. Smoke-test checklista

Snabbtest för att verifiera grundläggande funktionalitet:

- [ ] Navigera till `/admin/gamification` - laddas utan fel
- [ ] Alla 4 module cards visas
- [ ] Klicka på DiceCoin & XP - navigerar korrekt
- [ ] Byt till Leaderboards tab - URL uppdateras
- [ ] Navigera till `/admin/leaderboard` - redirectar korrekt
- [ ] Navigera till `/admin/marketplace` - redirectar korrekt
- [ ] Kontrollera navigation - gamla labels (Leaderboard, Butik) är borta
- [ ] Achievements sidan laddas
- [ ] Shop & Rewards sidan laddas
- [ ] Library Exports visar empty state

---

## Testmiljöer

| Miljö | URL | Status |
|-------|-----|--------|
| Lokal utveckling | http://localhost:3000/admin/gamification | ⬜ |
| Staging | https://staging.lekbanken.se/admin/gamification | ⬜ |
| Produktion | https://lekbanken.se/admin/gamification | ⬜ |

---

## Kända begränsningar

1. **Mock data** - Alla moduler använder mock data, API-integration krävs
2. **Library Exports** - Helt planerad, ingen backend
3. **RBAC** - Alla sidor är system_admin-only för närvarande
4. **CRUD** - Create/Update/Delete knappar är placeholders

---

## Sign-off

| Roll | Namn | Datum | Godkänt |
|------|------|-------|---------|
| Utvecklare | | | ⬜ |
| QA | | | ⬜ |
| Produktägare | | | ⬜ |
