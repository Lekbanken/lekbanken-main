# Game Prompting Guide (STRICT CONTRACT MODE)

**Version:** 1.0  
**Updated:** 2026-01-19  
**Reference:** [GAME_INTEGRITY_REPORT.md](../../GAME_INTEGRITY_REPORT.md)

> 📌 Denna guide är giltig för GAME_INTEGRITY_REPORT.md version 2026-01-19.  
> Om enums eller contracts ändras måste denna guide granskas.

---

## Läge

> ⚠️ **STRICT CONTRACT MODE**
>
> Denna guide körs i STRICT-läge. Alla enum-värden och metadata-nycklar MÅSTE komma från:
> - **Appendix G** (Enums) i GAME_INTEGRITY_REPORT.md
> - **Contract 4** (Canonical Metadata Keys per ArtifactType)
>
> Om du behöver ett värde som inte listas: markera det `[VERIFY_IN_REPO]` och använd det INTE förrän det är verifierat.

---

## ID-policy (för referensintegritet i specs)

- Alla `id` i YAML används för att kunna referera mellan objekt (t.ex. triggers → artifacts).
- Builder/API kan ignorera dessa och generera UUID internt.
- AI måste dock använda konsekventa `id` inom samma spec.

**Exempel:**
```yaml
artifacts:
  - id: "keypad-1"          # Client-side reference ID
    artifact_type: keypad
    ...

triggers:
  - condition_type: keypad_correct
    condition_config:
      keypadId: "keypad-1"  # References artifact above
```

---

## Omfattning: endast authoring

Denna guide täcker **authoring specs** (vad admin builder/API accepterar).

**DO NOT include runtime fields in specs:**
- ❌ `revealed_at` (set by session, not authoring)
- ❌ `session_role_id` (assigned at runtime)
- ❌ `status: 'fired'` for triggers (runtime state)

---

## Template 1: Minimum Viable Game (Basic Mode)

```yaml
game:
  name: "Mitt Första Spel"                    # REQUIRED
  short_description: "En enkel samarbetslek"  # REQUIRED
  play_mode: basic                            # REQUIRED: basic | facilitated | participants
  main_purpose_id: "<uuid>"                   # REQUIRED: Must be valid purpose
  status: draft                               # Default, change to 'published' to enable sessions

steps:                                        # REQUIRED: At least 1 step
  - title: "Introduktion"
    body: "Välkommen! Samla gruppen i en cirkel."
    duration_seconds: 60                      # Optional: null = no timer
  - title: "Aktivitet"
    body: "Börja leken enligt instruktionerna."
    duration_seconds: 300
  - title: "Avslut"
    body: "Bra jobbat! Diskutera vad ni lärde er."
```

**Required Fields:**
- `game.name` (non-empty string)
- `game.short_description` (non-empty string)
- `game.main_purpose_id` (valid UUID)
- At least 1 step with `title`

---

## Template 2: Facilitated Game (With Phases and Triggers)

```yaml
game:
  name: "Escape Room Äventyr"
  short_description: "Ett teambaserat escape room"
  play_mode: facilitated
  main_purpose_id: "<uuid>"
  min_players: 4
  max_players: 12

phases:
  - name: "Intro"
    phase_type: intro                         # See Appendix: intro | round | finale | break
    duration_seconds: 120
    auto_advance: false
  - name: "Omgång 1"
    phase_type: round
    duration_seconds: 600
  - name: "Finale"
    phase_type: finale
    duration_seconds: 300

steps:
  - title: "Samla ledtrådar"
    body: "Teamet ska hitta alla dolda ledtrådar."
    leader_script: "Ge tips om de fastnar efter 5 minuter."
    board_text: "Sök i rummet!"
  - title: "Lös gåtan"
    body: "Kombinera ledtrådarna för att knäcka koden."

artifacts:
  - id: "keypad-1"
    title: "Kodlås"
    artifact_type: keypad                     # See Appendix G.1
    metadata:
      correctCode: "1234"                     # HOST ONLY - NEVER shown to participants
      codeLength: 4
      maxAttempts: 5
      successMessage: "Koden är rätt! 🎉"

triggers:
  - name: "Kodlås löst"
    condition_type: keypad_correct            # See Appendix G.2
    condition_config:
      keypadId: "keypad-1"                    # References artifact.id above
    actions:
      - type: advance_step                    # See Appendix G.3
    execute_once: true
```

---

## Template 3: Participants/Roles Game

```yaml
game:
  name: "Mysteriet på Godset"
  short_description: "En rollspelslek med hemligheter"
  play_mode: participants
  main_purpose_id: "<uuid>"
  min_players: 5
  max_players: 10

roles:
  - id: "role-detective"
    name: "Detektiven"
    icon: "🔍"
    color: "blue"
    public_description: "Ledare för utredningen"
    private_instructions: |
      Du misstänker att Butler Johnson ljuger.
      Undersök hans alibi noga.
    private_hints: "Fråga om nyckeln till biblioteket."
    min_count: 1
    max_count: 1
    assignment_strategy: leader_picks         # random | leader_picks | player_picks

  - id: "role-butler"
    name: "Butlern"
    icon: "🎩"
    color: "gray"
    public_description: "Har arbetat på godset i 20 år"
    private_instructions: |
      Du är oskyldig men såg något misstänkt.
      Berätta bara om någon frågar direkt.
    min_count: 1
    max_count: 1
    assignment_strategy: random

  - id: "role-guest"
    name: "Gäst"
    icon: "👤"
    color: "green"
    public_description: "En av de inbjudna gästerna"
    private_instructions: "Du har inga hemligheter."
    min_count: 0
    max_count: null                           # Unlimited
    assignment_strategy: random

steps:
  - title: "Rollutdelning"
    body: "Varje deltagare får sin hemliga roll."
    participant_prompt: "Läs dina hemliga instruktioner!"
  - title: "Utredning"
    body: "Mingla och samla information."
    participant_prompt: "Prata med andra och sök ledtrådar."

artifacts:
  - id: "letter-detective"
    title: "Brevet"
    artifact_type: document
    variants:
      - title: "Till Detektiven"
        body: "Hemligt bevis som bara detektiven ser."
        visibility: role_private
        visible_to_role_id: "role-detective"  # References role.id above
      - title: "Offentlig version"
        body: "Ett mystiskt brev hittades..."
        visibility: public
```

---

## Anti-Patterns (FÖRBJUDET)

### Security

1. ❌ **Sätt ALDRIG hemligheter i `board_text`** — visas på public board utan auth
2. ❌ **Lägg aldrig rollspecifika hemligheter i `participant_prompt`** — den är inte roll-gated. Använd `private_instructions` (roll) eller `leader_script` (host) för hemligheter.
3. ❌ **Glöm inte `correctCode` i keypad metadata** — keypad fungerar inte utan

### Mode Mismatches

4. ❌ **Använd `participants` mode utan roller** — faller tyst tillbaka till basic  
   ⚠️ *Participants utan roller ger fallback utan varning i UI.*
5. ❌ **Sätt `max_count: 1` för alla roller med fler spelare** — tilldelning misslyckas
6. ❌ **Förvänta `facilitated` features utan faser** — faller tillbaka till basic

### STRICT MODE Violations

7. ❌ **Uppfinn INTE nya ArtifactType** — se Appendix G.1
8. ❌ **Uppfinn INTE nya TriggerConditionType** — se Appendix G.2
9. ❌ **Uppfinn INTE nya TriggerActionType** — se Appendix G.3
10. ❌ **Använd INTE metadata-nycklar utan att verifiera** — se Contract 4, eller markera `[VERIFY_IN_REPO]`

---

## Quick Reference: Enums

> Full lists in [GAME_INTEGRITY_REPORT.md → Appendix G](../../GAME_INTEGRITY_REPORT.md#g-enum-appendix-authoritative-values)

### ArtifactType (24 typer) — G.1

Vanligaste:
- `keypad` — Kodlås
- `riddle` — Gåta med textsvar
- `document`, `image`, `card` — Enkelt innehåll
- `audio` — Ljudfil
- `counter` — Räknare
- `qr_gate` — QR-skanning
- `hint_container` — Ledtrådar

### TriggerConditionType (29 typer) — G.2

Vanligaste:
- `step_started`, `step_completed`
- `keypad_correct`, `keypad_failed`
- `timer_ended`
- `manual` — Host-knapp
- `riddle_correct`
- `counter_reached`

### TriggerActionType (29 typer) — G.3

Vanligaste:
- `advance_step`, `advance_phase`
- `reveal_artifact`, `hide_artifact`
- `start_timer`
- `send_message`
- `reset_keypad`, `reset_riddle`

### PlayMode — G.6

```
basic | facilitated | participants
```

### ArtifactVisibility — G.7

```
public | leader_only | role_private
```

---

## Metadata Keys (Contract 4)

> Full table in [GAME_INTEGRITY_REPORT.md → Contract 4](../../GAME_INTEGRITY_REPORT.md#contract-4-artifacts)

### Verified Keys

| ArtifactType | Required | Optional |
|--------------|----------|----------|
| `keypad` | `correctCode` | `codeLength`, `maxAttempts`, `cooldownSeconds`, `successMessage`, `failMessage` |
| `riddle` | `acceptedAnswers[]` | `maxAttempts`, `promptText` |
| `counter` | — | `target`, `label` |
| `audio` | `audioUrl` or `src` | `autoPlay`, `loop`, `requireAck` |
| `document`, `image`, `card` | — | `variants[].body`, `variants[].media_ref` |

### Unverified (Use with [VERIFY_IN_REPO])

- `buttonLayout` (keypad)
- `onSuccessTrigger` (keypad)
- `normalizeMode` (riddle) — enum values unknown

---

## Checklist Before Submitting Spec

- [ ] `game.name` och `game.short_description` är ifyllda
- [ ] `game.main_purpose_id` är giltig UUID
- [ ] Minst 1 step med `title`
- [ ] Alla `artifact_type` finns i Appendix G.1
- [ ] Alla `condition_type` finns i Appendix G.2
- [ ] Alla `actions[].type` finns i Appendix G.3
- [ ] Alla ID-referenser (`keypadId`, `visible_to_role_id`, etc.) matchar definierade `id`
- [ ] Om `play_mode: participants`: minst 1 roll med `private_instructions`
- [ ] Om triggers använder `stepIndex`/`phaseIndex`: verifiera att index finns (0..n-1)
- [ ] Inga runtime-fält (`revealed_at`, `status`, etc.)
- [ ] Inga o-verifierade metadata-nycklar utan `[VERIFY_IN_REPO]`
