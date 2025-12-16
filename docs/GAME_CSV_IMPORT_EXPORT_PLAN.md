# Game CSV Import/Export - Implementeringsplan

> **Status:** ✅ IMPLEMENTATION KLAR  
> **Prioritet:** P0 - Kritisk för massproduktion  
> **Författare:** AI Assistant  
> **Datum:** 2025-12-16  
> **Codex Review:** 2025-12-16 - Godkänd med förtydliganden  
> **Implementation:** 2025-12-16 - Alla sessioner slutförda

## 1. Bakgrund och mål

### Problem
Lekbanken behöver kunna massproducera högkvalitativa lekar effektivt. Nuvarande import-funktion:
- Endast JSON-format (kräver teknisk kompetens)
- Endast grundläggande metadata (inga steg, material, faser, roller, board config)
- Ingen export för att spara/dela befintliga lekar

### Mål
Möjliggöra CSV import och export av kompletta lekar för alla tre speltyper:
1. **Enkel lek** (`play_mode: 'basic'`) - Instruktioner utan facilitator
2. **Ledd aktivitet** (`play_mode: 'facilitated'`) - Med faser och facilitator-skript
3. **Deltagarlek** (`play_mode: 'participants'`) - Med roller och publik tavla

---

## 2. Datamodell-översikt

### Tabeller som ingår
| Tabell | Beskrivning | Kardinalitet |
|--------|-------------|--------------|
| `games` | Huvudtabell med metadata | 1 per lek |
| `game_steps` | Instruktionssteg | N per lek |
| `game_materials` | Material, säkerhet, förberedelser | 1 per lek/locale |
| `game_phases` | Faser (intro, runda, final) | N per lek (facilitated/participants) |
| `game_roles` | Roller för deltagare | N per lek (participants) |
| `game_board_config` | Publik tavla-inställningar | 1 per lek (facilitated/participants) |

### Kolumner per tabell

#### games (core)
```
name, short_description, description, play_mode, status,
main_purpose_id, product_id, owner_tenant_id, category,
energy_level, location_type, time_estimate_min, duration_max,
min_players, max_players, players_recommended,
age_min, age_max, difficulty, accessibility_notes,
space_requirements, leader_tips
```

#### game_steps
```
step_order, title, body, duration_seconds, leader_script,
participant_prompt, board_text, optional
```

#### game_materials
```
items (array), safety_notes, preparation
```

#### game_phases
```
phase_order, name, phase_type, duration_seconds,
timer_visible, timer_style, description, board_message, auto_advance
```

#### game_roles
```
role_order, name, icon, color, public_description,
private_instructions, private_hints, min_count, max_count,
assignment_strategy, scaling_rules (JSON), conflicts_with (array)
```

#### game_board_config
```
show_game_name, show_current_phase, show_timer, show_participants,
show_public_roles, show_leaderboard, show_qr_code, welcome_message,
theme, background_color, layout_variant
```

---

## 3. CSV-format - Design

### Alternativ A: Flat CSV med prefixade kolumner ✅ REKOMMENDERAT
En rad per steg, med lek-metadata upprepat på varje rad.

**Fördelar:**
- Enkelt att redigera i Excel/Google Sheets
- Fungerar med standardverktyg
- Intuitivt för icke-tekniska användare

**Nackdelar:**
- Redundant data (metadata upprepas)
- Begränsat för komplexa strukturer (roller, faser)

**Struktur:**
```csv
game_name,game_play_mode,game_description,...,step_1_title,step_1_body,...,step_N_title,step_N_body,...
```

### Alternativ B: Multi-sheet format (JSON backup)
Separata ark/filer för varje tabell, länkade via `game_key`.

**Fördelar:**
- Ingen redundans
- Naturlig mappning till databas

**Nackdelar:**
- Kräver ZIP eller flerfils-hantering
- Svårare för användare

### Beslut: **Hybrid-approach**

#### Import: Stödja båda format
1. **Flat CSV** för enkel lek (basic) - en rad = en lek med alla steg inline
2. **Multi-row CSV** för komplexa lekar - en rad per steg, faser/roller i JSON-kolumner

#### Export: Flat CSV default, JSON för fullständig backup

---

## 4. CSV-kolumnspecifikation

### 4.1 Enkel Lek CSV (basic)
En rad per lek med steg som numrerade kolumner.

```csv
game_key,name,short_description,description,play_mode,status,energy_level,location_type,time_estimate_min,min_players,max_players,age_min,age_max,materials,safety_notes,preparation,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,...
```

**Max steg:** 20 (step_1 till step_20)

### 4.2 Ledd Aktivitet CSV (facilitated)
Utökat med faser.

```csv
game_key,name,...,[alla basic-kolumner]...,phases_json
```

`phases_json` innehåller:
```json
[{"name":"Intro","phase_type":"intro","duration_seconds":120,...}]
```

### 4.3 Deltagarlek CSV (participants)
Utökat med roller och board config.

```csv
game_key,name,...,[alla facilitated-kolumner]...,roles_json,board_config_json
```

`roles_json` och `board_config_json` innehåller JSON-strukturer.

---

## 5. Teknisk arkitektur

### 5.1 Nya filer

```
app/
  api/
    games/
      csv-export/
        route.ts              # GET: Exportera lekar som CSV
      csv-import/
        route.ts              # POST: Importera CSV/JSON

features/
  admin/
    games/
      components/
        GameImportDialog.tsx  # (uppdatera befintlig)
        GameExportDialog.tsx  # (ny - välj format & innehåll)
      utils/
        csv-parser.ts         # Parse CSV till GameBuilderData[]
        csv-generator.ts      # Generera CSV från GameBuilderData[]
        game-validator.ts     # Validera importdata

lib/
  utils/
    csv.ts                    # Generisk CSV utilities (escape, parse)

types/
  csv-import.ts               # Typer för import/export
```

### 5.2 API Endpoints

#### GET /api/games/csv-export
Exportera lekar till CSV.

**Query params:**
- `ids`: UUID[] - Specifika lekar att exportera
- `format`: 'csv' | 'json' (default: 'csv')
- `include`: 'basic' | 'full' (default: 'full')

**Response:**
```typescript
// Content-Type: text/csv
// Content-Disposition: attachment; filename="games-export-2025-12-16.csv"
```

#### POST /api/games/csv-import
Importera lekar från CSV/JSON.

**Request:**
```typescript
{
  format: 'csv' | 'json',
  data: string,           // Raw CSV/JSON
  options: {
    mode: 'create' | 'upsert', // Skapa nya eller uppdatera befintliga
    validateOnly: boolean,     // Dry run utan insert
    defaultStatus: 'draft' | 'published',
    defaultTenantId?: string,
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  stats: {
    total: number,
    created: number,
    updated: number,
    skipped: number,
    errors: ImportError[]
  },
  games?: GameSummary[]  // Om validateOnly, returnera förhandsvisning
}
```

### 5.3 Typdefinitioner

```typescript
// types/csv-import.ts

export type ImportMode = 'create' | 'upsert';
export type ImportFormat = 'csv' | 'json';

export type CsvGameRow = {
  // Core
  game_key?: string;     // För upsert
  name: string;
  short_description: string;
  description?: string;
  play_mode?: 'basic' | 'facilitated' | 'participants';
  status?: 'draft' | 'published';
  
  // Metadata
  energy_level?: 'low' | 'medium' | 'high';
  location_type?: 'indoor' | 'outdoor' | 'both';
  time_estimate_min?: number;
  min_players?: number;
  max_players?: number;
  age_min?: number;
  age_max?: number;
  difficulty?: string;
  accessibility_notes?: string;
  space_requirements?: string;
  leader_tips?: string;
  
  // Materials (komma-separerad lista)
  materials?: string;
  safety_notes?: string;
  preparation?: string;
  
  // Inline steps (step_1_title, step_1_body, etc.)
  [key: `step_${number}_title`]: string;
  [key: `step_${number}_body`]: string;
  [key: `step_${number}_duration`]: number;
  
  // JSON för komplexa strukturer
  phases_json?: string;
  roles_json?: string;
  board_config_json?: string;
};

export type ImportError = {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ImportOptions = {
  mode: ImportMode;
  validateOnly: boolean;
  defaultStatus: 'draft' | 'published';
  defaultTenantId?: string;
  defaultPurposeId?: string;
};

export type ImportResult = {
  success: boolean;
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: ImportError[];
    warnings: ImportError[];
  };
  preview?: GamePreview[];
};

export type GamePreview = {
  row: number;
  name: string;
  playMode: string;
  stepsCount: number;
  phasesCount: number;
  rolesCount: number;
  isValid: boolean;
  errors: string[];
};
```

---

## 6. UI/UX Design

### 6.1 Import Dialog (Uppdatering av GameImportDialog.tsx)

**Steg 1: Välj format**
```
┌─────────────────────────────────────────────────────┐
│  📥 Importera lekar                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Välj importformat:                                 │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │  📊 CSV     │  │  📄 JSON    │                   │
│  │  Excel/     │  │  Fullständig│                   │
│  │  Sheets     │  │  backup     │                   │
│  └─────────────┘  └─────────────┘                   │
│                                                     │
│  📎 Ladda upp fil eller klistra in innehåll        │
│                                                     │
│  [Drop zone eller textarea]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Steg 2: Förhandsvisning och validering**
```
┌─────────────────────────────────────────────────────┐
│  📥 Importera lekar - Förhandsvisning              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ 12 lekar hittades                               │
│  ⚠️  2 varningar                                    │
│  ❌ 1 fel (måste åtgärdas)                          │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ Rad │ Namn        │ Typ     │ Steg │ Status    ││
│  ├─────┼─────────────┼─────────┼──────┼───────────┤│
│  │  1  │ Frysta ärtor│ Basic   │  5   │ ✅        ││
│  │  2  │ Röda rummet │ Facilitd│  8   │ ⚠️ namn   ││
│  │  3  │ Maffia      │ Deltagar│ 12   │ ✅        ││
│  │  4  │ Broken      │ -       │  0   │ ❌ saknas ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Alternativ:                                        │
│  ☑ Importera som utkast                            │
│  ☐ Hoppa över rader med fel                        │
│                                                     │
│  [Avbryt]                    [Importera 11 lekar]  │
└─────────────────────────────────────────────────────┘
```

### 6.2 Export Dialog (Ny komponent)

```
┌─────────────────────────────────────────────────────┐
│  📤 Exportera lekar                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Välj exportformat:                                 │
│                                                     │
│  ● CSV (Excel/Google Sheets)                       │
│  ○ JSON (Fullständig backup)                       │
│                                                     │
│  Inkludera:                                         │
│  ☑ Grundinfo (namn, beskrivning, metadata)         │
│  ☑ Steg/instruktioner                              │
│  ☑ Material och förberedelser                      │
│  ☑ Faser (om tillämpligt)                          │
│  ☑ Roller (om tillämpligt)                         │
│  ☑ Tavla-inställningar (om tillämpligt)            │
│                                                     │
│  Spel att exportera:                                │
│  ○ Alla synliga (filtrerade): 47 lekar             │
│  ● Markerade: 5 lekar                              │
│                                                     │
│  [Avbryt]                        [📥 Ladda ner]    │
└─────────────────────────────────────────────────────┘
```

---

## 7. Implementation - Sessioner

### Session 1: CSV Parser & Generator
**Scope:** Verktyg för att tolka och generera CSV

**Filer:**
- `lib/utils/csv.ts` - Generiska CSV-funktioner (förbättra befintlig)
- `features/admin/games/utils/csv-parser.ts` - Parse CSV till GameBuilderData
- `features/admin/games/utils/csv-generator.ts` - Generera CSV
- `types/csv-import.ts` - Typdefinitioner

**Tid:** ~2h

### Session 2: Export API & UI
**Scope:** Export-funktionalitet

**Filer:**
- `app/api/games/csv-export/route.ts` - Export endpoint
- `features/admin/games/components/GameExportDialog.tsx` - Export dialog
- Uppdatera `GameAdminPage.tsx` - Integrera export-knapp

**Tid:** ~2h

### Session 3: Import API & Validering
**Scope:** Import-funktionalitet och validering

**Filer:**
- `app/api/games/csv-import/route.ts` - Import endpoint
- `features/admin/games/utils/game-validator.ts` - Valideringslogik
- Uppdatera `GameImportDialog.tsx` - Ny design med CSV-stöd och förhandsvisning

**Tid:** ~3h

### Session 4: Integration & Test
**Scope:** Sammankoppling och testning

**Uppgifter:**
- End-to-end test av import/export-flöde
- Seed data / testfiler
- Dokumentation

**Tid:** ~1h

---

## 8. Valideringsregler (Uppdaterat efter Codex-review)

### Obligatoriska fält (HÅRDA KRAV)
| Fält | Regel |
|------|-------|
| `game_key` | **Krävs** för upsert, genereras vid create om saknas. Stabilt unikt ID. |
| `name` | Krävs, 1-200 tecken |
| `short_description` | Krävs, 1-500 tecken |
| `play_mode` | Krävs: 'basic', 'facilitated', eller 'participants' |
| `step_1_title` + `step_1_body` | Minst ett steg krävs |

### Mjuka krav (VARNINGAR)
| Fält | Regel |
|------|-------|
| `main_purpose_id` | Varning om saknas (ej blockerande) |
| `status` | Default 'draft' om saknas |
| `locale` | Default 'sv-SE' om saknas |

### Steg-validering
| Regel | Beskrivning |
|-------|-------------|
| `step_count` | Kolumn för validering. Om >20 → **avbryt med fel** |
| Inline steg | Max 20 steg (step_1 till step_20) |
| Fler steg | Kräver JSON-format backup |

### Typ-validering
| Fält | Regel |
|------|-------|
| `energy_level` | Måste vara 'low', 'medium', 'high' eller tom |
| `location_type` | Måste vara 'indoor', 'outdoor', 'both' eller tom |
| `time_estimate_min` | Heltal >= 0 |
| `min_players`, `max_players` | Heltal >= 1, min <= max |
| `age_min`, `age_max` | Heltal >= 0, min <= max |

### JSON-validering (phases_json, roles_json, board_config_json, materials_json)
| Regel | Beskrivning |
|-------|-------------|
| Giltig JSON | Preflight parse med radnummer i felutskrift |
| Dubbelcitat | Kräv korrekt escaping ("") i CSV-celler |
| Max längd | 10 000 tecken per JSON-fält |

### Referens-validering
| Fält | Regel |
|------|-------|
| `main_purpose_id` | Om angivet: måste finnas i `purposes` |
| `product_id` | Om angivet: måste finnas i `products` |
| `owner_tenant_id` | Om angivet: användaren måste ha access |

### Logisk validering
| Regel | Beskrivning |
|-------|-------------|
| Minst ett steg | Alla lekar måste ha ≥1 steg |
| Faser för facilitated | Varning om play_mode = 'facilitated' utan faser |
| Roller för participants | Varning om play_mode = 'participants' utan roller |

---

## 9. Säkerhet

### Rate Limiting
- Max 10 import-requests per minut per användare
- Max filstorlek: 5MB

### Sanering
- Strip HTML från alla textfält
- Begränsa array-längder (max 100 items, steg, etc.)
- Validera UUID-format för ID-fält

### Auktorisering
- Import kräver `admin.games.create` permission
- Export kräver `admin.games.list` permission
- Tenant-scoping: användare kan endast importera till sina tenants

---

## 10. Exempelfiler

### 10.1 Enkel Lek CSV
```csv
name,short_description,description,play_mode,energy_level,location_type,time_estimate_min,min_players,max_players,age_min,age_max,materials,safety_notes,preparation,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,step_3_title,step_3_body,step_3_duration
"Frysta ärtor","En rolig fryslek","Alla springer runt och fryser när ledaren ropar","basic","high","both",10,4,30,6,,,"Rensa spelområdet","Markera gränser","Samla deltagare","Samla alla deltagare i en cirkel",30,"Förklara reglerna","När jag ropar FRYS så står alla stilla tills jag ropar SMÄLT",60,"Starta leken","Låt alla springa och ropa FRYS efter 10-20 sekunder",300
"Vem är jag?","Gissa karaktären","Lappar på pannan - gissa vem du är","basic","low","indoor",20,4,20,8,,"Klisterlappar; Pennor",,,"Förbered lappar","Skriv kända personer/karaktärer på lappar",120,"Sätt på lapparna","Sätt en lapp på varje deltagares panna utan att de ser",60,"Ställ ja/nej-frågor","Deltagarna turas om att ställa frågor och gissa",900
```

### 10.2 Ledd Aktivitet CSV
```csv
name,short_description,play_mode,phases_json,step_1_title,step_1_body,...
"Escape Room Light","Lagarbete med ledtrådar","facilitated","[{""name"":""Intro"",""phase_type"":""intro"",""duration_seconds"":180},{""name"":""Runda 1"",""phase_type"":""round"",""duration_seconds"":600}]","Välkomna deltagarna","Berätta historien och sätt scenen",120,...
```

### 10.3 Deltagarlek CSV
```csv
name,short_description,play_mode,phases_json,roles_json,board_config_json,...
"Maffia","Socialt deduktionsspel","participants","[...]","[{""name"":""Maffia"",""icon"":""🔪"",""private_instructions"":""Du är maffia...""}]","{""show_timer"":true,""theme"":""mystery""}",step_1_title,...
```

---

## 11. Codex-beslut (Godkänt 2025-12-16)

### Besvarade frågor

| Fråga | Beslut |
|-------|--------|
| **Max inline steg** | 20 räcker för MVP. Fler kräver JSON-format. |
| **JSON i CSV-celler** | Ja, med hård validering + examples. Dubbelcitat required. |
| **Upsert-nyckel** | `game_key` obligatoriskt. Fallback till `name` endast med varning. |
| **Locale-stöd** | Kolumn `locale`, default `sv-SE` eller `null`. |
| **Media-hantering** | Hoppa i MVP. Export: `cover_media_url` (read-only). Import: ignorera. |
| **main_purpose_id** | Valfritt i MVP, varning om saknas. Kan göras obligatoriskt senare. |

### Tillägg från Codex

1. **Export inkluderar:** `id` + `game_key` (import ignorerar `id`)
2. **step_count kolumn:** Validera att antal steg ≤ 20
3. **Preflight JSON-parse:** Med radnummer i felmeddelande
4. **Dry-run svar:** radnummer, kolumn, felorsak, warnings
5. **RLS/behörighet:** admin/editor krävs, dry-run skriver inget
6. **Maxlängd textfält:** 10k chars för att undvika Excel-problem
7. **Testfiler:** 2 exempelfiler i `docs/examples/`

---

## 12. Nästa steg

1. ✅ **Codex-granskning** - Godkänd med förtydliganden
2. ✅ **Session 1:** CSV Parser & Generator + Typer
3. ✅ **Session 2:** Export API & UI  
4. ✅ **Session 3:** Import API & Validering
5. ✅ **Session 4:** Integration, Test & TypeScript-validering
6. 📄 **Dokumentation** - Exempelfiler skapade

---

## 13. Implementerade filer

### Nya filer
| Fil | Beskrivning |
|-----|-------------|
| `types/csv-import.ts` | Typdefinitioner för CSV import/export |
| `lib/utils/csv.ts` | Generiska CSV utilities (parse, generate, escape) |
| `features/admin/games/utils/csv-parser.ts` | Parse CSV → ParsedGame[] |
| `features/admin/games/utils/csv-generator.ts` | Generera CSV från spel |
| `features/admin/games/utils/game-validator.ts` | Validering med fel/varningar |
| `features/admin/games/utils/index.ts` | Re-exports |
| `app/api/games/csv-export/route.ts` | GET endpoint för export |
| `app/api/games/csv-import/route.ts` | POST endpoint för import |
| `features/admin/games/components/GameExportDialog.tsx` | Export dialog UI |
| `docs/examples/example-basic-games.csv` | Exempelfil: 3 enkla lekar |
| `docs/examples/example-participants-game.csv` | Exempelfil: Maffia-lek |

### Uppdaterade filer
| Fil | Ändringar |
|-----|-----------|
| `features/admin/games/components/GameImportDialog.tsx` | Helt omskriven med CSV-stöd, filuppladdning, preview, validering |
| `features/admin/games/GameAdminPage.tsx` | Lagt till export-knapp och GameExportDialog |

---

## Appendix A: Befintlig kod att modifiera

### GameImportDialog.tsx (nuvarande)
- Endast JSON-format
- Ingen förhandsvisning
- Ingen validering utöver JSON-parse
- Måste ersättas med ny design

### AdminExportButton.tsx (nuvarande)
- Generisk export för tabelldata
- Stödjer CSV och JSON
- Kan återanvändas för grundexport

### lib/utils/export.ts (nuvarande)
- Grundläggande CSV-generering
- Behöver utökas med array-hantering och escape-förbättringar

