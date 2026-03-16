# 🗺️ Atlas Evolution – Komplett Implementeringsplan

> **Version:** 2.5  
> **Senast uppdaterad:** 2026-01-26  
> **Status:** ✅ Backlog-funktioner implementerade  
> **Ansvarig:** Claude + Användare

---

## 📊 LÄGESRAPPORT (2026-01-26)

### Sammanfattning
- ✅ **Atlas Evolution återställd** - Korrekt UI från atlas-v2 nu på `/sandbox/atlas`
- ✅ **Sprint 1 klart** - Graph View, Domain Filter, List/Graph toggle
- ✅ **Sprint 2 klart** - Annotations-system och beslutsstöd
- ✅ **Sprint 3 klart** - Säkerhetsnät med risk-aggregering, safe-to-refactor, dependency-visualisering, export
- ✅ **Backlog funktioner** - Edge highlighting, Safety filter, Dependency-risk, Filter-export, Keyboard navigation

### Nya funktioner (2026-01-26)
- ✨ **Edge highlighting** - Kanter highlightas röd och animeras när nod väljs i Graph View
- ✨ **Safe to refactor filter** - Nytt "Safety" filter i toolbar (safe/partial/not-safe)
- ✨ **Dependency-risk display** - Risk-badges på varje dependency i Inspector + sammanfattning
- ✨ **Filter-baserad CSV export** - Val att exportera endast filtrerade noder
- ✨ **Keyboard navigation** - ↑/↓ och j/k för att navigera i List View med auto-scroll

### Buggfix 2026-01-26
- 🔧 Fixat: BOM-tecken i inventory.json (Windows UTF-8 problem)
- 🔧 Fixat: API-route `/api/atlas/inventory` skapad för att läsa från projektrot
- 🔧 Fixat: Återställt korrekt Atlas Evolution UI (GroupedNodeList, InventoryInspector, etc.)
- 🔧 Fixat: Integrerat useAnnotations hook för review-status
- 🔧 Fixat: Ersatt InventoryInspector med AtlasInspectorV2 (full annotation support)
- 🔧 Fixat: Lagt till Findings-vy med AtlasFindings-komponenten
- 🔧 Fixat: Lagt till "Unsaved changes" indikator i header
- 🔧 Fixat: ViewModeSelector-knappar synliga när aktiva (bg-primary)
- 🔧 Fixat: localStorage-migration för `safetyLevels` (persist version 2 med merge-funktion)

### Sprint 3+ Implementerade delar
| Uppgift | Status | Fil |
|---------|--------|-----|
| Risk-aggregering per domain | ✅ | `components/AtlasFindings.tsx` |
| Safe to refactor-indikator | ✅ | `components/AtlasInspectorV2.tsx` |
| Dependency-visualisering | ✅ | `components/AtlasInspectorV2.tsx` |
| Export findings.csv | ✅ | `components/AtlasFindings.tsx` |
| **Edge highlighting** | ✅ | `components/AtlasGraphCanvas.tsx` |
| **Safety filter** | ✅ | `page.tsx`, `inventory-store.ts`, `inventory-adapter.ts` |
| **Dependency-risk** | ✅ | `components/AtlasInspectorV2.tsx` |
| **Filter-baserad export** | ✅ | `components/AtlasFindings.tsx` |
| **Keyboard navigation** | ✅ | `components/GroupedNodeList.tsx` |

### Sprint 2 Implementerade delar
| Uppgift | Status | Fil |
|---------|--------|-----|
| Skapa annotations-schema | ✅ | `lib/annotations-schema.ts` |
| Skapa annotations.json | ✅ | `.atlas/annotations.json` |
| API route för persistence | ✅ | `app/api/atlas/annotations/route.ts` |
| useAnnotations hook | ✅ | `hooks/useAnnotations.ts` |
| AtlasInspectorV2 | ✅ | `components/AtlasInspectorV2.tsx` |
| Integration i page.tsx | ✅ | `page.tsx` uppdaterad |

### Nuvarande filstruktur
```
app/sandbox/atlas/
├── page.tsx                    ← Atlas Evolution huvudsida
├── types.ts                    ← Typdefinitioner
├── components/
│   ├── AtlasCanvas.tsx         ← List View
│   ├── AtlasFindings.tsx       ← NY: Risk-aggregering & export
│   ├── AtlasGraphCanvas.tsx    ← Graph View (xyflow)
│   ├── AtlasFilters.tsx        ← Filterkomponent
│   ├── AtlasInspector.tsx      ← Legacy Inspector (bakåtkompatibilitet)
│   ├── AtlasInspectorV2.tsx    ← Inspector med annotations + dependencies
│   ├── AtlasToolbar.tsx        ← Verktygsrad
│   ├── DomainTabs.tsx          ← Domain-filter tabs
│   ├── GroupedNodeList.tsx     ← Grupperad nod-lista
│   ├── InventoryInspector.tsx  ← Inventory-inspektor
│   └── RiskDashboard.tsx       ← Risk-dashboard
├── hooks/
│   ├── useAnnotations.ts       ← Annotations-hantering
│   └── useInventoryLegacy.ts   ← Laddar inventory.json
├── lib/
│   ├── annotations-schema.ts   ← Annotations TypeScript-typer
│   ├── inventory-adapter.ts    ← Transformerar inventory
│   └── inventory-types.ts      ← Inventory-typer
└── store/
    ├── atlas-store.ts          ← Zustand store
    └── inventory-store.ts      ← Inventory-hantering

.atlas/
└── annotations.json            ← Manuella beslut (persistent)

app/api/atlas/annotations/
└── route.ts                    ← API för fil-I/O
```

### Nästa steg (Later)
Se sektion 8 för framtida förbättringar:
- Partitionera inventory.json
- Snapshot-diffing
- Multi-user annotations
- CI-integration

---

## 📋 Innehållsförteckning

1. [Vision & Syfte](#1-vision--syfte)
2. [Definition of Atlas](#2-definition-of-atlas)
3. [Arkitektur & Tekniska Beslut](#3-arkitektur--tekniska-beslut)
4. [Fas 0: Förberedelse](#4-fas-0-förberedelse)
5. [Sprint 1: Gör Atlas användbar](#5-sprint-1-gör-atlas-användbar)
6. [Sprint 2: Gör Atlas till beslutssystem](#6-sprint-2-gör-atlas-till-beslutssystem)
7. [Sprint 3: Gör Atlas till säkerhetsnät](#7-sprint-3-gör-atlas-till-säkerhetsnät)
8. [Later: Framtida förbättringar](#8-later-framtida-förbättringar)
9. [Risker & Mitigering](#9-risker--mitigering)
10. [Framgångskriterier](#10-framgångskriterier)
11. [Ändringslogg](#11-ändringslogg)

---

## 1. Vision & Syfte

### Vad är Atlas Evolution?

Atlas Evolution är ett **lokalt arkitektur- och beslutsverktyg** för Lekbanken som ger:

- 📊 **Levande systemkarta** – visuell översikt av routes, komponenter, databas och relationer
- ✅ **Checklista för teknisk hygien** – spåra cleanup, översättning, testning, ägarskap
- 🔒 **Säkerhets- och riskinstrument** – identifiera kritiska områden och unknown usage
- 📚 **Onboarding-verktyg** – hjälp nya utvecklare förstå systemet
- 🎯 **Beslutsstöd** – "safe to refactor"-signaler baserat på review-status

### Varför lokalt?

- ✅ Ingen produktionspåverkan
- ✅ Ingen databasberoende
- ✅ Snabb iteration
- ✅ Kan köras offline
- ✅ Inga säkerhetsproblem

### Vad Atlas INTE är

- ❌ Runtime-logik eller affärsregler
- ❌ Produktionskonfiguration
- ❌ API-dokumentation (det finns i Swagger/OpenAPI)
- ❌ Ersättning för kod-kommentarer

---

## 2. Definition of Atlas

> **LÅST BESLUT** – Denna definition ska läggas i `app/sandbox/atlas/README.md`

### Atlas ÄR source of truth för:

| Område | Beskrivning |
|--------|-------------|
| Användningsklassificering | `usage`, `confidence`, `evidence` |
| Riskbedömning | `risk`, `exposure`, `guards` |
| Manuella beslut | `cleanup_status`, `lock`, `owner`, `translation` |
| Review-status | `ux_reviewed`, `data_linked`, `rls_checked`, `tested` |
| Systemkarta | Vad finns, var, och hur det hänger ihop |

### Atlas ÄR INTE source of truth för:

| Område | Varför inte |
|--------|-------------|
| Runtime-logik | Hanteras i kod |
| Affärsregler | Hanteras i kod/dokumentation |
| Speldefinitioner | Hanteras i Game Builder |
| API-kontrakt | Hanteras i OpenAPI/Swagger |
| Feature flags | Hanteras i feature flag-system |
| Produktionsdata | Hanteras i Supabase |

### Konsekvenser:

- Atlas **läser**, den **styr inte**
- Atlas **informerar beslut**, den **verkställer inte**
- Atlas **kan regenereras** utan att tappa mänskliga anteckningar
- Atlas **får aldrig** bli ett produktionsberoende

---

## 3. Arkitektur & Tekniska Beslut

### 3.1 Dataflöde

```
┌─────────────────────────────────────────────────────────────────┐
│                         GENERATION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   scripts/generate-inventory-v2.ps1                              │
│              │                                                    │
│              ▼                                                    │
│   ┌─────────────────────┐                                        │
│   │   inventory.json    │  ← 47000+ rader, regenererbar          │
│   │   (read-only)       │                                        │
│   └─────────────────────┘                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ATLAS UI                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   inventory.json ──► inventory-adapter.ts ──► Atlas Store        │
│                                                   │               │
│                                                   ▼               │
│   annotations.json ─────────────────────────► MERGE              │
│   (mänskliga beslut)                             │               │
│                                                   ▼               │
│                                              Display Node         │
│                                                   │               │
│                                                   ▼               │
│                           ┌───────────────────────────────┐      │
│                           │  List View  │  Graph View     │      │
│                           │  (befintlig)│  (xyflow)       │      │
│                           └───────────────────────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   .atlas/annotations.json  ← Primär sparning (fil)               │
│   localStorage             ← Backup/fallback                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Filstruktur

```
lekbanken-main/
├── inventory.json                    ← Genererad systemkarta (read-only)
├── INVENTORY_SCHEMA.json             ← Schema för validering
├── .atlas/                           ← Atlas-specifika filer
│   ├── .gitkeep                      ← Så mappen existerar i git
│   ├── annotations.json              ← Mänskliga beslut (ej i git default)
│   └── README.md                     ← Definition of Atlas
├── app/sandbox/atlas/                ← Atlas UI (Evolution)
│   ├── page.tsx                      ← Huvudsida
│   ├── types.ts                      ← Typdefinitioner
│   ├── components/
│   │   ├── AtlasCanvas.tsx           ← List View
│   │   ├── AtlasGraphCanvas.tsx      ← Graph View (xyflow) ✅
│   │   ├── AtlasInspector.tsx        ← Inspektorpanel
│   │   ├── AtlasFilters.tsx          ← Filterkomponent
│   │   ├── AtlasToolbar.tsx          ← Verktygsrad
│   │   ├── DomainTabs.tsx            ← Domain-filter ✅
│   │   ├── GroupedNodeList.tsx       ← Grupperad nod-lista
│   │   ├── InventoryInspector.tsx    ← Inventory-inspektor
│   │   └── RiskDashboard.tsx         ← Risk-dashboard
│   ├── hooks/
│   │   └── useInventoryLegacy.ts     ← Laddar inventory.json ✅
│   ├── lib/
│   │   ├── inventory-adapter.ts      ← Transformerar inventory → Atlas
│   │   └── inventory-types.ts        ← Typer för inventory.json
│   └── store/
│       ├── atlas-store.ts            ← Zustand store (viewMode, activeDomain)
│       └── inventory-store.ts        ← Inventory-hantering
```

### 3.3 Annotations Schema

```typescript
// .atlas/annotations.json format

interface AnnotationsFile {
  version: "1.0";
  lastModified: string; // ISO timestamp
  annotations: Record<AnnotationKey, Annotation>;
}

// Nyckel = exakt samma som inventory.json node.id
type AnnotationKey = string; // "route:app/admin/games/page.tsx"

interface Annotation {
  // Review status (alla börjar false)
  reviewFlags: {
    ux_reviewed: boolean;     // UX/design granskad
    data_linked: boolean;     // Dataflöde dokumenterat
    rls_checked: boolean;     // RLS-policys verifierade
    tested: boolean;          // Tester finns/passerar
  };
  
  // Cleanup status
  cleanup_status: 'not_started' | 'in_progress' | 'cleaned' | 'locked';
  
  // Translation (för UI-routes)
  translation_status: 'n/a' | 'pending' | 'done';
  
  // Ownership
  owner?: string;
  
  // Notes
  notes?: string;
  
  // Timestamps
  lastReviewedAt?: string;   // ISO timestamp
  lastModifiedAt?: string;   // ISO timestamp
}
```

### 3.4 Låsta tekniska beslut

| Beslut | Val | Anledning |
|--------|-----|-----------|
| Graf-bibliotek | xyflow (React Flow v12) | Redan installerat, beprövat i Game Builder |
| State management | Zustand med persist | Redan implementerat i Atlas |
| Annotations-sparning | Filbaserad (.atlas/annotations.json) | Versionerbart, portabelt |
| Annotations-nyckel | inventory.node.id | Oberoende av filstruktur |
| Inventory-källa | Endast inventory.json | Ingen dubbel sanning |
| List View | Behåll befintlig AtlasCanvas | Fungerar för snabb översikt |
| Graph View | Ny AtlasGraphCanvas med xyflow | För relationförståelse |

---

## 4. Fas 0: Förberedelse

> **Status:** ✅ Klar  
> **Beräknad tid:** 30 minuter

### Checklista

- [x] **0.1** Skapa `.atlas/` mapp
- [x] **0.2** Skapa `.atlas/.gitkeep`
- [x] **0.3** Skapa `.atlas/README.md` med Definition of Atlas
- [x] **0.4** Lägg till i `.gitignore`:
  ```gitignore
  # Atlas annotations - remove this line if you want to share review state
  .atlas/annotations.json
  ```
- [x] **0.5** Verifiera att `inventory.json` finns och är läsbar
- [x] **0.6** Verifiera att `@xyflow/react` är installerat (`package.json`)
- [x] **0.7** Läs igenom befintlig `inventory-adapter.ts` för förståelse

### Definition of Done – Fas 0

- [x] `.atlas/` mapp existerar med README
- [x] `.gitignore` uppdaterad
- [x] Bekräftat att inventory.json finns

---

## 5. Sprint 1: Gör Atlas användbar

> **Status:** ✅ KLART  
> **Slutfört:** 2026-01-26  
> **Mål:** En fungerande Graph View som går att använda med 1600+ noder

### 5.1 Ta bort registry.ts-beroendet ✅ KLART

- [x] **1.1.1** Identifiera alla imports av `registry.ts` i Atlas
- [x] **1.1.2** Skapa `useInventoryLegacy()` hook i `hooks/useInventoryLegacy.ts`
- [x] **1.1.3** Byt alla `atlasRegistry.*` → data från useInventoryLegacy hook
- [x] **1.1.4** Lägg till felhantering om inventory.json saknas (loading + error states)
- [x] **1.1.5** Ta bort `registry.ts` filen - Legacy Atlas borttagen helt
- [x] **1.1.6** Verifiera att kompilering fungerar utan fel

**Filer:**
- `app/sandbox/atlas/hooks/useInventoryLegacy.ts` - Hook som laddar och konverterar

### 5.2 Koppla inventory.json ✅ KLART

- [x] **1.2.1** inventory-adapter.ts hanterar alla nod-typer
- [x] **1.2.2** Lazy loading av inventory.json implementerat i useInventoryLegacy
- [x] **1.2.3** Data cachas via useState i hook
- [x] **1.2.4** Testat med hela inventory.json (1600+ noder)
- [x] **1.2.5** Prestanda OK med domain-filter aktivt

### 5.3 Domain-filter som startläge ✅ KLART

- [x] **1.3.1** Skapat `DomainTabs.tsx` komponent med domain-tabs
- [x] **1.3.2** Default: visa alla domains (null = "All")
- [x] **1.3.3** Lagt till domain-tabs i page.tsx under toolbar
- [x] **1.3.4** Filtrera noder INNAN rendering via `filteredFrames` useMemo
- [x] **1.3.5** Visa nod-count per domain med färgkodade badges

**Filer:**
- `app/sandbox/atlas/components/DomainTabs.tsx` - Domain-tabs med counts och ikoner

### 5.4 Skapa AtlasGraphCanvas.tsx ✅ KLART

- [x] **1.4.1** Skapat `app/sandbox/atlas/components/AtlasGraphCanvas.tsx`
- [x] **1.4.2** Grundstruktur med ReactFlow, Background, Controls, MiniMap
- [x] **1.4.3** Implementerat props interface med AtlasFlowNode/Edge
- [x] **1.4.4** Lagt till Controls och MiniMap
- [x] **1.4.5** Implementerat node-click → onSelectNode callback

**Nya filer:**
- `app/sandbox/atlas/components/AtlasGraphCanvas.tsx` - xyflow-baserad grafvy

### 5.5 Skapa AtlasFlowNodes.tsx ✅ KLART (förenklad)

- [x] **1.5.1** AtlasNodeComponent skapad inline i AtlasGraphCanvas.tsx
- [x] **1.5.2** Implementerat generisk nodtyp med färgkodning per typ
- [x] **1.5.3** Varje nod visar:
  - Namn (label)
  - Subtitle (route/path)
  - Typ-färg (border)
  - Hover/selection states
- [x] **1.5.4** Registrerat som `atlasNode` i nodeTypes map

### 5.6 Skapa useAtlasFlowGraph.ts ⏭️ SKIPPAT

Transformation av noder/edges görs direkt i page.tsx via useMemo istället för separat hook.

### 5.7 List ↔ Graph toggle ✅ KLART

- [x] **1.7.1** Lagt till `viewMode: 'list' | 'graph'` i atlas-store
- [x] **1.7.2** Lagt till toggle-knappar direkt i page.tsx
- [x] **1.7.3** I `page.tsx`: conditional rendering av AtlasCanvas/AtlasGraphCanvas
- [x] **1.7.4** Selection bevaras vid view-byte (delar samma state)
- [x] **1.7.5** Filter bevaras vid view-byte (delar samma state)

### 5.8 Edge-rendering ✅ KLART

- [x] **1.8.1** Mappat inventory edges till xyflow edges i graphEdges useMemo
- [x] **1.8.2** Färgkodade edges baserat på relation-typ:
  - `uses` → grå
  - `reads` → blå
  - `writes` → orange (animerade)
  - `calls` → lila
- [x] **1.8.3** Begränsat edge-rendering till synliga noder (cappedEdges)
- [ ] **1.8.4** Highlighta edges vid nod-selection (LATER)

### Definition of Done – Sprint 1 ✅ KLART

- [x] ✅ Legacy Atlas borttagen, Evolution är nu /sandbox/atlas
- [x] ✅ Graph View renderar utan att frysa
- [x] ✅ Domain-filter fungerar (välj en domain i taget)
- [x] ✅ Kan byta mellan List View och Graph View
- [x] ✅ Minst 3 domains fungerar (admin, app, shared, db, marketing, sandbox, demo)
- [x] ✅ Klick på nod öppnar Inspector
- [x] ✅ Edges visas mellan relaterade noder
- [x] ✅ Inga kompileringsfel

---

## 6. Sprint 2: Gör Atlas till beslutssystem

> **Status:** ✅ KLART  
> **Slutfört:** 2026-01-26  
> **Mål:** Atlas blir en aktiv checklista för cleanup och governance

### 6.1 annotations.json filformat ✅ KLART

- [x] **2.1.1** Skapa `app/sandbox/atlas/lib/annotations-schema.ts` med TypeScript-typer
- [x] **2.1.2** Skapa tom `.atlas/annotations.json` med grundstruktur:
  ```json
  {
    "version": "1.0",
    "lastModified": "2026-01-26T00:00:00Z",
    "annotations": {}
  }
  ```
- [x] **2.1.3** Implementera `loadAnnotations()` via useAnnotations hook
- [x] **2.1.4** Implementera fallback till localStorage om fil saknas

### 6.2 Merge-logik ✅ KLART

- [x] **2.2.1** Skapa `mergeNodeWithAnnotation(node, annotation)` funktion i annotations-schema.ts
- [x] **2.2.2** I rendering: `displayNode = inventory + annotations` via getAnnotation()
- [x] **2.2.3** Annotation-nyckel = inventory.node.id (exakt match)
- [x] **2.2.4** Testa: annotation för borttagen nod = ignoreras (ingen krasch)
- [x] **2.2.5** Testa: ny nod utan annotation = default-värden (createDefaultAnnotation)

### 6.3 Utökade fält ✅ KLART

- [x] **2.3.1** Uppdatera `AtlasReviewFlags` typ med:
  - `ux_reviewed`
  - `data_linked`
  - `rls_checked`
  - `tested`
- [x] **2.3.2** Lägg till `cleanup_status` enum (CleanupStatus type)
- [x] **2.3.3** Lägg till `translation_status` enum (TranslationStatus type)
- [x] **2.3.4** Lägg till `owner` string field
- [x] **2.3.5** Migrera befintliga review-data till nytt format

### 6.4 Inspector-uppgradering ✅ KLART

- [x] **2.4.1** Lägg till cleanup_status dropdown
- [x] **2.4.2** Lägg till translation_status dropdown (visa bara för routes)
- [x] **2.4.3** Lägg till owner text input
- [x] **2.4.4** Lägg till "Mark All Reviewed" snabbknapp
- [ ] **2.4.5** Lägg till "Assign to me" snabbknapp (SKIPPAT - kräver auth)
- [x] **2.4.6** Visa timestamps: lastReviewedAt, lastModifiedAt, lastSavedAt
- [x] **2.4.7** Uppdatera styling för tydligare UX (completion bar, badges)

### 6.5 Findings-panel ⏭️ SKIPPAT (flytt till Sprint 3)

Findings-panel implementeras i Sprint 3 tillsammans med risk-aggregering.

### 6.6 Manual save-knapp ✅ KLART

- [x] **2.6.1** Lägg till "Save Annotations" knapp i Inspector
- [x] **2.6.2** Implementera `saveAnnotationsToFile()` via API route:
  - Serialisera annotations från hook
  - Skriv till `.atlas/annotations.json` via POST /api/atlas/annotations
- [x] **2.6.3** Visa "Saved ✓" feedback (isSaving state + hasUnsavedChanges)
- [x] **2.6.4** Warn vid osparade ändringar (hasUnsavedChanges indicator)

### 6.7 DoD per nod-typ ⏭️ SKIPPAT (flytt till Sprint 3)

- [ ] **2.7.1** Skapa `app/sandbox/atlas/lib/dod-config.ts`
- [ ] **2.7.2** Definiera vilka fält som krävs per nod-typ:
  ```typescript
  const DOD_CONFIG = {
    route: ['ux_reviewed', 'data_linked', 'owner', 'translation_status'],
    component: ['ux_reviewed', 'tested'],
    db_table: ['rls_checked', 'owner'],
DoD per nod-typ flyttas till Later tillsammans med mer avancerade features.

### Definition of Done – Sprint 2 ✅ KLART

- [x] ✅ Annotations sparas till fil (inte bara localStorage)
- [x] ✅ Alla noder har minst 4 review-fält
- [x] ✅ Findings-panel visar aggregerad status
- [x] ✅ Kan markera nod som "Verified + Cleaned + Owner assigned"
- [ ] ⏭️ DoD-completion visas per nod (flytt till Later)
- [x] ✅ Warn vid osparade ändringar

---

## 7. Sprint 3: Gör Atlas till säkerhetsnät

> **Status:** ✅ KLART  
> **Slutfört:** 2026-01-26  
> **Mål:** Atlas ger konkreta "safe to refactor"-signaler

### 7.1 Risk-aggregering per domain ✅ KLART

- [x] **3.1.1** Beräkna risk-summary per domain:
  - Critical count
  - High count
  - Medium count
  - Low count
- [x] **3.1.2** Visa i AtlasFindings komponent
- [x] **3.1.3** Färgkoda domains baserat på risk (röd shield-ikon)
- [x] **3.1.4** Sortera domains: critical-first

### 7.2 "Safe to refactor"-indikator ✅ KLART

- [x] **3.2.1** Definiera "safe" kriterier i `annotations-schema.ts`:
  - Alla review-flags = true
  - cleanup_status = 'cleaned' | 'locked'
  - owner is set
- [x] **3.2.2** Visa grön badge på "safe" noder
- [x] **3.2.3** Visa gul badge på "partially safe"
- [x] **3.2.4** Visa röd badge på "not safe"
- [x] **3.2.5** Filter: "Visa bara safe to refactor" ✅ KLART

### 7.3 Dependency-visualisering ✅ KLART

- [x] **3.3.1** Vid nod-selection: highlighta edges ✅ KLART
- [x] **3.3.2** Vid nod-selection: highlighta edges ✅ KLART
- [x] **3.3.3** I Inspector: lista alla dependencies med status
- [x] **3.3.4** Klickbara dependencies → navigera till den noden
- [x] **3.3.5** Visa "dependency risk" ✅ KLART

### 7.4 Export findings ✅ KLART

- [x] **3.4.1** Skapa "Download findings.csv" knapp i AtlasFindings
- [x] **3.4.2** CSV-format:
  ```csv
  node_id,type,domain,risk,usage,cleanup_status,translation_status,owner,notes
  ```
- [x] **3.4.3** Filtrera export baserat på aktiva filter ✅ KLART
- [x] **3.4.4** Inkludera timestamp i filnamn

### 7.5 Collapse/expand grupper ⏭️ FLYTT TILL LATER

### 7.6 Keyboard navigation ✅ KLART

- [x] **3.6.1** Pil-tangenter (↑/↓) och vim-stil (j/k) för att navigera i List View
- [x] **3.6.2** Auto-scroll till vald nod
- [x] **3.6.3** Keyboard hint i header

### Definition of Done – Sprint 3 ✅ KLART

- [x] ✅ Varje domain har en risk-summary synlig
- [x] ✅ "Safe to refactor"-status visas på noder
- [x] ✅ Dependencies kan ses för vald nod
- [x] ✅ Findings kan exporteras som CSV
- [ ] ⏭️ Graph View collapse/expand (flytt till Later)
- [x] ✅ Keyboard navigation

---

## 8. Later: Framtida förbättringar

> **Status:** 📋 Backlog  
> **Villkor:** Genomförs EFTER Sprint 3 och daglig användning

### 8.1 Partitionera inventory.json

| Uppgift | Beskrivning |
|---------|-------------|
| **L.1.1** | Skapa `inventory/` mapp med domänfiler: `admin.json`, `app.json`, etc. |
| **L.1.2** | Uppdatera `generate-inventory-v2.ps1` att skriva till separata filer |
| **L.1.3** | Skapa merge-script: `inventory/*.json` → `inventory.snapshot.json` |
| **L.1.4** | Atlas läser bara `inventory.snapshot.json` (ingen UI-ändring) |

### 8.2 Snapshot-diffing

| Uppgift | Beskrivning |
|---------|-------------|
| **L.2.1** | Spara snapshots per datum: `inventory.2026-01-26.json` |
| **L.2.2** | Diff-view: "X nya unknown sedan förra veckan" |
| **L.2.3** | Progress-graf över tid |

### 8.3 Multi-user annotations

| Uppgift | Beskrivning |
|---------|-------------|
| **L.3.1** | Synka annotations via git (ta bort från .gitignore) |
| **L.3.2** | Merge-strategi för konflikter |
| **L.3.3** | User-tracking: "Reviewed by X" |

### 8.4 CI-integration

| Uppgift | Beskrivning |
|---------|-------------|
| **L.4.1** | GitHub Action: "Check for critical unknown" |
| **L.4.2** | Block deploy om X critical findings |
| **L.4.3** | Rapport i PR-kommentar |

### 8.5 Advanced Graph Features

| Uppgift | Beskrivning |
|---------|-------------|
| **L.5.1** | Dagre/ELK auto-layout i Web Worker |
| **L.5.2** | Hierarkisk vy (parent/child relationer) |
| **L.5.3** | "Focus mode": visa bara valda nod + 2 steg ut |
| **L.5.4** | Timeline-vy: visa ändringar över tid |

---

## 9. Risker & Mitigering

| Risk | Sannolikhet | Påverkan | Mitigering | Status |
|------|-------------|----------|------------|--------|
| xyflow prestanda med 1600 noder | Medium | Hög | Domain-filter FÖRST, aldrig visa alla | ✅ Löst |
| Annotations tappas | Låg | Hög | localStorage backup + manuell save | ✅ Löst |
| Dubbel sanning (registry + inventory) | Hög | Kritisk | Ta bort registry.ts dag 1 | ✅ Löst |
| Överdesign tidigt | Medium | Medium | Strikt sprint-scope, Later-bucket | ✅ Löst |
| Atlas används inte | Medium | Hög | Gör Sprint 1 användbar | ✅ Löst |
| inventory.json saknas | Låg | Hög | Tydligt felmeddelande + instruktion | ✅ Löst |

---

## 10. Framgångskriterier

### Efter Fas 0: ✅
> "Jag har alla förutsättningar för att börja implementera."

### Efter Sprint 1: ✅
> "Jag kan öppna Atlas, välja en domain, se en graf, klicka på en nod och förstå vad den är."

### Efter Sprint 2: ✅
> "Jag kan markera noder som reviewed, sätta owner, och se hur mycket som är kvar att granska."

### Efter Sprint 3: ✅
> "Jag kan se vilka delar som är safe to refactor och exportera en lista på findings."

### Backlog Done: ✅
> "Jag kan filtrera på safety-nivå, se risk på dependencies, navigera med tangentbord, och exportera filtrerat."

### 110% Done: 🚀 Nästa mål
> "Atlas är mitt dagliga verktyg för att förstå, städa och säkra Lekbankens arkitektur."

---

## 11. Ändringslogg

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-01-26 | 2.5 | **Backlog-funktioner** - Edge highlighting, Safety filter, Dependency-risk, Filter-export, Keyboard nav |
| 2026-01-26 | 2.4 | **Sprint 3 slutförd** - Risk-aggregering, safe-to-refactor, dependencies, export |
| 2026-01-26 | 2.3 | **Sprint 2 slutförd** - Annotations-system, Inspector V2, persistence |
| 2026-01-26 | 2.2 | **Sprint 1 slutförd** - Legacy Atlas borttagen, Graph View, Domain Filter |
| 2026-01-26 | 2.1 | Initial komplett plan skapad |

---

## ✅ Godkännande

- [x] **Planen är godkänd och implementering slutförd (Sprint 1-3)**

**Godkänd av:** Claude + Användare  
**Datum:** 2026-01-26

---

> **Nästa steg:**  
> Använd Atlas dagligen och prioritera Later-features baserat på behov
