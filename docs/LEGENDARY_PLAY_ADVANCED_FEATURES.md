# 🎮 Legendary Play – Advanced Gameplay & Immersion Features

> UX Specification & System Design  
> Version 1.0 | December 2024

---

## 📋 Executive Summary

### Why These Features Matter Together

These five features form a **cohesive immersion layer** that transforms Legendary Play from a session management tool into a **theatrical game engine**. They work together to create:

| Feature | Role in System |
|---------|----------------|
| **Typewriter Reveal** | Controls **attention pacing** |
| **PIN Keypad** | Enables **tactile puzzle mechanics** |
| **Trigger System** | Provides **automation intelligence** |
| **Lobby Redesign** | Ensures **confident host setup** |
| **Countdown Overlay** | Creates **anticipation rhythm** |

**The unified experience goal**: Participants feel like they're inside a polished game, not a web form. Hosts feel empowered and in control, not overwhelmed.

### Design Principles Applied

1. **Mobile-first, thumb-zone optimized** – All critical actions within natural reach
2. **Progressive disclosure** – Complexity revealed only when needed
3. **Predictable rhythm** – Transitions are announced, never jarring
4. **Silent automation** – Triggers work invisibly for participants
5. **Graceful degradation** – Works with reduced-motion, slow connections

---

## 🎯 Feature 1: Typewriter / Text Reveal

### UX Concept

Transform static text reveals into **cinematic moments** by animating message appearance character-by-character. This creates:

- **Synchronized reading** across all participants
- **Dramatic tension** during story beats
- **Focus anchoring** on the current content

### Visual Design

```
┌─────────────────────────────────────┐
│                                     │
│   🎭 STORY MOMENT                   │
│                                     │
│   "The door creaks open,            │
│    revealing a dimly lit█           │
│                                     │
│   ─────────────────────────         │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  62%     │
│                                     │
│   [ HOST: ⏭️ Skip ]                 │
│                                     │
└─────────────────────────────────────┘
```

### Mobile Interaction Pattern

| Element | Behavior |
|---------|----------|
| **Text area** | Full-width, large readable font (18px min) |
| **Progress indicator** | Thin bar at bottom, non-intrusive |
| **Cursor** | Subtle blinking block `█` at insertion point |
| **Skip button** | Host-only, bottom-left (thumb zone) |
| **Pause** | Host tap anywhere on text area |

### Speed Presets

| Mode | Characters/sec | Use Case |
|------|----------------|----------|
| **Fast** | 80 cps | Quick instructions, low drama |
| **Normal** | 40 cps | Standard narrative |
| **Dramatic** | 15 cps | Key reveals, tension moments |
| **Instant** | ∞ | Accessibility fallback |

### Host Controls (Mobile)

```
┌─────────────────────────────────────┐
│  📝 Message Options                 │
│                                     │
│  Speed:  [Fast] [Normal] [Dramatic] │
│                                     │
│  ☑️ Allow participants to skip      │
│  ☐ Play sound tick                  │
│  ☑️ Show progress bar               │
│                                     │
│  [ Preview ]  [ Send to Wall ]      │
└─────────────────────────────────────┘
```

### Accessibility Considerations

| Concern | Solution |
|---------|----------|
| **Reduced motion** | Detect `prefers-reduced-motion`, show text instantly |
| **Screen readers** | Announce full text immediately (aria-live) |
| **Cognitive load** | Progress bar shows remaining, reduces anxiety |
| **Slow readers** | Text remains visible after completion indefinitely |

### Sound Design (Optional)

- **Tick sound**: Soft, mechanical typewriter click
- **Frequency**: Every 3rd character (not every character – too noisy)
- **Volume**: 20% of system volume
- **Disable**: Per-participant preference, respects device silent mode

### Where It Lives in UI

| Context | Implementation |
|---------|----------------|
| **Wall/Board** | Inline reveal within message bubble |
| **Story Overlay** | Full-screen modal for major moments |
| **Decision reveal** | Applied to decision question text |

**Recommendation**: Use **Story Overlay** for dramatic moments (Phase changes), **inline** for regular messages.

### Preventing Annoyance

| Risk | Mitigation |
|------|------------|
| **Too slow** | Host can skip anytime |
| **Repetitive** | Auto-disable after 3 consecutive messages in 30s |
| **Breaks flow** | "Quick mode" toggle in session settings |
| **Mobile data** | Text sent as single payload, animation is client-side |

### Technical Notes

```typescript
interface TypewriterConfig {
  speed: 'fast' | 'normal' | 'dramatic' | 'instant';
  allowParticipantSkip: boolean;
  showProgress: boolean;
  soundEnabled: boolean;
  onComplete?: () => void;
}

// Client-side only – no server streaming needed
// Text arrives complete, animation is purely presentational
```

---

## 🔐 Feature 2: PIN Code / Keypad System

### UX Concept

A **self-contained puzzle primitive** that creates escape-room moments. The keypad is a first-class game element, not a form input.

### Visual Design – Default Numeric Keypad

```
┌─────────────────────────────────────┐
│                                     │
│   🔒 Enter the Code                 │
│                                     │
│   ┌─────────────────────────┐       │
│   │    ●  ●  ●  ○  ○  ○     │       │
│   └─────────────────────────┘       │
│                                     │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │  1  │ │  2  │ │  3  │          │
│   └─────┘ └─────┘ └─────┘          │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │  4  │ │  5  │ │  6  │          │
│   └─────┘ └─────┘ └─────┘          │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │  7  │ │  8  │ │  9  │          │
│   └─────┘ └─────┘ └─────┘          │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │  ⌫  │ │  0  │ │  ✓  │          │
│   └─────┘ └─────┘ └─────┘          │
│                                     │
└─────────────────────────────────────┘
```

### Mobile Interaction Pattern

| Element | Size | Behavior |
|---------|------|----------|
| **Keypad buttons** | 64×64px minimum (exceeds 44px requirement) |
| **Button spacing** | 12px gaps for fat-finger tolerance |
| **Code dots** | 20px diameter, clear filled/empty states |
| **Haptic feedback** | Light tap on each button press |
| **Submit** | Explicit confirm button OR auto-submit on last digit |

### One-Handed Usage (Right Thumb Zone)

```
   Safe Zone for Thumb
   ┌─────────────────┐
   │     ░░░░░░░░░   │  ← Display area (read only)
   │     ░░░░░░░░░   │
   │                 │
   │   ┌───┬───┬───┐ │
   │   │ 1 │ 2 │ 3 │ │  ← Easy reach
   │   ├───┼───┼───┤ │
   │   │ 4 │ 5 │ 6 │ │  ← Natural zone
   │   ├───┼───┼───┤ │
   │   │ 7 │ 8 │ 9 │ │  ← Comfortable
   │   ├───┼───┼───┤ │
   │   │ ⌫ │ 0 │ ✓ │ │  ← Primary actions
   │   └───┴───┴───┘ │
   └─────────────────┘
```

### System Primitive Classification

**Recommendation**: Keypad is a **new Artifact type**, not a Decision.

| Primitive | Why/Why Not |
|-----------|-------------|
| **Artifact** ✅ | Can be placed, revealed, hidden, has state |
| **Decision** ❌ | Decisions are choices, not puzzles |
| **New primitive** ⚠️ | Overhead not justified; Artifact is extensible |

```typescript
interface KeypadArtifact {
  type: 'keypad';
  config: {
    correctCode: string;          // "1234" or "ABCD"
    codeLength: number;           // Visual hint for participants
    buttonLayout: 'numeric' | 'alpha' | 'custom';
    customButtons?: string[];     // ['🔴', '🟢', '🔵', '🟡']
    maxAttempts?: number;         // null = unlimited
    attemptsUsed: number;
    onSuccess: TriggerRef;        // Links to Trigger system
    onFailure?: TriggerRef;       // Optional: lock after max attempts
  };
  state: 'locked' | 'unlocked' | 'disabled';
}
```

### Feedback States

| State | Visual | Sound | Haptic |
|-------|--------|-------|--------|
| **Button press** | Brief highlight | Soft click | Light tap |
| **Digit entered** | Dot fills | None | None |
| **Wrong code** | Dots shake, clear | Subtle buzz | Double tap |
| **Correct code** | Dots turn green, expand | Success chime | Strong pulse |
| **Locked out** | Keypad dims | Lock sound | None |

### Wrong Code UX (Anti-Frustration)

```
Wrong Input Behavior:
┌─────────────────────────────────────┐
│                                     │
│   🔒 Enter the Code                 │
│                                     │
│        ○  ○  ○  ○  ○  ○             │
│       ← shake animation →           │
│                                     │
│   Attempts: 2 of 5 remaining        │  ← Only if limited
│                                     │
│   [ Keypad remains active ]         │
│                                     │
└─────────────────────────────────────┘
```

**Critical**: Never show "Wrong!" as an error message. Just:
1. Shake the dots subtly (200ms)
2. Clear the input
3. If attempts limited, show remaining count

### Brute-Force Prevention

| Method | Implementation |
|--------|----------------|
| **Attempt limits** | Configurable (3, 5, 10, unlimited) |
| **Cooldown** | After 3 wrong: 5-second lockout, escalating |
| **No hints** | Never indicate "X digits correct" |
| **Rate limiting** | Max 1 attempt per 2 seconds (client-enforced) |

### Host Configuration UI

```
┌─────────────────────────────────────┐
│  🔐 Keypad Configuration            │
│                                     │
│  Correct Code: [••••••] 👁️          │
│                                     │
│  Code Length: [6] digits            │
│                                     │
│  Layout:                            │
│  (•) Numbers 0-9                    │
│  ( ) Letters A-Z                    │
│  ( ) Custom symbols                 │
│                                     │
│  Attempts: [Unlimited ▾]            │
│                                     │
│  On Success:                        │
│  [ 🎯 Select Trigger... ]           │
│                                     │
│  [ Test Keypad ]  [ Save ]          │
└─────────────────────────────────────┘
```

---

## ⚡ Feature 3: Trigger System

### UX Concept

A **declarative rules engine** that makes games feel alive. Hosts define "when X happens, do Y" without writing code.

### Mental Model: Recipe Cards, Not Code

Present triggers as **simple recipe cards**, not a flowchart or code editor.

```
┌─────────────────────────────────────┐
│  ⚡ Trigger: "Unlock the Vault"     │
│                                     │
│  WHEN: Keypad "Safe" → Correct      │
│  THEN: Reveal Artifact "Secret Map" │
│                                     │
│  Status: ● Armed                    │
│                                     │
│  [ Edit ] [ Disable ] [ Delete ]    │
└─────────────────────────────────────┘
```

### Trigger Structure

```typescript
interface Trigger {
  id: string;
  name: string;                    // Human-readable
  enabled: boolean;
  
  when: TriggerCondition;          // Single condition (v1)
  then: TriggerAction[];           // One or more actions
  
  // Execution control
  executeOnce: boolean;            // Disable after firing
  delaySeconds?: number;           // Optional delay before action
  
  // Audit
  firedAt?: Date;
  firedCount: number;
}

type TriggerCondition = 
  | { type: 'step_started'; stepId: string }
  | { type: 'step_completed'; stepId: string }
  | { type: 'phase_started'; phaseId: string }
  | { type: 'decision_resolved'; decisionId: string; outcome?: string }
  | { type: 'timer_ended'; timerId: string }
  | { type: 'artifact_unlocked'; artifactId: string }
  | { type: 'keypad_correct'; keypadId: string }
  | { type: 'manual'; }            // Host-triggered only

type TriggerAction = 
  | { type: 'reveal_artifact'; artifactId: string }
  | { type: 'hide_artifact'; artifactId: string }
  | { type: 'unlock_decision'; decisionId: string }
  | { type: 'advance_step' }
  | { type: 'advance_phase' }
  | { type: 'start_timer'; duration: number; name: string }
  | { type: 'send_message'; message: string; style: 'normal' | 'dramatic' }
  | { type: 'play_sound'; soundId: string }
  | { type: 'show_countdown'; duration: number; message: string }
```

### Host Configuration UI (Mobile)

**List View – Trigger Overview**

```
┌─────────────────────────────────────┐
│  ⚡ Triggers (4)           [ + Add ]│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ● Act 2 Unlock                  ││
│  │ When: Phase 1 ends              ││
│  │ Then: Reveal "Hidden Door"      ││
│  │                        [Armed]  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ○ Safe Combination              ││
│  │ When: Keypad correct            ││
│  │ Then: Unlock Decision "Escape"  ││
│  │                     [Disabled]  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ✓ Timer Warning                 ││
│  │ When: Timer ends                ││
│  │ Then: Send dramatic message     ││
│  │                        [Fired]  ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

**Create/Edit View – Step by Step**

```
Step 1: What triggers it?
┌─────────────────────────────────────┐
│  WHEN...                            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │  📍 Step starts/completes       ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  🎭 Phase changes               ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  🗳️ Decision is made            ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  ⏱️ Timer ends                  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  🔐 Keypad solved               ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  🎯 Manual (host button)        ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘

Step 2: What happens?
┌─────────────────────────────────────┐
│  THEN...                            │
│                                     │
│  [ + Add Action ]                   │
│                                     │
│  1. 📦 Reveal "Secret Map"      [×] │
│  2. 💬 Send message             [×] │
│     "The path is revealed..."       │
│                                     │
│  ☐ Add 5-second delay before action │
│  ☑️ Only trigger once                │
│                                     │
│  [ Cancel ]           [ Save ]      │
└─────────────────────────────────────┘
```

### Safeguards Against Problems

| Problem | Prevention |
|---------|------------|
| **Infinite loops** | Actions cannot trigger same condition type |
| **Conflicting triggers** | Warn if two triggers modify same resource |
| **Lost triggers** | Disabled triggers remain visible |
| **Unexpected behavior** | "Test Trigger" button in host view |

### Loop Prevention Algorithm

```typescript
function validateTrigger(trigger: Trigger, allTriggers: Trigger[]): ValidationResult {
  const actionTypes = trigger.then.map(a => a.type);
  
  // Check if any action could cause this trigger to fire again
  for (const action of trigger.then) {
    const potentialConditions = getConditionsTriggeredBy(action);
    if (potentialConditions.includes(trigger.when.type)) {
      return { valid: false, error: 'This trigger might cause an infinite loop' };
    }
  }
  
  return { valid: true };
}
```

### Host Visibility During Session

```
┌─────────────────────────────────────┐
│  ⚡ Active Triggers                 │
│                                     │
│  ● Waiting: 3 triggers armed        │
│  ✓ Fired: 2 triggers completed      │
│  ○ Disabled: 1 trigger              │
│                                     │
│  [ View All ] [ Manual Trigger ▾ ]  │
└─────────────────────────────────────┘
```

### Minimal Viable Version (MVP)

| MVP (Ship First) | Phase 2 (Later) |
|------------------|-----------------|
| Step/Phase conditions | Timer conditions |
| Reveal/Hide artifact | Sound effects |
| Single action per trigger | Multiple actions |
| Manual enable/disable | Conditional logic (AND/OR) |
| Basic validation | Visual flowchart view |

---

## 📱 Feature 4: Lobby Menu Redesign

### Current Problem Analysis

```
Current (Problematic):
┌─────────────────────────────────────┐
│  ⚙️ Session Settings                │
│  ├─ Participants (3)                │
│  ├─ Roles                           │
│  ├─ Timing                          │
│  ├─ Visibility                      │
│  ├─ Permissions                     │
│  ├─ Content                         │
│  ├─ Advanced                        │
│  └─ ... (scrolling required)        │
└─────────────────────────────────────┘

Problems:
- Too many items in one menu
- Important items buried
- No visual priority
- Hard to tap on mobile
```

### Recommended Navigation Structure

**Hub-and-Spoke Model** – Clear primary sections with focused sub-views.

```
New Lobby Structure:
┌─────────────────────────────────────┐
│                                     │
│  🎮 Session: "Murder Mystery"       │
│  Status: Ready to Start             │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👥 Participants          3/8  → ││
│  │ View, invite, manage roles      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🎭 Roles & Secrets            → ││
│  │ Assign characters and info      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📋 Content Preview            → ││
│  │ Steps, phases, artifacts        ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ⚡ Triggers & Automation       → ││
│  │ 4 triggers configured           ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ⚙️ Session Settings           → ││
│  │ Timing, permissions, advanced   ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │       ▶️ START SESSION          ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Visual Hierarchy

| Priority | Element | Visual Treatment |
|----------|---------|------------------|
| **1** | Start Session button | Large, primary color, bottom fixed |
| **2** | Participants section | Top position, always visible count |
| **3** | Content readiness | Warning badges if incomplete |
| **4** | Settings | Smaller, less prominent |

### Readiness Indicators

```
Readiness States:
┌─────────────────────────────────────┐
│ 👥 Participants              3/8    │
│ ⚠️ 2 participants without roles     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📋 Content Preview            ✓     │
│ All steps configured                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚡ Triggers                   ●     │
│ 1 trigger has conflict              │
└─────────────────────────────────────┘
```

### Mobile Navigation Depth

**Rule**: Maximum 2 taps to any setting.

```
Tap 1: Lobby → Participants Section
Tap 2: Participants → Assign Role to User

NOT:
Tap 1: Lobby → Settings
Tap 2: Settings → Participants
Tap 3: Participants → Roles
Tap 4: Roles → Assign
```

### Section Detail Views

**Participants Section (Example)**

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  👥 Participants (3/8)              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👤 Anna S.             🎭 Host  ││
│  │    Role: Game Master            ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👤 Erik L.          🎭 Assigned ││
│  │    Role: Detective              ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 👤 Maria K.          ⚠️ No role ││
│  │    Tap to assign                ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [ 📤 Invite More ]  [ 🔀 Random ]  │
│                                     │
└─────────────────────────────────────┘
```

### Avoiding "Settings Fatigue"

| Pattern | Implementation |
|---------|----------------|
| **Smart defaults** | Pre-configure sensible settings |
| **Progressive disclosure** | "Advanced" sections collapsed |
| **Inline editing** | Change values without new screens |
| **Contextual help** | Tooltip/info icon explains options |
| **Templates** | "Quick Setup" from game template |

---

## ⏳ Feature 5: "Something Is About To Happen" Countdown

### UX Concept

A **predictable transition ritual** that prevents cognitive whiplash. Before any major state change, participants see a countdown that creates anticipation rather than surprise.

### Visual Design

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│           NÄSTA STEG                │
│           STARTAR OM                │
│                                     │
│              ╭───╮                  │
│              │ 3 │                  │
│              ╰───╯                  │
│                                     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘

Animation: Number scales down slightly, pulses
Background: Semi-transparent overlay (60% opacity)
```

### When Countdown Appears

| Event | Default Duration | Skippable |
|-------|------------------|-----------|
| **Step change** | 3 seconds | By host |
| **Phase change** | 5 seconds | By host |
| **Decision activation** | 3 seconds | By host |
| **Timer start** | 2 seconds | Never |
| **Game over** | 5 seconds | Never |

### Animation Pattern (Non-Stressful)

```
Animation Keyframes:
Second 5: Number appears, slight scale up (1.0 → 1.1)
Second 4: Number changes, subtle pulse
Second 3: Number changes, pulse
Second 2: Number changes, pulse
Second 1: Number changes, final pulse
Second 0: Fade out (200ms), new content appears
```

**Key**: Use **ease-out** curves, not jarring linear. Number should feel like it's settling, not jumping.

### Mobile Implementation

```typescript
interface CountdownConfig {
  duration: number;              // Default: 5
  message?: string;              // "Nästa steg startar om"
  size: 'compact' | 'fullscreen';
  allowHostSkip: boolean;
  onComplete: () => void;
}

// CSS (respect reduced motion)
const countdownAnimation = `
  @keyframes countdown-pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .countdown-number {
      animation: none;
    }
  }
`;
```

### Host Skip Control

```
Host View During Countdown:
┌─────────────────────────────────────┐
│                                     │
│           NÄSTA STEG                │
│           STARTAR OM                │
│                                     │
│              ╭───╮                  │
│              │ 3 │                  │
│              ╰───╯                  │
│                                     │
│         [ ⏭️ Skip Now ]             │
│                                     │
└─────────────────────────────────────┘
```

### Interaction with Other Features

| Feature | Interaction |
|---------|-------------|
| **Typewriter** | Countdown finishes → Typewriter begins |
| **Triggers** | Triggers fire AFTER countdown |
| **Timers** | Timer countdown is separate (inline) |

### When to Skip Automatically

| Context | Behavior |
|---------|----------|
| **Multiple rapid changes** | After 2nd change in 10s, reduce to 1s |
| **Host "Quick Mode"** | All countdowns reduced to 1s |
| **Manual trigger** | No countdown (host already expects it) |
| **Same-step updates** | No countdown (e.g., artifact reveal mid-step) |

### Accessibility

| Preference | Behavior |
|------------|----------|
| **Reduced motion** | Static number, no animation |
| **Screen reader** | Announce "Next step in 5 seconds" once |
| **Low vision** | High contrast number, large size |

---

## 🏗️ System Architecture Recommendation

### Primitive Classification

| Feature | Recommended Approach |
|---------|---------------------|
| **Typewriter** | **Presentation layer only** – no new backend primitive |
| **Keypad** | **New Artifact type** – `artifact.type = 'keypad'` |
| **Triggers** | **New primitive** – first-class entity with its own table |
| **Countdown** | **Presentation layer only** – no new backend primitive |
| **Lobby** | **Frontend restructure** – no backend changes |

### Data Model Extensions

```typescript
// Existing: Artifact (extend)
interface Artifact {
  id: string;
  type: 'text' | 'image' | 'link' | 'keypad';  // Add 'keypad'
  // ... existing fields
  keypadConfig?: KeypadConfig;
}

// New: Trigger
interface Trigger {
  id: string;
  sessionTemplateId: string;     // Belongs to template
  name: string;
  enabled: boolean;
  when: TriggerCondition;
  then: TriggerAction[];
  executeOnce: boolean;
  firedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Event Flow (Triggers)

```
1. Event occurs (step complete, timer end, keypad correct)
         ↓
2. Server evaluates all armed triggers for session
         ↓
3. Matching triggers fire in order (by priority or creation date)
         ↓
4. Actions execute (reveal artifact, send message, etc.)
         ↓
5. If action causes new event, repeat (with loop detection)
         ↓
6. Realtime update sent to all participants
```

---

## 📅 MVP vs Phase 2 Breakdown

### MVP (Ship First)

| Feature | Scope |
|---------|-------|
| **Typewriter** | Normal speed only, host skip, no sound |
| **Keypad** | Numeric only, unlimited attempts, one trigger |
| **Triggers** | Step/Phase conditions, reveal/hide actions, single action |
| **Lobby** | 5-section structure, readiness badges |
| **Countdown** | Fixed 3s/5s durations, host skip |

**Estimated effort**: 3-4 sprints

### Phase 2 (Iteration)

| Feature | Additions |
|---------|-----------|
| **Typewriter** | Speed presets, sound, participant skip option |
| **Keypad** | Custom symbols, attempt limits, lock animation |
| **Triggers** | Multiple actions, delays, timer conditions, visual editor |
| **Lobby** | Templates, bulk role assignment, conflict warnings |
| **Countdown** | Custom durations, custom messages, theme variations |

**Estimated effort**: 2-3 additional sprints

---

## 🚫 Red Flags & Anti-Patterns to Avoid

### UX Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| **Long animations** | Feels slow, blocks interaction | Max 500ms for any transition |
| **Sound by default** | Annoying, embarrassing in public | Sound off by default |
| **Invisible triggers** | Hosts forget what they configured | Always show trigger status |
| **Deep menu nesting** | Frustrating on mobile | Max 2 levels |
| **Instant state changes** | Jarring, confusing | Always use transition/countdown |
| **Error spam on wrong PIN** | Frustrating, not game-like | Neutral shake, no red text |

### Technical Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| **Client-side trigger logic** | Security risk, cheatable | Server evaluates all triggers |
| **Streaming typewriter text** | Complexity, latency | Send full text, animate client-side |
| **Storing PIN in plaintext** | Security risk | Hash with bcrypt before storing |
| **Synchronous trigger chains** | Performance, deadlocks | Async with timeout limits |
| **Unbounded trigger recursion** | Infinite loops | Max 10 chained triggers |

### Mobile Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| **Hover states as only affordance** | No hover on touch | Clear tap targets |
| **Small close buttons** | Hard to tap | Min 44×44px, or swipe to dismiss |
| **Fixed position keyboards** | Covers content | Native input, push content up |
| **Landscape-only features** | Most hold portrait | All features work portrait |
| **Assuming fast connection** | LTE can be spotty | Optimistic UI, offline tolerance |

---

## ✅ Summary Checklist

### Before Building

- [ ] Review this spec with stakeholders
- [ ] Confirm Trigger system scope (MVP vs full)
- [ ] Define sound asset requirements
- [ ] Audit existing Artifact model for keypad compatibility
- [ ] Design host onboarding for new features

### During Building

- [ ] Test on real mobile devices (not just simulators)
- [ ] Test with 3G throttling
- [ ] Test reduced-motion preference
- [ ] Test with 8+ participants simultaneously
- [ ] Document all trigger conditions/actions

### Before Shipping

- [ ] Host user testing (is it overwhelming?)
- [ ] Participant user testing (is it immersive?)
- [ ] Accessibility audit
- [ ] Performance profiling on mid-tier devices

---

*Document authored by Claude (Opus) | December 2024*
