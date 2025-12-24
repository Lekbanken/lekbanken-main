# 🚀 Legendary Play – Implementation Plan

> MVP & Phase 2 Roadmap  
> Version 1.0 | December 2024

---

## 📊 Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| **MVP** | 3-4 sprints | Core functionality, ship fast |
| **Phase 2** | 2-3 sprints | Polish, advanced features |

---

## 🎯 MVP (Sprint 1-4)

### Sprint 1: Foundation & Typewriter

**Goal**: Core presentation layer components

#### Week 1-2: Typewriter Text Reveal

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Create `TypewriterText` component | P0 | 4h | ✅ |
| Normal speed only (40 cps) | P0 | 2h | ✅ |
| Host skip button | P0 | 2h | ✅ |
| Progress bar indicator | P1 | 2h | ✅ |
| Reduced motion support | P0 | 1h | ✅ |
| Integration with Wall/Board | P0 | 4h | ⬜ |

**Files created:**
```
components/play/
├── TypewriterText.tsx          ✅
├── CountdownOverlay.tsx        ✅
└── hooks/
    ├── index.ts                ✅
    ├── useTypewriter.ts        ✅
    └── useCountdown.ts         ✅

app/sandbox/play/
└── page.tsx                    ✅
```

**Component API (MVP):**
```typescript
interface TypewriterTextProps {
  text: string;
  speed?: 'normal';           // MVP: only normal
  onComplete?: () => void;
  showProgress?: boolean;
  allowSkip?: boolean;        // Host only
  onSkip?: () => void;
}
```

---

### Sprint 2: Countdown Overlay

**Goal**: Transition ritual for state changes

#### Week 3-4: Countdown System

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Create `CountdownOverlay` component | P0 | 4h | ✅ |
| Fixed durations (3s/5s) | P0 | 1h | ✅ |
| Host skip functionality | P0 | 2h | ✅ |
| Pulse animation | P1 | 2h | ✅ |
| Reduced motion fallback | P0 | 1h | ✅ |
| Integration with step/phase changes | P0 | 4h | ⬜ |

**Files to create:**
```
components/play/
├── CountdownOverlay.tsx
├── CountdownOverlay.module.css
└── hooks/
    └── useCountdown.ts
```

**Component API (MVP):**
```typescript
interface CountdownOverlayProps {
  duration: 3 | 5;            // Fixed options
  message?: string;
  onComplete: () => void;
  allowHostSkip?: boolean;
  onSkip?: () => void;
}
```

---

### Sprint 3: PIN Keypad

**Goal**: Escape room puzzle primitive

#### Week 5-6: Keypad System

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Create `Keypad` component | P0 | 6h | ✅ |
| Numeric layout (0-9) | P0 | 2h | ✅ |
| Code dot display | P0 | 2h | ✅ |
| Wrong code shake animation | P1 | 2h | ✅ |
| Correct code success state | P0 | 2h | ✅ |
| Haptic feedback (vibration API) | P2 | 1h | ✅ |
| Extend Artifact model for keypad type | P0 | 4h | ⬜ |
| Host configuration UI | P0 | 6h | ⬜ |
| Keypad artifact rendering | P0 | 4h | ⬜ |

**Files created:**
```
types/
└── keypad.ts                   ✅

components/play/
├── Keypad.tsx                  ✅
├── KeypadDisplay.tsx           ✅
└── hooks/
    └── useKeypad.ts            ✅
```

**Component API (MVP):**
```typescript
interface KeypadProps {
  codeLength: number;
  correctCode: string;
  onSuccess: () => void;
  onAttempt?: (code: string) => void;
  disabled?: boolean;
}

interface KeypadArtifact {
  type: 'keypad';
  config: {
    correctCode: string;
    codeLength: number;
    buttonLayout: 'numeric';  // MVP: only numeric
    onSuccessTrigger?: string;
  };
  state: 'locked' | 'unlocked';
}
```

**Database Migration:**
```sql
-- Extend artifacts table
ALTER TABLE artifacts 
ADD COLUMN keypad_config JSONB;

-- Add constraint for keypad type
ALTER TABLE artifacts
ADD CONSTRAINT valid_keypad_config 
CHECK (
  type != 'keypad' OR keypad_config IS NOT NULL
);
```

---

### Sprint 4: Trigger System (Basic) + Lobby Redesign

**Goal**: Simple automation + improved host UX

#### Week 7-8: Triggers MVP

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Create `triggers` database table | P0 | 2h | ⬜ |
| Trigger types definition | P0 | 2h | ✅ |
| Step/Phase conditions only | P0 | 4h | ✅ |
| Reveal/Hide artifact actions | P0 | 4h | ✅ |
| Single action per trigger | P0 | 2h | ✅ |
| Host trigger list view | P0 | 4h | ✅ |
| Create trigger UI (2-step wizard) | P0 | 6h | ✅ |
| Trigger evaluation on events | P0 | 6h | ✅ |
| Manual enable/disable | P0 | 2h | ✅ |

**Files created:**
```
types/
└── trigger.ts                  ✅

components/play/
├── TriggerList.tsx             ✅
├── TriggerCard.tsx             ✅
├── TriggerWizard.tsx           ✅
└── hooks/
    └── useTrigger.ts           ✅
```

app/api/triggers/
├── route.ts
└── [triggerId]/
    └── route.ts
```

**Database Schema:**
```sql
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_template_id UUID REFERENCES session_templates(id),
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  
  -- Condition (MVP: step/phase only)
  condition_type VARCHAR(50) NOT NULL,
  condition_config JSONB NOT NULL,
  
  -- Action (MVP: single action)
  action_type VARCHAR(50) NOT NULL,
  action_config JSONB NOT NULL,
  
  -- Execution
  execute_once BOOLEAN DEFAULT true,
  fired_at TIMESTAMPTZ,
  fired_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_triggers_template ON triggers(session_template_id);
CREATE INDEX idx_triggers_enabled ON triggers(enabled) WHERE enabled = true;
```

#### Week 7-8: Lobby Redesign

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| New lobby navigation structure | P0 | 4h | ✅ |
| 5-section hub layout | P0 | 6h | ✅ |
| Participants section | P0 | 4h | ✅ |
| Roles section | P0 | 4h | ⬜ |
| Content Preview section | P1 | 4h | ✅ |
| Triggers section | P0 | 2h | ✅ |
| Settings section | P0 | 2h | ⬜ |
| Readiness badges/indicators | P1 | 3h | ✅ |
| Mobile-optimized tap targets | P0 | 2h | ✅ |

**Files created:**
```
types/
└── lobby.ts                    ✅

components/play/
├── LobbyHub.tsx                ✅
├── ReadinessBadge.tsx          ✅
└── lobby/
    ├── index.ts                ✅
    ├── ParticipantsSection.tsx ✅
    └── ContentPreviewSection.tsx ✅
```

---

## 🎨 Phase 2 (Sprint 5-7)

### Sprint 5: Typewriter & Countdown Enhancements

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Speed presets (Fast/Normal/Dramatic) | P1 | 3h | ⬜ |
| Participant skip option (configurable) | P1 | 2h | ⬜ |
| Sound tick (optional, off by default) | P2 | 4h | ⬜ |
| Story Overlay mode (fullscreen) | P1 | 4h | ⬜ |
| Custom countdown durations | P1 | 2h | ⬜ |
| Custom countdown messages | P1 | 2h | ⬜ |
| Theme variations (dark/dramatic) | P2 | 3h | ⬜ |

**Updated Component API:**
```typescript
interface TypewriterTextProps {
  text: string;
  speed?: 'fast' | 'normal' | 'dramatic';
  onComplete?: () => void;
  showProgress?: boolean;
  allowSkip?: boolean;
  allowParticipantSkip?: boolean;  // NEW
  soundEnabled?: boolean;           // NEW
  onSkip?: () => void;
}

interface CountdownOverlayProps {
  duration: number;                 // Any number now
  message?: string;
  variant?: 'default' | 'dramatic'; // NEW
  onComplete: () => void;
  allowHostSkip?: boolean;
  onSkip?: () => void;
}
```

---

### Sprint 6: Keypad Enhancements

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Custom symbol buttons | P1 | 4h | ⬜ |
| Alphabetic layout (A-Z) | P1 | 3h | ⬜ |
| Attempt limits (configurable) | P1 | 3h | ⬜ |
| Cooldown after failed attempts | P1 | 2h | ⬜ |
| Lock animation on max attempts | P2 | 2h | ⬜ |
| Success sound effect | P2 | 2h | ⬜ |
| Failure sound effect | P2 | 1h | ⬜ |
| "Hint" system (optional) | P2 | 4h | ⬜ |

**Updated Schema:**
```typescript
interface KeypadConfig {
  correctCode: string;
  codeLength: number;
  buttonLayout: 'numeric' | 'alpha' | 'custom';
  customButtons?: string[];
  maxAttempts?: number;           // NEW
  cooldownSeconds?: number;       // NEW
  soundEnabled?: boolean;         // NEW
  hintText?: string;              // NEW
  onSuccessTrigger?: string;
  onFailureTrigger?: string;      // NEW
}
```

---

### Sprint 7: Triggers Advanced + Lobby Polish

| Task | Priority | Estimate | Status |
|------|----------|----------|--------|
| Multiple actions per trigger | P1 | 4h | ⬜ |
| Delay before action | P1 | 3h | ⬜ |
| Timer conditions | P1 | 4h | ⬜ |
| Keypad conditions | P1 | 3h | ⬜ |
| Send message action | P1 | 3h | ⬜ |
| Play sound action | P2 | 2h | ⬜ |
| Show countdown action | P1 | 2h | ⬜ |
| Visual trigger editor (flowchart-style) | P2 | 8h | ⬜ |
| Conflict detection warnings | P1 | 4h | ⬜ |
| Lobby templates ("Quick Setup") | P1 | 6h | ⬜ |
| Bulk role assignment | P1 | 4h | ⬜ |

**Updated Schema:**
```typescript
interface Trigger {
  id: string;
  name: string;
  enabled: boolean;
  
  when: TriggerCondition;
  then: TriggerAction[];      // Array now (multiple actions)
  
  executeOnce: boolean;
  delaySeconds?: number;      // NEW
  priority?: number;          // NEW (for ordering)
  
  firedAt?: Date;
  firedCount: number;
}

// Extended conditions
type TriggerCondition = 
  | { type: 'step_started'; stepId: string }
  | { type: 'step_completed'; stepId: string }
  | { type: 'phase_started'; phaseId: string }
  | { type: 'phase_completed'; phaseId: string }  // NEW
  | { type: 'timer_ended'; timerId: string }      // NEW
  | { type: 'keypad_correct'; keypadId: string }  // NEW
  | { type: 'decision_resolved'; decisionId: string; outcome?: string }
  | { type: 'manual' }

// Extended actions
type TriggerAction = 
  | { type: 'reveal_artifact'; artifactId: string }
  | { type: 'hide_artifact'; artifactId: string }
  | { type: 'unlock_decision'; decisionId: string }
  | { type: 'advance_step' }
  | { type: 'advance_phase' }
  | { type: 'send_message'; message: string; style?: 'normal' | 'dramatic' }  // NEW
  | { type: 'play_sound'; soundId: string }       // NEW
  | { type: 'show_countdown'; duration: number; message?: string }  // NEW
  | { type: 'start_timer'; duration: number; name: string }
```

---

## 📁 Complete File Structure (MVP + Phase 2)

```
components/play/
├── TypewriterText.tsx
├── TypewriterText.module.css
├── CountdownOverlay.tsx
├── CountdownOverlay.module.css
├── Keypad.tsx
├── Keypad.module.css
├── KeypadConfig.tsx
├── KeypadArtifact.tsx
├── TriggerList.tsx
├── TriggerCard.tsx
├── TriggerWizard.tsx
├── TriggerConditionPicker.tsx
├── TriggerActionPicker.tsx
├── TriggerFlowEditor.tsx      # Phase 2
├── lobby/
│   ├── LobbyHub.tsx
│   ├── LobbySection.tsx
│   ├── ParticipantsSection.tsx
│   ├── RolesSection.tsx
│   ├── ContentPreviewSection.tsx
│   ├── TriggersSection.tsx
│   ├── SettingsSection.tsx
│   ├── ReadinessBadge.tsx
│   └── index.ts
├── hooks/
│   ├── useCountdown.ts
│   ├── useTypewriter.ts
│   └── useTriggers.ts
└── index.ts

types/
├── keypad.ts
├── triggers.ts
└── lobby.ts

lib/play/
├── keypad-validation.ts
├── trigger-engine.ts
├── trigger-conditions.ts
├── trigger-actions.ts
└── trigger-loop-detection.ts

app/api/
├── triggers/
│   ├── route.ts
│   └── [triggerId]/
│       └── route.ts
└── keypads/
    └── [keypadId]/
        └── validate/
            └── route.ts

supabase/migrations/
├── 20241224_add_keypad_artifacts.sql
└── 20241224_create_triggers_table.sql
```

---

## ✅ Definition of Done

### MVP Checklist

- [ ] All P0 tasks completed
- [ ] Mobile testing on iPhone 12+ equivalent
- [ ] Reduced motion tested
- [ ] Host flow tested end-to-end
- [ ] Participant flow tested end-to-end
- [ ] No console errors
- [ ] Loading states implemented
- [ ] Error states implemented

### Phase 2 Checklist

- [ ] All P1 tasks completed
- [ ] Sound effects work (when enabled)
- [ ] Multiple triggers fire correctly
- [ ] No trigger loops possible
- [ ] Lobby templates functional
- [ ] Documentation updated

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Trigger engine tests
describe('TriggerEngine', () => {
  it('evaluates step_started condition correctly')
  it('executes reveal_artifact action')
  it('respects executeOnce flag')
  it('detects infinite loops')
  it('handles disabled triggers')
});

// Keypad tests
describe('Keypad', () => {
  it('accepts correct code')
  it('rejects incorrect code')
  it('enforces attempt limits')
  it('applies cooldown after failures')
});
```

### Integration Tests

```typescript
describe('Play Session Flow', () => {
  it('shows countdown before step change')
  it('typewriter reveals text on wall')
  it('keypad unlocks artifact on correct code')
  it('trigger fires when step starts')
});
```

### Manual Testing Checklist

| Scenario | MVP | Phase 2 |
|----------|-----|---------|
| Typewriter with long text | ⬜ | ⬜ |
| Countdown during rapid navigation | ⬜ | ⬜ |
| Keypad on small screen | ⬜ | ⬜ |
| 10+ triggers in one session | ⬜ | ⬜ |
| Lobby with 8 participants | ⬜ | ⬜ |
| Slow network (3G) | ⬜ | ⬜ |

---

## 📅 Sprint Calendar

```
Sprint 1 (Weeks 1-2):   Typewriter           → Demo: Text reveal on Wall
Sprint 2 (Weeks 3-4):   Countdown            → Demo: Phase transition
Sprint 3 (Weeks 5-6):   Keypad               → Demo: Escape room puzzle
Sprint 4 (Weeks 7-8):   Triggers + Lobby     → Demo: Full MVP flow
────────────────────────────────────────────────────────────────────
Sprint 5 (Weeks 9-10):  Enhancements         → Demo: Speed/sound options
Sprint 6 (Weeks 11-12): Keypad Advanced      → Demo: Custom keypads
Sprint 7 (Weeks 13-14): Triggers Advanced    → Demo: Complex automation
```

---

## 🚨 Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Trigger loops crash session | Medium | High | Loop detection, max 10 chain depth |
| Keypad brute-forcing | Medium | Medium | Cooldown, attempt limits |
| Sound annoys users | High | Low | Off by default, easy toggle |
| Lobby too complex | Medium | Medium | Progressive disclosure, defaults |
| Mobile performance | Low | High | Lazy loading, virtualization |

---

## 📚 Related Documents

- [LEGENDARY_PLAY_ADVANCED_FEATURES.md](LEGENDARY_PLAY_ADVANCED_FEATURES.md) – Full UX specification
- [DESIGN_IMPLEMENTATION_TODO.md](DESIGN_IMPLEMENTATION_TODO.md) – UI components reference
- [GAMES_DOMAIN.md](GAMES_DOMAIN.md) – Game engine architecture

---

*Last updated: December 2024*
