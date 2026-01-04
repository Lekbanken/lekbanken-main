# Admin Products & Content - Testplan

> **Status**: Redo för testning
> **Version**: 1.0
> **Datum**: 2025-01-XX

---

## 1. Navigationstest

### 1.1 Menystruktur

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till Admin | "Produkter & Innehåll" visas som menygrupp | ⬜ |
| Kontrollera "Produkter" i menyn | Länk till `/admin/products` | ⬜ |
| Kontrollera "Lekhanteraren" | Tidigare "Spel", länk till `/admin/games` | ⬜ |
| Kontrollera "Planläggaren" | Tidigare "Planer", länk till `/admin/planner` | ⬜ |
| Verifiera att "Licenser" inte finns i Organisation-gruppen | Licenser ska inte längre visas separat | ⬜ |

### 1.2 RBAC-kontroll

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Användare utan `admin.products.list` | Produkter-länk ska inte visas | ⬜ |
| Användare utan `admin.games.list` | Lekhanteraren ska inte visas | ⬜ |
| Tenant admin | Ska se Products hub med begränsad funktionalitet | ⬜ |
| System admin | Ska se alla funktioner | ⬜ |

---

## 2. Products Hub (`/admin/products`)

### 2.1 Grundläggande laddning

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till `/admin/products` | Sidan laddas utan fel | ⬜ |
| Kontrollera statistik-kort | 5 statistik-kort visas | ⬜ |
| Kontrollera tabs | Tre tabs: Produkter, Licenser, Syften | ⬜ |
| Default tab | "Produkter" är vald som standard | ⬜ |

### 2.2 Tab-navigering

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Klicka på "Licenser"-tab | URL uppdateras till `?tab=licenses` | ⬜ |
| Klicka på "Syften"-tab | URL uppdateras till `?tab=purposes` | ⬜ |
| Navigera direkt till `?tab=licenses` | Licenser-tab är vald | ⬜ |
| Navigera direkt till `?tab=purposes` | Syften-tab är vald | ⬜ |
| Ogiltig tab-parameter | Default till Produkter | ⬜ |

---

## 3. Produkter-fliken

### 3.1 Produktlista

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Ladda produkter | Grid med produktkort visas | ⬜ |
| Tom lista | "Inga produkter hittades" med CTA | ⬜ |
| Laddningsindikator | Skeleton/spinner under laddning | ⬜ |
| Felhantering | Felmeddelande vid API-fel | ⬜ |

### 3.2 Sökfunktion

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Sök efter produktnamn | Filtrerar produkter i realtid | ⬜ |
| Sök efter kategori | Filtrerar på kategori | ⬜ |
| Töm sökfältet | Visar alla produkter igen | ⬜ |
| Ingen träff | "Inga produkter matchar sökningen" | ⬜ |

### 3.3 Produktåtgärder

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Klicka på produkt | Navigerar till detaljsida | ⬜ |
| Dropdown-meny på kort | Visa, Redigera, Ta bort | ⬜ |
| "Ny produkt"-knapp (med behörighet) | Navigerar till skapa-sida | ⬜ |
| "Ny produkt"-knapp (utan behörighet) | Knappen visas inte | ⬜ |

---

## 4. Licenser-fliken

### 4.1 Licenslista

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Ladda licenser | Grid med licenskort visas | ⬜ |
| Licensstatus | Korrekt badge (Aktiv/Utgången/Väntande) | ⬜ |
| Seat-användning | Progress bar visar användning | ⬜ |
| Giltighetsdatum | Visar start- och slutdatum | ⬜ |

### 4.2 Licensfilter

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Sök efter organisation | Filtrerar licenslistan | ⬜ |
| Sök efter produkt | Filtrerar licenslistan | ⬜ |

---

## 5. Syften-fliken

### 5.1 Syfteslista

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Ladda syften | Lista med syften visas | ⬜ |
| Huvudsyfte-badge | Visas korrekt för type="main" | ⬜ |
| Delsyfte-badge | Visas korrekt för type="sub" | ⬜ |
| Hierarki-indikator | Visar förälder för delsyften | ⬜ |

### 5.2 Syftessök

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Sök efter syftesnamn | Filtrerar syfteslistan | ⬜ |
| Sök efter syftesnyckel | Filtrerar på purpose_key | ⬜ |

---

## 6. Redirects

### 6.1 Legacy-rutter

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Navigera till `/admin/licenses` | Redirectar till `/admin/products?tab=licenses` | ⬜ |
| Navigera till `/admin/purposes` | Redirectar till `/admin/products?tab=purposes` | ⬜ |
| Direktlänk till legacy-rutt | Redirect fungerar utan fel | ⬜ |

### 6.2 Bokmärken

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Gammalt bokmärke till `/admin/licenses` | Fungerar via redirect | ⬜ |
| Gammalt bokmärke till `/admin/purposes` | Fungerar via redirect | ⬜ |

---

## 7. Responsivitet

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Desktop (1920px) | Full layout, grid med 3 kolumner | ⬜ |
| Tablet (768px) | Grid med 2 kolumner | ⬜ |
| Mobil (375px) | Enkelkolumn, stackad layout | ⬜ |
| Tab-navigering på mobil | Scrollbar eller dropdown | ⬜ |

---

## 8. Prestanda

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Initial laddning | < 2 sekunder | ⬜ |
| Tab-byte | Instant (< 100ms) | ⬜ |
| Sökning | Realtidsfiltrering utan fördröjning | ⬜ |
| 100+ produkter | Ingen märkbar fördröjning | ⬜ |

---

## 9. Tillgänglighet

| Test | Förväntat resultat | Status |
|------|-------------------|--------|
| Tangentbordsnavigering | Alla element nåbara med Tab | ⬜ |
| Tab-knappar | Korrekta ARIA-attribut | ⬜ |
| Skärmläsare | Korrekt announced vid tab-byte | ⬜ |
| Kontrast | Uppfyller WCAG 2.1 AA | ⬜ |

---

## 10. Smoke-test checklista

Snabbtest för att verifiera grundläggande funktionalitet:

- [ ] Navigera till `/admin/products` - laddas utan fel
- [ ] Byt till Licenser-tab - innehåll visas
- [ ] Byt till Syften-tab - innehåll visas
- [ ] Navigera till `/admin/licenses` - redirectar korrekt
- [ ] Navigera till `/admin/purposes` - redirectar korrekt
- [ ] Kontrollera navigation - "Lekhanteraren" och "Planläggaren" visas
- [ ] Sök i produktlistan - filtrering fungerar
- [ ] Öppna dropdown på produktkort - åtgärder visas

---

## Testmiljöer

| Miljö | URL | Status |
|-------|-----|--------|
| Lokal utveckling | http://localhost:3000/admin/products | ⬜ |
| Staging | https://staging.lekbanken.se/admin/products | ⬜ |
| Produktion | https://lekbanken.se/admin/products | ⬜ |

---

## Kända begränsningar

1. **Licenser och Syften** - Använder mock-data, integration med faktiska API:er krävs
2. **Produktantal per syfte** - Inte implementerat (TODO i kod)
3. **Bulk-operationer** - Framtida feature

---

## Sign-off

| Roll | Namn | Datum | Godkänt |
|------|------|-------|---------|
| Utvecklare | | | ⬜ |
| QA | | | ⬜ |
| Produktägare | | | ⬜ |
