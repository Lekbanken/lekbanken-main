# CSV Import - Fältreferens för Lekproduktion

> **Version:** 1.0  
> **Senast uppdaterad:** 2025-12-16  
> **Syfte:** Komplett guide för att massproducera lekar via CSV-import

---

## Innehåll

1. [Översikt](#1-översikt)
2. [Speltyper (play_mode)](#2-speltyper-play_mode)
3. [Obligatoriska fält](#3-obligatoriska-fält)
4. [Alla fält - Detaljerad referens](#4-alla-fält---detaljerad-referens)
5. [Inline steg (step_1 - step_20)](#5-inline-steg-step_1---step_20)
6. [JSON-kolumner](#6-json-kolumner)
7. [Valideringsregler](#7-valideringsregler)
8. [Kompletta exempel](#8-kompletta-exempel)
9. [Tips för AI-generering](#9-tips-för-ai-generering)

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
| roles_json | ❌ Ej relevant | ❌ Ej relevant | ✅ Obligatoriskt |
| board_config_json | ❌ Ej relevant | ⚪ Valfritt | ⚪ Valfritt |

---

## 3. Obligatoriska fält

Dessa fält **måste** finnas för att importen ska lyckas:

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `game_key` | string | Unikt ID för leken (för upsert). Exempel: `frysta-artor-001` |
| `name` | string | Lekens namn (1-200 tecken) |
| `short_description` | string | Kort beskrivning (1-500 tecken) |
| `play_mode` | enum | Speltyp: `basic`, `facilitated`, eller `participants` |
| `step_1_title` | string | Titel för första steget |
| `step_1_body` | string | Instruktioner för första steget |

---

## 4. Alla fält - Detaljerad referens

### 4.1 Identitet

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `game_key` | string | ✅ Ja | - | Unikt ID för upsert. Använd slug-format: `lek-namn-001`. Max 100 tecken. |

### 4.2 Kärndata

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `name` | string | ✅ Ja | - | Lekens namn. 1-200 tecken. |
| `short_description` | string | ✅ Ja | - | Kort sammanfattning för listor. 1-500 tecken. |
| `description` | string | ⚪ Nej | null | Längre beskrivning med full kontext. Max 10000 tecken. |
| `play_mode` | enum | ✅ Ja | - | `basic` \| `facilitated` \| `participants` |
| `status` | enum | ⚪ Nej | `draft` | `draft` (utkast) eller `published` (publicerad) |
| `locale` | string | ⚪ Nej | `sv-SE` | Språkkod. Exempel: `sv-SE`, `en-US` |

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
| `main_purpose_id` | UUID | ⚠️ Varning | null | Lekens huvudsyfte (kopplas till `purposes`-tabell). Varning om saknas. |
| `product_id` | UUID | ⚪ Nej | null | Tillhörande produkt (kopplas till `products`-tabell) |
| `owner_tenant_id` | UUID | ⚪ Nej | null | Ägarorganisation. Om null = global lek. |

### 4.5 Validering

| Kolumn | Typ | Obligatorisk | Default | Beskrivning |
|--------|-----|--------------|---------|-------------|
| `step_count` | integer | ⚪ Nej | - | Antal steg i leken. Används för validering. Max 20. |

---

## 5. Inline steg (step_1 - step_20)

Varje lek kan ha upp till **20 steg** definierade inline i CSV:en.

### Stegkolumner

För varje steg N (1-20):

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `step_N_title` | string | Stegetts titel. Kort och beskrivande. Exempel: `"Samla deltagarna"` |
| `step_N_body` | string | Detaljerade instruktioner. Kan vara flera meningar. |
| `step_N_duration` | integer | Uppskattad tid i sekunder. Exempel: `60` (1 minut), `300` (5 minuter) |

### Exempel

```csv
step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration
"Samla deltagarna","Be alla ställa sig i en ring mitt i rummet.",60,"Förklara reglerna","Gå igenom spelreglerna steg för steg...",120
```

### Regler för steg
- Steg måste vara i ordning (step_1 före step_2)
- Tomma steg hoppas över automatiskt
- Om `step_N_title` finns måste `step_N_body` också finnas
- Duration är valfritt (kan vara tom)

---

## 6. JSON-kolumner

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

---

## 7. Valideringsregler

### Hårda krav (blockerar import)

| Regel | Beskrivning |
|-------|-------------|
| `game_key` krävs | Måste finnas för upsert |
| `name` 1-200 tecken | Obligatoriskt, max längd |
| `short_description` 1-500 tecken | Obligatoriskt, max längd |
| `play_mode` giltigt värde | Måste vara `basic`, `facilitated`, eller `participants` |
| Minst ett steg | `step_1_title` + `step_1_body` krävs |
| Max 20 steg | `step_count` får ej överstiga 20 |
| Giltig JSON | JSON-fält måste vara korrekt formaterade |
| `min_players` ≤ `max_players` | Logisk validering |
| `age_min` ≤ `age_max` | Logisk validering |

### Mjuka krav (varningar)

| Regel | Beskrivning |
|-------|-------------|
| `main_purpose_id` saknas | Varning, men blockerar ej |
| Faser saknas för facilitated | Rekommenderas starkt |
| Roller saknas för participants | Krävs för fullständig lek |

---

## 8. Kompletta exempel

### 8.1 Enkel lek (basic)

```csv
game_key,name,short_description,description,play_mode,status,locale,energy_level,location_type,time_estimate_min,min_players,max_players,age_min,age_max,difficulty,step_count,materials_json,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,step_3_title,step_3_body,step_3_duration
kom-som-du-ar-001,"Kom som du är!","Snabb reaktionslek med rörelser","En enkel lek där ledaren ger kommandon och alla måste reagera snabbt.",basic,draft,sv-SE,high,both,10,4,30,5,12,easy,3,"{""items"":[],""safety_notes"":""Se till att det finns plats att röra sig"",""preparation"":""Rensa spelområdet""}","Samla gruppen","Be alla stå i en cirkel med god marginal till varandra.",30,"Förklara kommandona","Berätta vilka kommandon som finns: HOPPA, SITT, SPRING PÅ STÄLLET, etc.",60,"Starta leken","Ropa kommandon i snabb takt. Den som gör fel är ute!",300
```

### 8.2 Deltagarlek med roller (participants)

Se [example-participants-game.csv](examples/example-participants-game.csv) för komplett Maffia-exempel.

---

## 9. Tips för AI-generering

### Prompt-mall för att generera lekar

```
Generera en CSV-rad för en lek med följande specifikationer:

Tema: [TEMA]
Speltyp: [basic/facilitated/participants]
Antal deltagare: [MIN]-[MAX]
Åldersgrupp: [ÅLDER]
Energinivå: [low/medium/high]
Tid: [MINUTER] minuter

Följ dessa regler:
1. game_key: använd slug-format, t.ex. "tema-namn-001"
2. name: max 200 tecken
3. short_description: sammanfatta leken i 1-2 meningar, max 500 tecken
4. description: ge full kontext för ledaren
5. Skapa 3-5 tydliga steg med:
   - Beskrivande titlar (step_N_title)
   - Detaljerade instruktioner (step_N_body)
   - Rimliga tidsuppskattningar i sekunder (step_N_duration)
6. Inkludera materials_json med relevant utrustning
7. För participants: inkludera roles_json och board_config_json

Formatera som en giltig CSV-rad med korrekt escaping av citattecken ("").
```

### Kontrollista

- [ ] `game_key` är unik och i slug-format
- [ ] `name` och `short_description` är ifyllda
- [ ] `play_mode` matchar lektypen
- [ ] Minst ett steg med titel och body
- [ ] JSON-fält har korrekta dubbla citattecken (`""`)
- [ ] Numeriska fält (ålder, tid, spelare) är heltal
- [ ] Energi/plats-värden är giltiga enum-värden

---

## Appendix: Kolumnordning

Rekommenderad ordning för CSV-kolumner:

```
game_key
name
short_description
description
play_mode
status
locale
energy_level
location_type
time_estimate_min
min_players
max_players
age_min
age_max
difficulty
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
