# JSON Import - Fältreferens för Legendary Play

> **Version:** 1.0  
> **Skapad:** 2025-12-26  
> **Syfte:** Komplett guide för JSON-import av spel med full Legendary Play-struktur

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-26
- Last updated: 2026-03-21
- Last validated: 2025-12-26

> Canonical builder/import entrypoint: `docs/builder/README.md`

## 1. Översikt

### Varför JSON istället för CSV?

| Funktion | CSV | JSON |
|----------|-----|------|
| Basmeta (namn, beskrivning, etc.) | ✅ | ✅ |
| Steg (steps) | ✅ Max 20 | ✅ Obegränsat |
| Faser (phases) | ✅ | ✅ |
| Roller (roles) | ✅ | ✅ |
| Artefakter (artifacts) | ✅ | ✅ |
| Keypad med correctCode | ✅ | ✅ |
| role_private visibility | ✅ | ✅ |
| step/phase gating | ✅ | ✅ |
| Decisions/Outcomes | ❌ | ❌ (ej author-time stöd) |
| Triggers | ❌ | ❌ |
| Komplex nesting | ⚠️ Svårt | ✅ Naturligt |
| Round-trip export→import | ⚠️ Lossy | ✅ Bättre |

**Rekommendation:** Använd JSON för escape room, rollspel, och alla spel med artefakter.

---

## 2. API-endpoint

```
POST /api/games/csv-import
Content-Type: application/json

{
  "data": "[{...game object...}]",  // JSON-stringify:ad array
  "format": "json",
  "dry_run": true,   // true = validera endast, false = importera
  "upsert": true     // true = uppdatera existerande, false = skapa nya
}
```

**Notera:** `data` ska vara en JSON-sträng av en array, inte ett objekt direkt.

---

## 3. Spelstruktur (ParsedGame)

```typescript
{
  // === Identitet ===
  "game_key": "my-escape-room-nb",  // Unik nyckel för upsert
  
  // === Obligatoriska fält ===
  "name": "Mitt Escape Room",
  "short_description": "En kort beskrivning (max 500 tecken)",
  
  // === Spelläge (VIKTIGT!) ===
  "play_mode": "participants",  // "basic" | "facilitated" | "participants"
  
  // === Valfria fält ===
  "description": "Längre beskrivning...",
  "status": "draft",             // "draft" | "published"
  "locale": "nb-NO",             // Språkkod
  "energy_level": "medium",      // "low" | "medium" | "high"
  "location_type": "indoor",     // "indoor" | "outdoor" | "both"
  "time_estimate_min": 30,
  "duration_max": 45,
  "min_players": 4,
  "max_players": 12,
  "players_recommended": 8,
  "age_min": 12,
  "age_max": null,
  "difficulty": "medium",
  "accessibility_notes": "...",
  "space_requirements": "...",
  "leader_tips": "...",
  
  // === Referenser ===
  "main_purpose_id": null,       // UUID eller null
  "sub_purpose_ids": [],         // Array av UUID
  "product_id": null,
  "owner_tenant_id": null,
  
  // === Relaterad data ===
  "steps": [...],                // Se sektion 4
  "phases": [...],               // Se sektion 5
  "roles": [...],                // Se sektion 6
  "boardConfig": {...},          // Se sektion 7
  "artifacts": [...],            // Se sektion 8
  "materials": {...}             // Valfritt
}
```

---

## 4. Steg (steps)

```typescript
{
  "step_order": 1,
  "title": "Introduktion",
  "body": "Välkommen till spelet...",
  "duration_seconds": 120,
  "leader_script": "Instruktioner för spelledaren",
  "participant_prompt": "Vad deltagarna ser",
  "board_text": "Text på tavlan",
  "optional": false
}
```

**Krav:** Minst ett steg krävs.

---

## 5. Faser (phases)

```typescript
{
  "phase_order": 1,
  "name": "Introduktion",
  "phase_type": "intro",         // "intro" | "round" | "finale" | "break"
  "duration_seconds": 180,
  "timer_visible": true,
  "timer_style": "countdown",    // "countdown" | "elapsed" | "trafficlight"
  "description": "Beskrivning",
  "board_message": "Visas på tavlan",
  "auto_advance": false
}
```

**Rekommendation:** Definiera faser för `play_mode: "participants"`.

---

## 6. Roller (roles)

```typescript
{
  "role_order": 1,
  "name": "Detektiven",
  "icon": "🕵️",
  "color": "#3B82F6",
  "public_description": "Synlig för alla",
  "private_instructions": "Hemliga instruktioner (OBLIGATORISKT)",
  "private_hints": "Extra tips",
  "min_count": 1,
  "max_count": 2,
  "assignment_strategy": "random"  // "random" | "leader_picks" | "player_picks"
}
```

**Varning:** `play_mode: "participants"` utan roller ger varning.

---

## 7. Tavla-konfiguration (boardConfig)

```typescript
{
  "show_game_name": true,
  "show_current_phase": true,
  "show_timer": true,
  "show_participants": true,
  "show_public_roles": true,
  "show_leaderboard": false,
  "show_qr_code": true,
  "welcome_message": "Välkommen!",
  "theme": "dark",               // "light" | "dark"
  "background_color": "#1F2937",
  "layout_variant": "centered"   // "default" | "centered" | "compact"
}
```

---

## 8. Artefakter (artifacts) ⭐

### 8.1 Grundstruktur

```typescript
{
  "artifact_order": 1,
  "locale": "nb-NO",
  "title": "Min artefakt",
  "description": "Beskrivning",
  "artifact_type": "card",       // "card" | "keypad" | "document" | ...
  "tags": ["clue", "intro"],
  "metadata": {},                // Artifact-specifik data
  "variants": [...]              // Se 8.2
}
```

### 8.2 Varianter (variants)

```typescript
{
  "variant_order": 1,
  "visibility": "public",        // "public" | "leader_only" | "role_private"
  "title": "Variant-titel",
  "body": "Innehåll...",
  "media_ref": null,
  "metadata": {
    "step_index": 0,             // Visa från steg 0 (0-baserat)
    "phase_index": 0             // Visa från fas 0 (0-baserat)
  },
  
  // ENDAST för role_private:
  "visible_to_role_order": 1,    // Referens till roll
  // ELLER:
  "visible_to_role_name": "Detektiven",
  // ELLER:
  "visible_to_role_id": "uuid..."
}
```

### 8.3 Keypad (artifact_type: "keypad") ⚠️

**KRITISKT:** `correctCode` måste vara en sträng!

```typescript
{
  "artifact_type": "keypad",
  "metadata": {
    "correctCode": "0451",       // ⚠️ STRÄNG - inte nummer!
    "codeLength": 4,
    "maxAttempts": 3,
    "lockOnFail": true,
    "successMessage": "Rätt kod!",
    "failMessage": "Fel kod.",
    "lockedMessage": "Låst permanent."
  }
}
```

**Vanliga fel:**
- ❌ `"correctCode": 451` → Leading zeros försvinner!
- ❌ `"correctCode": 0451` → JSON-parse error!
- ✅ `"correctCode": "0451"` → Korrekt!

### 8.4 role_private visibility ⚠️

**OBLIGATORISKT:** Måste ha rollreferens!

```typescript
{
  "visibility": "role_private",
  "visible_to_role_order": 1     // Måste anges!
}
```

**Fel utan rollreferens → HARD ERROR, varianten importeras inte.**

---

## 9. Validering och felhantering

### 9.1 Dry-run läge

Sätt `dry_run: true` för att validera utan att spara:

```json
{
  "valid": true,
  "total_rows": 1,
  "valid_count": 1,
  "error_count": 0,
  "warning_count": 2,
  "errors": [],
  "warnings": [...]
}
```

### 9.2 Hårda fel (blockerar import)

| Fel | Orsak |
|-----|-------|
| `name saknas` | Obligatoriskt fält |
| `short_description saknas` | Obligatoriskt fält |
| `Minst ett steg krävs` | Inga steg definierade |
| `Keypad saknar correctCode` | Keypad utan kod |
| `correctCode är ett tal` | Leading zeros kan gå förlorade |
| `role_private saknar rollreferens` | Varianten skulle aldrig visas |

### 9.3 Varningar (tillåter import)

| Varning | Orsak |
|---------|-------|
| `play_mode 'participants' utan roller` | Rekommenderas men ej obligatoriskt |
| `main_purpose_id saknas` | Leken kopplas inte till syfte |
| `Roll saknar private_instructions` | Kan vara avsiktligt |

---

## 10. Upsert-semantik

Med `upsert: true` och matchande `game_key`:

1. **Befintlig spelets** basmeta uppdateras
2. **All relaterad data raderas:**
   - game_steps
   - game_phases
   - game_roles
   - game_artifacts + game_artifact_variants (cascade)
   - game_materials
   - game_board_config
   - game_secondary_purposes
3. **Ny relaterad data infogas**

**Viktigt:** Det finns inget "merge" - det är full ersättning!

---

## 11. Runtime-integration (Legendary Play)

### 11.1 Skapa session

Efter import:
1. Skapa ny session via Admin → Spela
2. Session skapas med `game_id` kopplat

### 11.2 Kopiera roller till session

Klicka "Kopiera roller från spel" för att:
- Köra `snapshot_game_roles_to_session` RPC
- Skapa `session_roles` från `game_roles`

### 11.3 Keypad-säkerhet

`correctCode` exponeras **ALDRIG** för deltagare:
- API:t sanerar metadata via `sanitizeMetadataForParticipant()`
- Deltagare ser: `codeLength`, `maxAttempts`, `keypadState`
- Validering sker server-side via `attempt_keypad_unlock` RPC

### 11.4 Gating

`step_index` och `phase_index` i variant-metadata styr synlighet:
- Variant visas endast när session når rätt steg/fas
- Logik finns i `app/api/play/sessions/[id]/artifacts/route.ts`

---

## 12. Exempel

Se `docs/examples/`:
- `example-legendary-play-import.json` - Komplett escape room
- `example-legendary-play-import-v2.json` - Upsert-test med ändrad data

---

## 13. SQL-verifiering

### Verifiera import

```sql
-- Hitta spel
SELECT id, game_key, name, play_mode, status
FROM games WHERE game_key = 'notodden-escape-nb';

-- Räkna relaterad data
SELECT 
  (SELECT COUNT(*) FROM game_steps WHERE game_id = g.id) as steps,
  (SELECT COUNT(*) FROM game_phases WHERE game_id = g.id) as phases,
  (SELECT COUNT(*) FROM game_roles WHERE game_id = g.id) as roles,
  (SELECT COUNT(*) FROM game_artifacts WHERE game_id = g.id) as artifacts
FROM games g WHERE game_key = 'notodden-escape-nb';

-- Keypad metadata
SELECT title, artifact_type, metadata->>'correctCode' as code
FROM game_artifacts
WHERE game_id = (SELECT id FROM games WHERE game_key = 'notodden-escape-nb')
  AND artifact_type = 'keypad';
```

### Verifiera upsert (ingen orphan-data)

```sql
-- Inga orphan variants
SELECT v.id
FROM game_artifact_variants v
LEFT JOIN game_artifacts a ON v.artifact_id = a.id
WHERE a.id IS NULL;

-- Inga stale rollreferenser
SELECT v.id
FROM game_artifact_variants v
WHERE v.visible_to_role_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM game_roles r WHERE r.id = v.visible_to_role_id);
```

### Verifiera session-snapshot

```sql
-- Session-roller
SELECT sr.name, sr.role_order
FROM session_roles sr
WHERE session_id = '<session-id>';
```

---

## Appendix A: Fullständig fältlista

| Fält | Typ | Obligatoriskt | Default |
|------|-----|---------------|---------|
| game_key | string | ⚠️ Rekommenderat | genereras |
| name | string | ✅ Ja | - |
| short_description | string | ✅ Ja | - |
| play_mode | enum | ⚠️ Rekommenderat | "basic" |
| status | enum | Nej | "draft" |
| locale | string | Nej | "sv-SE" |
| steps | array | ✅ Ja (minst 1) | - |
| phases | array | Nej | [] |
| roles | array | Nej | [] |
| artifacts | array | Nej | undefined |
| boardConfig | object | Nej | null |
