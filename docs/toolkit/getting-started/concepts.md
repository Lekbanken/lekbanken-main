# Core Concepts

Understanding these core concepts will help you make the most of the Legendary Escape Room Toolkit.

---

## Games

A **Game** is a complete escape room experience that can be played multiple times. Games contain:

- **Metadata**: Name, description, time limit, player capacity
- **Phases**: Major sections of the game
- **Steps**: Content items within phases
- **Triggers**: Automated actions
- **Artifacts**: Digital props and clues

### Game States

| State | Description |
|-------|-------------|
| Draft | Game is being created/edited |
| Published | Ready to run sessions |
| Archived | No longer active |

---

## Sessions

A **Session** is a single playthrough of a game. Sessions track:

- Participant list
- Current progress (phase/step)
- Timer state
- Events and signals
- Time bank balance

### Session States

| State | Description |
|-------|-------------|
| Pending | Created but not started |
| Active | Game is running |
| Paused | Temporarily stopped |
| Ended | Game completed |
| Archived | Moved to archive |

---

## Phases

**Phases** are the major sections of your game. Think of them as acts in a play:

```
Game
├── Phase 1: Introduction
│   ├── Step 1.1: Welcome
│   └── Step 1.2: Initial clues
├── Phase 2: Investigation
│   ├── Step 2.1: First puzzle
│   ├── Step 2.2: Hidden room
│   └── Step 2.3: Key discovery
└── Phase 3: Finale
    ├── Step 3.1: Final challenge
    └── Step 3.2: Escape!
```

### Phase Properties

- **Name**: Display name
- **Description**: Internal notes
- **Time Limit**: Optional per-phase timer
- **Auto-advance**: Automatically move to next phase

---

## Steps

**Steps** are individual content items. Each step has a type:

### Step Types

| Type | Purpose | Example |
|------|---------|---------|
| Narrative | Story text | "You enter a dark room..." |
| Puzzle | Interactive challenge | "Decode the message" |
| Reveal | Show hidden content | Reveal a secret door |
| Decision | Voting/choice | "Which path do you take?" |
| Timer | Time-based event | "30 seconds to escape!" |
| Media | Image/video/audio | Show a map |

### Step Visibility

- **Visible**: Shown to all participants
- **Hidden**: Only visible when revealed by trigger
- **Host-only**: Only visible to the host

---

## Triggers

**Triggers** are automated actions that fire when conditions are met.

### Condition Types

| Type | Description |
|------|-------------|
| Time | When timer reaches X minutes |
| Signal | When specific signal is fired |
| Step | When reaching a specific step |
| Phase | When entering a phase |
| Vote | When decision voting completes |

### Action Types

| Type | Description |
|------|-------------|
| Advance | Move to next step/phase |
| Reveal | Show hidden artifact |
| Signal | Fire another signal |
| TimeBank | Add/remove time |
| Message | Display notification |
| Sound | Play audio cue |

### Example Trigger

```
IF time_remaining < 5 minutes
THEN reveal hint_clue_3
AND send_message "Hint unlocked!"
```

---

## Signals

**Signals** are events that can be fired by hosts or triggers. They enable communication between game elements.

### Built-in Signals

- `session.start` - Session begins
- `session.end` - Session ends
- `phase.enter` - Entered new phase
- `step.advance` - Moved to next step
- `hint.requested` - Participant requested help

### Custom Signals

Create custom signals for your game logic:

```
puzzle.solved
secret.discovered
team.split
alarm.triggered
```

---

## Time Bank

The **Time Bank** manages bonus and penalty time during sessions.

### Entries

| Type | Effect |
|------|--------|
| Bonus | Adds time (e.g., solved puzzle quickly) |
| Penalty | Removes time (e.g., failed attempt) |
| Hint | Removes time for using a hint |
| Adjustment | Host manual adjustment |

### Example

```
Starting time: 60:00
- Hint used:     -5:00  → 55:00
- Puzzle bonus:  +3:00  → 58:00
- Penalty:       -2:00  → 56:00
Final time: 56:00 remaining
```

---

## Artifacts

**Artifacts** are digital props and content pieces:

### Artifact Types

| Type | Description |
|------|-------------|
| Document | Text/markdown content |
| Image | Photos, maps, diagrams |
| Audio | Sound clips, voiceovers |
| Video | Video content |
| Code | Interactive code/puzzle |
| Link | External URL |

### Artifact States

- **Hidden**: Not visible until revealed
- **Visible**: Shown to participants
- **Collected**: Participant has "picked up" artifact

---

## Participants

**Participants** are the players in a session.

### Participant Properties

- **Display Name**: Shown to other participants
- **Role**: Optional team assignment
- **Status**: Connected, disconnected, completed
- **Progress**: Individual progress tracking

### Roles

Optionally assign participants to teams or roles:

- **Solo**: Each participant plays independently
- **Teams**: Participants in groups
- **Roles**: Specific character assignments

---

## Multi-tenant

The toolkit supports multiple organizations (tenants):

### Tenant Features

- Isolated data
- Custom branding
- Feature flags
- Usage quotas

### Feature Flags

Enable/disable features per tenant:

- `advanced_triggers`
- `time_bank`
- `analytics`
- `custom_themes`

---

## Next Steps

- [Creating Games](../host-guide/creating-games.md)
- [Trigger System Deep Dive](../host-guide/triggers-automation.md)
- [API Reference](../api-reference/README.md)
