# MANUELL VERIFIERING — Import Fix

## Datum: 2025-01-XX
## Verifierad av: Johan L

---

## FÖRBEREDELSE

1. Starta appen lokalt: `pnpm dev`
2. Logga in som admin
3. Gå till Admin → Games

---

## TESTFALL A — Legacy Trigger Format (ska lyckas)

### Testdata
Skapa fil `test-legacy-triggers.json`:
```json
[{
  "game_key": "manual-test-legacy-triggers",
  "name": "Manual Test - Legacy Triggers",
  "description": "Test för att verifiera att legacy trigger-format normaliseras",
  "game_type": "mission",
  "min_players": 1,
  "max_players": 4,
  "difficulty": "medium",
  "play_duration_minutes": 15,
  "phases": [
    { "phase_order": 1, "title": "Fas 1", "description": "Första fasen" }
  ],
  "steps": [
    { "step_order": 1, "title": "Steg 1", "body": "Första steget", "phase_order": 1 },
    { "step_order": 2, "title": "Steg 2", "body": "Andra steget", "phase_order": 1 }
  ],
  "artifacts": [
    { "artifact_order": 1, "label": "Artefakt 1", "artifact_type": "text", "payload": { "text": "Hemlig text" } },
    { "artifact_order": 2, "label": "Artefakt 2", "artifact_type": "keypad", "payload": { "code": "1234" } }
  ],
  "roles": [
    { "role_order": 1, "label": "Spelare", "description": "Huvudroll" }
  ],
  "triggers": [
    {
      "name": "Avslöja artefakt vid korrekt kod",
      "condition_type": "keypad_correct",
      "condition_config": { "artifactOrder": 2 },
      "actions": [{ "type": "reveal_artifact", "artifactOrder": 1 }],
      "execute_once": true
    }
  ]
}]
```

### Steg

| # | Åtgärd | Förväntat resultat | ✓/✗ |
|---|--------|-------------------|-----|
| 1 | Klicka "Import Games" | Dialog öppnas | |
| 2 | Klistra in JSON ovan | Preview visar: Steps: 2, Phases: 1, Artifacts: 2, Roles: 1, Triggers: 1 | |
| 3 | Klicka "Import" | Grön toast: "Import successful" | |
| 4 | Sök efter "manual-test-legacy-triggers" i listan | Spelet visas | |
| 5 | Klicka på spelet → Edit | Builder öppnas | |
| 6 | Kontrollera "Steps" tab | 2 steg visas | |
| 7 | Kontrollera "Phases" tab | 1 fas visas | |
| 8 | Kontrollera "Artifacts" tab | 2 artefakter visas | |
| 9 | Kontrollera "Roles" tab | 1 roll visas | |
| 10 | Kontrollera "Triggers" tab | 1 trigger visas med condition.type = "keypad_correct" | |

---

## TESTFALL B — Canonical Trigger Format (ska lyckas)

### Testdata
Skapa fil `test-canonical-triggers.json`:
```json
[{
  "game_key": "manual-test-canonical-triggers",
  "name": "Manual Test - Canonical Triggers",
  "description": "Test för att verifiera att canonical trigger-format fungerar",
  "game_type": "mission",
  "min_players": 1,
  "max_players": 4,
  "difficulty": "medium",
  "play_duration_minutes": 15,
  "phases": [
    { "phase_order": 1, "title": "Fas 1", "description": "Första fasen" }
  ],
  "steps": [
    { "step_order": 1, "title": "Steg 1", "body": "Första steget", "phase_order": 1 }
  ],
  "artifacts": [
    { "artifact_order": 1, "label": "Artefakt 1", "artifact_type": "text", "payload": { "text": "Test" } }
  ],
  "triggers": [
    {
      "name": "Canonical Trigger",
      "condition": { "type": "step_started", "step_order": 1 },
      "actions": [{ "type": "reveal_artifact", "artifact_order": 1 }],
      "execute_once": true
    }
  ]
}]
```

### Steg

| # | Åtgärd | Förväntat resultat | ✓/✗ |
|---|--------|-------------------|-----|
| 1 | Import JSON ovan | Preview visar Triggers: 1 | |
| 2 | Klicka "Import" | Grön toast: "Import successful" | |
| 3 | Öppna spelet i builder | Trigger visas korrekt | |

---

## TESTFALL C — Ogiltiga Triggers (ska visa fel)

### Testdata
Skapa fil `test-invalid-triggers.json`:
```json
[{
  "game_key": "manual-test-invalid-triggers",
  "name": "Manual Test - Invalid Triggers",
  "description": "Test för att verifiera att ogiltiga triggers hanteras",
  "game_type": "mission",
  "min_players": 1,
  "max_players": 4,
  "steps": [
    { "step_order": 1, "title": "Steg 1", "body": "Första steget" }
  ],
  "triggers": [
    {
      "name": "Invalid - saknar condition",
      "actions": [{ "type": "reveal_artifact", "artifact_order": 1 }]
    }
  ]
}]
```

### Steg

| # | Åtgärd | Förväntat resultat | ✓/✗ |
|---|--------|-------------------|-----|
| 1 | Import JSON ovan | Preview visar Triggers: 0 (den ogiltiga filtreras bort) | |
| 2 | Kontrollera console | Varning om normalisering loggad | |
| 3 | Import fortsätter | Spelet skapas utan triggers | |

---

## TESTFALL D — Exakt Payload från Bug Report

### Testdata
Använd den exakta payloaden som Johan rapporterade:
```json
[{
  "game_key": "johan-exact-reproduction",
  "name": "Johan Exact Reproduction",
  "description": "Exakt samma format som orsakade buggen",
  "game_type": "mission",
  "min_players": 2,
  "max_players": 6,
  "difficulty": "medium",
  "play_duration_minutes": 30,
  "phases": [
    { "phase_order": 1, "title": "Intro", "description": "Introduktion" },
    { "phase_order": 2, "title": "Main", "description": "Huvudfas" },
    { "phase_order": 3, "title": "Outro", "description": "Avslutning" }
  ],
  "steps": [
    { "step_order": 1, "title": "Start", "body": "Välkommen", "phase_order": 1 },
    { "step_order": 2, "title": "Uppgift 1", "body": "Lös koden", "phase_order": 2 },
    { "step_order": 3, "title": "Uppgift 2", "body": "Hitta ledtråden", "phase_order": 2 },
    { "step_order": 4, "title": "Avslut", "body": "Grattis!", "phase_order": 3 }
  ],
  "artifacts": [
    { "artifact_order": 1, "label": "Keypad", "artifact_type": "keypad", "payload": { "code": "1234" } },
    { "artifact_order": 2, "label": "Hemligt meddelande", "artifact_type": "text", "payload": { "text": "Du hittade det!" } },
    { "artifact_order": 3, "label": "Karta", "artifact_type": "image", "payload": { "url": "/placeholder.jpg" } }
  ],
  "roles": [
    { "role_order": 1, "label": "Ledare", "description": "Leder gruppen" },
    { "role_order": 2, "label": "Kodknäckare", "description": "Löser koder" }
  ],
  "triggers": [
    {
      "name": "Avslöja meddelande vid korrekt kod",
      "condition_type": "keypad_correct",
      "condition_config": { "artifactOrder": 1 },
      "actions": [{ "type": "reveal_artifact", "artifactOrder": 2 }],
      "execute_once": true
    },
    {
      "name": "Visa karta efter steg 2",
      "condition_type": "step_completed",
      "condition_config": { "stepOrder": 2 },
      "actions": [{ "type": "reveal_artifact", "artifactOrder": 3 }],
      "execute_once": true
    }
  ]
}]
```

### Steg

| # | Åtgärd | Förväntat resultat | ✓/✗ |
|---|--------|-------------------|-----|
| 1 | Import JSON ovan | Preview: Steps: 4, Phases: 3, Artifacts: 3, Roles: 2, Triggers: 2 | |
| 2 | Klicka "Import" | Grön toast: "Import successful" | |
| 3 | Öppna i builder | ALLA data visas (inte tomt som tidigare!) | |
| 4 | Steps tab | 4 steg | |
| 5 | Phases tab | 3 faser | |
| 6 | Artifacts tab | 3 artefakter | |
| 7 | Roles tab | 2 roller | |
| 8 | Triggers tab | 2 triggers med condition.type korrekt | |

---

## SAMMANFATTNING

| Testfall | Status | Anteckningar |
|----------|--------|--------------|
| A - Legacy Triggers | | |
| B - Canonical Triggers | | |
| C - Invalid Triggers | | |
| D - Exakt Reproduction | | |

**Signatur:** _______________  
**Datum:** _______________

---

## TEKNISK BAKGRUND

### Vad fixades?

1. **Legacy trigger-format stöds nu**
   - `condition_type` → `condition.type`
   - `condition_config.artifactOrder` → `condition.artifact_order`
   - `actions[].artifactOrder` → `actions[].artifact_order`

2. **Fel visas i UI**
   - Om API returnerar `errors`, visas röd toast istället för grön
   - Partiella fel (spel skapat men data saknas) visas som fel

### Filer som ändrades

- `features/admin/games/utils/json-game-import.ts` — Legacy normalisering
- `features/admin/games/components/GameImportDialog.tsx` — Felhantering i UI
