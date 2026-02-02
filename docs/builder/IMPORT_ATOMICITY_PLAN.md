# Import Atomicity Plan

> **Syfte**: Eliminera partial-update risk vid `isUpdate=true` genom atomic RPC-transaktion.  
> **Källa**: [IMPORT_METADATA_RISK_REPORT.md](IMPORT_METADATA_RISK_REPORT.md) sektion 14-15  
> **Datum**: 2026-02-01  
> **Policy**: Endast evidens. Inga gissningar.

---

## Executive Summary

| Aspekt | Nuläge | Mål |
|--------|--------|-----|
| **DB writes per game** | 16+ sekventiella calls | 1 atomic RPC call |
| **Partial update risk** | ⚠️ Fail mellan delete/insert → tomt spel | ✅ ROLLBACK → oförändrat |
| **Pre-flight** | ✅ Redan implementerat | ✅ Oförändrat |
| **Typed errors** | ✅ ImportError[] | ✅ Propageras från RPC |

---

## 0. Schema Verification (Steg 1 — KRITISK)

> **Status**: Genomförd 2026-02-01  
> **Källa**: `lib/supabase/database.types.ts` (autogenererad från Supabase)

### 🔴 KRITISKA MISMATCHES (måste fixas i RPC)

| Entity | Route.ts Field | DB Column | Mismatch | Fix |
|--------|----------------|-----------|----------|-----|
| `game_artifacts` | `step_id` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `phase_id` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `visible_to_role_id` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `completion_trigger_id` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `timer_seconds` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `is_optional` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_artifacts` | `body` | ❌ Finns ej | Route skickar, DB saknar | Ta bort — använd `description` |
| `game_artifacts` | `media_ref` | ❌ Finns ej | Route skickar, DB saknar | Ta bort från RPC |
| `game_phases` | `start_conditions` | ❌ Finns ej | RPC plan har, DB saknar | Ta bort från RPC |
| `game_phases` | `end_conditions` | ❌ Finns ej | RPC plan har, DB saknar | Ta bort från RPC |
| `game_phases` | `duration_minutes` | ❌ Finns ej | RPC plan har, DB har `duration_seconds` | Använd `duration_seconds` |
| `game_triggers` | `trigger_order` | ❌ Finns ej | RPC plan har, DB har `sort_order` | Använd `sort_order` |
| `game_triggers` | `conditions` | ❌ Finns ej | RPC plan har array, DB har `condition` (singular JSONB) | Använd `condition` |
| `game_triggers` | `is_active` | ❌ Finns ej | RPC plan har, DB har `enabled` | Använd `enabled` |
| `game_triggers` | `run_once` | ❌ Finns ej | RPC plan har, DB har `execute_once` | Använd `execute_once` |
| `game_triggers` | `priority` | ❌ Finns ej | RPC plan har, DB saknar | Ta bort från RPC |

### ✅ VERIFIERADE KOLUMNER (matchar)

#### game_steps
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ✅ | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `step_order` | INT | NOT NULL | ✅ | OK |
| `title` | TEXT | NULL | ✅ | OK |
| `body` | TEXT | NULL | ✅ | OK |
| `duration_seconds` | INT | NULL | ✅ | OK |
| `leader_script` | TEXT | NULL | ✅ | OK |
| `participant_prompt` | TEXT | NULL | ✅ | OK |
| `board_text` | TEXT | NULL | ✅ | OK |
| `optional` | BOOL | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ❌ Route saknar | Lägg till |
| `phase_id` | UUID | NULL | ❌ Route saknar | Lägg till |
| `conditional` | TEXT | NULL | ❌ Route saknar | Lägg till |
| `media_ref` | UUID | NULL | ❌ Route saknar | Lägg till |
| `display_mode` | TEXT | NULL | ❌ Route saknar | Lägg till |

#### game_phases
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ✅ | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `phase_order` | INT | NOT NULL | ✅ | OK |
| `name` | TEXT | NOT NULL | ✅ | OK |
| `phase_type` | TEXT | NOT NULL | ✅ | OK |
| `duration_seconds` | INT | NULL | ✅ | OK |
| `timer_visible` | BOOL | NULL | ✅ | OK |
| `timer_style` | TEXT | NULL | ✅ | OK |
| `description` | TEXT | NULL | ✅ | OK |
| `board_message` | TEXT | NULL | ✅ | OK |
| `auto_advance` | BOOL | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ❌ Route saknar | Lägg till |

#### game_artifacts
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ✅ | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `artifact_order` | INT | NOT NULL | ✅ | OK |
| `artifact_type` | TEXT | NOT NULL | ✅ | OK |
| `title` | TEXT | NOT NULL | ✅ | OK |
| `description` | TEXT | NULL | ❌ Route har `body` | Mappa `body` → `description` |
| `metadata` | JSONB | NULL | ✅ | OK |
| `tags` | TEXT[] | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ✅ | OK |

#### game_artifact_variants
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ❌ Route saknar | Auto-genereras |
| `artifact_id` | UUID | NOT NULL | ✅ | OK |
| `visibility` | TEXT | NOT NULL | ✅ | OK |
| `visible_to_role_id` | UUID | NULL | ✅ | OK |
| `title` | TEXT | NULL | ✅ | OK |
| `body` | TEXT | NULL | ✅ | OK |
| `media_ref` | UUID | NULL | ✅ | OK |
| `variant_order` | INT | NOT NULL | ✅ | OK |
| `metadata` | JSONB | NULL | ✅ | OK |

#### game_triggers
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ❌ Route saknar | Lägg till |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `name` | TEXT | NOT NULL | ✅ | OK |
| `description` | TEXT | NULL | ✅ | OK |
| `enabled` | BOOL | NOT NULL | ✅ | OK |
| `condition` | JSONB | NOT NULL | ✅ | OK (singular!) |
| `actions` | JSONB | NOT NULL | ✅ | OK |
| `execute_once` | BOOL | NOT NULL | ✅ | OK |
| `delay_seconds` | INT | NULL | ✅ | OK |
| `sort_order` | INT | NOT NULL | ✅ | OK |

#### game_roles
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ❌ Auto | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `role_order` | INT | NOT NULL | ✅ | OK |
| `name` | TEXT | NOT NULL | ✅ | OK |
| `icon` | TEXT | NULL | ✅ | OK |
| `color` | TEXT | NULL | ✅ | OK |
| `public_description` | TEXT | NULL | ✅ | OK |
| `private_instructions` | TEXT | NOT NULL | ✅ | OK |
| `private_hints` | TEXT | NULL | ✅ | OK |
| `min_count` | INT | NOT NULL | ✅ | OK |
| `max_count` | INT | NULL | ✅ | OK |
| `assignment_strategy` | TEXT | NOT NULL | ✅ | OK |
| `scaling_rules` | JSONB | NULL | ✅ | OK |
| `conflicts_with` | UUID[] | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ❌ Route saknar | Lägg till |

#### game_materials
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ❌ Auto | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `items` | TEXT[] | NULL | ✅ | OK |
| `safety_notes` | TEXT | NULL | ✅ | OK |
| `preparation` | TEXT | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ❌ Route saknar | Lägg till |

#### game_board_config
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `id` | UUID | NOT NULL | ❌ Auto | OK |
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `show_game_name` | BOOL | NULL | ✅ | OK |
| `show_current_phase` | BOOL | NULL | ✅ | OK |
| `show_timer` | BOOL | NULL | ✅ | OK |
| `show_participants` | BOOL | NULL | ✅ | OK |
| `show_public_roles` | BOOL | NULL | ✅ | OK |
| `show_leaderboard` | BOOL | NULL | ✅ | OK |
| `show_qr_code` | BOOL | NULL | ✅ | OK |
| `welcome_message` | TEXT | NULL | ✅ | OK |
| `theme` | TEXT | NULL | ✅ | OK |
| `background_color` | TEXT | NULL | ✅ | OK |
| `layout_variant` | TEXT | NULL | ✅ | OK |
| `locale` | TEXT | NULL | ❌ Route saknar | Lägg till |
| `background_media_id` | UUID | NULL | ❌ Route saknar | Lägg till |

#### game_secondary_purposes
| DB Column | Type | Nullable | Route.ts | Status |
|-----------|------|----------|----------|--------|
| `game_id` | UUID | NOT NULL | ✅ | OK |
| `purpose_id` | UUID | NOT NULL | ✅ | OK |

### UNIQUE Constraints att respektera

| Table | Constraint | Evidens |
|-------|------------|---------|
| `game_steps` | `(game_id, step_order)` | idx_game_steps_game_order |
| `game_phases` | `(game_id, phase_order)` | idx_game_phases_game_order |
| `game_artifacts` | `(game_id, artifact_order)` | idx_game_artifacts_game_order |
| `game_roles` | `(game_id, role_order)` | idx_game_roles_game_order |
| `game_materials` | `(game_id, locale)` | idx_game_materials_unique_locale |
| `game_board_config` | `(game_id, locale)` | UNIQUE(game_id, locale) |

### FK Constraints att respektera

| Child Table | FK Column | Parent Table | Delete Order |
|-------------|-----------|--------------|--------------|
| `game_artifact_variants` | `artifact_id` | `game_artifacts` | 1st |
| `game_artifact_variants` | `visible_to_role_id` | `game_roles` | 1st |
| `game_steps` | `phase_id` | `game_phases` | After phases |
| `game_steps` | `media_ref` | `game_media` | N/A |
| `game_triggers` | `game_id` | `games` | 2nd |
| `game_artifacts` | `game_id` | `games` | 3rd |
| `game_phases` | `game_id` | `games` | 4th |
| `game_steps` | `game_id` | `games` | 5th |

---

## 1. Problemdefinition

### Nuvarande flöde vid `isUpdate=true`

```
isUpdate=true:
├── DELETE game_steps          ✅ committed
├── DELETE game_materials      ✅ committed
├── DELETE game_phases         ✅ committed
├── DELETE game_roles          ✅ committed
├── DELETE game_board_config   ✅ committed
├── DELETE game_secondary_purposes ✅ committed
├── DELETE game_artifacts      ✅ committed
├── DELETE game_triggers       ✅ committed
│   ─── FAILURE POINT ───      ❌ network/constraint/timeout
├── INSERT steps               ❌ aldrig körs
├── INSERT materials           ❌ aldrig körs
├── ...                        ❌ aldrig körs
```

**Konsekvens**: Spelet finns kvar i `games` men är "tomt" — alla child entities raderade.

### Evidens (nuvarande kod)

```typescript
// app/api/games/csv-import/route.ts, rad 711-720
if (isUpdate) {
  await db.from('game_steps').delete().eq('game_id', gameId);
  await db.from('game_materials').delete().eq('game_id', gameId);
  await db.from('game_phases').delete().eq('game_id', gameId);
  await db.from('game_roles').delete().eq('game_id', gameId);
  await db.from('game_board_config').delete().eq('game_id', gameId);
  await db.from('game_secondary_purposes').delete().eq('game_id', gameId);
  await db.from('game_artifacts').delete().eq('game_id', gameId);
  await db.from('game_triggers').delete().eq('game_id', gameId);
}
```

**16+ icke-atomiska DB-calls** → partial update risk.

---

## 2. Målbild: Single Write Boundary

### Nytt flöde

```
┌─────────────────────────────────────────────────────────────┐
│  ROUTE.TS (TypeScript)                                      │
├─────────────────────────────────────────────────────────────┤
│  1. Parse CSV/JSON                                          │
│  2. Normalize metadata (alias→canonical)                    │
│  3. Validate metadata (HARD_REQUIRED, etc.)                 │
│  4. Pre-generate UUIDs                                      │
│  5. Pre-flight trigger rewrite                              │
│  6. Build payload                                           │
│                                                             │
│  ↓ SINGLE DB CALL                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  RPC: upsert_game_content(payload)                          │
├─────────────────────────────────────────────────────────────┤
│  BEGIN                                                      │
│  ├── Validate auth + tenant                                 │
│  ├── IF is_update: DELETE all child entities               │
│  ├── INSERT steps (with pre-generated IDs)                  │
│  ├── INSERT phases (with pre-generated IDs)                 │
│  ├── INSERT artifacts (with pre-generated IDs)              │
│  ├── INSERT variants                                        │
│  ├── INSERT triggers                                        │
│  ├── INSERT materials, roles, board_config, etc.           │
│  COMMIT                                                     │
│                                                             │
│  ON ERROR → ROLLBACK (implicit)                             │
└─────────────────────────────────────────────────────────────┘
```

**Garanti**: "Either all changes commit, or nothing changes."

---

## 3. RPC Funktion Specifikation

### Signatur (Single Payload — rekommenderat)

```sql
-- Version 1: Single JSONB payload (enklare att versionera)
CREATE OR REPLACE FUNCTION public.upsert_game_content_v1(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
...
$$;
```

### Payload Shape

```jsonb
{
  "game_id": "uuid",
  "is_update": true,
  "import_run_id": "uuid | null",
  "payload_version": 1,
  
  "steps": [{
    "id": "uuid",
    "step_order": 1,
    "title": "...",
    "body": "...",
    "duration_seconds": 60,
    "leader_script": "...",
    "participant_prompt": "...",
    "board_text": "...",
    "optional": false,
    "locale": null,
    "phase_id": null,
    "conditional": null,
    "media_ref": null,
    "display_mode": null
  }],
  
  "phases": [{
    "id": "uuid",
    "phase_order": 1,
    "name": "...",
    "phase_type": "round",
    "duration_seconds": 300,
    "timer_visible": true,
    "timer_style": "countdown",
    "description": "...",
    "board_message": "...",
    "auto_advance": false,
    "locale": null
  }],
  
  "artifacts": [{
    "id": "uuid",
    "artifact_order": 1,
    "artifact_type": "keypad",
    "title": "...",
    "description": "...",
    "metadata": {...},
    "tags": [],
    "locale": null,
    "variants": [{
      "visibility": "public",
      "visible_to_role_id": null,
      "title": "...",
      "body": "...",
      "media_ref": null,
      "variant_order": 1,
      "metadata": {}
    }]
  }],
  
  "triggers": [{
    "id": "uuid",
    "name": "...",
    "description": null,
    "enabled": true,
    "condition": {...},
    "actions": [...],
    "execute_once": false,
    "delay_seconds": 0,
    "sort_order": 1
  }],
  
  "roles": [{
    "role_order": 1,
    "name": "...",
    "icon": "🎭",
    "color": "#8661ff",
    "public_description": "...",
    "private_instructions": "...",
    "private_hints": null,
    "min_count": 1,
    "max_count": null,
    "assignment_strategy": "random",
    "scaling_rules": null,
    "conflicts_with": [],
    "locale": null
  }],
  
  "materials": {
    "items": ["papper", "penna"],
    "safety_notes": "...",
    "preparation": "...",
    "locale": null
  },
  
  "board_config": {
    "show_game_name": true,
    "show_current_phase": true,
    "show_timer": true,
    "show_participants": true,
    "show_public_roles": true,
    "show_leaderboard": false,
    "show_qr_code": false,
    "welcome_message": "...",
    "theme": "neutral",
    "background_color": null,
    "layout_variant": "standard",
    "locale": null,
    "background_media_id": null
  },
  
  "secondary_purpose_ids": ["uuid", "uuid"]
}
```

### Varför Single Payload

| Aspekt | Många parametrar | Single payload |
|--------|------------------|----------------|
| **Signaturändringar** | Kräver DROP+CREATE | Nej — payload är flexibel |
| **Versionering** | Svårt | `payload_version: 1` |
| **Observability** | Måste logga varje param | Kan logga hela payload |
| **TypeScript** | Måste matcha exakt | Interface → JSON |

### Return Format

```jsonb
-- Success
{
  "ok": true,
  "counts": {
    "steps": 5,
    "phases": 3,
    "artifacts": 12,
    "triggers": 8
  }
}

-- Failure
{
  "ok": false,
  "error": "Constraint violation: ...",
  "code": "23505"  -- Postgres error code
}
```

### Säkerhetsmodell

| Aspekt | Implementation |
|--------|----------------|
| **SECURITY DEFINER** | Ja — kör med full access |
| **Auth check** | `auth.uid() IS NOT NULL` |
| **Tenant check** | `games.owner_tenant_id = get_current_tenant_id()` |
| **Role check** | Caller måste ha `tenant_admin` eller `system_admin` |

```sql
-- Inuti RPC:n
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
BEGIN
  -- 1. Auth check
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Game ownership check
  SELECT owner_tenant_id INTO v_tenant_id
  FROM games WHERE id = p_game_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Game not found');
  END IF;

  -- 3. Tenant permission check
  IF NOT is_tenant_admin(v_user_id, v_tenant_id) 
     AND NOT is_system_admin(v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied');
  END IF;
  
  -- ... continue with atomic operations
END;
```

---

## 4. Delete Order (kritisk för FK constraints)

Vid update måste deletes ske i korrekt ordning pga foreign keys:

```sql
-- Ordning: leaf → parent
DELETE FROM game_artifact_variants WHERE artifact_id IN (
  SELECT id FROM game_artifacts WHERE game_id = p_game_id
);
DELETE FROM game_triggers WHERE game_id = p_game_id;
DELETE FROM game_artifacts WHERE game_id = p_game_id;
DELETE FROM game_phases WHERE game_id = p_game_id;
DELETE FROM game_steps WHERE game_id = p_game_id;
DELETE FROM game_roles WHERE game_id = p_game_id;
DELETE FROM game_materials WHERE game_id = p_game_id;
DELETE FROM game_board_config WHERE game_id = p_game_id;
DELETE FROM game_secondary_purposes WHERE game_id = p_game_id;
```

**Viktigt**: `game_artifact_variants` refererar `game_artifacts.id` — måste raderas först.

---

## 5. Insert Order (kritisk för FK constraints)

Inserts måste ske i korrekt ordning:

```sql
-- Ordning: parent → leaf
INSERT INTO game_steps (...) SELECT ... FROM jsonb_to_recordset(p_steps);
INSERT INTO game_phases (...) SELECT ... FROM jsonb_to_recordset(p_phases);
INSERT INTO game_roles (...) SELECT ... FROM jsonb_to_recordset(p_roles);
INSERT INTO game_materials (...) VALUES (...);
INSERT INTO game_board_config (...) VALUES (...);
INSERT INTO game_secondary_purposes (...) SELECT ...;
INSERT INTO game_artifacts (...) SELECT ... FROM jsonb_to_recordset(p_artifacts);
-- Variants refererar artifacts — måste komma efter
INSERT INTO game_artifact_variants (...) SELECT ... FROM extracted_variants;
INSERT INTO game_triggers (...) SELECT ... FROM jsonb_to_recordset(p_triggers);
```

---

## 6. Route Integration

### Före (nuvarande)

```typescript
// 16+ sekventiella DB calls
if (isUpdate) {
  await db.from('game_steps').delete().eq('game_id', gameId);
  // ... 7 more deletes
}
await db.from('game_steps').insert(stepRows);
// ... 7 more inserts
```

### Efter (atomic)

```typescript
// Single RPC call with unified payload
const importRunId = randomUUID();

const payload = {
  game_id: gameId,
  is_update: isUpdate,
  import_run_id: importRunId,
  payload_version: 1,
  
  steps: stepRows.map(s => ({
    id: s.id,
    step_order: s.step_order,
    title: s.title,
    body: s.body,  // maps to DB 'body' column
    duration_seconds: s.duration_seconds,
    leader_script: s.leader_script,
    participant_prompt: s.participant_prompt,
    board_text: s.board_text,
    optional: s.optional,
    locale: null,
    phase_id: null,
    conditional: null,
    media_ref: null,
    display_mode: null,
  })),
  
  phases: phaseRows.map(p => ({
    id: p.id,
    phase_order: p.phase_order,
    name: p.name,
    phase_type: p.phase_type,
    duration_seconds: p.duration_seconds,
    timer_visible: p.timer_visible,
    timer_style: p.timer_style,
    description: p.description,
    board_message: p.board_message,
    auto_advance: p.auto_advance,
    locale: null,
  })),
  
  artifacts: artifactRows.map((a, i) => ({
    id: a.id,
    artifact_order: a.artifact_order,
    artifact_type: a.artifact_type,
    title: a.title,
    description: a.description,  // NOTE: DB column is 'description', not 'body'
    metadata: a.metadata,
    tags: a.tags,
    locale: a.locale,
    variants: game.artifacts?.[i]?.variants?.map(v => ({
      visibility: v.visibility,
      visible_to_role_id: v.visible_to_role_id ?? null,
      title: v.title,
      body: v.body,
      media_ref: v.media_ref ?? null,
      variant_order: v.variant_order,
      metadata: v.metadata ?? {},
    })) ?? [],
  })),
  
  triggers: rewrittenTriggerRows.map(t => ({
    id: randomUUID(),  // Generate trigger IDs
    name: t.name,
    description: t.description,
    enabled: t.enabled,
    condition: t.condition,  // singular, not 'conditions'
    actions: t.actions,
    execute_once: t.execute_once,
    delay_seconds: t.delay_seconds,
    sort_order: t.sort_order,
  })),
  
  roles: roleRows ?? null,
  materials: game.materials ?? null,
  board_config: game.boardConfig ?? null,
  secondary_purpose_ids: game.sub_purpose_ids ?? null,
};

const { data, error } = await db.rpc('upsert_game_content_v1', {
  p_payload: payload,
});

if (error || !data?.ok) {
  const errMsg = data?.error ?? error?.message ?? 'Unknown error';
  throw new Error(`Atomic upsert failed: ${errMsg} (code: ${data?.code ?? 'N/A'})`);
}

console.log(`[csv-import] db.write.done run=${importRunId} game=${game.game_key} counts=${JSON.stringify(data.counts)}`);
```

### Payload Transformation Notes

| Route.ts Field | DB Column | Transformation |
|----------------|-----------|----------------|
| `artifactRows.description` | `game_artifacts.description` | Direct (NOT 'body') |
| `stepRows.body` | `game_steps.body` | Direct |
| `trigger.condition` | `game_triggers.condition` | Singular JSONB |
| `trigger.enabled` | `game_triggers.enabled` | Direct |
| `trigger.execute_once` | `game_triggers.execute_once` | Direct |
| `trigger.sort_order` | `game_triggers.sort_order` | Direct |

---

## 7. Observability: importRunId

### Generering (route)

```typescript
const importRunId = randomUUID();
console.log(`[csv-import] import.start run=${importRunId} games=${games.length}`);
```

### Loggning (RPC)

```sql
RAISE LOG 'upsert_game_content run=% game=% is_update=%', 
  p_import_run_id, p_game_id, p_is_update;
```

### Korrelation

| Layer | Log Format |
|-------|------------|
| Route | `import.start run=abc123 games=5` |
| Route | `preflight.ok run=abc123 game=GAME-001` |
| RPC | `upsert_game_content run=abc123 game=uuid is_update=true` |
| Route | `db.write.done run=abc123 game=GAME-001` |

---

## 8. Tripwire Tests: Atomicity

### Test 1: Simulera constraint-fel

```typescript
it('should rollback all changes if insert fails mid-way', async () => {
  // Setup: Create game with valid content
  const gameId = await createTestGame();
  const originalCounts = await getGameContentCounts(gameId);
  
  // Act: Attempt update with invalid data (e.g., duplicate step_order in payload)
  const invalidPayload = {
    ...validPayload,
    p_artifacts: [
      { id: uuid(), artifact_order: 1, ... },
      { id: uuid(), artifact_order: 1, ... },  // Duplicate!
    ]
  };
  
  const { data, error } = await db.rpc('upsert_game_content', invalidPayload);
  
  // Assert: RPC reports failure
  expect(data?.ok ?? false).toBe(false);
  
  // Assert: Game content is UNCHANGED
  const afterCounts = await getGameContentCounts(gameId);
  expect(afterCounts).toEqual(originalCounts);
});
```

### Test 2: Simulera network timeout (mockad)

```typescript
it('should not leave partial state on timeout', async () => {
  // This is harder to test in unit tests — integration test recommended
  // Use pg_sleep() or manual transaction abort
});
```

### Test 3: Verifiera delete-order respekterar FK

```typescript
it('should delete variants before artifacts', async () => {
  // Setup: Create game with artifacts + variants
  const gameId = await createGameWithVariants();
  
  // Act: Run update
  const { data } = await db.rpc('upsert_game_content', {
    p_game_id: gameId,
    p_is_update: true,
    p_artifacts: [{ id: uuid(), artifact_order: 1, variants: [] }],
    ...
  });
  
  // Assert: Success (no FK violation)
  expect(data?.ok).toBe(true);
});
```

---

## 9. Migration File Outline (KORRIGERAD efter schema-verifiering)

```sql
-- =============================================================================
-- Migration: 20260201000000_atomic_game_upsert.sql
-- Description: Atomic upsert for game content import
-- =============================================================================
-- 
-- Schema verified against: lib/supabase/database.types.ts (2026-02-01)
--
-- Guarantees:
--   - Either all changes commit, or nothing changes
--   - Delete order respects FK constraints
--   - Pre-generated UUIDs from app layer are used (no ID re-generation)
--
-- Security:
--   - SECURITY DEFINER with explicit auth checks
--   - Tenant ownership verified before any writes
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_game_content_v1(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_game_id UUID;
  v_is_update BOOLEAN;
  v_import_run_id UUID;
  v_step_count INT := 0;
  v_phase_count INT := 0;
  v_artifact_count INT := 0;
  v_trigger_count INT := 0;
  v_role_count INT := 0;
BEGIN
  -- ==========================================================================
  -- 0. Extract payload fields
  -- ==========================================================================
  v_game_id := (p_payload->>'game_id')::UUID;
  v_is_update := COALESCE((p_payload->>'is_update')::BOOLEAN, false);
  v_import_run_id := (p_payload->>'import_run_id')::UUID;

  -- ==========================================================================
  -- 1. Auth + Tenant validation
  -- ==========================================================================
  -- NOTE: Om route.ts använder service_role är auth.uid() NULL.
  -- I det fallet måste vi lita på att route redan har gjort auth-check.
  -- Alternativt: ta emot p_actor_user_id i payload.
  
  SELECT owner_tenant_id INTO v_tenant_id
  FROM games WHERE id = v_game_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Game not found', 'code', 'GAME_NOT_FOUND');
  END IF;

  -- ==========================================================================
  -- 2. Log start
  -- ==========================================================================
  RAISE LOG 'upsert_game_content_v1 run=% game=% is_update=%', 
    COALESCE(v_import_run_id::text, 'null'), v_game_id, v_is_update;

  -- ==========================================================================
  -- 3. Delete existing content (if update)
  -- ==========================================================================
  IF v_is_update THEN
    -- Delete in FK-safe order (leaf → parent)
    -- 1. Variants (refs artifacts + roles)
    DELETE FROM game_artifact_variants WHERE artifact_id IN (
      SELECT id FROM game_artifacts WHERE game_id = v_game_id
    );
    -- 2. Triggers
    DELETE FROM game_triggers WHERE game_id = v_game_id;
    -- 3. Artifacts
    DELETE FROM game_artifacts WHERE game_id = v_game_id;
    -- 4. Steps (refs phases)
    DELETE FROM game_steps WHERE game_id = v_game_id;
    -- 5. Phases
    DELETE FROM game_phases WHERE game_id = v_game_id;
    -- 6. Roles (refs from variants already deleted)
    DELETE FROM game_roles WHERE game_id = v_game_id;
    -- 7. Materials
    DELETE FROM game_materials WHERE game_id = v_game_id;
    -- 8. Board config
    DELETE FROM game_board_config WHERE game_id = v_game_id;
    -- 9. Secondary purposes
    DELETE FROM game_secondary_purposes WHERE game_id = v_game_id;
  END IF;

  -- ==========================================================================
  -- 4. Insert new content (parent → leaf order)
  -- ==========================================================================
  
  -- 4a. Phases (before steps, since steps reference phases)
  IF p_payload->'phases' IS NOT NULL AND jsonb_array_length(p_payload->'phases') > 0 THEN
    INSERT INTO game_phases (
      id, game_id, phase_order, name, phase_type, 
      duration_seconds, timer_visible, timer_style,
      description, board_message, auto_advance, locale
    )
    SELECT 
      (ph->>'id')::UUID,
      v_game_id,
      (ph->>'phase_order')::INT,
      ph->>'name',
      COALESCE(ph->>'phase_type', 'round'),
      (ph->>'duration_seconds')::INT,
      COALESCE((ph->>'timer_visible')::BOOLEAN, true),
      COALESCE(ph->>'timer_style', 'countdown'),
      ph->>'description',
      ph->>'board_message',
      COALESCE((ph->>'auto_advance')::BOOLEAN, false),
      ph->>'locale'
    FROM jsonb_array_elements(p_payload->'phases') AS ph;
    
    GET DIAGNOSTICS v_phase_count = ROW_COUNT;
  END IF;

  -- 4b. Steps
  IF p_payload->'steps' IS NOT NULL AND jsonb_array_length(p_payload->'steps') > 0 THEN
    INSERT INTO game_steps (
      id, game_id, step_order, title, body,
      duration_seconds, leader_script, participant_prompt,
      board_text, optional, locale, phase_id, conditional, media_ref, display_mode
    )
    SELECT 
      (s->>'id')::UUID,
      v_game_id,
      (s->>'step_order')::INT,
      s->>'title',
      s->>'body',
      (s->>'duration_seconds')::INT,
      s->>'leader_script',
      s->>'participant_prompt',
      s->>'board_text',
      COALESCE((s->>'optional')::BOOLEAN, false),
      s->>'locale',
      (s->>'phase_id')::UUID,
      s->>'conditional',
      (s->>'media_ref')::UUID,
      s->>'display_mode'
    FROM jsonb_array_elements(p_payload->'steps') AS s;
    
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
  END IF;

  -- 4c. Roles (before artifacts/variants, since variants reference roles)
  IF p_payload->'roles' IS NOT NULL AND jsonb_array_length(p_payload->'roles') > 0 THEN
    INSERT INTO game_roles (
      game_id, role_order, name, icon, color,
      public_description, private_instructions, private_hints,
      min_count, max_count, assignment_strategy, scaling_rules, conflicts_with, locale
    )
    SELECT 
      v_game_id,
      (r->>'role_order')::INT,
      r->>'name',
      r->>'icon',
      r->>'color',
      r->>'public_description',
      r->>'private_instructions',
      r->>'private_hints',
      COALESCE((r->>'min_count')::INT, 1),
      (r->>'max_count')::INT,
      COALESCE(r->>'assignment_strategy', 'random'),
      r->'scaling_rules',
      CASE 
        WHEN r->'conflicts_with' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(r->'conflicts_with'))::UUID[]
        ELSE '{}'::UUID[]
      END,
      r->>'locale'
    FROM jsonb_array_elements(p_payload->'roles') AS r;
    
    GET DIAGNOSTICS v_role_count = ROW_COUNT;
  END IF;

  -- 4d. Materials
  IF p_payload->'materials' IS NOT NULL THEN
    INSERT INTO game_materials (game_id, items, safety_notes, preparation, locale)
    VALUES (
      v_game_id,
      CASE 
        WHEN p_payload->'materials'->'items' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'materials'->'items'))
        ELSE '{}'::TEXT[]
      END,
      p_payload->'materials'->>'safety_notes',
      p_payload->'materials'->>'preparation',
      p_payload->'materials'->>'locale'
    );
  END IF;

  -- 4e. Board config
  IF p_payload->'board_config' IS NOT NULL THEN
    INSERT INTO game_board_config (
      game_id, show_game_name, show_current_phase, show_timer,
      show_participants, show_public_roles, show_leaderboard, show_qr_code,
      welcome_message, theme, background_color, layout_variant, locale, background_media_id
    )
    VALUES (
      v_game_id,
      COALESCE((p_payload->'board_config'->>'show_game_name')::BOOLEAN, true),
      COALESCE((p_payload->'board_config'->>'show_current_phase')::BOOLEAN, true),
      COALESCE((p_payload->'board_config'->>'show_timer')::BOOLEAN, true),
      COALESCE((p_payload->'board_config'->>'show_participants')::BOOLEAN, true),
      COALESCE((p_payload->'board_config'->>'show_public_roles')::BOOLEAN, true),
      COALESCE((p_payload->'board_config'->>'show_leaderboard')::BOOLEAN, false),
      COALESCE((p_payload->'board_config'->>'show_qr_code')::BOOLEAN, false),
      p_payload->'board_config'->>'welcome_message',
      COALESCE(p_payload->'board_config'->>'theme', 'neutral'),
      p_payload->'board_config'->>'background_color',
      COALESCE(p_payload->'board_config'->>'layout_variant', 'standard'),
      p_payload->'board_config'->>'locale',
      (p_payload->'board_config'->>'background_media_id')::UUID
    );
  END IF;

  -- 4f. Secondary purposes
  IF p_payload->'secondary_purpose_ids' IS NOT NULL 
     AND jsonb_array_length(p_payload->'secondary_purpose_ids') > 0 THEN
    INSERT INTO game_secondary_purposes (game_id, purpose_id)
    SELECT v_game_id, (pid)::UUID
    FROM jsonb_array_elements_text(p_payload->'secondary_purpose_ids') AS pid;
  END IF;

  -- 4g. Artifacts (NOTE: uses 'description' column, not 'body')
  IF p_payload->'artifacts' IS NOT NULL AND jsonb_array_length(p_payload->'artifacts') > 0 THEN
    INSERT INTO game_artifacts (
      id, game_id, artifact_order, artifact_type, title, description, metadata, tags, locale
    )
    SELECT 
      (a->>'id')::UUID,
      v_game_id,
      (a->>'artifact_order')::INT,
      COALESCE(a->>'artifact_type', 'card'),
      a->>'title',
      a->>'description',  -- NOT 'body'
      COALESCE(a->'metadata', '{}'::JSONB),
      CASE 
        WHEN a->'tags' IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(a->'tags'))
        ELSE '{}'::TEXT[]
      END,
      a->>'locale'
    FROM jsonb_array_elements(p_payload->'artifacts') AS a;
    
    GET DIAGNOSTICS v_artifact_count = ROW_COUNT;

    -- 4h. Variants (nested inside artifacts)
    INSERT INTO game_artifact_variants (
      artifact_id, visibility, visible_to_role_id, title, body, media_ref, variant_order, metadata
    )
    SELECT 
      (a->>'id')::UUID,
      COALESCE(v->>'visibility', 'public'),
      (v->>'visible_to_role_id')::UUID,
      v->>'title',
      v->>'body',
      (v->>'media_ref')::UUID,
      COALESCE((v->>'variant_order')::INT, 0),
      COALESCE(v->'metadata', '{}'::JSONB)
    FROM jsonb_array_elements(p_payload->'artifacts') AS a,
         jsonb_array_elements(COALESCE(a->'variants', '[]'::JSONB)) AS v
    WHERE jsonb_array_length(COALESCE(a->'variants', '[]'::JSONB)) > 0;
  END IF;

  -- 4i. Triggers (NOTE: uses 'condition' singular, 'enabled', 'execute_once', 'sort_order')
  IF p_payload->'triggers' IS NOT NULL AND jsonb_array_length(p_payload->'triggers') > 0 THEN
    INSERT INTO game_triggers (
      id, game_id, name, description, enabled, condition, actions, 
      execute_once, delay_seconds, sort_order
    )
    SELECT 
      (t->>'id')::UUID,
      v_game_id,
      t->>'name',
      t->>'description',
      COALESCE((t->>'enabled')::BOOLEAN, true),
      t->'condition',  -- singular JSONB, NOT 'conditions'
      COALESCE(t->'actions', '[]'::JSONB),
      COALESCE((t->>'execute_once')::BOOLEAN, false),
      COALESCE((t->>'delay_seconds')::INT, 0),
      COALESCE((t->>'sort_order')::INT, 0)
    FROM jsonb_array_elements(p_payload->'triggers') AS t;
    
    GET DIAGNOSTICS v_trigger_count = ROW_COUNT;
  END IF;

  -- ==========================================================================
  -- 5. Return success
  -- ==========================================================================
  RETURN jsonb_build_object(
    'ok', true,
    'counts', jsonb_build_object(
      'steps', v_step_count,
      'phases', v_phase_count,
      'artifacts', v_artifact_count,
      'triggers', v_trigger_count,
      'roles', v_role_count
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK happens here
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION public.upsert_game_content_v1 IS 
  'Atomic upsert for game content. Either all changes commit, or nothing changes. v1: 2026-02-01';

-- Grant to service role (used by import route)
GRANT EXECUTE ON FUNCTION public.upsert_game_content_v1 TO service_role;
-- Grant to authenticated for potential direct admin use
GRANT EXECUTE ON FUNCTION public.upsert_game_content_v1 TO authenticated;
```

---

## 10. Definition of Done (DoD)

### Funktionalitet

- [ ] RPC `upsert_game_content` skapad och deployad
- [ ] Route.ts använder RPC istället för 16+ calls
- [ ] `isUpdate=true` → atomic delete+insert
- [ ] `isUpdate=false` → atomic insert only
- [ ] Pre-generated UUIDs från pre-flight används (inte re-genererade)

### Säkerhet

- [ ] Auth check (`auth.uid() IS NOT NULL`)
- [ ] Tenant ownership check
- [ ] Role check (tenant_admin / system_admin)
- [ ] SECURITY DEFINER med explicit `SET search_path = public`

### Observability

- [ ] `importRunId` genereras i route
- [ ] `importRunId` skickas till RPC
- [ ] `RAISE LOG` i RPC med run/game/is_update
- [ ] Log markers: `import.start`, `preflight.ok`, `db.write.done`

### Tester

- [ ] Tripwire: constraint-fel → rollback, oförändrat state
- [ ] Tripwire: FK-ordning respekteras (variants före artifacts)
- [ ] Tripwire: auth-fel returnerar `{ok: false}` utan writes
- [ ] Integration: fullständig import → korrekt content counts

### Dokumentation

- [ ] IMPORT_ATOMICITY_PLAN.md uppdaterad med "DONE" status
- [ ] IMPORT_METADATA_RISK_REPORT.md sektion 14-15 uppdaterad

---

## 11. Risklista

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| **RPC kringgår RLS** | Hög (SECURITY DEFINER) | Kritisk | Explicit auth/tenant checks i RPC |
| **JSONB schema drift** | Medium | Hög | Contract tests för RPC input format |
| **FK constraint miss** | Låg | Kritisk | Unit test: delete/insert order |
| **Timeout på stora games** | Låg | Medium | Sätt `statement_timeout` per query |
| **Error message exposure** | Medium | Medium | Sanera `SQLERRM` innan return |

---

## 12. Rollback Plan

Om RPC orsakar problem i produktion:

1. **Omedelbar rollback**: Deploya route.ts utan RPC-call (behåll gamla 16+ calls)
2. **Drop function**: `DROP FUNCTION IF EXISTS public.upsert_game_content;`
3. **Verifiera**: Kör befintliga import-tester

RPC-funktionen har inga schema-ändringar — den läser/skriver samma tabeller som innan.

---

## 13. Implementation Checklist

### Steg 1: Migration file ✅ DONE 2026-02-01
- [x] Skapa `supabase/migrations/20260201000000_atomic_game_upsert.sql`
- [x] Verifiera FK-ordning i DELETE (variants → triggers → artifacts → steps → phases → roles → materials → board_config → secondary_purposes)
- [x] Verifiera column-mappning mot aktuella tabeller (alla 9 tabeller)
- [x] Fix: Lägg till `id` i game_roles INSERT (krävs för visible_to_role_id)
- [x] Deploy till staging ✅ DONE 2026-02-01

### Steg 2: Route integration ✅ DONE 2026-02-01
- [x] Pre-generera role IDs (nytt!)
- [x] Pre-resolve `visible_to_role_id` i variants INNAN RPC
- [x] Byt 16+ writes → 1 RPC-call (`upsert_game_content_v1`)
- [x] Logga `importRunId` med varje write
- [x] Uppdatera tester för nya arkitekturen (60/60 pass)

### Steg 3: Tests ✅ DONE 2026-02-01
- [x] preflightOrder.test.ts: uppdaterad för RPC-boundary
- [x] Nya tripwire: "no direct writes" (regex guard mot .insert/.delete)
- [x] Nya tripwire: role ID pre-generation + visible_to_role_id resolution
- [x] Alla 67 tester passerar (unit)

### Steg 4: DB Integration Proof ✅ DONE 2026-02-01
- [x] Fix: Auth check med JWT claims istället för `current_user`
- [x] Fix: `private_instructions` NOT NULL default till empty string
- [x] `tests/integration/import/atomicUpsert.test.ts` skapad
- [x] Atomic rollback proof: FK fail → counts oförändrade ✅
- [x] Happy path create: full payload med tags, materials, variants, triggers ✅
- [x] Update path success: isUpdate=true → old content replaced ✅
- [x] Auth guards: TENANT_MISMATCH, GAME_NOT_FOUND, MISSING_GAME_ID ✅
- [x] Edge cases: empty arrays, materials without items ✅
- [x] **9/9 integrationstester passerar** 🎉

### Steg 5: Observability ✅ DONE 2026-02-02
- [x] `importRunId` genereras per request (inte per game)
- [x] `importRunId` trådat genom hela flödet (POST → importRelatedData → RPC)
- [x] `importRunId` returneras i API-response (success + error)
- [x] Standardiserade log markers:
  - `import.start run=<id>`
  - `db.write.begin run=<id> game=<key>`
  - `db.write.done run=<id> game=<key> counts={...}`
  - `import.done run=<id> total=X created=X updated=X failed=X`
- [x] `import.fail` logg vid 500-fel

### Steg 6: RLS/Security Audit ✅ DONE 2026-02-02
- [x] **Audit**: Granskat grants på `upsert_game_content_v1`
- [x] **Problem identifierat**: `authenticated` hade execute-rättighet → risk för direkt RPC-anrop
- [x] **Fix**: `20260202000000_revoke_authenticated_from_atomic_rpc.sql`
  - `REVOKE execute FROM authenticated`
  - Endast `service_role` kan nu köra RPC:n
- [x] **Defense in depth**:
  1. GRANT: Endast service_role
  2. SQL guard: ~~auth.uid() OR~~ service_role JWT check only (förenklad 2026-02-02)
  3. Tenant guard: expected_tenant_id vs owner_tenant_id
- [x] **Auth guard förenklad**: `20260202000001_simplify_auth_guard.sql`
  - Borttagning av `auth.uid()` fallback (skapade semantisk bakdörr-risk)
  - Nu endast: `if v_jwt_role <> 'service_role' then return SERVICE_ROLE_ONLY`
  - Ändrat felkod från `AUTH_REQUIRED` → `SERVICE_ROLE_ONLY`
- [x] **Integrationstest**: anon client → fail, counts oförändrade ✅
- [x] **10/10 integrationstester passerar** 🎉

### Steg 7: DX/Typings ✅ DONE 2026-02-02
- [x] `supabase gen types typescript` uppdaterade types/supabase.ts
- [x] `upsert_game_content_v1` finns nu i genererade typer
- [x] `UpsertRpcResult` interface i route.ts för type-safe RPC-hantering
- [x] Inga TS-fel i csv-import/route.ts

### Steg 8: Performance Envelope ✅ DONE 2026-02-02
- [x] Skapad `tests/integration/import/largeGamePerf.test.ts`
- [x] **4/4 performance tests passerar**

**Baseline resultat:**

| Test | RPC Time | Payload Size | Counts |
|------|----------|--------------|--------|
| Medium Game | ~650 ms | 0.80 MB | 20 phases, 100 steps, 500 artifacts, 2000 variants |
| Large Game | ~1350 ms | 1.82 MB | 200 phases, 400 steps, 1000 artifacts, 4000 variants, 500 triggers |
| Large UPDATE | ~1500 ms | 0.94 MB | Delete + re-insert 100 phases, 300 steps, 500 artifacts, 2000 variants |

**Thresholds:**
- Medium game: < 10s
- Large game: < 30s
- Max payload: < 10 MB

---

## Sammanfattning: Locked Contracts

| Kontrakt | Beskrivning | Test Coverage |
|----------|-------------|---------------|
| **Metadata Gate** | normalize + validate, HARD/conditional/quality gates | 48 unit tests |
| **Trigger Rewrite** | Pre-flight ref resolution, typed ImportError[] | 19 unit tests |
| **Pre-flight Order** | Inga writes innan preflight + collision checks | Tripwire tests |
| **Atomicity** | 1 RPC boundary, FK fail → full rollback | 10 integration tests |
| **Observability** | Request-scoped importRunId, structured logs | Manual + code review |
| **RLS Security** | service_role only, tenant guard | 1 integration test |
| **Performance** | Baseline + thresholds för large games | 4 performance tests |

**Total: 67 unit + 14 integration = 81 tests** 🎉

---

## Import Idempotency Policy

> **Status**: Policy A (Strict Replace) — aktiv sedan 2026-02-02  
> **Beslut**: Dokumenterat nedan. Ingen kodändring krävs.

### Frågan

> *Vad betyder "samma import två gånger"?*

### Nuvarande beteende

- `randomUUID()` genereras för alla entities vid varje import
- `is_update=true` → DELETE all existing + INSERT new
- Varje import skapar **ny verklighet** (nya UUIDs)
- Re-import = ny content-version, inte idempotent

### Policy-alternativ

| Policy | Beskrivning | Komplexitet | Status |
|--------|-------------|-------------|--------|
| **A) Strict Replace** | Varje import är sanningen. Nya UUIDs varje gång. | Låg | ✅ **AKTIV** |
| **B) Key-based Idempotency** | IDs deterministiska via `hash(game_id + entity_type + order)`. Samma CSV → samma IDs. | Medium | ⏳ Planerad |
| **C) Versioned Imports** | Import skapar version N+1. Rollback möjlig. | Hög | ❌ Ej planerad |

### Policy A: Strict Replace (AKTIV)

**Konsekvenser:**
- ✅ Enkelt och robust
- ✅ Inga extra beroenden
- ✅ Atomiskt via RPC
- ⚠️ Dubbelklick/retry skapar duplicerad import
- ⚠️ Ingen idempotency-garanti för klienter

**Skydd mot oavsiktlig re-import:**
- UI bör visa "Importerar..." loading state
- UI bör disable import-knapp under pågående import
- API returnerar `importRunId` för debugging

**Dokumenterad acceptans:**
> Vi accepterar att re-import skapar ny content-version. 
> Detta är korrekt beteende för "source of truth = CSV".
> UI ansvarar för att förhindra oavsiktliga dubbelklick.

### Policy B: Key-based Idempotency (FRAMTIDA)

**När det behövs:**
- Om import-API:t exponeras externt (webhook, integration)
- Om retry-logik behövs i batch-jobb
- Om samma CSV måste kunna importeras flera gånger utan sidoeffekter

**Implementation (skiss):**
```typescript
// Deterministiskt ID baserat på position
function generateDeterministicId(gameId: string, entityType: string, orderIndex: number): string {
  const input = `${gameId}:${entityType}:${orderIndex}`;
  return uuidv5(input, NAMESPACE_UUID);
}
```

**Konsekvenser:**
- ✅ Samma CSV → exakt samma databas-state
- ✅ Retry-safe
- ⚠️ Order-ändringar i CSV → nya IDs
- ⚠️ Kräver beslut om NAMESPACE_UUID

**Status:** Ej implementerad. Dokumenterad för framtida iteration.

---

## Failure-UX (Frontend Policy)

> **Status**: Ej implementerad. Dokumenterad för frontend-team.

### Krav

1. **Visa alla fel på en gång** — inte bara första
2. **Klickbar rad/kolumn** — länka till CSV-position
3. **Kategorisera fel** — HARD vs SOFT vs QUALITY
4. **Partial success** — om flera games: visa per-game status

### Teknisk grund

Backend returnerar redan:
```typescript
interface ImportResult {
  ok: boolean;
  importRunId: string;
  errors: ImportError[];      // Typed, med row/column
  warnings: ImportWarning[];  // Soft issues
  stats: { games: number, steps: number, ... };
}
```

Frontend-implementation: **TBD av UI-team**.

---

## Import History (Strategiskt, ej bråttom)

> **Status**: Ej implementerad. Lågprioritet.

### Värde

- Support kan se "vad hände vid import X?"
- Admin kan se senaste imports per game
- Audit trail för compliance

### Möjlig implementation

```sql
CREATE TABLE import_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  game_id UUID REFERENCES games(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT, -- 'success' | 'partial' | 'failed'
  error_count INT,
  warning_count INT,
  stats JSONB
);
```

**Status:** Ej planerad. Lägg till om/när admin-UI behöver det.

---

## Nästa steg (framtida)

- [x] ~~Idempotency policy beslut~~ → Policy A dokumenterad
- [ ] Frontend: Failure-UX implementation
- [ ] (Låg prio) `import_runs` tabell för historik

---

*Skapad 2026-02-01. Schema verifierad 2026-02-01. Performance baseline 2026-02-02. Idempotency policy 2026-02-02. Status: PRODUCTION-READY.*
