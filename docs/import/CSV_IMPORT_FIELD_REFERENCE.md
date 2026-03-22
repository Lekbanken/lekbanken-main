# CSV Import - Fältreferens för Lekproduktion

> **Version:** 2.1  
> **Senast uppdaterad:** 2025-12-27  
> **Syfte:** Komplett guide för att massproducera lekar via CSV-import – nu med full Legendary Play-support

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-16
- Last updated: 2026-03-22
- Last validated: 2025-12-27

> Canonical import-doc entrypoint: `docs/import/README.md`

## Related code (source of truth)

- `app/api/games/csv-import/route.ts`
- `app/api/games/csv-export/route.ts`
- `features/admin/games/utils/csv-parser.ts`
- `features/admin/games/utils/csv-generator.ts`
- `features/admin/games/utils/game-validator.ts`
- `types/csv-import.ts`

## Validation checklist

- Importen accepterar `sub_purpose_ids` (preferred: JSON-array i cell) och stöder `sub_purpose_id` som legacy.
- Exporten skriver `sub_purpose_ids` i det dokumenterade formatet.
- `types/csv-import.ts` matchar kolumnnamn/format som beskrivs här.
- **artifacts_json** stöder alla artifact types inklusive keypads
- **Keypad correctCode** behandlas alltid som sträng (leading zeros bevaras)
- **decisions_json / outcomes_json** läses men persisteras EJ (endast runtime-tabeller finns)
- **triggers** stöds i JSON-import (se avsnitt 7.7)

---

## Innehåll

1. [Översikt](#1-översikt)
2. [Speltyper (play_mode)](#2-speltyper-play_mode)
3. [Obligatoriska fält](#3-obligatoriska-fält)
4. [Alla fält - Detaljerad referens](#4-alla-fält---detaljerad-referens)
5. [Syften (purpose) - VIKTIGT](#5-syften-purpose---viktigt)
6. [Inline steg (step_1 - step_20)](#6-inline-steg-step_1---step_20)
7. [JSON-kolumner](#7-json-kolumner)
8. [Valideringsregler](#8-valideringsregler)
9. [Kompletta exempel](#9-kompletta-exempel)
10. [Tips för AI-generering](#10-tips-för-ai-generering)
11. [CSV Authoring Guide](#11-csv-authoring-guide)
12. [Begränsningar och ej stödda funktioner](#12-begränsningar-och-ej-stödda-funktioner)
13. [Round-trip kontrakt](#13-round-trip-kontrakt)

---

## 1. Översikt

### CSV-format
- **Teckenkodning:** UTF-8 (med eller utan BOM)
- **Separator:** Komma (`,`)
- **Radbrytning:** Windows (`\r\n`) eller Unix (`\n`)
- **Textfält:** Omslut med citattecken (`"`) om de innehåller komma, radbrytning eller citattecken
- **Escape citattecken:** Dubbla citattecken (`""`) inuti en cell

### En rad = En lek
Varje rad i CSV-filen representerar en komplett lek med alla dess steg, material, faser och roller.

---

## 2. Speltyper (play_mode)

| Värde | Beskrivning | Typiska användningsfall |
|-------|-------------|------------------------|
| `basic` | **Enkel lek** - Endast instruktionssteg | Lekar utan facilitator, enkla gruppaktiviteter |
| `facilitated` | **Ledd aktivitet** - Med faser och tidtagning | Workshops, strukturerade aktiviteter med timer |
| `participants` | **Deltagarlek** - Med roller och publik tavla | Maffia, spionspel, rollspel med hemliga roller |

### Krav per speltyp

| Fält | basic | facilitated | participants |
|------|-------|-------------|--------------|
| Steg (step_*) | ✅ Obligatoriskt | ✅ Obligatoriskt | ✅ Obligatoriskt |
| phases_json | ❌ Ej relevant | ⚠️ Rekommenderat | ⚠️ Rekommenderat |
| roles_json | ❌ Ej relevant | ❌ Ej relevant | ⚠️ Rekommenderat (varning om saknas) |
| board_config_json | ❌ Ej relevant | ⚪ Valfritt | ⚪ Valfritt |

---

## 3. Obligatoriska fält

Dessa fält krävs för att importen ska lyckas (dvs. valideringen ger **error** om de saknas):

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `name` | string | Lekens namn (1-200 tecken) |
| `short_description` | string | Kort beskrivning (1-500 tecken) |
| Minst ett steg | - | Minst ett steg måste finnas (minst en av `step_1_title` / `step_1_body` ifylld). Rekommenderat: båda ifyllda för att undvika varningar. |

> Obs: `game_key` är **starkt rekommenderad** (krävs för “stabil” upsert), men om den saknas genereras en och importen kan fortfarande lyckas.
> Obs: `play_mode` defaultar till `basic` om den saknas eller är ogiltig.

---

## 4. Alla fält - Detaljerad referens

### 4.1 Identitet

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `id` | UUID | ⚪ Export-only | - | Databas-ID. Exporten inkluderar denna kolumn men importen använder den inte. |
| `game_key` | string | ⚠️ Rekommenderat | - | Unikt ID för upsert. Om tomt genereras ett värde. För deterministisk upsert: ange alltid `game_key` (slug-format: `lek-namn-001`, max 100 tecken). |

### 4.2 Kärndata

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `name` | string | ✅ Ja | - | Lekens namn. 1-200 tecken. |
| `short_description` | string | ✅ Ja | - | Kort sammanfattning för listor. 1-500 tecken. |
| `description` | string | ⚪ Nej | null | Längre beskrivning med full kontext. Max 10000 tecken. |
| `play_mode` | enum | ✅ Ja | - | `basic` \| `facilitated` \| `participants` |
| `status` | enum | ⚪ Nej | `draft` | `draft` (utkast) eller `published` (publicerad) |
| `locale` | string | ⚪ Nej | null | Språkkod. Exempel: `sv-SE`, `en-US`. **Notera:** CSV-importen persisterar för närvarande inte `locale` (fältet är främst med för export/framåtkompatibilitet). |

### 4.3 Metadata

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `energy_level` | enum | ⚪ Nej | null | Energinivå: `low` (lugn), `medium` (måttlig), `high` (aktiv) |
| `location_type` | enum | ⚪ Nej | null | Plats: `indoor` (inomhus), `outdoor` (utomhus), `both` (båda) |
| `time_estimate_min` | integer | ⚪ Nej | null | Uppskattad tid i minuter. Exempel: `15` |
| `duration_max` | integer | ⚪ Nej | null | Maximal tid i minuter (för längre aktiviteter) |
| `min_players` | integer | ⚪ Nej | null | Minsta antal deltagare. Exempel: `4` |
| `max_players` | integer | ⚪ Nej | null | Maximalt antal deltagare. Exempel: `30` |
| `players_recommended` | integer | ⚪ Nej | null | Rekommenderat antal. Exempel: `12` |
| `age_min` | integer | ⚪ Nej | null | Lägsta ålder. Exempel: `6` |
| `age_max` | integer | ⚪ Nej | null | Högsta ålder. Exempel: `12` (eller tom för ingen gräns) |
| `difficulty` | string | ⚪ Nej | null | Svårighetsgrad: `easy`, `medium`, `hard` eller fritext |
| `accessibility_notes` | string | ⚪ Nej | null | Tillgänglighetsinfo. Exempel: `"Kräver att man kan springa"` |
| `space_requirements` | string | ⚪ Nej | null | Utrymmeskrav. Exempel: `"Stort öppet rum eller utomhus"` |
| `leader_tips` | string | ⚪ Nej | null | Tips till ledaren. Max 5000 tecken. |

### 4.4 Referenser (UUID)

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `main_purpose_id` | UUID | ⚠️ Varning | null | Lekens huvudsyfte (kopplas till `purposes`-tabell). **Se avsnitt 5 för giltiga värden!** |
| `sub_purpose_ids` | UUID[] | ⚪ Nej | [] | Undersyften (array av UUID). **Rekommenderat format:** JSON-array i cellen: `["uuid1","uuid2"]`. **Se avsnitt 5!** |
| `sub_purpose_id` | string | ⚪ Legacy | - | Legacy-format: kommaseparerad lista i en cell: `uuid1,uuid2`. Stöds men föredra `sub_purpose_ids`. |
| `product_id` | UUID | ⚪ Nej | null | Tillhörande produkt (kopplas till `products`-tabell) |
| `owner_tenant_id` | UUID | ⚪ Nej | null | Ägarorganisation. Om null = global lek. |

### 4.5 Validering

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `step_count` | integer | ⚪ Nej | - | Antal steg i leken. Används för validering. Max 20. |

---

## 5. Syften (purpose) - VIKTIGT

> ⚠️ **KRITISKT:** Fälten `main_purpose_id` och `sub_purpose_ids` måste innehålla **giltiga UUID:er** från `purposes`-tabellen i databasen. Påhittade UUID:er gör att leken **inte visas** i listorna!

### 5.1 Hur får jag giltiga purpose-ID:er?

**Alternativ 1: Exportera en befintlig lek**  
Den enklaste metoden är att exportera en befintlig lek via CSV-export och kopiera dess purpose-ID:er.

**Alternativ 2: SQL-fråga i Supabase**  
Kör denna SQL i Supabase Dashboard → SQL Editor:

```sql
SELECT id, name, parent_id, level 
FROM purposes 
ORDER BY level, name;
```

Resultatet ger dig alla giltiga purpose-ID:er med namn.

**Alternativ 3: Via Admin-gränssnittet**  
Gå till Admin → Game Builder och välj ett syfte. ID:t visas i webbläsarens utvecklarverktyg (Network-fliken).

### 5.2 Struktur för syften

Syften har en hierarki:
- **Huvudsyfte (level 0):** Toppnivå, ex: "Lära känna varandra", "Energiboost"
- **Undersyfte (level 1):** Mer specifikt, ex: "Namnlekar", "Rörelseaktiviteter"

### 5.3 Aktuella syften i Lekbanken

> **OBS:** Dessa ID:er kan variera mellan miljöer. Verifiera alltid mot din databas!

Hämta aktuella syften med:
```sql
SELECT 
  id,
  name,
  CASE WHEN parent_id IS NULL THEN 'Huvudsyfte' ELSE 'Undersyfte' END as typ
FROM purposes 
WHERE deleted_at IS NULL
ORDER BY parent_id NULLS FIRST, name;
```

### 5.4 Exempel på korrekt användning

**CSV med huvudsyfte och undersyften:**
```csv
game_key,name,main_purpose_id,sub_purpose_ids,...
min-lek-001,"Min lek","a1b2c3d4-e5f6-7890-abcd-ef1234567890","[""b2c3d4e5-f6a7-8901-bcde-f23456789012"",""c3d4e5f6-a7b8-9012-cdef-345678901234""]",...
```

**JSON-format (för sub_purpose_ids):**
```json
["uuid-1", "uuid-2"]
```

**I CSV-cell (med escapade citattecken):**
```
"[""uuid-1"",""uuid-2""]"
```

### 5.5 Vanliga misstag

| Problem | Lösning |
|---------|---------|
| Leken skapas men syns inte i listan | Kontrollera att `main_purpose_id` är ett giltigt UUID från `purposes`-tabellen |
| "Invalid UUID" felmeddelande | Du har använt ett påhittat ID. Hämta riktiga ID:er enligt ovan |
| Undersyften sparas inte | Se till att `sub_purpose_ids` är en giltig JSON-array med UUID:er |

---

## 6. Inline steg (step_1 - step_20)

Varje lek kan ha upp till **20 steg** definierade inline i CSV:en.

### Stegkolumner

För varje steg N (1-20):

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `step_N_title` | string | Stegetts titel. Kort och beskrivande. Exempel: `"Samla deltagarna"` |
| `step_N_body` | string | Detaljerade instruktioner. Kan vara flera meningar. |
| `step_N_duration` | integer | Uppskattad tid i sekunder. Exempel: `60` (1 minut), `300` (5 minuter) |
| `step_N_leader_script` | string | *(Valfritt)* Privata instruktioner synliga endast för spelledaren. |
| `step_N_participant_prompt` | string | *(Valfritt)* Text som visas för deltagare. |
| `step_N_board_text` | string | *(Valfritt)* Text som visas på publik tavla. |
| `step_N_optional` | boolean | *(Valfritt)* Om steget är valfritt. Default: `false` |

### Exempel

```csv
step_1_title,step_1_body,step_1_duration,step_1_leader_script,step_2_title,step_2_body,step_2_duration
"Samla deltagarna","Be alla ställa sig i en ring.","60","OBS: Vänta tills alla satt sig","Förklara reglerna","Gå igenom spelreglerna...","120"
```

### Regler för steg
- Steg måste vara i ordning (step_1 före step_2)
- Tomma steg hoppas över automatiskt
- Om `step_N_title` finns måste `step_N_body` också finnas
- Duration är valfritt (kan vara tom)

---

## 7. JSON-kolumner

För komplex data används JSON i CSV-celler. **Viktigt:** Escapea citattecken genom att dubbla dem (`""`).

### 6.1 materials_json

Material, säkerhetsnoteringar och förberedelser.

```json
{
  "items": ["Material 1", "Material 2", "Material 3"],
  "safety_notes": "Säkerhetsinformation eller null",
  "preparation": "Förberedelser som behövs eller null"
}
```

**Exempel i CSV-cell:**
```
"{""items"":[""Klisterlappar"",""Pennor""],""safety_notes"":null,""preparation"":""Skriv namn på lapparna i förväg""}"
```

### 6.2 phases_json (för facilitated/participants)

Faser för strukturerade aktiviteter.

```json
[
  {
    "name": "Introduktion",
    "phase_type": "intro",
    "duration_seconds": 180,
    "timer_visible": true,
    "timer_style": "countdown",
    "description": "Beskrivning av fasen",
    "board_message": "Text på tavlan",
    "auto_advance": false
  }
]
```

**Fältreferens för faser:**

| Fält | Typ | Obligatorisk | Giltiga värden |
|------|-----|--------------|----------------|
| `name` | string | ✅ Ja | Fasens namn |
| `phase_type` | enum | ✅ Ja | `intro`, `round`, `finale`, `break` |
| `duration_seconds` | integer | ⚪ Nej | Sekunder, ex: `180` |
| `timer_visible` | boolean | ⚪ Nej | `true` / `false` |
| `timer_style` | enum | ⚪ Nej | `countdown`, `elapsed`, `trafficlight` |
| `description` | string | ⚪ Nej | Intern beskrivning för ledaren |
| `board_message` | string | ⚪ Nej | Visas på publik tavla |
| `auto_advance` | boolean | ⚪ Nej | Gå vidare automatiskt? |

### 6.3 roles_json (för participants)

Roller för deltagarlekar.

```json
[
  {
    "name": "Maffia",
    "icon": "🔪",
    "color": "#DC2626",
    "role_order": 1,
    "public_description": "En vanlig bybor... eller?",
    "private_instructions": "Du är MAFFIA. På natten...",
    "private_hints": "Tips för spelaren",
    "min_count": 1,
    "max_count": 4,
    "assignment_strategy": "random",
    "scaling_rules": {"8": 1, "10": 2, "15": 3},
    "conflicts_with": []
  }
]
```

**Fältreferens för roller:**

| Fält | Typ | Obligatorisk | Beskrivning |
|------|-----|--------------|-------------|
| `name` | string | ✅ Ja | Rollens namn |
| `icon` | string | ⚪ Nej | Emoji eller ikon-ID |
| `color` | string | ⚪ Nej | Hex-färg, ex: `#DC2626` |
| `role_order` | integer | ✅ Ja | Ordning i listan |
| `public_description` | string | ⚪ Nej | Synlig för alla |
| `private_instructions` | string | ✅ Ja | Hemliga instruktioner för spelaren |
| `private_hints` | string | ⚪ Nej | Tips för spelaren |
| `min_count` | integer | ✅ Ja | Minsta antal med denna roll |
| `max_count` | integer | ⚪ Nej | Max antal (null = obegränsat) |
| `assignment_strategy` | enum | ⚪ Nej | `random`, `leader_picks`, `player_picks` |
| `scaling_rules` | object | ⚪ Nej | Hur många vid olika grupstorlekar |
| `conflicts_with` | array | ⚪ Nej | Rollnamn som ej kan kombineras |

### 6.4 board_config_json (för facilitated/participants)

Konfiguration av publik tavla.

```json
{
  "show_game_name": true,
  "show_current_phase": true,
  "show_timer": true,
  "show_participants": true,
  "show_public_roles": false,
  "show_leaderboard": false,
  "show_qr_code": true,
  "welcome_message": "Välkommen! Skanna QR-koden för att gå med.",
  "theme": "mystery",
  "background_color": "#1F2937",
  "layout_variant": "standard"
}
```

**Fältreferens för board_config:**

| Fält | Typ | Default | Beskrivning |
|------|-----|---------|-------------|
| `show_game_name` | boolean | true | Visa lekens namn |
| `show_current_phase` | boolean | true | Visa aktuell fas |
| `show_timer` | boolean | true | Visa timer |
| `show_participants` | boolean | true | Visa deltagarlista |
| `show_public_roles` | boolean | false | Visa publika roller |
| `show_leaderboard` | boolean | false | Visa poängtavla |
| `show_qr_code` | boolean | true | Visa QR-kod för anslutning |
| `welcome_message` | string | null | Välkomstmeddelande |
| `theme` | enum | `neutral` | `mystery`, `party`, `sport`, `nature`, `neutral` |
| `background_color` | string | null | Hex-färg för bakgrund |
| `layout_variant` | enum | `standard` | `standard`, `fullscreen` |

### 6.5 artifacts_json (Play primitives: artefakter)

Artefakter kan importeras som en JSON-struktur i en cell. De används i **Legendary Play** (participants) och kan innehålla flera **variants**.

**Viktigt om step/phase-gating:**
- Du kan låsa upp en variant först vid en viss tidpunkt genom att ange `step_index` och/eller `phase_index` på varianten.
- Indexen är **0-baserade** (första steget = `0`, första fasen = `0`).
- Fälten sparas i varianten som `metadata.step_index` / `metadata.phase_index`.

**Author-time vs runtime (viktigt):**
- CSV-importen beskriver **potential** (vad som *kan* finnas i en session).
- En session snapshot skapar **verklighet** (vilka artefakter/varianter som faktiskt finns i just den sessionen).
- Step/phase-gating är därför *författat i CSV* men *tillämpas vid runtime i sessionen* när deltagare hämtar innehåll.

```json
[
  {
    "title": "Ledtrådar",
    "artifact_order": 1,
    "artifact_type": "card",
    "tags": ["mystery"],
    "metadata": {},
    "variants": [
      {
        "variant_order": 1,
        "visibility": "public",
        "title": "Ledtråd 1",
        "body": "En kort ledtråd…",
        "step_index": 0,
        "phase_index": 0,
        "metadata": {"difficulty": "easy"}
      },
      {
        "variant_order": 2,
        "visibility": "role_private",
        "visible_to_role_order": 1,
        "title": "Hemlig ledtråd",
        "body": "Syns bara för en roll",
        "step_index": 1
      }
    ]
  }
]
```

**Exempel i CSV-cell (kort):**
```
"[{""title"":""Ledtrådar"",""artifact_order"":1,""variants"":[{""variant_order"":1,""visibility"":""public"",""title"":""Ledtråd 1"",""body"":""…"",""step_index"":0,""phase_index"":0}]}]"
```

### 6.5.1 Keypad-artefakter (artifact_type: "keypad")

Keypads är pinkods-lås som deltagare måste låsa upp. **Viktigt:** Koden valideras server-side och exponeras ALDRIG till deltagare.

**Keypad-specifika metadata-fält:**

| Fält | Typ | Default | Beskrivning |
|------|-----|---------|-------------|
| `correctCode` | string | - | **Obligatoriskt.** Koden som krävs för att låsa upp. **OBS:** Ange som sträng, citera i CSV vid leading zeros. |
| `codeLength` | number | 4 | Antal siffror/tecken (för UI-visning) |
| `maxAttempts` | number \| null | null | Max antal försök. `null` = obegränsat |
| `lockOnFail` | boolean | false | Om `true`: lås keypaden permanent efter `maxAttempts` |
| `successMessage` | string | "Koden är korrekt!" | Meddelande vid rätt kod |
| `failMessage` | string | "Fel kod, försök igen." | Meddelande vid fel kod |
| `lockedMessage` | string | "Keypaden är låst." | Meddelande när keypaden är permanent låst |

**⚠️ VIKTIGT: Leading zeros i CSV**

Om koden börjar med noll (t.ex. `0451`), **måste** du citera värdet som sträng i JSON:
- ✅ `"correctCode": "0451"` - Korrekt
- ❌ `"correctCode": 0451` - FEL (tolkas som siffra, tappar leading zero)

**Keypad-artefakt exempel (JSON):**
```json
[
  {
    "title": "Kassaskåpet",
    "artifact_order": 1,
    "artifact_type": "keypad",
    "metadata": {
      "correctCode": "0451",
      "codeLength": 4,
      "maxAttempts": 3,
      "lockOnFail": true,
      "successMessage": "Kassaskåpet öppnas!",
      "failMessage": "Fel kod. Försök igen.",
      "lockedMessage": "Larmet har gått av. Kassaskåpet är låst."
    },
    "variants": [
      {
        "variant_order": 1,
        "visibility": "public",
        "title": "Hemligt dokument",
        "body": "Du hittar ett gammalt brev med en ledtråd..."
      }
    ]
  }
]
```

**CSV-cell format (citerad JSON):**
```
"[{""title"":""Kassaskåpet"",""artifact_type"":""keypad"",""artifact_order"":1,""metadata"":{""correctCode"":""0451"",""codeLength"":4,""maxAttempts"":3,""lockOnFail"":true},""variants"":[{""variant_order"":1,""visibility"":""public"",""title"":""Hemligt dokument"",""body"":""...""}]}]"
```

### 6.7 triggers (JSON-import only)

Triggers definierar automationsregler: "När X händer, gör Y". Endast stödd i JSON-import (inte inline CSV).

#### Struktur

```json
[
  {
    "name": "Lås upp ledtråd",
    "description": "Visar ledtråd när steg 2 startar",
    "enabled": true,
    "condition": { "type": "step_started", "stepOrder": 2 },
    "actions": [
      { "type": "reveal_artifact", "artifactOrder": 1 }
    ],
    "execute_once": true,
    "delay_seconds": 0
  }
]
```

#### Condition-typer (NÄR)

| type | Parametrar | Beskrivning |
|------|-----------|-------------|
| `manual` | – | Spelledaren trycker på en knapp |
| `step_started` | `stepId` eller `stepOrder` | När ett visst steg påbörjas |
| `step_completed` | `stepId` eller `stepOrder` | När ett visst steg avslutas |
| `phase_started` | `phaseId` eller `phaseOrder` | När en fas påbörjas |
| `phase_completed` | `phaseId` eller `phaseOrder` | När en fas avslutas |
| `artifact_unlocked` | `artifactId` eller `artifactOrder` | När en artefakt visas |
| `keypad_correct` | `keypadId` eller `artifactOrder` | När rätt kod anges |
| `keypad_failed` | `keypadId` eller `artifactOrder` | När max antal försök nåtts |
| `timer_ended` | `timerId` | När en timer går ut |
| `decision_resolved` | `decisionId`, `outcome?` | När röstning avslutats |

> **Tips:** Använd `stepOrder`, `phaseOrder`, `artifactOrder` (1-baserat index) vid import. Dessa mappas automatiskt till UUID:er.

#### Action-typer (DÅ)

| type | Parametrar | Beskrivning |
|------|-----------|-------------|
| `reveal_artifact` | `artifactId` eller `artifactOrder` | Visa en dold artefakt |
| `hide_artifact` | `artifactId` eller `artifactOrder` | Dölj en synlig artefakt |
| `unlock_decision` | `decisionId` | Aktivera röstning |
| `lock_decision` | `decisionId` | Inaktivera röstning |
| `advance_step` | – | Gå till nästa steg |
| `advance_phase` | – | Gå till nästa fas |
| `start_timer` | `duration`, `name` | Starta en nedräkning (sekunder) |
| `send_message` | `message`, `style?` | Skicka meddelande till tavlan |
| `play_sound` | `soundId` | Spela ett ljudeffekt |
| `show_countdown` | `duration`, `message` | Visa countdown-overlay |
| `reset_keypad` | `keypadId` | Återställ keypad till låst |

#### Exempel: Kassaskåp → Visa skatten

```json
{
  "triggers": [
    {
      "name": "Kassaskåpet öppnas",
      "condition": { "type": "keypad_correct", "artifactOrder": 1 },
      "actions": [
        { "type": "reveal_artifact", "artifactOrder": 2 },
        { "type": "send_message", "message": "💰 Skatten är avslöjad!", "style": "dramatic" }
      ],
      "execute_once": true
    },
    {
      "name": "Starta nedräkning",
      "condition": { "type": "phase_started", "phaseOrder": 2 },
      "actions": [
        { "type": "start_timer", "duration": 300, "name": "Utrymning" },
        { "type": "send_message", "message": "⏰ Ni har 5 minuter!", "style": "typewriter" }
      ],
      "execute_once": true
    }
  ]
}
```

---

## 8. Valideringsregler

### Hårda krav (blockerar import)

| Regel | Beskrivning |
|-------|-------------|
| `name` 1-200 tecken | Obligatoriskt, max längd |
| `short_description` 1-500 tecken | Obligatoriskt, max längd |
| `play_mode` giltigt värde | Måste vara `basic`, `facilitated`, eller `participants` |
| Minst ett steg | Minst ett inline-steg måste finnas (minst en av titel/body ifylld för något `step_N_*`). |
| Max 20 steg | `step_count` får ej överstiga 20 |
| Giltig JSON | JSON-fält måste vara korrekt formaterade |
| UUID-fält måste vara UUID | Om ifyllt: `main_purpose_id`, `sub_purpose_ids`, `product_id`, `owner_tenant_id` måste vara giltiga UUID (annars error). |
| `min_players` ≤ `max_players` | Logisk validering |
| `age_min` ≤ `age_max` | Logisk validering |

### Mjuka krav (varningar)

| Regel | Beskrivning |
|-------|-------------|
| `main_purpose_id` saknas | Varning - leken kopplas inte till något syfte (kan påverka filtrering/sök). |
| Faser saknas för facilitated | Rekommenderas starkt |
| Roller saknas för participants | Krävs för fullständig lek |

---

## 9. Kompletta exempel

### 8.1 Enkel lek (basic)

> **Viktigt:** Ersätt `main_purpose_id` med ett giltigt UUID från din databas! Se avsnitt 5.

```csv
game_key,name,short_description,description,play_mode,status,locale,energy_level,location_type,time_estimate_min,min_players,max_players,age_min,age_max,difficulty,main_purpose_id,sub_purpose_ids,step_count,materials_json,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,step_3_title,step_3_body,step_3_duration
kom-som-du-ar-001,"Kom som du är!","Snabb reaktionslek med rörelser","En enkel lek där ledaren ger kommandon och alla måste reagera snabbt.",basic,draft,sv-SE,high,both,10,4,30,5,12,easy,ERSÄTT-MED-GILTIGT-UUID,"[]",3,"{""items"":[],""safety_notes"":""Se till att det finns plats att röra sig"",""preparation"":""Rensa spelområdet""}","Samla gruppen","Be alla stå i en cirkel med god marginal till varandra.",30,"Förklara kommandona","Berätta vilka kommandon som finns: HOPPA, SITT, SPRING PÅ STÄLLET, etc.",60,"Starta leken","Ropa kommandon i snabb takt. Den som gör fel är ute!",300
```

### 8.2 Deltagarlek med roller (participants)

Se [docs/examples/example-participants-game.csv](docs/examples/example-participants-game.csv) för komplett Maffia-exempel.

---

## 10. Tips för AI-generering

### Prompt-mall för att generera lekar

```
Generera en CSV-rad för en lek med följande specifikationer:

Tema: [TEMA]
Speltyp: [basic/facilitated/participants]
Antal deltagare: [MIN]-[MAX]
Åldersgrupp: [ÅLDER]
Energinivå: [low/medium/high]
Tid: [MINUTER] minuter
Huvudsyfte-ID: [ANGE GILTIGT UUID FRÅN purposes-TABELLEN]
Undersyfte-ID:er: [ARRAY AV GILTIGA UUID:ER ELLER TOM ARRAY]

Följ dessa regler:
1. game_key: använd slug-format, t.ex. "tema-namn-001"
2. name: max 200 tecken
3. short_description: sammanfatta leken i 1-2 meningar, max 500 tecken
4. description: ge full kontext för ledaren
5. main_purpose_id: MÅSTE vara ett giltigt UUID från databasen (se avsnitt 5)
6. sub_purpose_ids: JSON-array med giltiga UUID:er eller tom array []
7. Skapa 3-5 tydliga steg med:
   - Beskrivande titlar (step_N_title)
   - Detaljerade instruktioner (step_N_body)
   - Rimliga tidsuppskattningar i sekunder (step_N_duration)
8. Inkludera materials_json med relevant utrustning
9. För participants: inkludera roles_json och board_config_json

Formatera som en giltig CSV-rad med korrekt escaping av citattecken ("").
```

### Kontrollista

- [ ] `game_key` är unik och i slug-format
- [ ] `name` och `short_description` är ifyllda
- [ ] `play_mode` matchar lektypen
- [ ] **`main_purpose_id` är ett GILTIGT UUID från `purposes`-tabellen**
- [ ] **`sub_purpose_ids` innehåller endast GILTIGA UUID:er (eller är tom array)**
- [ ] Minst ett steg med titel och body
- [ ] JSON-fält har korrekta dubbla citattecken (`""`)
- [ ] Numeriska fält (ålder, tid, spelare) är heltal
- [ ] Energi/plats-värden är giltiga enum-värden

---

## Appendix: Kolumnordning

Rekommenderad ordning för CSV-kolumner:

```
id (export-only)
game_key
name
short_description
description
play_mode
status
locale (för närvarande ej persisterad av importen; export sätter ofta null)
energy_level
location_type
time_estimate_min
min_players
max_players
age_min
age_max
difficulty
main_purpose_id         ← VIKTIGT: Måste vara giltigt UUID!
sub_purpose_ids         ← JSON-array med giltiga UUID:er
cover_media_url (export-only/kan vara null)
step_count
materials_json
phases_json (om relevant)
roles_json (om relevant)
board_config_json (om relevant)
step_1_title
step_1_body
step_1_duration
step_2_title
step_2_body
step_2_duration
... (upp till step_20)
```

### Canonical CSV-header (source of truth)

Den canonical CSV-headern (dvs den som UI och import-validering utgår från) kommer från `getAllCsvColumns()` i `types/csv-import.ts`.

<!-- CANONICAL_CSV_HEADER_START -->
```csv
game_key,name,short_description,description,play_mode,status,locale,energy_level,location_type,time_estimate_min,duration_max,min_players,max_players,players_recommended,age_min,age_max,difficulty,accessibility_notes,space_requirements,leader_tips,main_purpose_id,sub_purpose_ids,product_id,owner_tenant_id,step_count,materials_json,phases_json,roles_json,board_config_json,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,step_3_title,step_3_body,step_3_duration,step_4_title,step_4_body,step_4_duration,step_5_title,step_5_body,step_5_duration,step_6_title,step_6_body,step_6_duration,step_7_title,step_7_body,step_7_duration,step_8_title,step_8_body,step_8_duration,step_9_title,step_9_body,step_9_duration,step_10_title,step_10_body,step_10_duration,step_11_title,step_11_body,step_11_duration,step_12_title,step_12_body,step_12_duration,step_13_title,step_13_body,step_13_duration,step_14_title,step_14_body,step_14_duration,step_15_title,step_15_body,step_15_duration,step_16_title,step_16_body,step_16_duration,step_17_title,step_17_body,step_17_duration,step_18_title,step_18_body,step_18_duration,step_19_title,step_19_body,step_19_duration,step_20_title,step_20_body,step_20_duration
```
<!-- CANONICAL_CSV_HEADER_END -->

---

## Appendix B: Felsökning

### Leken importerades men visas inte i listan

**Vanliga orsaker:**
1. `main_purpose_id` saknas (leken saknar syfteskoppling och kan därför hamna utanför vissa filter/sökflöden)
2. `main_purpose_id` eller `sub_purpose_ids` innehåller ogiltigt UUID (då ska importen ge error)

**Lösning:**
1. Kör SQL i Supabase för att hitta giltiga purpose-ID:er:
   ```sql
   SELECT id, name FROM purposes WHERE deleted_at IS NULL;
   ```
2. Uppdatera din CSV med ett giltigt UUID
3. Importera igen

### Hur vet jag om min lek importerades?

Kör i Supabase SQL Editor:
```sql
SELECT id, name, main_purpose_id, status 
FROM games 
WHERE game_key = 'din-game-key'
ORDER BY created_at DESC 
LIMIT 1;
```

Om `main_purpose_id` är `null` eller ett ogiltigt UUID kommer leken inte att visas i filtreringar baserade på syfte.

---

## Appendix C: Lista “purposes” utan drift

`purposes`-ID:n är **miljöspecifika** (dev/stage/prod kan skilja), så den här guiden listar inte statiska UUID-tabeller.

Hämta alltid aktuell lista från din databas:

```sql
SELECT id, name, parent_id, level
FROM purposes
WHERE deleted_at IS NULL
ORDER BY level, parent_id NULLS FIRST, name;
```

Tips: spara gärna resultatet som CSV och kopiera in `id`-värdena i din import.
---

## 11. CSV Authoring Guide

### 11.1 Grundläggande formateringsregler

#### Citering (quoting)

| Scenario | Exempel | Resultat |
|----------|---------|----------|
| Vanlig text utan komma | `Hej alla` | OK |
| Text med komma | `"Hej, alla"` | ✅ Måste citeras |
| Text med radbrytning | `"Rad 1\nRad 2"` | ✅ Måste citeras |
| Citattecken i text | `"Han sa ""Hej"""` | ✅ Dubbla citattecken |

#### JSON-i-CSV

När du inkluderar JSON i en CSV-cell:

```csv
# FEL - citattecken ej escapade
artifacts_json
[{"title":"Test"}]

# RÄTT - hela cellen citerad + inre citattecken dubblade
artifacts_json
"[{""title"":""Test""}]"
```

**Tips:** Validera alltid JSON först i en online JSON-validator innan du kopierar in i CSV.

### 11.2 Newlines i textfält

För flerradiga instruktioner använd `\n` (escaped newline) eller verkliga radbrytningar med citering:

```csv
step_1_body
"Steg 1: Gör detta.

Steg 2: Gör detta sen."
```

### 11.3 Locale/språk-hantering

**Nuvarande begränsning:** `locale`-fältet läses av parsern men persisteras INTE till databasen vid import. Alla lekar importeras utan explicit locale.

### 11.4 Vanliga valideringsfel och lösningar

| Fel | Orsak | Lösning |
|-----|-------|---------|
| `Namn saknas (obligatoriskt)` | `name`-kolumnen är tom | Fyll i lekens namn |
| `Kort beskrivning saknas` | `short_description` tom | Fyll i kort beskrivning |
| `Kunde inte tolka JSON` | Ogiltig JSON i `*_json` kolumn | Validera JSON, escapea `"` som `""` |
| `Ogiltigt play_mode` | Fel spelläge angivet | Använd `basic`, `facilitated`, eller `participants` |
| `main_purpose_id saknas` | Varning (ej error) | Lägg till giltigt UUID från `purposes`-tabellen |
| `correctCode är ett tal` | **FEL (blockerar)** - Leading zeros förlorade | Citera koden: `"correctCode": "0451"` |
| `role_private saknar rollreferens` | **FEL (blockerar)** - Variant skulle ej synas | Lägg till `visible_to_role_order` eller `visible_to_role_id` |

### 11.5 När välja CSV vs JSON import?

| Scenario | Rekommendation |
|----------|----------------|
| Enkel batch-import av basic-lekar | **CSV** |
| Export → redigera → import cycle | **CSV** |
| Komplexa artifacts med djupa nästlingar | **JSON** |
| Programmatiskt genererade lekar | **JSON** |
| Manuell redigering i kalkylark | **CSV** |
| Fler än 20 steg | **JSON** (CSV max 20 inline) |

---

## 12. Begränsningar och ej stödda funktioner

### 12.1 Beslut och Utfall (Decisions / Outcomes)

❌ **EJ STÖDD för game templates:**

- `decisions_json` och `outcomes_json` **parsas** men **sparas INTE** till databasen
- Det finns inga author-time tabeller för decisions/outcomes – endast runtime-tabeller (`session_decisions`, `session_outcomes`)
- Om du inkluderar dessa kolumner ignoreras de med en varning

**Framtida:** När author-time schema för beslut/utfall läggs till kan CSV-stöd implementeras. Tills dess, använd Game Builder UI för att konfigurera beslutslogik.

**Framtida plan:** När author-time decisions-tabeller skapas kommer dessa att stödjas fullt ut.

### 12.2 Triggers

✅ **Stöds via JSON-import:**

Triggers (automatiska åtgärder baserade på events) stöds nu i JSON-import. Se avsnitt 7.7 för fullständig dokumentation.

- **Import:** `triggers`-array i JSON-format
- **Export:** EJ inkluderad i CSV-export ännu (använd Supabase eller JSON-export)
- **Runtime:** Triggers kopieras till `session_triggers` vid session-start

### 12.3 Export – begränsad round-trip

⚠️ **Viktig begränsning:**

Exporten (`csv-export`) inkluderar **INTE** följande:

- `artifacts_json` – artefakter exporteras inte
- `decisions_json` / `outcomes_json`

Detta innebär att **export → import inte ger full round-trip** för Legendary Play-lekar.

**Workaround:** Använd JSON-export för fullständig data, eller exportera artefakter separat via Supabase.

### 12.4 Keypad – sessionsglobal state

Keypad-artefakter har **sessionsglobal** state:

- När en deltagare låser upp keypaden påverkas **alla** deltagare
- Det finns ingen per-deltagare keypad-state
- `attemptCount`, `isUnlocked`, `isLockedOut` lagras i `session_artifacts.metadata.keypadState`

### 12.5 step_index / phase_index semantik

**Viktigt att förstå:**

- Index är **0-baserade** (första steget = `0`, första fasen = `0`)
- Dessa fält anger **när en variant blir synlig** under session-runtime
- De påverkar INTE spelordning eller UI-layout vid author-time
- Gating tillämpas av `ParticipantPlayView` vid hämtning

---

## 13. Round-trip kontrakt

Detta avsnitt dokumenterar exakt vad som kan exporteras och återimporteras utan förlust.

### 13.1 Fulla round-trip (export → import utan förlust)

✅ **CSV-export inkluderar:**

| Fält | Format | Notering |
|------|--------|----------|
| Basmeta | Kolumner | name, short_description, description, play_mode, status, locale, etc. |
| Steg | step_1..step_20 | Upp till 20 inline-steg |
| phases_json | JSON-cell | Alla faser |
| roles_json | JSON-cell | Alla roller |
| board_config_json | JSON-cell | Tavla-konfiguration |
| materials_json | JSON-cell | Material och säkerhetsnoteringar |
| sub_purpose_ids | JSON-cell | Sekundära syften |

### 13.2 Förlustbringande fält (LOSSY)

❌ **Följande exporteras EJ och går förlorade vid round-trip:**

| Fält | Orsak | Workaround |
|------|-------|------------|
| `artifacts_json` | csv-export inkluderar inte artefakter | Använd JSON-export eller Supabase query |
| `decisions_json` | Endast runtime-tabeller finns | Ej tillgängligt, väntar på author-time schema |
| `outcomes_json` | Endast runtime-tabeller finns | Ej tillgängligt, väntar på author-time schema |
| Keypad state | Session-specifik data | Endast initial metadata sparas |

### 13.3 Partiella round-trips

⚠️ **Om du exporterar ett spel med artefakter och återimporterar CSV:**

- Basmeta, steg, faser, roller: **Bevaras**
- Artefakter: **FÖRSVINNER** (måste återskapas manuellt)
- För escape room / Legendary Play: **Använd JSON-export istället**

### 13.4 Rekommendation per användningsfall

| Användningsfall | Rekommenderat format |
|-----------------|---------------------|
| Enkel basic-lek batch-import | CSV |
| Facilitated lek med faser | CSV |
| Participants lek med roller (utan artefakter) | CSV |
| Escape room med keypads | **JSON** |
| Lek med role_private artefakter | **JSON** |
| Full backup för återställning | **JSON + Supabase export** |

### 13.5 Validering av round-trip

För att verifiera att en round-trip fungerar:

1. Exportera spel till CSV
2. Radera spelet (eller använd ny game_key)
3. Importera CSV med upsert=false
4. Jämför:
   ```sql
   -- Förväntat: identiska värden
   SELECT name, short_description, play_mode, status
   FROM games WHERE game_key = '<game_key>';
   
   -- Förväntat: samma antal
   SELECT COUNT(*) FROM game_steps WHERE game_id = '<game_id>';
   SELECT COUNT(*) FROM game_phases WHERE game_id = '<game_id>';
   SELECT COUNT(*) FROM game_roles WHERE game_id = '<game_id>';
   
   -- Förväntat: 0 (artefakter exporteras EJ)
   SELECT COUNT(*) FROM game_artifacts WHERE game_id = '<game_id>';
   ```

---

## Appendix D: Exempel-CSV:er

| Fil | Beskrivning |
|-----|-------------|
| `docs/examples/example-basic-games.csv` | Tre enkla basic-lekar |
| `docs/examples/example-participants-game.csv` | Maffia med roller och faser |
| `docs/examples/example-legendary-play-complete.csv` | **Komplett** Legendary Play med keypad, gating, roller |

Se `docs/examples/README-legendary-play-example.md` för detaljerad genomgång av golden example.