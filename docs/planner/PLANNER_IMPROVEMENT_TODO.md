# PLANNER IMPROVEMENT TODO

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-08
- Last updated: 2026-03-21
- Last validated: -

> Historical snapshot of completed planner improvement work and its original execution checklist.

**Skapad:** 2026-01-08  
**Status:** ✅ IMPLEMENTERAD  
**Baserat på:** Systemanalys Admin ↔ App Kvalitet & Arkitekturvalidering
**Implementerad:** 2026-01-08

---

## IMPLEMENTATION STATUS

| # | Prioritet | Titel | Status |
|---|-----------|-------|--------|
| 1 | P0 | Centralisera Labels | ✅ Klar |
| 2 | P0 | Fixa stavfel "Andrad" | ✅ Klar |
| 3 | P0 | Återanvänd StatusBadge | ✅ Klar |
| 4 | P0 | Arkivera-funktion | ✅ Klar |
| 5 | P1 | Filter-hook | ✅ Klar |
| 6 | P1 | Version-info i App | ✅ Klar |
| 7 | P1 | Modified-feedback | ✅ Klar |
| 8 | P1 | Restore-funktion | ✅ Klar |
| 9 | P2 | Template-kopiering | ✅ Klar |
| 10 | P2 | State machine | ✅ Klar |
| 11 | P2 | DTO-lager | ✅ Klar |
| 12 | P2 | Versions-UX | ✅ Klar |
| 13 | P2 | Server-side filter | ✅ Klar |
| 14 | P3 | Plan i18n | ✅ Klar |
| 15 | P3 | Bulk operations | ✅ Klar |
| 16 | P3 | AI-assistans | ✅ Klar |
| 17 | P3 | Analytics | ✅ Klar |
| 18 | P3 | Scope separation | ✅ Klar |

---

## SKAPADE FILER

### lib/planner/
- `labels.ts` - Centraliserade labels, färger och format-funktioner
- `state-machine.ts` - Status-övergångar och validering
- `dto.ts` - Zod schemas för API-validering
- `i18n.ts` + `locales.json` - Internationalisering
- `ai-assist.ts` - AI-förslag typer och stub-service
- `analytics.ts` - Statistik och insights
- `scope.ts` - Admin/App scope separation
- `hooks/usePlanFilters.ts` - Filter-hook med debounce
- `hooks/useBulkActions.ts` - Bulk-operationer hook
- `index.ts` - Barrel export

### API Endpoints
- `app/api/plans/[planId]/status/route.ts` - Status-ändringar (arkivera/återställ)
- `app/api/plans/[planId]/copy/route.ts` - Kopiera plan
- `app/api/plans/bulk/route.ts` - Bulk-operationer

### Komponenter
- `features/planner/components/VersionTimeline.tsx` - Versions-tidslinje

---

## ÖVERSIKT

Detta dokument innehåller en prioriterad förbättringsplan för Planner-domänen baserat på en djupgående analys av `/admin/planner` och `/app/planner`. Målet är att säkerställa att båda vyerna upplevs som:

> "Två olika verktyg – men byggda på samma stabila, genomtänkta Planner-motor."

---

## PRIORITERINGSNYCKEL

| Prioritet | Betydelse | Tidsram |
|-----------|-----------|---------|
| 🔴 P0 | MUST HAVE — Gör omedelbart | Denna sprint |
| 🟠 P1 | HIGH — Planera in snart | 1-2 sprints |
| 🟡 P2 | MEDIUM — Bör göras | 3-4 sprints |
| 🟢 P3 | LOW — Nice to have | Backlog |

---

## SPRINT: IMMEDIATE FIXES (P0)

### 1. Centralisera Status/Visibility Labels

**Problem:** Labels för `PlannerStatus` och `PlannerVisibility` definieras på två ställen med inkonsekvent terminologi.

**Filer som påverkas:**
- `app/admin/planner/page.tsx` (rad 50-70)
- `app/admin/planner/[planId]/page.tsx` (rad 40-60)
- `features/planner/components/StatusBadge.tsx`
- `features/planner/components/PlanListPanel.tsx`

**Åtgärd:**
- [ ] Skapa `lib/planner/labels.ts` med centraliserade konstanter
- [ ] Exportera `STATUS_LABELS`, `STATUS_COLORS`, `VISIBILITY_LABELS`, `VISIBILITY_COLORS`
- [ ] Uppdatera alla imports i admin och app
- [ ] Ta bort duplicerade definitioner

**Ny fil: `lib/planner/labels.ts`**
```typescript
import type { PlannerStatus, PlannerVisibility } from '@/types/planner'

export const STATUS_LABELS: Record<PlannerStatus, string> = {
  draft: 'Utkast',
  published: 'Publicerad',
  modified: 'Ändrad',
  archived: 'Arkiverad',
} as const

export const STATUS_COLORS: Record<PlannerStatus, { bg: string; text: string; border: string; dot: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  published: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  modified: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  archived: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
} as const

export const STATUS_BADGE_VARIANTS: Record<PlannerStatus, 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'secondary',
  published: 'success',
  modified: 'warning',
  archived: 'outline',
} as const

export const VISIBILITY_LABELS: Record<PlannerVisibility, string> = {
  private: 'Privat',
  tenant: 'Organisation',
  public: 'Publik',
} as const

export const VISIBILITY_BADGE_VARIANTS: Record<PlannerVisibility, 'outline' | 'accent' | 'primary'> = {
  private: 'outline',
  tenant: 'accent',
  public: 'primary',
} as const

export const STATUS_FILTER_OPTIONS: Array<{ value: PlannerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'published', label: STATUS_LABELS.published },
  { value: 'modified', label: STATUS_LABELS.modified },
  { value: 'archived', label: STATUS_LABELS.archived },
]

export const VISIBILITY_FILTER_OPTIONS: Array<{ value: PlannerVisibility | 'all'; label: string }> = [
  { value: 'all', label: 'Alla synligheter' },
  { value: 'private', label: VISIBILITY_LABELS.private },
  { value: 'tenant', label: VISIBILITY_LABELS.tenant },
  { value: 'public', label: VISIBILITY_LABELS.public },
]
```

**Effort:** ~2 timmar  
**Ansvarig:** _Tillsätt_

---

### 2. Fixa Stavfel "Andrad" → "Ändrad"

**Problem:** I admin-filerna saknas å-tecken.

**Filer:**
- [ ] `app/admin/planner/page.tsx` rad 53: `modified: "Andrad"` → `modified: "Ändrad"`
- [ ] `app/admin/planner/[planId]/page.tsx` rad 43: samma fix

**Effort:** 5 minuter  
**Ansvarig:** _Tillsätt_

---

### 3. Återanvänd StatusBadge i Admin

**Problem:** Admin använder inline `<Badge>` med duplicerad config istället för den dedikerade `StatusBadge`-komponenten.

**Åtgärd:**
- [ ] Importera `StatusBadge` från `@/features/planner/components/StatusBadge`
- [ ] Ersätt inline Badge-användning i `app/admin/planner/page.tsx`
- [ ] Ersätt inline Badge-användning i `app/admin/planner/[planId]/page.tsx`

**Effort:** 30 minuter  
**Ansvarig:** _Tillsätt_

---

### 4. Lägg till Arkivera-funktion i Admin UI

**Problem:** `status='archived'` finns i schema men ingen UI för att arkivera planer.

**Filer att uppdatera:**
- [ ] `app/admin/planner/[planId]/page.tsx` — lägg till Arkivera-knapp
- [ ] `app/api/plans/[planId]/route.ts` — lägg till PATCH för status-ändring (om saknas)

**UI-spec:**
```tsx
// I actions-sektionen
{plan._capabilities?.canUpdate && plan.status !== 'archived' && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => void handleArchive()}
    disabled={isPending}
  >
    Arkivera
  </Button>
)}
```

**API-endpoint behov:**
```typescript
// PATCH /api/plans/[planId]
// Body: { status: 'archived' }
```

**Effort:** 2 timmar  
**Ansvarig:** _Tillsätt_

---

## SPRINT: HIGH PRIORITY (P1)

### 5. Abstrakt Filter/Sort-hook

**Problem:** Identisk filter- och sorteringslogik duplicerad i:
- `app/admin/planner/page.tsx` (rad 250-280)
- `features/planner/components/PlanListPanel.tsx` (rad 60-90)

**Åtgärd:**
- [ ] Skapa `lib/planner/hooks/usePlanFilters.ts`
- [ ] Flytta gemensam logik till hook
- [ ] Uppdatera båda filerna att använda hook

**Ny fil: `lib/planner/hooks/usePlanFilters.ts`**
```typescript
import { useMemo, useState } from 'react'
import type { PlannerPlan, PlannerStatus, PlannerVisibility } from '@/types/planner'

type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc' | 'duration-desc' | 'duration-asc'

interface UsePlanFiltersOptions {
  plans: PlannerPlan[]
  initialStatus?: PlannerStatus | 'all'
  initialVisibility?: PlannerVisibility | 'all'
  initialSort?: SortOption
}

export function usePlanFilters({
  plans,
  initialStatus = 'all',
  initialVisibility = 'all',
  initialSort = 'updated-desc',
}: UsePlanFiltersOptions) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | 'all'>(initialStatus)
  const [visibilityFilter, setVisibilityFilter] = useState<PlannerVisibility | 'all'>(initialVisibility)
  const [sort, setSort] = useState<SortOption>(initialSort)

  const filteredPlans = useMemo(() => {
    let result = [...plans]

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(searchLower) ||
          plan.description?.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((plan) => plan.status === statusFilter)
    }

    if (visibilityFilter !== 'all') {
      result = result.filter((plan) => plan.visibility === visibilityFilter)
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'name-asc': return a.name.localeCompare(b.name, 'sv')
        case 'name-desc': return b.name.localeCompare(a.name, 'sv')
        case 'updated-desc': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'updated-asc': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'duration-desc': return (b.totalTimeMinutes ?? 0) - (a.totalTimeMinutes ?? 0)
        case 'duration-asc': return (a.totalTimeMinutes ?? 0) - (b.totalTimeMinutes ?? 0)
        default: return 0
      }
    })

    return result
  }, [plans, search, statusFilter, visibilityFilter, sort])

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    visibilityFilter,
    setVisibilityFilter,
    sort,
    setSort,
    filteredPlans,
  }
}
```

**Effort:** 4 timmar  
**Ansvarig:** _Tillsätt_

---

### 6. Visa Version-info i App Planner

**Problem:** App-användare ser bara "Publicerad" utan att veta vilken version som är aktiv.

**Åtgärd:**
- [ ] Uppdatera `features/planner/components/PlanHeaderBar.tsx`
- [ ] Visa aktuellt versionsnummer intill status-badge
- [ ] Lägg till tooltip med publiceringsdatum

**UI-spec:**
```tsx
// I PlanHeaderBar, efter StatusBadge
{plan.currentVersion && (
  <span className="text-xs text-muted-foreground">
    v{plan.currentVersion.versionNumber}
  </span>
)}
```

**Effort:** 2 timmar  
**Ansvarig:** _Tillsätt_

---

### 7. Tydligare "Modified" Status-feedback

**Problem:** Användare förstår inte att de måste publicera igen efter ändringar.

**Åtgärd:**
- [ ] Lägg till informationstext när status är `modified`
- [ ] Visa diff-indikator (t.ex. badge med "Opublicerade ändringar")
- [ ] Highlight Publicera-knappen tydligare

**UI-spec för PlanHeaderBar:**
```tsx
{plan.status === 'modified' && (
  <div className="flex items-center gap-2 text-amber-600 text-sm">
    <ExclamationTriangleIcon className="h-4 w-4" />
    <span>Du har opublicerade ändringar</span>
  </div>
)}
```

**Effort:** 2 timmar  
**Ansvarig:** _Tillsätt_

---

### 8. Restore-funktion för Arkiverade Planer

**Problem:** Om man arkiverar en plan finns inget sätt att återställa den.

**Åtgärd:**
- [ ] Lägg till "Återställ" knapp i admin för arkiverade planer
- [ ] Implementera status-transition `archived` → `draft`
- [ ] Validera att state machine tillåter detta

**Effort:** 2 timmar  
**Ansvarig:** _Tillsätt_

---

## SPRINT: MEDIUM PRIORITY (P2)

### 9. Template-kopiering (Spara som mall / Kopiera plan)

**Problem:** Användare kan inte återanvända centrala planer utan att manuellt duplicera.

**Omfattning:**
- [ ] Skapa `POST /api/plans/[planId]/copy` endpoint
- [ ] UI: "Kopiera plan" knapp i App
- [ ] UI: "Skapa mall" i Admin (skapar copy med `visibility='public'`)
- [ ] Kopiera blocks, men resetta owner + status

**API-spec:**
```typescript
// POST /api/plans/[planId]/copy
// Body: { name?: string, visibility?: PlannerVisibility }
// Returns: { plan: PlannerPlan }
```

**Effort:** 1-2 dagar  
**Ansvarig:** _Tillsätt_

---

### 10. Explicit State Machine för PlanStatus

**Problem:** Status-transitions är implicit logik spridd i API-routes.

**Åtgärd:**
- [ ] Skapa `lib/planner/state-machine.ts`
- [ ] Definiera tillåtna transitions
- [ ] Använd i alla status-ändrande endpoints
- [ ] Kasta tydliga fel vid ogiltiga transitions

**Ny fil: `lib/planner/state-machine.ts`**
```typescript
import type { PlannerStatus } from '@/types/planner'

const VALID_TRANSITIONS: Record<PlannerStatus, PlannerStatus[]> = {
  draft: ['published', 'archived'],
  published: ['modified', 'archived'],
  modified: ['published', 'archived'],
  archived: ['draft'], // Restore
}

export function canTransition(from: PlannerStatus, to: PlannerStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: PlannerStatus, to: PlannerStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`)
  }
}

export function getNextStatus(current: PlannerStatus, action: 'publish' | 'edit' | 'archive' | 'restore'): PlannerStatus {
  switch (action) {
    case 'publish':
      if (current === 'draft' || current === 'modified') return 'published'
      throw new Error(`Cannot publish from status: ${current}`)
    case 'edit':
      if (current === 'published') return 'modified'
      return current // draft stays draft
    case 'archive':
      if (current !== 'archived') return 'archived'
      throw new Error('Already archived')
    case 'restore':
      if (current === 'archived') return 'draft'
      throw new Error('Can only restore archived plans')
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
```

**Effort:** 4 timmar  
**Ansvarig:** _Tillsätt_

---

### 11. DTO-lager för API-responses

**Problem:** Supabase-types läcker direkt till klient, gör breaking changes svåra.

**Åtgärd:**
- [ ] Skapa `lib/planner/dto.ts` med Zod-scheman
- [ ] Validera API-responses
- [ ] Dokumentera API-kontrakt

**Omfattning:**
```typescript
// lib/planner/dto.ts
import { z } from 'zod'

export const PlannerBlockDTOSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  position: z.number(),
  blockType: z.enum(['game', 'pause', 'preparation', 'custom']),
  durationMinutes: z.number().nullable(),
  title: z.string().nullable(),
  notes: z.string().nullable(),
  isOptional: z.boolean().nullable(),
  game: z.object({
    id: z.string(),
    title: z.string(),
    shortDescription: z.string().nullable(),
    durationMinutes: z.number().nullable(),
    coverUrl: z.string().nullable(),
  }).nullable(),
})

export const PlannerPlanDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['private', 'tenant', 'public']),
  status: z.enum(['draft', 'published', 'modified', 'archived']),
  ownerUserId: z.string().uuid(),
  ownerTenantId: z.string().uuid().nullable(),
  totalTimeMinutes: z.number().nullable(),
  currentVersionId: z.string().uuid().nullable(),
  updatedAt: z.string(),
  blocks: z.array(PlannerBlockDTOSchema),
})
```

**Effort:** 4-6 timmar  
**Ansvarig:** _Tillsätt_

---

### 12. Förbättrad Versions-UX i App

**Problem:** Versionshistorik är gömd i dialog, svår att förstå.

**Åtgärd:**
- [ ] Visa versions-tidslinje i plan-header
- [ ] Möjliggör "Visa version X" (read-only preview)
- [ ] Lägg till diff-vy mellan versioner (stretch goal)

**Effort:** 1-2 dagar  
**Ansvarig:** _Tillsätt_

---

### 13. Server-side Filtering för Admin

**Problem:** Admin gör client-side filtering, skalerar dåligt vid tusentals planer.

**Åtgärd:**
- [ ] Utöka `POST /api/plans/search` med `status` och `visibility` query-params
- [ ] Uppdatera admin att skicka filter till server
- [ ] Behåll client-side som fallback för snabb UX

**API-ändring:**
```typescript
// POST /api/plans/search
// Body: { 
//   search?: string,
//   tenantId?: string,
//   visibility?: PlannerVisibility,  // Finns
//   status?: PlannerStatus,          // Lägg till
//   page?: number,
//   pageSize?: number 
// }
```

**Effort:** 3-4 timmar  
**Ansvarig:** _Tillsätt_

---

## SPRINT: LOW PRIORITY (P3) / BACKLOG

### 14. Plan i18n-stöd

**Problem:** Plans har ingen översättningsstrategi (till skillnad från games).

**Åtgärd:**
- [ ] Analysera behov av plan-translations
- [ ] Designa schema (`plan_translations` tabell?)
- [ ] Implementera locale-fallback liknande games

**Effort:** 3-5 dagar  
**Ansvarig:** _Tillsätt_

---

### 15. Bulk-operationer i Admin

**Problem:** Saknas möjlighet att arkivera/publicera flera planer samtidigt.

**Åtgärd:**
- [ ] Lägg till multi-select i admin-listan
- [ ] Skapa bulk-endpoints (`POST /api/plans/bulk-archive` etc.)
- [ ] Implementera progress-feedback vid bulk-ops

**Effort:** 2-3 dagar  
**Ansvarig:** _Tillsätt_

---

### 16. AI-assistans för Plan-skapande

**Problem:** Användare måste manuellt bygga planer från scratch.

**Åtgärd:**
- [ ] Designa AI-flöde: "Skapa plan för 10 barn, 45 min, utomhus"
- [ ] Integrera med befintligt AI-system
- [ ] Metadata-struktur för AI-preferenser

**Effort:** 1-2 veckor  
**Ansvarig:** _Tillsätt_

---

### 17. Plan Analytics

**Problem:** Ingen insikt i hur planer används.

**Åtgärd:**
- [ ] Spåra runs per plan
- [ ] Visa popularitet/användningsstatistik i admin
- [ ] Dashboard för trender

**Effort:** 1 vecka  
**Ansvarig:** _Tillsätt_

---

### 18. Scope vs Visibility Separation i Admin

**Problem:** Global scope = visibility='public' i queries, begränsar system_admin.

**Önskad funktionalitet:** System_admin ska kunna se alla planer oavsett visibility.

**Åtgärd:**
- [ ] Separera "query scope" (what to fetch) från "visibility filter" (UI filtering)
- [ ] Uppdatera admin-query att hämta alla för system_admin
- [ ] Behåll visibility-filter som UI-kontroll

**Effort:** 4 timmar  
**Ansvarig:** _Tillsätt_

---

## TEKNISK SKULD ATT BETALA

### T1. Sandbox References (Minor)

**Filer:**
- `app/sandbox/admin/content/page.tsx` — refererar /admin/content
- `app/sandbox/config/sandbox-modules.ts` — refererar /admin/content

**Åtgärd:** Uppdatera till /admin/planner

**Effort:** 15 minuter

---

### T2. PlanOverview Återanvändning (Klargör)

**Problem:** `features/planner/components/PlanOverview.tsx` används av App men inte Admin.

**Åtgärd:**
- [ ] Analysera om den kan återanvändas i admin detail view
- [ ] Alternativt: dokumentera varför de ska vara separata

**Effort:** 1 timme (analys)

---

### T3. useRbac Permissions Cleanup

**Filer:** `features/admin/shared/hooks/useRbac.ts`

**Observation:** Både `admin.content.*` och `admin.planner.list` finns.

**Åtgärd:**
- [ ] Ta bort `admin.content.*` om /admin/content permanent borttaget
- [ ] Lägg till `admin.planner.detail`, `admin.planner.publish` etc. om granulär kontroll behövs

**Effort:** 30 minuter

---

## RISKER OM IGNORERAT

| Risk | Konsekvens | Sannolikhet | Impact |
|------|------------|-------------|--------|
| Duplicerade labels divergerar | Inkonsekvent UX, förvirrade användare | Hög | Medium |
| Arkivering saknas | Tusentals döda planer vid skala | Hög (vid tillväxt) | Hög |
| Inget DTO-lager | Breaking API-ändringar kräver stor refactor | Medium | Hög |
| Ingen template-copy | Support-ärenden, manuellt arbete | Hög | Medium |
| State machine saknas | Ogiltiga status-transitions, dataintegritet | Låg | Hög |

---

## IMPLEMENTATION TIMELINE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLANNER IMPROVEMENT ROADMAP                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SPRINT N (Current)          SPRINT N+1              SPRINT N+2             │
│  ─────────────────           ──────────              ──────────             │
│                                                                             │
│  🔴 P0: Labels               🟠 P1: Filter-hook      🟡 P2: Templates       │
│  🔴 P0: Stavfel              🟠 P1: Version-info     🟡 P2: State machine   │
│  🔴 P0: StatusBadge          🟠 P1: Modified UX      🟡 P2: DTO-layer       │
│  🔴 P0: Arkivera-knapp       🟠 P1: Restore          🟡 P2: Server filter   │
│                                                                             │
│  Total: ~4-5 timmar          Total: ~10 timmar       Total: ~3-4 dagar      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SPRINT N+3                  BACKLOG                                        │
│  ──────────                  ───────                                        │
│                                                                             │
│  🟡 P2: Versions-UX          🟢 P3: Plan i18n                               │
│                              🟢 P3: Bulk-ops                                │
│                              🟢 P3: AI-assistans                            │
│                              🟢 P3: Analytics                               │
│                                                                             │
│  Total: ~2 dagar             Total: 2-4 veckor                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RELATERADE DOKUMENT

- [PLANNER_DOMAIN.md](PLANNER_DOMAIN.md) — Domändokumentation
- [PLANNER_TARGET_ARCHITECTURE.md](PLANNER_TARGET_ARCHITECTURE.md) — Målarkitektur
- [ADMIN_PLANNER_MASTER_IMPLEMENTATION.md](../admin/ADMIN_PLANNER_MASTER_IMPLEMENTATION.md) — Admin-implementation

---

## CHANGELOG

| Datum | Ändring | Ansvarig |
|-------|---------|----------|
| 2026-01-08 | Initial version skapad baserat på systemanalys | — |

---

## GODKÄNNANDE

- [ ] Tech Lead godkänd
- [ ] Product Owner godkänd
- [ ] Inplanerat i sprint

