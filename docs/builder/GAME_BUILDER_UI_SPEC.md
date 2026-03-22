# Game Builder – Unified Admin Editor
## UX/UI Design Specification

## Metadata

- Owner: -
- Status: draft
- Date: 2025-12-16
- Last updated: 2026-03-22
- Last validated: 2025-12-16

> Draft builder UI specification. Canonical routing for the builder domain starts at `docs/builder/README.md`.

**Version:** 1.0  
**Date:** 2025-12-16  
**Last updated:** 2026-03-21  
**Last validated:** 2025-12-16  
**Status:** draft  
**Author:** Claude Opus 4.5  
**Canonical entrypoint:** `docs/builder/README.md`

---

## 1. Executive Summary

A single, unified Game Builder that scales from quick "simple game" creation to advanced "participant-based game" authoring through **progressive disclosure** and **modular sections**. No separate wizards—one tool that grows with complexity.

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **One Builder, All Games** | Same entry point; complexity revealed as needed |
| **Fast Path Default** | Start simple—name, description, steps—publish in 2 minutes |
| **Modules On Demand** | Advanced sections (Roles, Phases, Board) collapse until enabled |
| **Quality Milestones** | Clear states: Utkast → Spelbar → Publicerbar |
| **Autosave + Gate** | Never lose work; explicit "Publicera" action |

---

## 2. Information Architecture

### 2.1 Route Structure

```
/admin/games                     ← List view (existing)
/admin/games/new                 ← Builder: Create mode
/admin/games/[id]/edit           ← Builder: Edit mode
/admin/games/[id]                ← Read-only detail view (optional)
```

**Rationale:** Full-page builder (not modal) gives room for complex editing. `/new` and `/[id]/edit` share 95% of the same component tree.

### 2.2 Page Layout (Three-Column)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [← Tillbaka]   Lekbyggaren   [Spara utkast]  [Förhandsgranska] [Publicera] │
├───────────────┬─────────────────────────────────────────┬───────────────┤
│               │                                         │               │
│   SEKTIONER   │          HUVUDINNEHÅLL                  │   CHECKLISTA  │
│   (nav)       │          (active section)               │   (quality)   │
│               │                                         │               │
│  ○ Grundinfo  │  ┌─────────────────────────────────┐   │  Kvalitets-   │
│  ○ Steg       │  │                                 │   │  kontroll     │
│  ○ Material   │  │  [Section content here]         │   │               │
│  ○ Säkerhet   │  │                                 │   │  ☑ Namn       │
│  ─────────────│  │                                 │   │  ☑ Beskrivning│
│  AVANCERAT    │  │                                 │   │  ☐ Minst 1    │
│  ○ Spelläge   │  └─────────────────────────────────┘   │    steg       │
│  ○ Faser      │                                         │  ☐ Syfte valt │
│  ○ Roller     │                                         │               │
│  ○ Tavla      │                                         │  ─────────    │
│  ─────────────│                                         │  Publicerings-│
│  ○ Översätt   │                                         │  krav         │
│  ○ Inställn.  │                                         │               │
│               │                                         │  ☐ Alla fält  │
│               │                                         │  ☐ Granskat   │
│               │                                         │               │
└───────────────┴─────────────────────────────────────────┴───────────────┘
```

**Responsive behavior:**
- Desktop (≥1280px): Full three-column
- Tablet (768–1279px): Collapsible left nav, checklist as popover
- Mobile (<768px): Full-width main content, nav in drawer, checklist in sheet

### 2.3 Section Navigation (Left Sidebar)

#### Standard Sections (Always Visible)
| Section | Icon | Description |
|---------|------|-------------|
| **Grundinfo** | `InformationCircleIcon` | Name, description, classification |
| **Steg** | `ListBulletIcon` | Step-by-step instructions |
| **Material** | `CubeIcon` | Required materials list |
| **Säkerhet** | `ShieldCheckIcon` | Safety notes, inclusion tips |

#### Advanced Sections (Collapsed by Default)
| Section | Icon | Trigger |
|---------|------|---------|
| **Spelläge** | `AdjustmentsIcon` | Always visible, enables others |
| **Faser/Rundor** | `ClockIcon` | Enabled when play_mode ≠ 'basic' |
| **Roller** | `UserGroupIcon` | Enabled when play_mode has roles |
| **Publik Tavla** | `TvIcon` | Enabled when play_mode ≠ 'basic' |

#### Utility Sections
| Section | Icon | Description |
|---------|------|-------------|
| **Översättningar** | `LanguageIcon` | SE/NO/EN completeness |
| **Inställningar** | `CogIcon` | Status, owner, visibility |

---

## 3. Quality Milestones

### 3.1 Three States

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   UTKAST     │ ───▶ │   SPELBAR    │ ───▶ │ PUBLICERBAR  │
│              │      │              │      │              │
│  Kan sparas  │      │  Kan testas  │      │  Kan delas   │
│  Ofullständ. │      │  Komplett    │      │  Godkänd     │
└──────────────┘      └──────────────┘      └──────────────┘
```

### 3.2 Requirements Per State

| State | Requirements |
|-------|-------------|
| **Utkast** | Namn finns (auto-sparas alltid) |
| **Spelbar** | + Kort beskrivning, + Syfte valt, + Minst 1 steg ELLER full beskrivning |
| **Publicerbar** | + Alla spelbara krav, + Granskning godkänd (om aktiverat), + Inga valideringsfel |

### 3.3 Quality Checklist (Right Sidebar)

```tsx
<QualityChecklist>
  <ChecklistSection title="Grundkrav (Utkast)">
    <ChecklistItem checked={!!name} label="Namn" />
  </ChecklistSection>
  
  <ChecklistSection title="Spelbar">
    <ChecklistItem checked={!!shortDescription} label="Kort beskrivning" />
    <ChecklistItem checked={!!mainPurposeId} label="Syfte valt" />
    <ChecklistItem checked={steps.length > 0 || !!description} label="Steg eller beskrivning" />
    <ChecklistItem checked={!!energyLevel} label="Energinivå" optional />
    <ChecklistItem checked={!!locationOptions} label="Plats" optional />
  </ChecklistSection>
  
  <ChecklistSection title="Publicerbar">
    <ChecklistItem checked={allRequiredMet} label="Alla krav uppfyllda" />
    <ChecklistItem checked={noValidationErrors} label="Inga valideringsfel" />
    <ChecklistItem checked={reviewed} label="Granskning godkänd" conditional />
  </ChecklistSection>
</QualityChecklist>
```

---

## 4. Progressive Disclosure: Play Mode Selection

### 4.1 Top-Level Mode Selector

Located in **Spelläge** section. This is the "gate" that reveals advanced modules.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Välj spelläge                                                      │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  🎯 ENKEL      │  │  👨‍🏫 LEDD        │  │  🎭 DELTAGARE   │     │
│  │                 │  │                 │  │                 │     │
│  │  Klassisk lek   │  │  Med faser och  │  │  Med roller och │     │
│  │  med steg.      │  │  tidsstyrning.  │  │  digital tavla. │     │
│  │                 │  │                 │  │                 │     │
│  │  Steg, material │  │  + Faser        │  │  + Allt i Ledd  │     │
│  │  och säkerhet.  │  │  + Timer        │  │  + Roller       │     │
│  │                 │  │  + Teleprompter │  │  + Privat kort  │     │
│  │                 │  │                 │  │  + Publik tavla │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│        ◯                    ◯                    ◯                  │
│                                                                     │
│  💡 Osäker? Börja enkelt – du kan uppgradera senare.               │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mode Definitions

| Mode | Slug | Enables | Use Case |
|------|------|---------|----------|
| **Enkel** | `basic` | Steg, Material, Säkerhet | Quick games, old-style browse |
| **Ledd** | `facilitated` | + Faser, + Timer config per step | Workshops, structured activities |
| **Deltagare** | `participants` | + Roller, + Publik Tavla, + Join Code | Murder mystery, team exercises |

### 4.3 Sidebar Updates Based on Mode

```typescript
const visibleSections = useMemo(() => {
  const base = ['grundinfo', 'steg', 'material', 'sakerhet'];
  const advanced = ['spelläge'];
  
  if (playMode === 'facilitated' || playMode === 'participants') {
    advanced.push('faser');
  }
  if (playMode === 'participants') {
    advanced.push('roller', 'tavla');
  }
  
  return [...base, ...advanced, 'oversattningar', 'installningar'];
}, [playMode]);
```

---

## 5. Component-Level Design

### 5.1 Step Editor

The core of the builder. Must handle simple instructions AND advanced timer/cue config.

#### Step List (Left/Main Area)
```
┌─────────────────────────────────────────────────────────────────────┐
│  Steg                                                    [+ Lägg till] │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  1. Samla gruppen                                    ⏱ 2m │ │
│  │      Förklara reglerna kort innan ni börjar.            ✎ ✕ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  2. Starta musiken                          [aktivt]  ⏱ 5m │ │
│  │      Alla dansar fritt i rummet.                        ✎ ✕ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  3. Stoppa och stelna                               ⏱ 30s │ │
│  │      När musiken tystnar fryser alla.                   ✎ ✕ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [+ Lägg till steg]   [+ Lägg till från mall]                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Step Detail Editor (Drawer/Panel)
```
┌─────────────────────────────────────────────────────────────────────┐
│  Redigera steg                                               [✕]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Sektion *                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Förberedelse ▾] [Intro ▾] [●Huvudmoment▾] [Avslut ▾]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Stegtyp                                                            │
│  [Instruktion ▾]  ← prep | explain | demo | run | reflect | tips   │
│                                                                     │
│  Rubrik *                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Starta musiken                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Beskrivning                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Alla dansar fritt i rummet. Säg till gruppen att de ska... │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  💬 Ledarskript (valfritt)                       [Visa/Dölj]       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ "Nu ska ni dansa fritt! När musiken tystnar..."             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  ⏱ Tid & Timer                                                      │
│                                                                     │
│  Beräknad tid (sekunder)    Timer aktiv                            │
│  ┌─────────┐                ┌──────────────┐                       │
│  │ 300     │                │ [✓] Ja       │                       │
│  └─────────┘                └──────────────┘                       │
│                                                                     │
│  [När timer är på:]                                                │
│  Visuell signal        Ljud              Vibration                 │
│  [● Trafikljus ▾]     [Gong ▾]          [✓]                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  🎨 Media (valfritt)                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Ladda upp bild]  eller  [Välj från mediebibliotek]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  📝 Anpassningstips (valfritt)                   [Visa/Dölj]       │
│                                                                     │
│  För yngre          │ För äldre          │ Färre deltagare          │
│  ┌────────────────┐ │ ┌────────────────┐ │ ┌────────────────┐       │
│  │                │ │ │                │ │ │                │       │
│  └────────────────┘ │ └────────────────┘ │ └────────────────┘       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                              [Avbryt]  [Spara steg]                │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Materials Editor

Structured list instead of free text.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Material                                             [+ Lägg till] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🔷 Koner                                                     │ │
│  │     8 st totalt                                               │ │
│  │     Alternativ: Plastmuggar eller stenar                 [✎✕] │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🔷 Bollar                                                    │ │
│  │     1 st per lag                                              │ │
│  │     –                                                    [✎✕] │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [+ Lägg till material]                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Material Add/Edit Dialog:**
```
┌────────────────────────────────────────────┐
│  Lägg till material                        │
├────────────────────────────────────────────┤
│  Namn *                                    │
│  ┌────────────────────────────────────┐   │
│  │ Koner                               │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Antal                                     │
│  ┌────────┐                               │
│  │ 8      │                               │
│  └────────┘                               │
│                                            │
│  Per...                                    │
│  (●) Totalt  ( ) Per person  ( ) Per lag  │
│                                            │
│  Alternativ (valfritt)                     │
│  ┌────────────────────────────────────┐   │
│  │ Plastmuggar eller stenar           │   │
│  └────────────────────────────────────┘   │
│                                            │
│          [Avbryt]  [Lägg till]            │
└────────────────────────────────────────────┘
```

### 5.3 Safety & Inclusion Editor

```
┌─────────────────────────────────────────────────────────────────────┐
│  Säkerhet & Inkludering                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️ Säkerhetsnoteringar                           [+ Lägg till]    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  • Se upp för väggar vid snabb rörelse                   [✕] │ │
│  │  • Undvik glatta golv                                    [✕] │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Lägg till ny säkerhetsnotering...                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ♿ Inkluderingstips                               [+ Lägg till]    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  • Går att spela sittande med anpassning                 [✕] │ │
│  │  • Visuella signaler för hörselnedsatta                  [✕] │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Lägg till inkluderingstips...                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📊 Sensoriska nivåer                                              │
│                                                                     │
│  Tempo        Lugnt ───●─────────── Intensivt                      │
│  Ljudnivå     Tyst ─────●───────── Högt                            │
│  Fysisk nivå  Stillsam ──────●──── Mycket rörelse                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Phase/Round Editor (Facilitated + Participants Mode)

For games with structured phases (intro → rounds → finale):

```
┌─────────────────────────────────────────────────────────────────────┐
│  Faser & Rundor                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Fasstruktur                                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ [+ Intro] → [Runda 1] → [Runda 2] → [+ Runda] → [Finale]     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📍 Runda 1                                          [Redigera] [✕] │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Namn: Första rundan                                          │ │
│  │  Tid: 5 minuter                                               │ │
│  │  Steg: 3 st (länkade från Steg-sektionen)                    │ │
│  │  Timer: Aktiv med nedräkning                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  📍 Runda 2                                          [Redigera] [✕] │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Namn: Andra rundan                                           │ │
│  │  Tid: 7 minuter                                               │ │
│  │  Steg: 4 st                                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [+ Lägg till fas]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 Role Cards Editor (Participants Mode Only)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Roller                                               [+ Ny roll]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────┐  ┌─────────────────────────┐  │
│  │  🎭 MÖRDARE                     │  │  🔍 DETEKTIV            │  │
│  │                                 │  │                         │  │
│  │  Min: 1  Max: 1                 │  │  Min: 1  Max: 2         │  │
│  │  Tilldelning: Slumpmässig       │  │  Tilldelning: Slump     │  │
│  │                                 │  │                         │  │
│  │  [Redigera] [Kopiera] [✕]      │  │  [Redigera] [Kopiera]   │  │
│  └─────────────────────────────────┘  └─────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────┐  ┌─────────────────────────┐  │
│  │  👁️ VITTNE                      │  │  [+ Ny roll]            │  │
│  │                                 │  │                         │  │
│  │  Min: 0  Max: ∞                 │  │                         │  │
│  │  Tilldelning: Fyll ut resten    │  │                         │  │
│  │                                 │  │                         │  │
│  │  [Redigera] [Kopiera] [✕]      │  │                         │  │
│  └─────────────────────────────────┘  └─────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Role Edit Dialog:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Redigera roll                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Rollnamn *                          Ikon                          │
│  ┌─────────────────────────┐        ┌──────────────────┐          │
│  │ Mördare                 │        │ 🎭 [Välj...]     │          │
│  └─────────────────────────┘        └──────────────────┘          │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│  PUBLIK INFORMATION (visas för alla)                              │
│                                                                    │
│  Offentlig beskrivning                                            │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ En mystisk person som rör sig i skuggorna...               │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│  🔒 PRIVAT INFORMATION (endast rollinnehavare ser)                │
│                                                                    │
│  Hemliga instruktioner *                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Du är mördaren! Din uppgift är att "eliminera" andra       │   │
│  │ spelare genom att blinka till dem när ingen annan ser.     │   │
│  │                                                             │   │
│  │ Tips: Var diskret och skapa alibi.                         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│  FÖRDELNINGSREGLER                                                │
│                                                                    │
│  Antal      Min: [1]    Max: [1]    (∞ = obegränsat)              │
│                                                                    │
│  Tilldelningsstrategi                                             │
│  ( ) Slumpmässig   (●) Ledaren väljer   ( ) Deltagare väljer     │
│                                                                    │
│  Konfliktroller (kan inte kombineras med)                         │
│  [ Detektiv ✕ ]  [ + Lägg till ]                                  │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│  REKOMMENDERAD FÖRDELNING                                         │
│                                                                    │
│  Vid 10 spelare: [1] st    Vid 20 spelare: [1] st                 │
│  [+ Lägg till fördelning]                                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                   [Avbryt]  [Spara roll]          │
└────────────────────────────────────────────────────────────────────┘
```

### 5.6 Public Board Template Editor (Participants Mode)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Publik Tavla                                                      │
│  Innehåll som visas på projektor/storskärm under spelet           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Förhandsgranskning                               [📱 Mobil] [🖥️ TV] │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │    ╔═══════════════════════════════════════════════════════╗  │ │
│  │    ║                   MORDMYSTERIET                       ║  │ │
│  │    ║                                                       ║  │ │
│  │    ║   Fas: Utredning                     Tid kvar: 04:32  ║  │ │
│  │    ║                                                       ║  │ │
│  │    ║   ┌─────────┐  ┌─────────┐  ┌─────────┐              ║  │ │
│  │    ║   │Detektiv │  │ Vittne  │  │ ???    │              ║  │ │
│  │    ║   │  Anna   │  │  Kalle  │  │        │              ║  │ │
│  │    ║   └─────────┘  └─────────┘  └─────────┘              ║  │ │
│  │    ║                                                       ║  │ │
│  │    ╚═══════════════════════════════════════════════════════╝  │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Tavlaelement                                                       │
│                                                                     │
│  [✓] Visa spelnamn                                                 │
│  [✓] Visa aktuell fas                                              │
│  [✓] Visa timer/nedräkning                                         │
│  [✓] Visa deltagare (publika roller)                               │
│  [ ] Visa ledartavla/poäng                                         │
│  [ ] Visa QR-kod för att gå med                                    │
│                                                                     │
│  Anpassat meddelande (valfritt)                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Välkomna till kvällens mysterium!                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Bakgrundsbild                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Ladda upp]  eller  [Välj från teman]                      │   │
│  │  Teman: Mysterie ● | Fest | Sport | Natur | Neutral         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.7 Translation Completeness UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  Översättningar                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Originalspråk: Svenska (SE)                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🇸🇪 Svenska          ████████████████████████  100%  [✓]  │   │
│  │  🇳🇴 Norska           ████████░░░░░░░░░░░░░░░░   35%  [→]  │   │
│  │  🇬🇧 Engelska         ░░░░░░░░░░░░░░░░░░░░░░░░    0%  [→]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Klicka på ett språk för att öppna översättningsläge.              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  🇳🇴 Norska – Översättningsstatus                    [AI-översätt] │
│                                                                     │
│  ☑ Namn                          │ ☐ Kort beskrivning              │
│  ☐ Full beskrivning              │ ☐ Steg 1: Rubrik                │
│  ☐ Steg 1: Beskrivning           │ ☐ Steg 2: Rubrik                │
│  ...                                                                │
│                                                                     │
│  [Öppna sida vid sida-redigering]                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Save Patterns

### 6.1 Autosave

```typescript
// Debounced autosave on every change
const debouncedSave = useDebouncedCallback(async (values) => {
  setIsSaving(true);
  await saveGame(gameId, values);
  setLastSaved(new Date());
  setIsSaving(false);
}, 1500);

// Visual indicator in header
<SaveIndicator status={isSaving ? 'saving' : 'saved'} lastSaved={lastSaved} />
```

**Indicator states:**
- `saving`: "Sparar..." with spinner
- `saved`: "Sparat" with checkmark + relative time
- `error`: "Kunde inte spara" with retry button

### 6.2 Publish Gate

```
┌────────────────────────────────────────────────────────────────────┐
│  Publicera lek                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ⚠️ Kontrollera innan publicering                                 │
│                                                                    │
│  ☑ Alla obligatoriska fält är ifyllda                             │
│  ☑ Minst ett steg eller fullständig beskrivning finns             │
│  ☑ Syfte och produkt är valda                                     │
│  ☐ Granskning godkänd (valfritt men rekommenderat)                │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│                                                                    │
│  Synlighet efter publicering:                                      │
│  (●) Synlig för alla med tillgång till produkten                   │
│  ( ) Endast synlig för min organisation                            │
│  ( ) Olistad (endast med direkt länk)                              │
│                                                                    │
│  ─────────────────────────────────────────────────────────────     │
│                                                                    │
│  💡 Du kan avpublicera när som helst från Inställningar.          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                   [Avbryt]  [Publicera nu]        │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Component Tree

```
GameBuilderPage
├── GameBuilderHeader
│   ├── BackButton
│   ├── PageTitle
│   ├── SaveIndicator
│   ├── PreviewButton
│   └── PublishButton
│
├── GameBuilderLayout (3-column)
│   │
│   ├── SectionNavigation (left)
│   │   ├── SectionNavItem (basic sections)
│   │   ├── SectionDivider
│   │   ├── SectionNavItem (advanced sections, conditional)
│   │   └── SectionNavItem (utility sections)
│   │
│   ├── MainContent (center)
│   │   ├── GrundInfoSection
│   │   │   ├── NameInput
│   │   │   ├── ShortDescriptionTextarea
│   │   │   ├── FullDescriptionEditor (rich text)
│   │   │   ├── PurposeSelect
│   │   │   ├── ProductSelect
│   │   │   ├── CategoryInput
│   │   │   ├── EnergyLevelSelect
│   │   │   ├── LocationSelect
│   │   │   ├── DurationInput
│   │   │   ├── PlayerCountInputs (min/max)
│   │   │   └── AgeRangeInputs (min/max)
│   │   │
│   │   ├── StepEditorSection
│   │   │   ├── StepList
│   │   │   │   └── StepListItem (draggable)
│   │   │   ├── StepDetailDrawer
│   │   │   │   ├── SectionSelect
│   │   │   │   ├── StepTypeSelect
│   │   │   │   ├── TitleInput
│   │   │   │   ├── DescriptionTextarea
│   │   │   │   ├── LeaderScriptTextarea (collapsible)
│   │   │   │   ├── TimerConfig
│   │   │   │   ├── MediaUploader
│   │   │   │   └── AdaptationHints (collapsible)
│   │   │   └── AddStepButton
│   │   │
│   │   ├── MaterialsSection
│   │   │   ├── MaterialList
│   │   │   │   └── MaterialListItem
│   │   │   ├── MaterialDialog
│   │   │   └── AddMaterialButton
│   │   │
│   │   ├── SafetySection
│   │   │   ├── SafetyNotesList
│   │   │   ├── InclusionTipsList
│   │   │   └── SensoryLevelSliders
│   │   │
│   │   ├── PlayModeSection
│   │   │   └── PlayModeSelector (cards)
│   │   │
│   │   ├── PhasesSection (conditional)
│   │   │   ├── PhaseTimeline
│   │   │   ├── PhaseCard
│   │   │   └── AddPhaseButton
│   │   │
│   │   ├── RolesSection (conditional)
│   │   │   ├── RoleCardGrid
│   │   │   │   └── RoleCard
│   │   │   ├── RoleEditDialog
│   │   │   └── AddRoleButton
│   │   │
│   │   ├── BoardSection (conditional)
│   │   │   ├── BoardPreview
│   │   │   ├── BoardElementToggles
│   │   │   └── BoardThemeSelector
│   │   │
│   │   ├── TranslationsSection
│   │   │   ├── LanguageProgressList
│   │   │   └── TranslationEditor
│   │   │
│   │   └── SettingsSection
│   │       ├── StatusSelect
│   │       ├── OwnerSelect
│   │       └── VisibilitySelect
│   │
│   └── QualityChecklist (right)
│       ├── ChecklistSection (Grundkrav)
│       ├── ChecklistSection (Spelbar)
│       ├── ChecklistSection (Publicerbar)
│       └── PublishStatusBadge
│
└── GameBuilderFooter (mobile only)
    ├── SaveButton
    └── PublishButton
```

---

## 8. Microcopy (Swedish)

### 8.1 Page & Navigation

| Location | Copy |
|----------|------|
| Page title (new) | `Skapa ny lek` |
| Page title (edit) | `Redigera: {name}` |
| Back button | `← Tillbaka till lekar` |
| Save indicator | `Sparar...` / `Sparat {time}` / `Kunde inte spara` |
| Preview button | `Förhandsgranska` |
| Publish button | `Publicera` |

### 8.2 Section Labels

| Section | Label |
|---------|-------|
| Grundinfo | `Grundinformation` |
| Steg | `Steg-för-steg` |
| Material | `Material` |
| Säkerhet | `Säkerhet & Inkludering` |
| Spelläge | `Spelläge` |
| Faser | `Faser & Rundor` |
| Roller | `Roller` |
| Tavla | `Publik Tavla` |
| Översättningar | `Översättningar` |
| Inställningar | `Inställningar` |

### 8.3 Empty States

| Context | Title | Description | Action |
|---------|-------|-------------|--------|
| No steps | `Inga steg ännu` | `Lägg till steg för att guida ledaren genom leken.` | `+ Lägg till första steget` |
| No materials | `Inget material` | `Beskriv vad som behövs för att spela leken.` | `+ Lägg till material` |
| No roles | `Inga roller` | `Roller ger deltagare unika uppdrag under spelet.` | `+ Skapa första rollen` |
| No phases | `Inga faser` | `Dela upp leken i tydliga faser med egna tidsbegränsningar.` | `+ Lägg till fas` |

### 8.4 Validation Errors

| Field | Error |
|-------|-------|
| Name | `Namn krävs för att spara` |
| Short description | `Kort beskrivning krävs för att leken ska vara spelbar` |
| Purpose | `Välj minst ett syfte` |
| Steps/description | `Lägg till minst ett steg eller en fullständig beskrivning` |
| Role private | `Hemliga instruktioner krävs för varje roll` |
| Role min/max | `Min kan inte vara större än max` |

### 8.5 Quality Checklist Copy

| State | Title |
|-------|-------|
| Utkast | `Grundkrav (Utkast)` |
| Spelbar | `Redo att testas (Spelbar)` |
| Publicerbar | `Redo att publiceras` |

| Item | Label (unchecked) | Label (checked) |
|------|-------------------|-----------------|
| Name | `Lägg till namn` | `Namn ✓` |
| Short desc | `Lägg till kort beskrivning` | `Kort beskrivning ✓` |
| Purpose | `Välj syfte` | `Syfte ✓` |
| Steps | `Lägg till steg` | `Steg ✓` |
| All required | `Fyll i alla obligatoriska fält` | `Alla krav uppfyllda ✓` |

### 8.6 Play Mode Selector Copy

**Enkel:**
- Title: `Enkel lek`
- Subtitle: `Klassisk lek med steg`
- Description: `Perfekt för snabba lekar. Lägg till steg, material och säkerhetstips.`

**Ledd:**
- Title: `Ledd aktivitet`
- Subtitle: `Med faser och tidsstyrning`
- Description: `För strukturerade workshops. Inkluderar timer, teleprompter och fasstyrning.`

**Deltagare:**
- Title: `Deltagarlek`
- Subtitle: `Med roller och digital tavla`
- Description: `För mordmysterier och rollspel. Deltagare får hemliga kort via sina mobiler.`

### 8.7 Guidance Microcopy

| Location | Copy |
|----------|------|
| Mode selector hint | `💡 Osäker? Börja enkelt – du kan uppgradera senare.` |
| Step editor hint | `💡 Tips: Använd ledarskript för att ge ordagrant vad ledaren ska säga.` |
| Role editor hint | `💡 Hemliga instruktioner syns bara för den som får rollen.` |
| Timer hint | `💡 Trafikljuset visar grönt → gult → rött när tiden börjar ta slut.` |
| Publish gate info | `💡 Du kan avpublicera när som helst från Inställningar.` |

### 8.8 Action Buttons

| Action | Label |
|--------|-------|
| Add step | `+ Lägg till steg` |
| Add from template | `+ Lägg till från mall` |
| Add material | `+ Lägg till material` |
| Add safety note | `+ Lägg till säkerhetsnotering` |
| Add inclusion tip | `+ Lägg till inkluderingstips` |
| Add phase | `+ Lägg till fas` |
| Add role | `+ Ny roll` |
| Save step | `Spara steg` |
| Save role | `Spara roll` |
| Cancel | `Avbryt` |
| Publish now | `Publicera nu` |
| AI translate | `AI-översätt` |

---

## 9. Visual Direction

### 9.1 Layout & Spacing

Follow existing [ADMIN_DESIGN_SYSTEM.md](admin/ADMIN_DESIGN_SYSTEM.md):

- Page padding: `px-4 lg:px-8`, `pt-6 pb-10`
- Section gaps: `gap-6` or `gap-8`
- Card padding: `p-4` to `p-6`
- Form field spacing: `space-y-4`

### 9.2 Color Usage

| Element | Color |
|---------|-------|
| Primary actions | `bg-primary` (#8661ff) |
| Section nav active | `text-primary`, `bg-primary/10` |
| Checklist complete | `text-emerald-600` with checkmark |
| Checklist incomplete | `text-muted-foreground` |
| Error states | `text-destructive` (red-500) |
| Warnings | `text-amber-600` |
| Info hints | `text-blue-600` with 💡 |

### 9.3 Cards & Containers

- Section cards: `Card variant="elevated"` with shadow
- List items: Subtle border, hover state `bg-muted/50`
- Mode selector cards: `ring-2 ring-primary` when selected
- Role cards: Colored top border based on role type

### 9.4 Typography

- Section titles: `text-lg font-semibold`
- Form labels: `text-sm font-medium`
- Hints/help text: `text-sm text-muted-foreground`
- Error messages: `text-sm text-destructive`

### 9.5 Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Contrast | All text meets WCAG AA (4.5:1 for normal, 3:1 for large) |
| Focus states | Visible `ring-2 ring-primary/50` on all interactive elements |
| Keyboard nav | Full keyboard support, logical tab order |
| Touch targets | Minimum 44×44px for all buttons/controls |
| Screen readers | Proper labels, ARIA attributes, announcements |
| Motion | Respect `prefers-reduced-motion` |

---

## 10. Edge Cases & Migration

### 10.1 Migrating Old Games

**Scenario:** Existing games created with current modal (no steps, no roles).

**Solution:**
1. All existing games default to `play_mode = 'basic'`
2. When opened in builder, show only standard sections
3. If user selects advanced mode, new tables are populated
4. No data loss—old `description` field remains

**Visual indicator:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ℹ️ Äldre lek                                                      │
│  Denna lek skapades innan steg-redigering. Du kan lägga till      │
│  steg manuellt eller behålla beskrivningen som den är.            │
│                                                [Lägg till steg →] │
└────────────────────────────────────────────────────────────────────┘
```

### 10.2 Mode Downgrade Warning

**Scenario:** User has roles defined, then switches to "Enkel" mode.

**Solution:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ⚠️ Byt spelläge?                                                  │
│                                                                    │
│  Du har definierat 3 roller. Om du byter till "Enkel lek" kommer  │
│  rollerna att döljas (inte raderas).                              │
│                                                                    │
│  Du kan alltid byta tillbaka till "Deltagarlek" för att se dem    │
│  igen.                                                             │
│                                                                    │
│                          [Avbryt]  [Byt ändå]                     │
└────────────────────────────────────────────────────────────────────┘
```

### 10.3 Incomplete Translation Publish Warning

**Scenario:** User publishes with 0% Norwegian translation.

**Solution:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ⚠️ Ofullständiga översättningar                                   │
│                                                                    │
│  🇳🇴 Norska: 0% översatt                                          │
│  🇬🇧 Engelska: 0% översatt                                        │
│                                                                    │
│  Leken kommer endast visas för svenskspråkiga användare tills     │
│  översättningar är klara.                                          │
│                                                                    │
│                   [Översätt först]  [Publicera ändå]              │
└────────────────────────────────────────────────────────────────────┘
```

### 10.4 Autosave Conflict

**Scenario:** User has tab open, another user edits same game.

**Solution:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ⚠️ Leken har ändrats                                              │
│                                                                    │
│  Någon annan har redigerat denna lek sedan du öppnade den.        │
│                                                                    │
│  [Ladda om (förlora mina ändringar)]  [Behåll mina ändringar]    │
└────────────────────────────────────────────────────────────────────┘
```

### 10.5 Template Starter Library

For common game patterns, offer templates:

```
┌────────────────────────────────────────────────────────────────────┐
│  Börja med en mall                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ 🎯 Uppvärm-  │  │ 🎭 Mord-     │  │ 🤝 Samarbets-│            │
│  │ ningslek    │  │ mysterium   │  │ övning      │            │
│  │             │  │             │  │             │            │
│  │ 3 steg      │  │ 5 roller    │  │ 4 faser     │            │
│  │ Enkel       │  │ Deltagare   │  │ Ledd        │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                    │
│  eller [Börja från tomt]                                          │
└────────────────────────────────────────────────────────────────────┘
```

---

## 11. Summary

This unified Game Builder enables:

1. **Fast simple games** — Name + description + steps in under 2 minutes
2. **Gradual complexity** — Mode selector reveals advanced modules
3. **Clear quality gates** — Visual checklist guides toward publishable state
4. **Never lose work** — Autosave + explicit publish action
5. **Future-proof** — Roles and public board ready for Participants Domain

**Key implementation priorities:**
1. Full-page builder route with section navigation
2. Step editor with drag-and-drop
3. Play mode selector with progressive disclosure
4. Quality checklist component
5. Autosave mechanism
6. Role cards editor (for advanced mode)
7. Translation completeness UI

---

*End of specification*
