# Game Builder P2 - Implementation Plan
## Faser, Roller & Publik Tavla

**Version:** 1.2  
**Date:** 2025-12-16  
**Status:** Session 1 & 2 Complete  
**Estimated Effort:** ~3 sessions (4-6h each)

---

## Progress Tracker

| Session | Feature | Status | Notes |
|---------|---------|--------|-------|
| Session 1 | Faser & Rundor | ✅ Complete | Migration pushed, PhaseEditor integrated |
| Session 2 | Roller | ✅ Complete | Migration pushed, RoleEditor integrated |
| Session 3 | Publik Tavla | ✅ Complete | Migration pushed, BoardEditor integrated |

---

## 0. Data Model Clarifications (Codex Review)

Before implementation, these schema facts are verified:

| Aspect | Correct Value | Notes |
|--------|---------------|-------|
| Tenant column on `games` | `owner_tenant_id` | NOT `tenant_id` |
| Sessions table | `participant_sessions` | NOT `play_sessions` |
| Participants table | `participants` | References `participant_sessions.id` |
| Media table | `game_media` | Exists, has `game_id` FK |
| `phase_id` on `game_steps` | Already exists (P0) | Reserved, needs FK added |

### Locale Strategy
- `locale = NULL` means default/fallback language
- API fetching: prefer exact locale match, fall back to `locale IS NULL`
- Example query pattern:
  ```sql
  SELECT * FROM game_phases
  WHERE game_id = $1 
  AND (locale = $2 OR locale IS NULL)
  ORDER BY locale NULLS LAST, phase_order
  ```

### API Contract (Upsert Pattern)
- **PUT replaces entire list** for phases/roles/boardConfig
- No partial merge - client sends complete state
- Server deletes all existing, inserts new batch
- Wrapped in transaction for atomicity

---

## 1. Overview

### 1.1 Scope
Implement three advanced Game Builder sections that are currently placeholders:

| Feature | Description | Complexity | Priority |
|---------|-------------|------------|----------|
| **Faser & Rundor** | Phase/round structure with timers | Medium | P2a |
| **Roller** | Role cards with secret instructions | High | P2b |
| **Publik Tavla** | Public board/display configuration | Medium | P2c |

### 1.2 Dependencies
- [x] P0: `game_steps`, `game_materials` tables exist
- [x] P1: Three-column builder UI implemented
- [x] `play_mode` column exists on `games` table
- [x] @dnd-kit installed (v6.3.1) for drag-and-drop
- [x] `game_media` table exists for media references
- [x] `participant_sessions` + `participants` tables exist

### 1.3 Guiding Principles
1. **Progressive Disclosure:** Advanced sections only appear when `play_mode != 'basic'`
2. **Non-Breaking:** All changes are additive - existing games continue to work
3. **Locale-Ready:** All new tables support `locale` column for i18n
4. **RLS by Default:** Every table gets Row Level Security policies
5. **Use `owner_tenant_id`:** All RLS policies reference games.owner_tenant_id

---

## 2. Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│  Session 1: Faser & Rundor                                     │
│  ├── 1. Database migration (game_phases table)                 │
│  ├── 2. API routes (/api/games/builder phases support)         │
│  ├── 3. PhaseEditor component                                  │
│  └── 4. Integration + test                                     │
├─────────────────────────────────────────────────────────────────┤
│  Session 2: Roller                                             │
│  ├── 1. Database migration (game_roles, role assignments)      │
│  ├── 2. API routes (roles CRUD)                                │
│  ├── 3. RoleCardGrid + RoleEditDialog components               │
│  └── 4. Integration + test                                     │
├─────────────────────────────────────────────────────────────────┤
│  Session 3: Publik Tavla                                       │
│  ├── 1. Database migration (game_board_config)                 │
│  ├── 2. API routes (board config)                              │
│  ├── 3. BoardEditor + BoardPreview components                  │
│  └── 4. Integration + end-to-end test                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Session 1: Faser & Rundor

### 3.1 Database Schema

```sql
-- Migration: 20251216020000_game_phases.sql

-- Game phases table
CREATE TABLE IF NOT EXISTS public.game_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,  -- null = default language
  
  -- Phase metadata
  name TEXT NOT NULL,
  phase_type TEXT NOT NULL DEFAULT 'round', -- 'intro' | 'round' | 'finale' | 'break'
  phase_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  duration_seconds INTEGER,          -- null = no timer
  timer_visible BOOLEAN DEFAULT true,
  timer_style TEXT DEFAULT 'countdown', -- 'countdown' | 'elapsed' | 'trafficlight'
  
  -- Content overrides
  description TEXT,
  board_message TEXT,               -- shown on public display during this phase
  
  -- Behavior
  auto_advance BOOLEAN DEFAULT false, -- auto-progress when timer ends
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_game_phases_game_order ON public.game_phases(game_id, phase_order);
CREATE INDEX idx_game_phases_locale ON public.game_phases(locale) WHERE locale IS NOT NULL;

-- Update trigger
CREATE TRIGGER trg_game_phases_updated
BEFORE UPDATE ON public.game_phases
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Link steps to phases (FK already reserved as phase_id)
ALTER TABLE public.game_steps
  ADD CONSTRAINT fk_game_steps_phase
  FOREIGN KEY (phase_id) REFERENCES public.game_phases(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.game_phases ENABLE ROW LEVEL SECURITY;

-- Policy: same as game_steps (inherit from parent game)
CREATE POLICY "game_phases_select" ON public.game_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_phases.game_id
      AND (g.status = 'published' OR g.owner_tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_memberships
        WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "game_phases_insert" ON public.game_phases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "game_phases_update" ON public.game_phases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "game_phases_delete" ON public.game_phases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_phases.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
  );

COMMENT ON TABLE public.game_phases IS 'Phase/round structure for games (builder P2)';
```

### 3.2 TypeScript Types

```typescript
// types/games.ts (additions)

export type PhaseType = 'intro' | 'round' | 'finale' | 'break';
export type TimerStyle = 'countdown' | 'elapsed' | 'trafficlight';

export type GamePhase = {
  id: string;
  game_id: string;
  locale: string | null;
  name: string;
  phase_type: PhaseType;
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string | null;
  board_message: string | null;
  auto_advance: boolean;
  created_at: string;
  updated_at: string;
};

// For form state
export type PhaseFormData = Omit<GamePhase, 'id' | 'game_id' | 'created_at' | 'updated_at'>;
```

### 3.3 API Changes

**Extend `/api/games/builder/[id]` GET response:**
```typescript
{
  game: { ... },
  steps: [...],
  materials: { ... },
  phases: GamePhase[]  // NEW
}
```

**Extend `/api/games/builder/[id]` PUT body:**
```typescript
{
  core: { ... },
  steps: [...],
  materials: { ... },
  phases: PhaseFormData[]  // NEW
}
```

### 3.4 UI Components

```
app/admin/games/builder/components/
├── PhaseEditor.tsx          # Main phase editor section
├── PhaseTimeline.tsx        # Visual timeline of phases
├── PhaseCard.tsx            # Single phase card
├── PhaseEditDrawer.tsx      # Drawer for editing phase details
└── index.ts                 # Updated exports
```

**PhaseEditor wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Faser & Rundor                                                │
│  Dela upp leken i tydliga faser med egna tidsbegränsningar.   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timeline:  [Intro] → [Runda 1] → [Runda 2] → [+ Runda] → [Finale]
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📍 Intro                                      5 min    │   │
│  │    Välkomna alla och förklara reglerna       [✎] [✕]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📍 Runda 1                                   10 min    │   │
│  │    Första rundan – alla letar ledtrådar     [✎] [✕]   │   │
│  │    3 steg länkade                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Lägg till fas]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Step Integration

Steps can be linked to phases:
- In StepEditor drawer, add "Fas" dropdown
- Filter steps by phase in view
- Steps without phase appear in "Generella steg"

---

## 4. Session 2: Roller

### 4.1 Database Schema

```sql
-- Migration: 20251216030000_game_roles.sql

-- Role definitions per game
CREATE TABLE IF NOT EXISTS public.game_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,
  
  -- Identity
  name TEXT NOT NULL,
  icon TEXT,                         -- emoji or icon name
  color TEXT,                        -- hex color for UI
  role_order INTEGER NOT NULL DEFAULT 0,
  
  -- Public info (visible to everyone)
  public_description TEXT,
  
  -- Private info (only visible to role holder)
  private_instructions TEXT NOT NULL,
  private_hints TEXT,
  
  -- Assignment rules
  min_count INTEGER NOT NULL DEFAULT 1,
  max_count INTEGER,                 -- null = unlimited
  assignment_strategy TEXT DEFAULT 'random', -- 'random' | 'leader_picks' | 'player_picks'
  
  -- Scaling recommendations
  scaling_rules JSONB,               -- e.g. {"10": 1, "20": 2} players -> count
  
  -- Conflicts (cannot be combined with these roles)
  conflicts_with UUID[],             -- array of role IDs
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role assignments in participant sessions (uses existing participant_sessions table)
CREATE TABLE IF NOT EXISTS public.participant_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.game_roles(id) ON DELETE CASCADE,
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id), -- null = system/random
  revealed_at TIMESTAMPTZ,           -- when role was shown to public
  
  UNIQUE(session_id, participant_id, role_id)
);

-- Indexes
CREATE INDEX idx_game_roles_game_order ON public.game_roles(game_id, role_order);
CREATE INDEX idx_game_roles_game_locale ON public.game_roles(game_id, locale);
CREATE INDEX idx_role_assignments_session ON public.participant_role_assignments(session_id);
CREATE INDEX idx_role_assignments_participant ON public.participant_role_assignments(participant_id);

-- Update trigger
CREATE TRIGGER trg_game_roles_updated
BEFORE UPDATE ON public.game_roles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS (same pattern as phases)
ALTER TABLE public.game_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_role_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for game_roles (similar to phases)
CREATE POLICY "game_roles_select" ON public.game_roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_roles.game_id
    AND (g.status = 'published' OR g.owner_tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
    ))
  ));

CREATE POLICY "game_roles_modify" ON public.game_roles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
    WHERE g.id = game_roles.game_id
    AND m.user_id = auth.uid()
    AND m.role IN ('admin', 'editor')
  ));

-- Policies for assignments (participant can see own, leader can see all)
CREATE POLICY "role_assignments_select" ON public.participant_role_assignments FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_identifier = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_role_assignments.session_id
      AND ps.host_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.game_roles IS 'Role definitions for participant-based games (builder P2)';
COMMENT ON TABLE public.participant_role_assignments IS 'Runtime role assignments per session';
```

### 4.2 TypeScript Types

```typescript
// types/games.ts (additions)

export type AssignmentStrategy = 'random' | 'leader_picks' | 'player_picks';

export type GameRole = {
  id: string;
  game_id: string;
  locale: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  role_order: number;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: AssignmentStrategy;
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
  created_at: string;
  updated_at: string;
};

export type RoleFormData = Omit<GameRole, 'id' | 'game_id' | 'created_at' | 'updated_at'>;

export type RoleAssignment = {
  id: string;
  play_session_id: string;
  participant_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  revealed_at: string | null;
};
```

### 4.3 UI Components

```
app/admin/games/builder/components/
├── RoleEditor.tsx           # Main roles section
├── RoleCardGrid.tsx         # Grid of role cards
├── RoleCard.tsx             # Single role card preview
├── RoleEditDialog.tsx       # Full role edit dialog (modal)
└── index.ts                 # Updated exports
```

**RoleCard wireframe:**
```
┌─────────────────────────────────────┐
│  🎭 MÖRDARE                         │
│                                     │
│  En mystisk person...               │
│                                     │
│  Min: 1  Max: 1                     │
│  Tilldelning: Slumpmässig           │
│                                     │
│  [Redigera] [Kopiera] [✕]          │
└─────────────────────────────────────┘
```

**RoleEditDialog tabs:**
1. **Grundinfo** – Namn, ikon, färg
2. **Publik** – Vad alla ser
3. **Privat** – Hemliga instruktioner
4. **Regler** – Min/max, tilldelning, konflikter

---

## 5. Session 3: Publik Tavla

### 5.0 Codex Review Feedback (Applied)

| Item | Decision |
|------|----------|
| FK `background_media_id` | ✅ `game_media(id)` verified to exist |
| RLS | Use `owner_tenant_id` (not `tenant_id`), add `is_global_admin()` fallback |
| Upsert strategy | Delete+insert, documented that PUT replaces entire config |
| `custom_css` | **Removed for MVP** - XSS/layout risk, can add later with sanitization |
| Layout variants | Reduced to 2: `'standard' \| 'fullscreen'` (removed 'compact') |
| Themes | Keep 5 themes as planned |
| `show_leaderboard` | Keep as stub (no-op until leaderboard model exists) |
| QR-kod | Links to `/join/[code]` for participant join |
| Locale | `UNIQUE(game_id, locale)`, GET prefers exact then NULL |
| Quality checklist | Add "Board config exists" for participants-mode |

### 5.1 Database Schema

```sql
-- Migration: 20251216040000_game_board_config.sql

-- Board configuration per game
CREATE TABLE IF NOT EXISTS public.game_board_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  locale TEXT,
  
  -- Display elements (7 toggles)
  show_game_name BOOLEAN DEFAULT true,
  show_current_phase BOOLEAN DEFAULT true,
  show_timer BOOLEAN DEFAULT true,
  show_participants BOOLEAN DEFAULT true,
  show_public_roles BOOLEAN DEFAULT true,   -- no-op if no roles defined
  show_leaderboard BOOLEAN DEFAULT false,   -- stub until leaderboard model exists
  show_qr_code BOOLEAN DEFAULT false,       -- links to /join/[code]
  
  -- Custom content
  welcome_message TEXT,
  -- NOTE: custom_css removed for MVP (XSS/layout risk)
  
  -- Theming
  theme TEXT DEFAULT 'neutral',      -- 'mystery' | 'party' | 'sport' | 'nature' | 'neutral'
  background_media_id UUID REFERENCES public.game_media(id) ON DELETE SET NULL,
  background_color TEXT,             -- fallback hex color
  
  -- Layout (reduced to 2 variants)
  layout_variant TEXT DEFAULT 'standard', -- 'standard' | 'fullscreen'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(game_id, locale)
);

-- Index for locale lookups
CREATE INDEX idx_game_board_config_game_locale ON public.game_board_config(game_id, locale);

-- Update trigger
DROP TRIGGER IF EXISTS trg_game_board_config_updated ON public.game_board_config;
CREATE TRIGGER trg_game_board_config_updated
BEFORE UPDATE ON public.game_board_config
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.game_board_config ENABLE ROW LEVEL SECURITY;

-- Select: published games OR tenant members can see
DROP POLICY IF EXISTS "game_board_config_select" ON public.game_board_config;
CREATE POLICY "game_board_config_select" ON public.game_board_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_board_config.game_id
      AND (
        g.status = 'published'
        OR g.owner_tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
        )
      )
    )
    OR public.is_global_admin()
  );

-- Insert: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_insert" ON public.game_board_config;
CREATE POLICY "game_board_config_insert" ON public.game_board_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Update: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_update" ON public.game_board_config;
CREATE POLICY "game_board_config_update" ON public.game_board_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

-- Delete: editors/admins of tenant
DROP POLICY IF EXISTS "game_board_config_delete" ON public.game_board_config;
CREATE POLICY "game_board_config_delete" ON public.game_board_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.user_tenant_memberships m ON m.tenant_id = g.owner_tenant_id
      WHERE g.id = game_board_config.game_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'editor')
    )
    OR public.is_global_admin()
  );

COMMENT ON TABLE public.game_board_config IS 'Public display/projector configuration (builder P2)';
COMMENT ON COLUMN public.game_board_config.show_leaderboard IS 'Stub - awaiting leaderboard model';
COMMENT ON COLUMN public.game_board_config.show_qr_code IS 'QR links to /join/[code]';
```

### 5.2 TypeScript Types

```typescript
// types/games.ts (additions)

export type BoardTheme = 'mystery' | 'party' | 'sport' | 'nature' | 'neutral';
export type BoardLayout = 'standard' | 'fullscreen';  // removed 'compact'

export type GameBoardConfig = {
  id: string;
  game_id: string;
  locale: string | null;
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;   // no-op if no roles defined
  show_leaderboard: boolean;    // stub until leaderboard model
  show_qr_code: boolean;        // links to /join/[code]
  welcome_message: string | null;
  // NOTE: custom_css removed for MVP
  theme: BoardTheme;
  background_media_id: string | null;
  background_color: string | null;
  layout_variant: BoardLayout;
  created_at: string;
  updated_at: string;
};

// FormData excludes DB-generated fields
export type BoardConfigFormData = Omit<GameBoardConfig, 'id' | 'game_id' | 'created_at' | 'updated_at'>;
```

### 5.3 UI Components

```
app/admin/games/builder/components/
├── BoardEditor.tsx          # Main board config section (simplified)
├── BoardPreview.tsx         # Live preview with theme
└── index.ts                 # Updated exports
```

**BoardEditor wireframe (updated):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Publik Tavla                                                  │
│  Innehåll som visas på projektor/storskärm under spelet       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Förhandsgranskning                    [Standard] [Fullscreen] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │    ╔═══════════════════════════════════════════════╗    │   │
│  │    ║           MORDMYSTERIET                       ║    │   │
│  │    ║   Fas: Utredning            Tid kvar: 04:32   ║    │   │
│  │    ║   👤 12 deltagare           📲 Skanna för att │   │
│  │    ║                                 gå med        ║    │   │
│  │    ╚═══════════════════════════════════════════════╝    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Tavlaelement                                                   │
│  [✓] Visa spelnamn           [✓] Visa aktuell fas              │
│  [✓] Visa timer              [✓] Visa deltagare                │
│  [✓] Visa publika roller     [ ] Visa ledartavla (stub)        │
│  [ ] Visa QR-kod (/join/[code])                                │
│                                                                 │
│  Tema                                                           │
│  [🔍 Mysterium ●] [🎉 Fest] [⚽ Sport] [🌲 Natur] [⚪ Neutral]  │
│                                                                 │
│  Bakgrundsfärg                                                  │
│  [#1e293b ●] (color picker)                                    │
│                                                                 │
│  Välkomstmeddelande                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Välkomna till kvällens mysterium!                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️  Minst ett element måste visas eller välkomstmeddelande   │
│      anges för att tavlan ska sparas.                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 API Pattern

**GET returns:**
```typescript
boardConfig: GameBoardConfig | null  // null if never configured
```

**PUT uses delete+insert pattern:**
```typescript
// Replace entire config (documented behavior)
await supabase.from('game_board_config').delete().eq('game_id', id);
if (body.boardConfig) {
  // Validate: at least one element visible OR welcome_message set
  const bc = body.boardConfig;
  const hasContent = bc.show_game_name || bc.show_current_phase || 
    bc.show_timer || bc.show_participants || bc.show_public_roles || 
    bc.show_leaderboard || bc.show_qr_code || bc.welcome_message?.trim();
  
  if (hasContent) {
    await supabase.from('game_board_config').insert({ game_id: id, ...bc });
  }
}
```

---

## 6. API Consolidation

### 6.1 Extended Builder Endpoints

After all P2 work, the builder API looks like:

**GET `/api/games/builder/[id]`**
```typescript
{
  game: GameWithRelations,
  steps: GameStep[],
  materials: GameMaterials,
  phases: GamePhase[],      // P2a ✅
  roles: GameRole[],         // P2b ✅
  boardConfig: GameBoardConfig | null  // P2c
}
```

**PUT `/api/games/builder/[id]`**
```typescript
{
  core: CoreFormData,
  steps: StepFormData[],
  materials: MaterialsFormData,
  phases?: PhaseFormData[],        // P2a ✅
  roles?: RoleFormData[],          // P2b ✅
  boardConfig?: BoardConfigFormData // P2c
}
```

### 6.2 Save Strategy

Use upsert pattern for all sub-resources:
1. Delete all existing phases/roles/config for game
2. Insert new ones from form
3. Wrap in transaction

This is simpler than tracking individual edits and safe because builder always sends complete state.

---

## 7. Quality Checklist Updates

The QualityChecklist component needs to reflect new requirements:

### 7.1 For `play_mode = 'facilitated'`
- [ ] Minst 2 faser definierade
- [ ] Alla faser har tidsbegränsning

### 7.2 For `play_mode = 'participants'`
- [ ] Minst 2 roller definierade
- [ ] Alla roller har hemliga instruktioner
- [ ] Tavlakonfiguration skapad

---

## 8. Testing Checklist

### 8.1 Per Feature
- [ ] Create new game with feature
- [ ] Edit existing game, add feature
- [ ] Delete items (phases/roles)
- [ ] Reorder items (drag-and-drop)
- [ ] Save and reload – data persists
- [ ] Switch play_mode – sections show/hide correctly

### 8.2 Integration
- [ ] Play session picks up phases/roles
- [ ] Participant app shows role card
- [ ] Public board renders correctly
- [ ] Timer works in phases

### 8.3 Edge Cases
- [ ] Game with 0 phases in facilitated mode (warning)
- [ ] Role with max < min (validation error)
- [ ] Conflicting roles assigned to same person (blocked)

---

## 9. File Checklist

### 9.1 Migrations
- [ ] `20251216020000_game_phases.sql`
- [ ] `20251216030000_game_roles.sql`
- [ ] `20251216040000_game_board_config.sql`

### 9.2 Types
- [ ] `types/games.ts` – Add GamePhase, GameRole, GameBoardConfig

### 9.3 API
- [ ] `app/api/games/builder/[id]/route.ts` – Extend GET/PUT

### 9.4 Components
- [ ] `PhaseEditor.tsx`
- [ ] `PhaseTimeline.tsx`
- [ ] `PhaseCard.tsx`
- [ ] `PhaseEditDrawer.tsx`
- [ ] `RoleEditor.tsx`
- [ ] `RoleCardGrid.tsx`
- [ ] `RoleCard.tsx`
- [ ] `RoleEditDialog.tsx`
- [ ] `BoardEditor.tsx`
- [ ] `BoardPreview.tsx`
- [ ] `BoardElementToggles.tsx`
- [ ] `BoardThemeSelector.tsx`

### 9.5 Integration
- [ ] `GameBuilderPage.tsx` – Replace placeholders with real editors
- [ ] `QualityChecklist.tsx` – Add new requirements
- [ ] `components/index.ts` – Export new components

---

## 10. Success Criteria

| Milestone | Definition of Done |
|-----------|-------------------|
| **P2a Complete** | Faser can be created, edited, reordered. Steps can be linked to phases. |
| **P2b Complete** | Roles can be created with public/private info. Assignment rules work. |
| **P2c Complete** | Board config saves. Preview renders correctly. |
| **P2 Complete** | All three features work together in a participant-mode game. |

---

## 11. Next Steps After P2

Once P2 is complete, consider:
1. **Play Session Integration** – Phases control session flow
2. **Participant App** – Show role cards on mobile
3. **Public Display Route** – `/play/[code]/board` for projector
4. **AI Translation** – Auto-translate roles/phases
5. **Role Templates** – Pre-built roles (Mördare, Detektiv, etc.)

---

**Ready to start?** Begin with Session 1: Faser & Rundor.
