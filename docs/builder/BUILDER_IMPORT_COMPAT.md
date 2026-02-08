# Game Builder Import/Export Compatibility

**Datum:** 2026-02-01  
**Status:** GAP ANALYSIS + ROUNDTRIP GUARANTEE

---

## Nuvarande Import/Export Kapabilitet

### Import

| Format | Endpoint | Status | Via Builder? |
|--------|----------|--------|--------------|
| CSV | `POST /api/games/csv-import` | ✅ Fungerar | ❌ Nej - direkt till DB |
| JSON | `POST /api/games/csv-import?format=json` | ✅ Fungerar | ❌ Nej - direkt till DB |

### Export

| Format | Endpoint | Status |
|--------|----------|--------|
| JSON (Builder format) | `GET /api/games/builder/[id]` | ✅ Returnerar all data |
| CSV | ❌ Finns ej | ❌ Ej implementerat |
| JSON (canonical export) | ❌ Finns ej | ❌ Ej implementerat |

---

## Data Flow Jämförelse

### Import Flow (Current)

```
CSV/JSON fil
    │
    ▼
POST /api/games/csv-import
    │
    ▼
parseCsvGames() / parseGamesFromJsonPayload()
    │
    ▼
validateGames()
    │
    ▼
normalizeLegacyArtifactTypesForImport()
    │
    ▼
INSERT INTO games, game_steps, game_artifacts, etc.
    │
    ▼
DB (games i 'draft' status)

⚠️ PROBLEM: Går INTE via builder state normalisering
```

### Builder Load Flow

```
/admin/games/[id]/edit
    │
    ▼
GET /api/games/builder/[id]
    │
    ▼
Load from: games, game_steps, game_phases, game_roles,
          game_artifacts, game_artifact_variants, game_triggers,
          game_materials, game_board_config, game_tools,
          game_media, game_secondary_purposes
    │
    ▼
Normalize in GameBuilderPage:
  - Map media_ref (game_media.id → media.id)
  - Apply defaults for missing fields
  - Normalize variants
    │
    ▼
LOAD_FROM_API → builder state
```

### Builder Save Flow

```
builder state
    │
    ▼
handleSave() in GameBuilderPage
    │
    ▼
Build payload:
  - isUuid() checks on IDs
  - Map step_order, phase_order, etc.
  - Normalize media_ref
    │
    ▼
PUT /api/games/builder/[id]
    │
    ▼
For each related table:
  1. DELETE WHERE game_id = ?
  2. INSERT new rows
    │
    ▼
DB updated
```

---

## Field Mapping: Import → Builder

### Core Fields

| Import Field | Builder Field | Transformation |
|--------------|---------------|----------------|
| `name` | `core.name` | Direct |
| `short_description` | `core.short_description` | Direct |
| `description` | `core.description` | Direct |
| `status` | `core.status` | `'draft'` / `'published'` |
| `play_mode` | `core.play_mode` | `'basic'` / `'facilitated'` / `'participants'` |
| `main_purpose_id` | `core.main_purpose_id` | UUID |
| `category` | `core.taxonomy_category` | String |
| `energy_level` | `core.energy_level` | `'low'` / `'medium'` / `'high'` |
| `location_type` | `core.location_type` | `'indoor'` / `'outdoor'` / `'both'` |
| `time_estimate_min` | `core.time_estimate_min` | Number |
| `min_players` | `core.min_players` | Number |
| `max_players` | `core.max_players` | Number |
| `age_min` | `core.age_min` | Number |
| `age_max` | `core.age_max` | Number |
| `difficulty` | `core.difficulty` | String |
| `accessibility_notes` | `core.accessibility_notes` | String |
| `space_requirements` | `core.space_requirements` | String |
| `leader_tips` | `core.leader_tips` | String |
| `is_demo_content` | `core.is_demo_content` | Boolean |

### Steps

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `steps[].title` | `steps[].title` | Direct |
| `steps[].body` | `steps[].body` | Direct |
| `steps[].duration_seconds` | `steps[].duration_seconds` | Number |
| `steps[].leader_script` | `steps[].leader_script` | String |
| `steps[].media_ref` | `steps[].media_ref` | ⚠️ Needs media.id, not game_media.id |
| `steps[].phase_id` | `steps[].phase_id` | UUID (optional) |

### Phases

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `phases[].name` | `phases[].name` | Direct |
| `phases[].phase_type` | `phases[].phase_type` | `'preparation'` / `'round'` / `'scoring'` / `'finale'` |
| `phases[].duration_seconds` | `phases[].duration_seconds` | Number |
| `phases[].timer_visible` | `phases[].timer_visible` | Boolean |
| `phases[].timer_style` | `phases[].timer_style` | `'countdown'` / `'countup'` / `'hidden'` |
| `phases[].auto_advance` | `phases[].auto_advance` | Boolean |

### Roles

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `roles[].name` | `roles[].name` | Direct |
| `roles[].icon` | `roles[].icon` | Emoji |
| `roles[].color` | `roles[].color` | Hex color |
| `roles[].public_description` | `roles[].public_description` | String |
| `roles[].private_instructions` | `roles[].private_instructions` | String |
| `roles[].min_count` | `roles[].min_count` | Number |
| `roles[].max_count` | `roles[].max_count` | Number or null |
| `roles[].assignment_strategy` | `roles[].assignment_strategy` | `'random'` / `'manual'` / `'first_come'` |

### Artifacts

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `artifacts[].title` | `artifacts[].title` | Direct |
| `artifacts[].description` | `artifacts[].description` | String |
| `artifacts[].artifact_type` | `artifacts[].artifact_type` | ⚠️ Legacy types normalized |
| `artifacts[].tags` | `artifacts[].tags` | String[] |
| `artifacts[].metadata` | `artifacts[].metadata` | JSONB |
| `artifacts[].variants` | `artifacts[].variants` | See below |

#### Artifact Variants

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `variants[].title` | `variants[].title` | String |
| `variants[].body` | `variants[].body` | String |
| `variants[].media_ref` | `variants[].media_ref` | ⚠️ Needs media.id |
| `variants[].visibility` | `variants[].visibility` | `'public'` / `'leader_only'` / `'role_private'` |
| `variants[].visible_to_role_id` | `variants[].visible_to_role_id` | UUID (optional) |
| `variants[].step_index` | `variants[].step_index` | Number (optional) |
| `variants[].phase_index` | `variants[].phase_index` | Number (optional) |

### Triggers

| Import Field | Builder Field | Notes |
|--------------|---------------|-------|
| `triggers[].name` | `triggers[].name` | String |
| `triggers[].description` | `triggers[].description` | String |
| `triggers[].enabled` | `triggers[].enabled` | Boolean |
| `triggers[].condition` | `triggers[].condition` | ⚠️ TriggerCondition JSONB |
| `triggers[].actions` | `triggers[].actions` | ⚠️ TriggerAction[] JSONB |
| `triggers[].execute_once` | `triggers[].execute_once` | Boolean |
| `triggers[].delay_seconds` | `triggers[].delay_seconds` | Number |

---

## Gap Analysis

### Critical Gaps

| Gap | Description | Impact | Priority |
|-----|-------------|--------|----------|
| **No builder-aware import** | Import bypasses builder state normalization | Imported games may have inconsistent data | HIGH |
| **No JSON export** | Cannot export game to portable format | No backup/transfer capability | HIGH |
| **No CSV export** | Cannot export game to spreadsheet format | Hard to batch-edit games | MEDIUM |
| **media_ref mismatch** | Import uses media.id, DB stores game_media.id | Media not displayed correctly | HIGH |
| **Trigger order aliases** | Import uses aliases (@step_1), builder uses UUIDs | Triggers may break on import | MEDIUM |

### Field Transformation Gaps

| Field | Import → DB | DB → Builder | Builder → DB | Roundtrip Issue |
|-------|-------------|--------------|--------------|-----------------|
| `media_ref` | media.id | game_media.id → media.id | media.id → game_media.id | ✅ OK (mapped) |
| `step_index` | Number | In variant metadata | From variant | ✅ OK |
| `phase_index` | Number | In variant metadata | From variant | ✅ OK |
| `artifact_type` | Legacy normalized | Direct | Direct | ⚠️ One-way normalization |
| `trigger.condition` | Order aliases | UUIDs | UUIDs | ⚠️ Aliases lost |

### Missing Export Fields

The builder's GET endpoint returns all data, but there's no dedicated export format:

```typescript
// Current GET /api/games/builder/[id] response
{
  game: { /* core fields */ },
  steps: [ /* StepData[] */ ],
  materials: { /* MaterialsForm */ },
  phases: [ /* PhaseData[] */ ],
  roles: [ /* RoleData[] */ ],
  artifacts: [ /* with variants */ ],
  triggers: [ /* TriggerFormData[] */ ],
  boardConfig: { /* BoardConfigData */ },
  gameTools: [ /* GameToolForm[] */ ],
  secondaryPurposes: [ /* string[] */ ],
  coverMedia: { /* CoverMedia */ },
}
```

---

## Roundtrip Guarantee Analysis

### Test Scenario

```
1. Create game in builder
2. Save via PUT
3. Export via GET /api/games/builder/[id]
4. Delete game
5. Import exported data
6. Load in builder
7. Compare: Original state === Loaded state?
```

### Known Roundtrip Issues

| Field | Issue | Resolution |
|-------|-------|------------|
| `id` (all entities) | New UUIDs generated on import | ⚠️ IDs will differ |
| `created_at`, `updated_at` | New timestamps | ⚠️ Expected behavior |
| `artifact_type` (legacy) | `'text'` → `'card'`, `'note'` → `'card'` | ❌ One-way transformation |
| `trigger order aliases` | `@step_1` → UUID → `@step_1`? | ⚠️ Need alias preservation |
| `media_ref` | game_media.id ↔ media.id | ✅ Bidirectional mapping |
| `game_content_version` | Always 'v2' for builder | ✅ OK |

### Roundtrip Test Cases Needed

```typescript
// Proposed test structure
describe('Game Builder Roundtrip', () => {
  it('should preserve core fields', async () => {
    // Create → Save → Export → Import → Load → Compare
  });

  it('should preserve step order', async () => {
    // Steps should maintain sequence
  });

  it('should preserve phase-step relationships', async () => {
    // step.phase_id should resolve correctly
  });

  it('should preserve artifact variants', async () => {
    // All variant fields should survive roundtrip
  });

  it('should preserve trigger conditions', async () => {
    // Condition types and references should survive
  });

  it('should preserve trigger actions', async () => {
    // Action types and parameters should survive
  });
});
```

---

## Recommended Fixes

### P0: Critical (Before Next Release)

1. **Add "Export to JSON" button in builder**
   ```typescript
   // GameBuilderPage.tsx
   const handleExport = async () => {
     const data = await fetch(`/api/games/builder/${gameId}`);
     const json = await data.json();
     downloadAsJson(json, `${core.name}.json`);
   };
   ```

2. **Add beforeunload warning**
   ```typescript
   useEffect(() => {
     const handleBeforeUnload = (e: BeforeUnloadEvent) => {
       if (isDirty) {
         e.preventDefault();
         e.returnValue = '';
       }
     };
     window.addEventListener('beforeunload', handleBeforeUnload);
     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
   }, [isDirty]);
   ```

### P1: High Priority (Next Sprint)

3. **Create dedicated export endpoint**
   ```
   GET /api/games/[id]/export?format=json
   GET /api/games/[id]/export?format=csv
   ```

4. **Add "Import to Builder" option**
   - Parse imported data
   - Route to `/admin/games/new?import=true`
   - Pre-populate builder state from import

5. **Preserve trigger order aliases**
   - Store original alias in metadata
   - Restore on export

### P2: Medium Priority (Next Month)

6. **Template library**
   ```
   POST /api/games/templates
   GET /api/games/templates
   POST /api/games/templates/[id]/use → Create new game from template
   ```

7. **Roundtrip test suite**
   - E2E test that exports, re-imports, and compares

8. **Version snapshots integration**
   - Enable SnapshotManager in builder
   - Allow rollback to previous versions

---

## Export Schema Proposal

```typescript
interface GameExport {
  version: '1.0';
  exported_at: string; // ISO timestamp
  game: {
    // All core fields
    name: string;
    short_description: string;
    description: string;
    status: 'draft' | 'published';
    play_mode: 'basic' | 'facilitated' | 'participants';
    // ... etc
  };
  steps: Array<{
    order: number; // Explicit order, not UUID
    title: string;
    body: string;
    duration_seconds: number | null;
    phase_ref: string | null; // @phase_1 alias
    media_ref: string | null; // Media URL for portability
  }>;
  phases: Array<{
    order: number;
    ref: string; // @phase_1 for cross-references
    name: string;
    phase_type: string;
    // ... etc
  }>;
  roles: Array<{
    order: number;
    ref: string; // @role_1 for cross-references
    name: string;
    // ... etc
  }>;
  artifacts: Array<{
    order: number;
    ref: string; // @artifact_1 for cross-references
    artifact_type: string;
    variants: Array<{
      // ... with visible_to_role_ref instead of UUID
    }>;
  }>;
  triggers: Array<{
    order: number;
    name: string;
    condition: TriggerConditionExport; // Uses @refs
    actions: TriggerActionExport[]; // Uses @refs
  }>;
  materials: MaterialsForm;
  board_config: BoardConfigData;
}
```

---

## Current State Summary

| Capability | Status | Notes |
|------------|--------|-------|
| Import CSV | ✅ Working | Bypasses builder |
| Import JSON | ✅ Working | Bypasses builder |
| Export JSON | ⚠️ Partial | GET endpoint exists, no UI |
| Export CSV | ❌ Missing | Not implemented |
| Roundtrip guaranteed | ❌ No | IDs and some fields differ |
| Template library | ❌ Missing | Not implemented |
| Import to builder | ❌ Missing | Not implemented |
