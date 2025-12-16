# CSV Import - Fältreferens för Lekproduktion

> **Version:** 1.1  
> **Senast uppdaterad:** 2025-06-19  
> **Syfte:** Komplett guide för att massproducera lekar via CSV-import

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
| `main_purpose_id` | UUID | ⚠️ Varning | null | Lekens huvudsyfte (kopplas till `purposes`-tabell). **Se avsnitt 5 för giltiga värden!** |
| `sub_purpose_ids` | UUID[] | ⚪ Nej | [] | Undersyften (array av UUID). JSON-format: `["uuid1","uuid2"]`. **Se avsnitt 5!** |
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

---

## 8. Valideringsregler

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
| `main_purpose_id` saknas | Varning - leken filtreras bort vid sökning |
| `main_purpose_id` ogiltigt | **Leken visas inte i listan!** Måste vara ett UUID från `purposes`-tabellen |
| `sub_purpose_ids` ogiltiga | Undersyften ignoreras om de inte finns i DB |
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

Se [example-participants-game.csv](examples/example-participants-game.csv) för komplett Maffia-exempel.

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
main_purpose_id         ← VIKTIGT: Måste vara giltigt UUID!
sub_purpose_ids         ← JSON-array med giltiga UUID:er
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

---

## Appendix B: Felsökning

### Leken importerades men visas inte i listan

**Orsak:** `main_purpose_id` innehåller ett ogiltigt UUID som inte finns i `purposes`-tabellen.

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

## Appendix C: Alla giltiga Purpose-ID:er

> **Uppdaterad:** 2025-12-16  
> Komplett lista över alla huvudsyften och undersyften med giltiga UUID:er.

### Samarbete & Gemenskap

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54` | collaboration_and_community | Samarbete & Gemenskap |
| Sub | `e8349d85-80a4-4c5a-9dc5-d4e858f5fedf` | teamwork | Teamwork |
| Sub | `0b9487c0-51e6-484b-9108-2cb722fd343c` | trust_and_confidence | Tilltro och förtroende |
| Sub | `9a0c2b55-d30d-49d1-aab5-8757e9d5f89e` | group_communication | Gruppkommunikation |
| Sub | `d60593e4-5d68-4516-9a61-1374325fc687` | collaborative_problem_solving | Problemlösning tillsammans |
| Sub | `f9efe422-ba59-4284-8d95-1435b13279f2` | leadership_and_followership | Ledarskap och följarskap |
| Sub | `4bb07b28-6b11-43de-8a26-48c21755578d` | shared_goals | Gemensamma mål |
| Sub | `f07f6235-165f-438e-9e2d-aaca3ba48d91` | other_general1 | Övrigt (samarbete) |

**Bilder:** `Samarbete & Gemenskap 1.webp` – `Samarbete & Gemenskap 5.webp`

---

### Motorik & Rörelse

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `c2043912-66d4-4143-8714-f5bb0b518acf` | motor_skills_and_movement | Motorik & Rörelse |
| Sub | `0b675ef4-142c-4310-9fd4-f3cc7e87a8b4` | balance_and_coordination | Balans och koordination |
| Sub | `45bef10e-52f9-4868-8879-4ef7a4f27632` | gross_motor_skills | Grov motorik |
| Sub | `db5bed7c-d552-4582-a639-d81269831f90` | fine_motor_skills | Finmotorik |
| Sub | `6e4d1cb8-c550-4a12-88e7-789540f3e70d` | movement_in_space | Rörelse i rummet |
| Sub | `1667bc73-ff7e-4a66-99e0-8cb08d65ec4c` | rhythm_and_tempo | Rytm och tempo |
| Sub | `bf5e7783-e40d-488a-afab-c08873d6af3f` | physical_endurance | Fysisk uthållighet |
| Sub | `3845866d-cf63-4bc8-a4ae-27185619e46c` | other_general2 | Övrigt (motorik) |

**Bilder:** `Motorik & Rorelse 1.webp` – `Motorik & Rorelse 5.webp`

---

### Kognition & Fokus

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4` | cognition_and_focus | Kognition & Fokus |
| Sub | `f949fb0a-ccca-4738-913c-2de141cdfc17` | problem_solving | Problemlösning |
| Sub | `32e9ef6f-1108-4c80-91d3-fd511956956d` | logical_thinking | Logiskt tänkande |
| Sub | `c3e5db13-9ff1-4028-9587-b3173db97d30` | concentration_and_attention | Koncentration och uppmärksamhet |
| Sub | `11e3cb51-af9b-4073-ba95-bb8c1589e336` | memory_training | Minne och repetition |
| Sub | `eb35bf8e-17f4-490e-814c-5c107b9fc518` | strategy_and_planning | Strategi och planering |
| Sub | `05e51531-90c6-4e7a-8168-433524814605` | quick_thinking | Snabbtänkhet |
| Sub | `d7dd8719-9c8e-463b-b0a7-5fc56e98cfe6` | other_general3 | Övrigt (kognition) |

**Bilder:** `Kognition & Fokus 1.webp` – `Kognition & Fokus 5.webp`

---

### Kreativitet & Uttryck

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `59596e93-821d-4450-8e5e-4f214fed8168` | creativity_and_expression | Kreativitet & Uttryck |
| Sub | `894aa3f3-1396-477c-8a50-851e9b760cb9` | free_expression | Fritt uttryck |
| Sub | `631775cd-93ac-4f6d-9568-60a76223f742` | fantasy_and_imagination | Fantasi och inlevelse |
| Sub | `38b3dee4-7b61-4d54-becb-4e4c910575fe` | artistic_creation | Konstnärligt skapande |
| Sub | `7b61ef32-9c51-4886-a236-9b1b6b4f1ce3` | improvisation | Improvisation |
| Sub | `a9de9a7a-4e91-42b1-8e58-170b3e5180fc` | storytelling | Berättande |
| Sub | `ca58c447-58d0-44c3-8cfa-4932b609f0d5` | other_general4 | Övrigt (kreativitet) |

**Bilder:** `Kreativitet & Uttryck 1.webp` – `Kreativitet & Uttryck 5.webp`

---

### Kommunikation & Språk

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `93500ab9-6ff3-4a0b-bb0d-b9111486a364` | communication_and_language | Kommunikation & Språk |
| Sub | `148f873d-83c3-42f7-9431-00908b9ffe1b` | verbal_communication | Verbal kommunikation |
| Sub | `20c251ae-9d84-4e06-b0aa-4aa1d1103cdd` | non_verbal_communication | Icke-verbal kommunikation |
| Sub | `399a5020-f2e1-4697-bc47-90bdb2a9fba3` | active_listening | Aktivt lyssnande |
| Sub | `1f311a76-e024-42cb-ab43-46ca1c86cb3a` | vocabulary_building | Ordförråd och språklek |
| Sub | `71fdf4cc-9b8c-437c-893e-d8bba1381bf6` | language_play | Språklekar |
| Sub | `73b36bd9-767a-44cb-b4c6-9eb06168f44f` | other_general5 | Övrigt (kommunikation) |

**Bilder:** `Kommunikation & Sprak 1.webp` – `Kommunikation & Sprak 5.webp`

---

### Självutveckling & Emotionell Medvetenhet

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `704fe093-7b6f-45cf-ac38-c9ab2c6e5caa` | self_development_and_emotional_awareness | Självutveckling & Emotionell Medvetenhet |
| Sub | `d6b7fd36-6aa9-463c-b91a-438bd7a7f7d1` | self_awareness | Självmedvetenhet |
| Sub | `1397bba9-37cb-4acb-900c-8f7021a1ecd7` | emotion_identification | Identifiera känslor |
| Sub | `0bf77ac2-ea5f-4afe-b370-94bbaa98d6fb` | coping_strategies | Strategier och bemötande |
| Sub | `0401ace3-3434-4a12-ad09-ea9fa793a72a` | self_esteem | Självkänsla |
| Sub | `22a76c6e-af2c-456d-84ff-816307c49bfe` | personal_growth | Personlig utveckling |
| Sub | `6c337f1f-a2c5-4381-8de6-44d29280d5aa` | other_general6 | Övrigt (självutveckling) |

**Bilder:** `Sjalvutveckling & Emotionell Medvetenhet 1.webp` – `...5.webp`

---

### Reflektion & Mindfulness

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `cb2533f4-51af-4add-929b-2747f6e43b81` | reflection_and_mindfulness | Reflektion & Mindfulness |
| Sub | `860ab8a7-353e-4b8a-bcdb-ea11a8206508` | relaxation | Avslappning |
| Sub | `9f5b737a-f128-455e-91d1-7dd2ffde1890` | breathing_exercises | Andningsövningar |
| Sub | `6d364df5-1a79-4169-b9f1-0d730dedcec7` | body_awareness | Kroppsmedvetenhet |
| Sub | `ccd9d408-5e56-4445-8713-38de6d25b8eb` | meditation_basics | Meditation grund |
| Sub | `95b3ddd0-5eb4-4fae-99b4-bdb15c18a590` | stress_reduction | Stressreducering |
| Sub | `5ec058f5-b145-46d7-9320-f778f67d455d` | other_general7 | Övrigt (mindfulness) |

**Bilder:** `Reflektion & Mindfulness 1.webp` – `Reflektion & Mindfulness 5.webp`

---

### Upptäckande & Äventyr

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `fddf7912-4616-446b-b68a-6aa1679dd7de` | exploration_and_adventure | Upptäckande & Äventyr |
| Sub | `64b7e212-957b-4bd5-953d-86e42d6054ca` | nature_exploration | Utforska naturen |
| Sub | `61f29028-d8c1-42b8-afbf-20e9db246d90` | curiosity_and_wonder | Nyfikenhet och förundran |
| Sub | `c6507e3b-3a5c-478b-9ef3-41aad5c636db` | risk_and_challenge | Risk och utmaning |
| Sub | `8b55eb99-3c2c-4a20-ac3e-6b48bc1b3c8c` | discovery_learning | Upptäckande lärande |
| Sub | `bef5189b-aefa-4c56-bffd-64a1b56a0f15` | outdoor_activities | Utomhusaktiviteter |
| Sub | `3d6789ee-a039-4d10-a6e9-76d1f5f91239` | other_general8 | Övrigt (äventyr) |

**Bilder:** `Upptackande & Aventyr 1.webp` – `Upptackande & Aventyr 5.webp`

---

### Tävling & Motivation

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `2b83cedf-1f9d-4427-852f-ab781a2eeb51` | competition_and_motivation | Tävling & Motivation |
| Sub | `e99bbf3f-b51e-45e7-96c5-36da6c5186d4` | friendly_competition | Lekfull tävling |
| Sub | `828e30e7-2b37-43b9-94a7-6e35fe29714a` | goal_setting | Målsättning |
| Sub | `dbaecac5-7f3d-4359-b519-42062739c804` | performance_improvement | Prestationsförbättring |
| Sub | `56dff3fb-adfc-4366-aa9d-427869f0fe72` | fair_play | Fair play |
| Sub | `fb5d30a8-5acc-4203-b6a8-f7e69281a681` | reward_systems | Belöningssystem |
| Sub | `d076c51b-5545-46a5-a9cf-de089a359721` | other_general9 | Övrigt (tävling) |

**Bilder:** `Tavling & Motivation 1.webp` – `Tavling & Motivation 5.webp`

---

### Kunskap & Lärande

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `49a6cc94-52be-4a2e-92a6-55503b5988b6` | knowledge_and_learning | Kunskap & Lärande |
| Sub | `a5403bd0-8dcf-4532-a24b-c2796deacd84` | subject_knowledge | Ämneskunskap |
| Sub | `9c85fb33-5bc6-4406-8e6a-903dcbc709fb` | learning_through_play | Lärande genom lek |
| Sub | `4c3938e6-7c1b-4685-ba29-9b14c9cccfc2` | inquiry_based_learning | Utforskande lärande |
| Sub | `fd0c5c7f-d21c-47d1-9875-80b1a81e3aa4` | skill_development | Färdighetsutveckling |
| Sub | `729857fc-b8c6-4d93-b48b-11d5d38700b7` | cross_curricular_learning | Ämnesövergripande lärande |
| Sub | `8bb99456-29dc-4635-bc20-00e66d49e8c7` | other_general10 | Övrigt (kunskap) |

**Bilder:** `Kunskap & Larande 1.webp` – `Kunskap & Larande 5.webp`

---

### Tillgänglighet & Anpassning

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `577207e2-c07c-44f1-b107-53a24a842640` | accessibility_and_adaptation | Tillgänglighet & Anpassning |
| Sub | `2958ec0a-bebd-4e55-922a-00e1879dafb9` | adaptive_design | Anpassad design |
| Sub | `e9af0a70-cb86-4601-864d-3853fbe1dab0` | communication_support | Kommunikationsstöd |
| Sub | `0f9cb5de-64cc-44f0-90eb-136118e7973b` | safe_environment | Trygg miljö |
| Sub | `00bf4e67-bec8-40b6-a78a-085429721320` | flexibility_and_options | Flexibilitet och val |
| Sub | `5067520d-7bdc-40f8-a8d3-789dbcc1a88d` | other_general11 | Övrigt (tillgänglighet) |

**Bilder:** *Ingen bildserie ännu*

---

### Digital interaktion

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `e1159589-f469-498b-81ff-b81888a1eab9` | digital_interaction | Digital interaktion |
| Sub | `22f37c90-470b-4706-bab4-e9d55637a840` | engagement_and_energy | Engagemang och energi |
| Sub | `dda29c4d-a384-4e3b-9d34-6ff9db69c679` | visual_focus | Visuellt fokus |
| Sub | `ec7b5bb8-63b3-40e5-abe4-9a1a4a418de3` | flow_and_timing | Flow och timing |
| Sub | `7ae2ae3d-1ca1-4380-90b7-f79a46d04318` | creative_interaction | Kreativ interaktion |
| Sub | `e5d54dc7-fe80-442e-a9c0-cc94e106b674` | other_general12 | Övrigt (digitalt) |

**Bilder:** *Ingen bildserie ännu*

---

### Ledarskap & Ansvar

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `a0ace276-0a17-4750-895b-6e14bfd2b3dd` | leadership_and_responsibility | Ledarskap & Ansvar |
| Sub | `d03ec86f-d512-40f0-8a58-961c48332d63` | delegation_and_trust | Delegation och förtroende |
| Sub | `4b0eab04-2d3b-4b50-9f93-0e012117cd4f` | group_management | Gruppledning |
| Sub | `41a26122-ea62-44c8-8d6a-021f7ea6112f` | motivation_and_inspiration | Motivation och inspiration |
| Sub | `7cb33e6e-af2e-441b-b421-dc4db6b60baa` | conflict_management | Konflikthantering |
| Sub | `01cfb1a6-89cb-4292-89c5-15d11edd9510` | other_general13 | Övrigt (ledarskap) |

**Bilder:** *Ingen bildserie ännu*

---

### Tema & Stämning

| Typ | ID | Key | Namn |
|-----|-----|-----|------|
| **Main** | `badd2cd4-cb1f-4838-b932-029222566b2c` | theme_and_atmosphere | Tema & Stämning |
| Sub | `7ad5cccb-b174-4b42-9a7f-e9a312b078e7` | social_connection | Social gemenskap |
| Sub | `e1942736-6171-4875-9766-5b0eec7bda0f` | traditions_and_customs | Traditioner och seder |
| Sub | `989d6f35-dce2-46c5-9e0d-14929ba84362` | humor_and_fun | Humor och glädje |
| Sub | `1ae3c8d7-1562-4f8a-a602-68e2e724671d` | inclusive_celebrations | Inkluderande firanden |
| Sub | `9aa096e6-9c1c-410d-ad96-48b28ebf53c9` | teamwork_in_celebration | Teamwork i firande |
| Sub | `df80f575-ed39-4289-b05a-59f8c23b27ab` | other_general14 | Övrigt (tema & stämning) |

**Bilder:** *Ingen bildserie ännu*

---

### Snabbreferens: Alla Main Purpose ID:er

```
72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54  Samarbete & Gemenskap
c2043912-66d4-4143-8714-f5bb0b518acf  Motorik & Rörelse
3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4  Kognition & Fokus
59596e93-821d-4450-8e5e-4f214fed8168  Kreativitet & Uttryck
93500ab9-6ff3-4a0b-bb0d-b9111486a364  Kommunikation & Språk
704fe093-7b6f-45cf-ac38-c9ab2c6e5caa  Självutveckling & Emotionell Medvetenhet
cb2533f4-51af-4add-929b-2747f6e43b81  Reflektion & Mindfulness
fddf7912-4616-446b-b68a-6aa1679dd7de  Upptäckande & Äventyr
2b83cedf-1f9d-4427-852f-ab781a2eeb51  Tävling & Motivation
49a6cc94-52be-4a2e-92a6-55503b5988b6  Kunskap & Lärande
577207e2-c07c-44f1-b107-53a24a842640  Tillgänglighet & Anpassning
e1159589-f469-498b-81ff-b81888a1eab9  Digital interaktion
a0ace276-0a17-4750-895b-6e14bfd2b3dd  Ledarskap & Ansvar
badd2cd4-cb1f-4838-b932-029222566b2c  Tema & Stämning
```
