# Admin IA Refactor: Produkter & Innehåll

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-04
- Last updated: 2026-03-21
- Last validated: 2026-01-04

> Historisk snapshot av en genomförd IA-refaktor för produkter och innehåll. Läs som förändringshistorik, inte som ensam nuvarande navigationssanning.

> **Execution status**: ✅ Implementerad

## Sammanfattning

Denna IA-refaktorering konsoliderar produktrelaterade admin-sidor under ett sammanhängande nav: **Produkter & Innehåll**. Målet är att förenkla navigeringen och gruppera relaterad funktionalitet logiskt.

---

## Genomförda ändringar

### 1. Navigationsändringar

| Tidigare namn | Nytt namn |
|--------------|-----------|
| "Innehåll" | "Produkter & Innehåll" |
| "Spel" | "Lekhanteraren" |
| "Planer" | "Planläggaren" |

### 2. Ruttändringar

| Tidigare rutt | Ny rutt | Strategi |
|--------------|---------|----------|
| `/admin/licenses` | `/admin/products?tab=licenses` | Redirect |
| `/admin/purposes` | `/admin/products?tab=purposes` | Redirect |
| `/admin/products` | `/admin/products` (ny hub) | Ersatt med tabbad vy |
| `/admin/games` | `/admin/games` | Behållen (label ändrad) |
| `/admin/planner` | `/admin/planner` | Behållen (label ändrad) |

### 3. Ny Products Hub

Den nya `/admin/products`-sidan är en tabbad hub med tre flikar:

1. **Produkter** - Produktlista med grid-visning, sökfunktion och CRUD-operationer
2. **Licenser** - Licenshantering med användningsstatistik och giltighetsövervakning
3. **Syften** - Syfteshantering med hierarkisk visning (huvudsyften/delsyften)

---

## Arkitektur

### Filstruktur

```
features/admin/products/
├── ProductHubPage.tsx          # Huvud-hub med tabs
├── ProductAdminPage.tsx        # Detaljsida för enskild produkt
├── types.ts                    # Delade typer
├── components/
│   └── hub/
│       ├── index.ts            # Barrel export
│       ├── ProductsTab.tsx     # Produktlista-flik
│       ├── LicensesTab.tsx     # Licenslista-flik
│       └── PurposesTab.tsx     # Syfteslista-flik
app/admin/
├── products/
│   └── page.tsx               # Renderar ProductHubPage
├── licenses/
│   ├── page.tsx               # Redirect till products?tab=licenses
│   └── _legacy-page.tsx       # Gammal implementation (backup)
├── purposes/
│   ├── page.tsx               # Redirect till products?tab=purposes
│   └── _legacy-page.tsx       # Gammal implementation (backup)
```

### Tab-synkronisering

Flikarna synkroniseras med URL:ens query-parameter:

- `/admin/products` → Visar produkter-fliken (default)
- `/admin/products?tab=licenses` → Visar licenser-fliken
- `/admin/products?tab=purposes` → Visar syften-fliken

---

## Navigationsstruktur

### Grupp: Produkter & Innehåll

```yaml
- Produkter
  - path: /admin/products
  - permission: admin.products.list
  
- Lekhanteraren (tidigare "Spel")
  - path: /admin/games
  - permission: admin.games.list
  
- Planläggaren (tidigare "Planer")
  - path: /admin/planner
  - permission: admin.planner.list
```

---

## RBAC-behörigheter

| Behörighet | Beskrivning |
|------------|-------------|
| `admin.products.list` | Lista produkter |
| `admin.products.create` | Skapa produkter |
| `admin.products.edit` | Redigera produkter (inkl. radera) |
| `admin.games.list` | Lista spel |
| `admin.planner.list` | Åtkomst till planläggaren |

---

## Cross-linking

Products Hub innehåller snabblänkar mellan flikarna:

- Produktkort → Länk till associerat syfte
- Licensvy → Länk till produkt
- Syftesvy → Produktantal per syfte

---

## Statistik-dashboard

Överst i Products Hub visas sammanfattande statistik:

| Metric | Beskrivning |
|--------|-------------|
| Produkter | Totalt antal produkter |
| Aktiva produkter | Produkter med status "active" |
| Licenser | Totalt antal licenser |
| Syften | Totalt antal syften |
| Aktiva syften | Syften med associerade produkter |

---

## Migrering

### Bakåtkompatibilitet

Gamla rutter (`/admin/licenses`, `/admin/purposes`) redirectar automatiskt till motsvarande tab i Products Hub. Legacy-implementationer finns sparade som `_legacy-page.tsx` för referens.

### Rensa legacy-filer

När migreringen är validerad kan följande filer tas bort:

```bash
rm app/admin/licenses/_legacy-page.tsx
rm app/admin/purposes/_legacy-page.tsx
```

---

## Framtida förbättringar

- [ ] Fullständig CRUD för licenser direkt i tab
- [ ] Fullständig CRUD för syften direkt i tab
- [ ] Produktantal per syfte (API-integration)
- [ ] Bulk-operationer för licenser
- [ ] Export av licensrapporter
