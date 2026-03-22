# Planner UI Upgrade Plan

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-25
- Last updated: 2026-03-21
- Last validated: -

> Draft planner UI upgrade plan focused on AppShell alignment, mobile-first redesign, and calendar improvements.

> **Status**: Planning Phase  
> **Prioritet**: P1 - UX Critical  
> **Uppskattad tid**: 3-4 sprints  

## 1. Executive Summary

Planläggaren behöver en omfattande UI-uppgradering för att:
- Följa AppShell-standarder och designsystem
- Vara fullt mobilanpassad (mobile-first)
- Implementera en funktionell kalendervy
- Förbättra användarupplevelsen i wizard-flödet
- Standardisera komponenter med resten av applikationen

---

## 2. Nuvarande Problem

### 2.1 Design & Konsistens
| Problem | Konsekvens |
|---------|-----------|
| Tabs följer inte AppShell-mönster | Inkonsekvent navigation |
| Olika spacing/padding jämfört med andra sidor | Visuell dissonans |
| Card-design matchar inte admin-sektionen | Splittrad UX |
| Wizard-steg är inte visuellt tilltalande | Svårt att förstå progress |

### 2.2 Mobilanpassning
| Problem | Konsekvens |
|---------|-----------|
| Fasta bredder på containrar | Horizontal scroll på mobil |
| Wizard-navigation inte touch-optimerad | Svårt att navigera |
| Blocklistan svårhanterlig på små skärmar | Drag-and-drop fungerar dåligt |
| Dialog-formulär inte responsiva | Keyboard täcker input |

### 2.3 Kalender
| Problem | Konsekvens |
|---------|-----------|
| Endast placeholder | Ingen funktionalitet |
| Ingen schemaläggning möjlig | Begränsat värde |
| Ingen integration med genomföranden | Ingen översikt |

---

## 3. Målbild

### 3.1 Desktop (1024px+)
```
┌─────────────────────────────────────────────────────────────┐
│ AppShell Header                                              │
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌─────────────────────────────────────────────┐ │
│ Sidebar  │  │ Breadcrumb: Planera > [Plan namn]           │ │
│          │  ├─────────────────────────────────────────────┤ │
│  • Din   │  │ Tabs: Mina planer | Planera | Kalender     │ │
│    resa  │  ├─────────────────────────────────────────────┤ │
│  • Spela │  │                                             │ │
│  • Plane │  │           [Page Content]                    │ │
│    ra ◀  │  │                                             │ │
│          │  └─────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────┘
```

### 3.2 Mobile (< 768px)
```
┌─────────────────────┐
│ ☰ Lekbanken    👤   │
├─────────────────────┤
│ ← Mina planer       │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Stepper (horiz) │ │
│ │ ●──○──○──○──○   │ │
│ └─────────────────┘ │
├─────────────────────┤
│                     │
│   [Card Content]    │
│                     │
│   [Sticky Actions]  │
├─────────────────────┤
│ [Prev]     [Next] ▶ │
└─────────────────────┘
```

---

## 4. Fas-indelning

### Fas 1: Foundation & Standardisering (Sprint 1)
**Mål**: Anpassa till AppShell och designsystem

#### 4.1.1 Uppgifter
- [ ] **Migrera till AppShell-layout** 
  - Använd `PageHeader` komponent
  - Integrera med sidebar-state
  - Konsekvent breadcrumb-pattern

- [ ] **Standardisera PlannerTabs**
  - Använd befintliga `Tabs` från ui-kit
  - Mobile: Horisontell scroll eller dropdown
  - Synka med URL-state

- [ ] **Uppdatera Card-styling**
  - Använd `Card` från catalyst-ui-kit
  - Konsekvent border/shadow
  - Standardiserad padding

#### 4.1.2 Nya komponenter
```
components/planner/
├── PlannerPageLayout.tsx     # Wrapper med AppShell-integration
├── PlannerPageHeader.tsx     # Breadcrumb + actions
└── PlannerMobileTabs.tsx     # Touch-optimerad tab-navigation
```

#### 4.1.3 Feature Flags (v2 Opt-in)
> ⚠️ **Viktigt**: Feature flags måste finnas innan Mobile-first-delen börjar.
> Detta ger oss möjlighet att rulla tillbaka om något går fel.

```typescript
// lib/features.ts
export const features = {
  PLANNER_V2: 'planner_v2',           // Master toggle för ny UI
  PLANNER_CALENDAR: 'planner_calendar', // Kalendervy (Fas 3)
  PLANNER_GESTURES: 'planner_gestures', // Avancerade gestures (Fas 4)
}

// Användning i komponenter:
if (isFeatureEnabled('planner_v2')) {
  return <PlannerV2 />
}
return <PlannerLegacy />
```

**Granularitet:**
- Per tenant (för beta-test med utvalda förskolor)
- Per user (för intern testning)
- Global (för slutgiltigt rollout)

#### 4.1.4 Acceptance Criteria
- [ ] Planner använder samma PageHeader som admin
- [ ] Tabs ser identiska ut med andra app-sektioner
- [ ] Sidebar-toggle fungerar korrekt
- [ ] Breadcrumbs visar rätt hierarki
- [ ] Feature flag `planner_v2` implementerad och testad
- [ ] Fallback till legacy-komponenter fungerar

---

### Fas 2: Mobile-First Redesign (Sprint 1-2)
**Mål**: Fullt responsiv design

#### 4.2.1 Breakpoints
```scss
// Design tokens
$breakpoints: (
  'sm': 640px,   // Mobile landscape
  'md': 768px,   // Tablet
  'lg': 1024px,  // Desktop
  'xl': 1280px,  // Wide desktop
);
```

#### 4.2.2 Mina Planer (Plans Library)
**Desktop:**
```
┌────────────────────────────────────────────────────────┐
│ Mina planer                           [+ Ny plan]      │
├────────────────────────────────────────────────────────┤
│ [Sök...]   [Filter ▼]   [Sortera ▼]                   │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ Plan namn                    Status    Datum      │ │
│ │ ─────────────────────────────────────────────────  │ │
│ │ Morgonsamling måndag         ● Publ.   19 jan    → │ │
│ │ Fredagslek                   ○ Utkast  8 jan     → │ │
│ │ Introduktion nya barn        ◐ Ändrad  30 dec    → │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────┐
│ Mina planer [+ Ny]  │
├─────────────────────┤
│ [🔍 Sök planer...] │
├─────────────────────┤
│ Alla  Utkast  Publ. │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Morgonsamling   │ │
│ │ ● Publicerad    │ │
│ │ 4 block · 20min │ │
│ │ 19 jan      →   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Fredagslek      │ │
│ │ ○ Utkast        │ │
│ │ 0 block · 0min  │ │
│ │ 8 jan       →   │ │
│ └─────────────────┘ │
└─────────────────────┘
```

#### 4.2.3 Wizard Stepper
**Desktop (horizontal):**
```
┌──────────────────────────────────────────────────────────┐
│  ① Grund  ─────  ② Bygg  ─────  ③ Anteckningar  ─────   │
│     ✓                ●                ○                  │
│                                                          │
│  ─────  ④ Granska  ─────  ⑤ Kör                         │
│              ○               ○                           │
└──────────────────────────────────────────────────────────┘
```

**Mobile (compact):**
```
┌─────────────────────────┐
│  ← Grund (1/5)      ▼   │
│  ●━━○━━○━━○━━○          │
└─────────────────────────┘
```
- Steg-titel + dropdown för snabbnavigering
- Progress-dots istället för full text
- Swipe-gesture för att byta steg

#### 4.2.4 BlockList Touch-optimering
```
┌─────────────────────────┐
│ ≡  Namn på lek    5 min │
│    ○ Valfri      [···]  │
├─────────────────────────┤
│ ≡  Pause         3 min  │
│                  [···]  │
└─────────────────────────┘
        ↕ Drag handle vänster
        ↔ Swipe = reveal actions
```

**Gestures i v1 (Fas 2):**
| Gesture | Action | Prioritet |
|---------|--------|----------|
| Tap drag-handle + drag | Flytta block | P0 - Kritisk |
| Swipe left | Reveal edit/delete actions | P0 - Kritisk |
| Tap action button | Utför action | P0 - Kritisk |

**Skjuts till Fas 4 (polish):**
| Gesture | Action | Anledning |
|---------|--------|----------|
| Long press | Secondary actions | Discoverable först via menu |
| Pinch på kalender | Zoom vecka/månad | Komplext, låg prio |
| Haptic feedback | Vibration | Kräver infra-setup |

> 💡 **Princip**: Lär användarna grundläggande mönster först.
> Avancerade gestures introduceras när beteendet sitter.

#### 4.2.5 Sticky Action Bar
```
┌─────────────────────────┐
│ │                     │ │
│ │   [Card Content]    │ │
│ │                     │ │
├─────────────────────────┤
│ [Tillbaka]  [Fortsätt ▶]│  ← Sticky bottom
└─────────────────────────┘
```

#### 4.2.6 Komponenter att skapa/uppdatera
```
features/planner/
├── components/
│   ├── MobilePlanCard.tsx      # Touch-optimerad planvisning
│   ├── MobileBlockRow.tsx      # Swipe-to-delete, drag-handle
│   ├── StickyActionBar.tsx     # Fixed bottom navigation
│   └── ResponsiveBlockList.tsx # Adaptiv blocklista
├── wizard/
│   ├── MobileWizardStepper.tsx # Compact stepper
│   └── SwipeableWizard.tsx     # Gesture-baserad navigation
```

---

### Fas 3: Kalendervy Implementation (Sprint 2-3)
**Mål**: Funktionell kalender med schemaläggning

#### 4.3.0 Konceptuell Avgränsning: Plan vs Schema

> ⚠️ **Kritiskt beslut**: Kalendern ska ALDRIG redigera planens innehåll.

| Begrepp | Definition | Ägs av |
|---------|-----------|--------|
| **Plan** | Ett innehåll – en samling block med lekar/aktiviteter | Wizard (Bygg-steget) |
| **Schema** | En instans i tid – när en plan ska köras | Kalender |

**Kalendervy får:**
- ✅ Placera en plan på ett datum/tid
- ✅ Kopiera en plan till flera datum
- ✅ Visa genomförda körningar
- ✅ Markera körning som genomförd/hoppad
- ✅ Lägga till körningsanteckningar

**Kalendervy får INTE:**
- ❌ Ändra planens block eller lekar
- ❌ Ändra planens titel eller beskrivning
- ❌ Publicera/avpublicera planen
- ❌ Ändra synlighet

> 💡 **Konsekvens**: För att redigera planens innehåll → länka till wizard.
> Detta sparar enormt med komplexitet och håller UX ren.

---

#### 4.3.1 Data Model
```typescript
// types/planner.ts - utökning
interface PlanSchedule {
  id: string
  planId: string
  scheduledDate: string     // ISO date
  scheduledTime?: string    // HH:mm
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly'
    interval: number
    daysOfWeek?: number[]   // 0-6 for weekly
    endDate?: string
  }
  reminder?: {
    enabled: boolean
    minutesBefore: number
  }
  status: 'scheduled' | 'completed' | 'skipped'
  completedAt?: string
  notes?: string
}

interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  schedules: PlanSchedule[]
}
```

#### 4.3.2 API Endpoints
```
GET  /api/plans/schedules?from=2026-01-01&to=2026-01-31
POST /api/plans/:planId/schedule
PUT  /api/plans/schedules/:scheduleId
DELETE /api/plans/schedules/:scheduleId
```

#### 4.3.3 Kalender Layout

**Desktop - Split View:**
```
┌────────────────────────────────────────────────────────────┐
│ Kalender                                                    │
├────────────────────────────┬───────────────────────────────┤
│                            │                                │
│   ◀ Januari 2026 ▶        │  Idag, 25 januari              │
│                            │  ────────────────────────────  │
│   M  T  O  T  F  L  S     │                                │
│   ───────────────────     │  09:00  Morgonsamling          │
│      1  2  3  4  5  6     │         4 block · 20 min   [▸] │
│   7  8  9 10 11 12 13     │                                │
│  14 15 16 17 18 19 20     │  14:00  Fredagslek             │
│  21 22 23 24 ●25 26 27    │         2 block · 15 min   [▸] │
│  28 29 30 31              │                                │
│                            │  + Schemalägg plan             │
│                            │                                │
└────────────────────────────┴───────────────────────────────┘
```

**Mobile - Stacked:**
```
┌─────────────────────────┐
│ ◀   Januari 2026    ▶   │
├─────────────────────────┤
│ M  T  O  T  F  L  S     │
│    1  2  3  4  5  6     │
│ 7  8  9 10 11 12 13     │
│ ...           ●25       │
├─────────────────────────┤
│ 25 januari              │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 09:00               │ │
│ │ Morgonsamling       │ │
│ │ 4 block · 20 min  ▸ │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 14:00               │ │
│ │ Fredagslek          │ │
│ │ 2 block · 15 min  ▸ │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ [+ Schemalägg plan]     │
└─────────────────────────┘
```

#### 4.3.4 Kalender-komponenter
```
features/planner/calendar/
├── index.ts
├── types.ts
├── hooks/
│   ├── useCalendar.ts        # Navigation, selection
│   └── useSchedules.ts       # CRUD för schedules
├── components/
│   ├── CalendarGrid.tsx      # Månadsgrid
│   ├── CalendarHeader.tsx    # Månad + navigation
│   ├── CalendarDay.tsx       # Dag-cell med indikatorer
│   ├── ScheduleList.tsx      # Lista för vald dag
│   ├── ScheduleCard.tsx      # Enskild schemaläggning
│   ├── ScheduleDialog.tsx    # Skapa/redigera
│   └── QuickSchedule.tsx     # Snabbschemaläggning
└── utils/
    ├── dateUtils.ts          # Datumhantering
    └── calendarUtils.ts      # Grid-generering
```

#### 4.3.5 Schedule Dialog
```
┌─────────────────────────────────────────┐
│ Schemalägg plan                     ✕   │
├─────────────────────────────────────────┤
│                                         │
│ Plan *                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Morgonsamling måndag            ▼  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Datum *              Tid                │
│ ┌──────────────┐     ┌────────────┐    │
│ │ 2026-01-25   │     │ 09:00      │    │
│ └──────────────┘     └────────────┘    │
│                                         │
│ ☐ Upprepa                              │
│   ┌─────────────────────────────────┐  │
│   │ Varje vecka                  ▼  │  │
│   └─────────────────────────────────┘  │
│   [ ] M [✓] T [ ] O [ ] T [✓] F        │
│   Till: ┌────────────┐                 │
│         │ 2026-06-30 │                 │
│         └────────────┘                 │
│                                         │
│ ☐ Påminnelse (15 min innan)            │
│                                         │
├─────────────────────────────────────────┤
│           [Avbryt]    [Schemalägg]      │
└─────────────────────────────────────────┘
```

---

### Fas 4: Polish & Animations (Sprint 3-4)
**Mål**: Professionell finish

#### 4.4.1 Micro-interactions
- **Wizard-övergångar**: Slide-animation mellan steg
- **Block-reordering**: Smooth drag-animation
- **Dialog-öppning**: Scale + fade
- **Status-ändringar**: Pulse-effekt på badge
- **Loading states**: Skeleton screens istället för spinners

#### 4.4.2 Haptic Feedback (mobil)
```typescript
// lib/haptics.ts
export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  success: () => navigator.vibrate?.([25, 50, 25]),
  error: () => navigator.vibrate?.([50, 25, 50, 25, 50]),
}
```

#### 4.4.3 Avancerade Gestures (skjutna från Fas 2)

> Dessa gestures adderas först när grundläggande touch-mönster sitter hos användarna.

| Gesture | Action | Förutsättning |
|---------|--------|---------------|
| Long press på block | Aktivera multi-select | Swipe fungerar bra |
| Pinch på kalender | Zoom vecka/månad | Kalender lanserad |
| Pull-to-refresh | Uppdatera planlista | Native feel önskad |
| 3D Touch / Force Touch | Quick actions preview | iOS-specifikt |

#### 4.4.4 Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `n` | Ny plan |
| `←/→` | Föregående/Nästa steg |
| `1-5` | Hoppa till steg |
| `cmd+s` | Spara |
| `cmd+p` | Publicera |
| `esc` | Stäng dialog |

---

## 5. Teknisk Implementation

### 5.1 Nya Dependencies
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.x",           // Already have
    "@dnd-kit/sortable": "^8.x",       // Already have
    "date-fns": "^3.x",                // Datumhantering
    "framer-motion": "^11.x",          // Animations (optional)
  }
}
```

### 5.2 CSS/Styling Approach
```css
/* Använd CSS Container Queries för komponentnivå-responsivitet */
@container (max-width: 400px) {
  .block-row {
    flex-direction: column;
  }
}

/* Tailwind breakpoint utilities */
.wizard-stepper {
  @apply flex-col gap-2 md:flex-row md:gap-4;
}
```

### 5.3 State Management
```typescript
// Zustand store för kalender-state
interface CalendarStore {
  selectedDate: Date
  viewMode: 'month' | 'week' | 'day'
  schedules: Map<string, PlanSchedule[]>
  setSelectedDate: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  addSchedule: (schedule: PlanSchedule) => void
  updateSchedule: (id: string, updates: Partial<PlanSchedule>) => void
  removeSchedule: (id: string) => void
}
```

---

## 6. Testing Requirements

### 6.1 Visual Regression
- Storybook stories för alla nya komponenter
- Chromatic för visual diff

### 6.2 E2E Tests
```typescript
// tests/e2e/planner-mobile.spec.ts
test.describe('Planner Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  
  test('swipe to navigate wizard steps', async ({ page }) => { ... })
  test('swipe to delete block', async ({ page }) => { ... })
  test('sticky action bar visible', async ({ page }) => { ... })
})
```

### 6.3 Accessibility
- [ ] Alla interaktiva element keyboard-navigerbara
- [ ] Screen reader labels på kalender
- [ ] Focus management i wizard
- [ ] Touch targets ≥ 44x44px

---

## 7. Migration Path

### 7.1 Feature Flags

> Feature flags implementeras i **Fas 1** (se 4.1.3) – inte här.
> Detta säkerställer att vi kan börja A/B-testa redan i Sprint 1.

```typescript
// Se 4.1.3 för full implementation
// Kort sammanfattning:
features.PLANNER_V2       // Master toggle (Fas 1)
features.PLANNER_CALENDAR // Kalender (Fas 3)  
features.PLANNER_GESTURES // Avancerade gestures (Fas 4)
```

### 7.2 Gradual Rollout
1. **Week 1**: Deploy med feature flag OFF
2. **Week 2**: Enable för internal team
3. **Week 3**: 10% av användare
4. **Week 4**: 50% av användare
5. **Week 5**: 100% rollout

### 7.3 Fallback
- Behåll gamla komponenter som `*_legacy.tsx`
- Automatisk fallback vid errors
- Kill switch i admin

---

## 8. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Mobile usability score | ~60 | 90+ |
| Time to create plan | ~3 min | < 90 sec |
| Wizard completion rate | ~45% | 80%+ |
| Calendar adoption | 0% | 40%+ |
| Touch gesture success | N/A | 95%+ |

---

## 9. Timeline

```
Week 1-2:  Fas 1 - Foundation & Standardisering
Week 2-4:  Fas 2 - Mobile-First Redesign  
Week 4-6:  Fas 3 - Kalendervy Implementation
Week 6-8:  Fas 4 - Polish & Animations
Week 8:    Final testing & rollout
```

---

## 10. Files to Create/Modify

### New Files
```
features/planner/
├── calendar/
│   ├── index.ts
│   ├── types.ts
│   ├── hooks/useCalendar.ts
│   ├── hooks/useSchedules.ts
│   ├── components/CalendarGrid.tsx
│   ├── components/CalendarHeader.tsx
│   ├── components/CalendarDay.tsx
│   ├── components/ScheduleList.tsx
│   ├── components/ScheduleCard.tsx
│   ├── components/ScheduleDialog.tsx
│   └── utils/calendarUtils.ts
├── components/
│   ├── PlannerPageLayout.tsx
│   ├── StickyActionBar.tsx
│   ├── MobilePlanCard.tsx
│   └── MobileBlockRow.tsx
└── wizard/
    ├── MobileWizardStepper.tsx
    └── SwipeableWizard.tsx

app/app/planner/
└── calendar/
    └── page.tsx (replace placeholder)
```

### Modified Files
```
features/planner/
├── components/PlannerTabs.tsx       # Responsive redesign
├── components/PlanListPanel.tsx     # Mobile cards
├── components/BlockList.tsx         # Touch optimization
├── components/BlockRow.tsx          # Swipe actions
└── wizard/
    ├── WizardStepNav.tsx           # Mobile stepper
    └── steps/*.tsx                 # Responsive updates

app/app/planner/
├── plans/page.tsx                  # Use new layout
├── plan/[planId]/page.tsx          # Use new layout
└── layout.tsx (new)                # Shared planner layout
```

---

## 11. Next Steps

1. **Immediate**: Review och godkänn denna plan
2. **Week 1**: Starta Fas 1 - Foundation
3. **Ongoing**: Veckovisa demos för feedback
4. **Before start**: Skapa Figma mockups för key screens

---

*Dokument skapat: 2026-01-25*  
*Senast uppdaterad: 2026-01-25*
