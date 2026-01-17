# Adaptivt Spelläge – Designdokument

**Datum:** 2026-01-17  
**Status:** Design fas  
**Baserat på:** Game Builder `PLAY_MODE_META` i `features/admin/games/v2/types.ts`

---

## 1. Spelläges-definitioner (från Game Builder)

Följande spellägen används konsekvent genom hela systemet:

```typescript
type PlayMode = 'basic' | 'facilitated' | 'participants';
```

| Spelläge | Svenska | Kort | Beskrivning | Features |
|----------|---------|------|-------------|----------|
| `basic` | **Enkel lek** | Enkel | Traditionella lekar med steg och material. Ingen digital interaktion. | steps, materials |
| `facilitated` | **Ledd aktivitet** | Ledd | Lekar med faser, timer och eventuellt en publik tavla. | steps, materials, phases, timer, board |
| `participants` | **Deltagarlek** | Deltagare | Fullständiga interaktiva lekar med roller, artifacts och triggers. | steps, materials, phases, roles, artifacts, triggers, board |

---

## 2. UI-komponenter per spelläge

### 2.1 Enkel lek (basic)

**Användningsfall:** Traditionella lekar, korta aktiviteter, uppvärmningar

**UI-komponenter:**
```
┌─────────────────────────────────┐
│  [Lekens titel]                 │
│  ───────────────────────────    │
│  📖 Instruktioner               │
│  • Steg 1...                    │
│  • Steg 2...                    │
│  ───────────────────────────    │
│  🎲 Material                    │
│  • Item 1, Item 2               │
│  ───────────────────────────    │
│  ⏱️ Timer (valfri)              │
│  ───────────────────────────    │
│  [✓ Markera som klar]           │
└─────────────────────────────────┘
```

**Komponenter:**
- `SimplePlayHeader` – Titel + tillbaka-knapp
- `InstructionsCard` – Steg-för-steg instruktioner
- `MaterialsChecklist` – Material att förbereda
- `OptionalTimer` – Enkel timer om leken har tidsgräns
- `CompleteButton` – Avsluta leken

### 2.2 Ledd aktivitet (facilitated)

**Användningsfall:** Grupplekar med lekledare, workshops, teambuildingmoment

**UI-komponenter:**
```
┌─────────────────────────────────┐
│  [Lekens titel]       ⏱️ 12:34  │
│  Fas 2 av 4: Genomförande       │
│  ═══════════════════════════    │
│                                 │
│  📋 Nuvarande instruktion       │
│  "Dela in i grupper om 4..."    │
│                                 │
│  ───────────────────────────    │
│  👥 Deltagare: 16               │
│  ───────────────────────────    │
│                                 │
│  [◀ Föregående] [Nästa ▶]       │
│  ───────────────────────────    │
│  [📺 Visa på skärm]             │
└─────────────────────────────────┘
```

**Komponenter:**
- `FacilitatedPlayHeader` – Titel + global timer + sessionskod
- `PhaseIndicator` – Visar nuvarande fas och progress
- `CurrentInstructionCard` – Fokuserad vy för nuvarande steg
- `ParticipantCounter` – Antal deltagare
- `PhaseNavigation` – Föregående/Nästa fas-knappar
- `BoardToggle` – Öppna publik tavla i nytt fönster/fullskärm

### 2.3 Deltagarlek (participants)

**Användningsfall:** Escape rooms, mordmysterier, rollspel, tävlingar

**UI-komponenter:**
```
┌─────────────────────────────────┐
│  [Sessionskod: ABC123]  ⏱️ 45:12│
│  ═══════════════════════════    │
│                                 │
│  🏆 Lag                         │
│  ┌─────────┐ ┌─────────┐        │
│  │ Röda    │ │ Blåa    │        │
│  │ 120 pts │ │ 95 pts  │        │
│  └─────────┘ └─────────┘        │
│                                 │
│  📍 Progress: 4/7 checkpoints   │
│  ▓▓▓▓▓▓▓▓░░░░                   │
│                                 │
│  💡 Ledtrådar (2 kvar)          │
│  [Ge ledtråd]                   │
│                                 │
│  ───────────────────────────    │
│  [Hantera lag] [Artifacts]      │
│  [📺 Publik tavla]              │
└─────────────────────────────────┘
```

**Komponenter:**
- `ParticipantPlayHeader` – Sessionskod + timer + statusindikator
- `TeamScoreboard` – Lag med poäng och progress
- `ProgressTracker` – Visuell progress (checkpoints, artifacts)
- `ClueDispenser` – Hantera och skicka ledtrådar
- `TeamManagement` – Lägg till/ta bort deltagare, byt lag
- `ArtifactPanel` – Visa insamlade/ej insamlade artifacts
- `BoardController` – Kontrollera publik tavla

---

## 3. Komponenthierarki

```
PlaySessionView
├── usePlayMode(game.play_mode)
│
├── [basic] SimplePlayView
│   ├── SimplePlayHeader
│   ├── InstructionsCard
│   ├── MaterialsChecklist
│   ├── OptionalTimer
│   └── CompleteButton
│
├── [facilitated] FacilitatedPlayView
│   ├── FacilitatedPlayHeader
│   ├── PhaseIndicator
│   ├── CurrentInstructionCard
│   ├── ParticipantCounter
│   ├── PhaseNavigation
│   └── BoardToggle
│
└── [participants] ParticipantPlayView
    ├── ParticipantPlayHeader
    ├── TeamScoreboard
    ├── ProgressTracker
    ├── ClueDispenser
    ├── TeamManagement
    ├── ArtifactPanel
    └── BoardController
```

---

## 4. TypeScript-typer

```typescript
// types/play-session.ts

import type { PlayMode } from '@/features/admin/games/v2/types';

/**
 * Play session adapted to the game's play mode
 */
export interface AdaptivePlaySession {
  id: string;
  gameId: string;
  playMode: PlayMode;
  sessionCode: string;
  status: 'active' | 'paused' | 'ended';
  
  // Timer state
  timer: {
    isRunning: boolean;
    elapsedSeconds: number;
    limitSeconds: number | null;
  };
  
  // Basic mode
  completedSteps: string[];
  
  // Facilitated mode
  currentPhaseIndex: number;
  phases: PlayPhase[];
  
  // Participants mode
  teams: PlayTeam[];
  artifacts: PlayArtifact[];
  cluesRemaining: number;
  cluesGiven: PlayClue[];
}

export interface PlayPhase {
  id: string;
  title: string;
  instructions: string;
  durationMinutes: number | null;
}

export interface PlayTeam {
  id: string;
  name: string;
  color: string;
  score: number;
  participants: string[];
  completedCheckpoints: string[];
}

export interface PlayArtifact {
  id: string;
  name: string;
  imageUrl: string | null;
  collectedByTeamId: string | null;
}

export interface PlayClue {
  id: string;
  content: string;
  givenToTeamId: string;
  givenAt: string;
}
```

---

## 5. Spelläges-metadata (UI-konfiguration)

```typescript
// lib/play-modes.ts

import { PuzzlePieceIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';

export const PLAY_MODE_UI = {
  basic: {
    key: 'basic',
    label: 'Enkel lek',
    labelShort: 'Enkel',
    description: 'Traditionella lekar med steg och material. Ingen digital interaktion.',
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500/30',
    icon: PuzzlePieceIcon,
    features: ['instructions', 'materials', 'timer'],
    uiComponents: ['SimplePlayHeader', 'InstructionsCard', 'MaterialsChecklist', 'CompleteButton'],
  },
  facilitated: {
    key: 'facilitated',
    label: 'Ledd aktivitet',
    labelShort: 'Ledd',
    description: 'Lekar med faser, timer och eventuellt en publik tavla.',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500/30',
    icon: UsersIcon,
    features: ['instructions', 'materials', 'phases', 'timer', 'board', 'participants'],
    uiComponents: ['FacilitatedPlayHeader', 'PhaseIndicator', 'CurrentInstructionCard', 'PhaseNavigation', 'BoardToggle'],
  },
  participants: {
    key: 'participants',
    label: 'Deltagarlek',
    labelShort: 'Deltagare',
    description: 'Fullständiga interaktiva lekar med roller, artifacts och triggers.',
    color: 'purple',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600',
    borderClass: 'border-purple-500/30',
    icon: SparklesIcon,
    features: ['instructions', 'materials', 'phases', 'roles', 'teams', 'artifacts', 'clues', 'board', 'scoring'],
    uiComponents: ['ParticipantPlayHeader', 'TeamScoreboard', 'ProgressTracker', 'ClueDispenser', 'TeamManagement', 'ArtifactPanel', 'BoardController'],
  },
} as const;

export type PlayModeUIConfig = typeof PLAY_MODE_UI[keyof typeof PLAY_MODE_UI];
```

---

## 6. Hook för adaptivt spelläge

```typescript
// hooks/useAdaptivePlayMode.ts

import { useMemo } from 'react';
import type { PlayMode } from '@/features/admin/games/v2/types';
import { PLAY_MODE_UI } from '@/lib/play-modes';

export function useAdaptivePlayMode(playMode: PlayMode | null) {
  return useMemo(() => {
    const mode = playMode ?? 'basic';
    const config = PLAY_MODE_UI[mode];
    
    return {
      mode,
      config,
      isSimple: mode === 'basic',
      isFacilitated: mode === 'facilitated',
      isParticipant: mode === 'participants',
      hasPhases: mode !== 'basic',
      hasTeams: mode === 'participants',
      hasBoard: mode !== 'basic',
      hasArtifacts: mode === 'participants',
      hasClues: mode === 'participants',
    };
  }, [playMode]);
}
```

---

## 7. Implementation – PlaySessionView

```typescript
// features/play/components/PlaySessionView.tsx

'use client';

import type { PlayMode } from '@/features/admin/games/v2/types';
import { useAdaptivePlayMode } from '@/hooks/useAdaptivePlayMode';
import { SimplePlayView } from './SimplePlayView';
import { FacilitatedPlayView } from './FacilitatedPlayView';
import { ParticipantPlayView } from './ParticipantPlayView';

interface PlaySessionViewProps {
  sessionId: string;
  playMode: PlayMode | null;
}

export function PlaySessionView({ sessionId, playMode }: PlaySessionViewProps) {
  const { mode, isSimple, isFacilitated, isParticipant } = useAdaptivePlayMode(playMode);

  if (isSimple) {
    return <SimplePlayView sessionId={sessionId} />;
  }

  if (isFacilitated) {
    return <FacilitatedPlayView sessionId={sessionId} />;
  }

  if (isParticipant) {
    return <ParticipantPlayView sessionId={sessionId} />;
  }

  // Fallback
  return <SimplePlayView sessionId={sessionId} />;
}
```

---

## 8. Filstruktur

```
features/play/
├── components/
│   ├── PlaySessionView.tsx          # Adapter-komponent
│   ├── SimplePlayView.tsx           # basic mode
│   ├── FacilitatedPlayView.tsx      # facilitated mode
│   ├── ParticipantPlayView.tsx      # participants mode
│   │
│   ├── shared/
│   │   ├── PlayHeader.tsx
│   │   ├── PlayTimer.tsx
│   │   ├── InstructionsCard.tsx
│   │   └── MaterialsChecklist.tsx
│   │
│   ├── facilitated/
│   │   ├── PhaseIndicator.tsx
│   │   ├── PhaseNavigation.tsx
│   │   └── BoardToggle.tsx
│   │
│   └── participants/
│       ├── TeamScoreboard.tsx
│       ├── ProgressTracker.tsx
│       ├── ClueDispenser.tsx
│       ├── TeamManagement.tsx
│       ├── ArtifactPanel.tsx
│       └── BoardController.tsx
│
├── hooks/
│   ├── useAdaptivePlayMode.ts
│   ├── usePlaySession.ts
│   └── usePlayTimer.ts
│
├── types.ts
└── api.ts
```

---

## 9. Nästa steg

1. **Skapa baskomponenter:**
   - `PlaySessionView` (adapter)
   - `SimplePlayView` (enkel lek)
   - Delade komponenter (header, timer, instruktioner)

2. **Integrera med SessionCard:**
   - Visa spelläge-badge på sessionskort
   - Länka till rätt vy baserat på `play_mode`

3. **Implementera FacilitatedPlayView:**
   - Fas-navigation
   - Timer per fas
   - Publik tavla-länk

4. **Implementera ParticipantPlayView:**
   - Lag-hantering
   - Poängräkning
   - Ledtråds-system
   - Artifact-tracking

---

*Designdokument skapat baserat på PLAY_MODE_META i Game Builder.*
