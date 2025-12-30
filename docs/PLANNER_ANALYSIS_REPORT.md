# PLANNER DOMAIN – Analys & Förbättringsförslag

## Executive Summary

Denna rapport analyserar Planner-domänen i Lekbanken och presenterar konkreta förslag för att göra systemet mer anpassat, skalbart och användarvänligt för enterprise-användning. Planner är redan en solid grund med bra arkitektur, men det finns betydande möjligheter att förbättra UX, funktionalitet och enterprise-anpassning.

---

## 1. NULÄGESANALYS

### 1.1 Arkitektur & Datamodell

**Styrkor:**
- ✅ Välstrukturerad datamodell med `plans`, `plan_blocks`, `plan_notes_private`, `plan_notes_tenant`
- ✅ Tydlig separering av block-typer: `game | pause | preparation | custom`
- ✅ Bra visibility-modell: `private | tenant | public`
- ✅ RLS-policies för säker multi-tenant arkitektur
- ✅ Server-side triggers för automatisk tidsberäkning (`total_time_minutes`)
- ✅ Locale-fallback för översättningar (sv → no → en)
- ✅ Progress-tracking för uppspelning (`plan_play_progress`)

**Svagheter:**
- ❌ Ingen template/duplicering i UI (funktionen finns i backend men exponeras ej)
- ❌ Begränsad metadata-användning per block
- ❌ Saknar tagging/kategorisering av planer
- ❌ Ingen versionshistorik
- ❌ Begränsad sökfunktionalitet

### 1.2 UI/UX-nuläge

**Styrkor:**
- ✅ Ren, modern design med Tailwind CSS
- ✅ Drag-and-drop stöd för omsortning
- ✅ Inline-redigering av plantitel och beskrivning
- ✅ Visibility-switcher
- ✅ Sticky "Starta plan"-knapp

**Svagheter:**
- ❌ Enkel planlista utan filter, sortering eller sök
- ❌ Game-sökfunktionen är grundläggande (ingen filtrering på duration, energi, plats)
- ❌ Saknar kalender/schemavy
- ❌ Ingen bulk-hantering
- ❌ Inga tomma tillstånd för specifika användarflöden
- ❌ Saknar undo/redo

### 1.3 API & Backend

**Styrkor:**
- ✅ Komplett REST-API med CRUD
- ✅ Bulk reorder-endpoint
- ✅ Validering med tydliga felmeddelanden
- ✅ Play-view projektion för uppspelning

**Svagheter:**
- ❌ Duplicering/kopiering ej exponerat via API
- ❌ Ingen bulk-delete eller bulk-update
- ❌ Ingen export/import-funktionalitet
- ❌ Saknar analytics/statistik-endpoints

---

## 2. ENTERPRISE-FÖRBÄTTRINGAR

### 2.1 Plan Templates & Delning

**Problem:** Organisationer behöver kunna skapa och dela mallar inom och mellan tenants.

**Förslag:**

```sql
-- Ny kolumn för template-status
ALTER TABLE public.plans 
ADD COLUMN is_template boolean DEFAULT false,
ADD COLUMN template_category text,
ADD COLUMN template_source_id uuid REFERENCES plans(id);

-- Index för snabb template-sökning
CREATE INDEX idx_plans_is_template ON public.plans(is_template) WHERE is_template = true;
CREATE INDEX idx_plans_template_category ON public.plans(template_category) WHERE is_template = true;
```

**API-tillägg:**
```typescript
// GET /api/plans/templates - Hämta tillgängliga mallar
// POST /api/plans/[planId]/duplicate - Duplicera plan (inkl. som mall)
// POST /api/plans/from-template/[templateId] - Skapa plan från mall
```

**UI-komponenter:**
- `TemplateGallery` - Galleri med mallar per kategori
- `TemplateSaveDialog` - Spara plan som mall
- `PlanDuplicateButton` - Snabbknapp för duplicering

### 2.2 Avancerad Plan-organisering

**Problem:** Svårt att hitta och organisera planer när de blir många.

**Förslag:**

```sql
-- Tagging-system
CREATE TABLE public.plan_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, tag)
);

-- Mapp-/kategori-struktur
CREATE TABLE public.plan_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES plan_folders(id),
  owner_user_id uuid REFERENCES users(id),
  owner_tenant_id uuid REFERENCES tenants(id),
  color text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.plans 
ADD COLUMN folder_id uuid REFERENCES plan_folders(id);
```

**UI-komponenter:**
- `PlanFolderTree` - Navigerbar mappstruktur
- `TagSelector` - Tagg-hantering med autocomplete
- `PlanFilters` - Filter-panel med tags, datum, status

### 2.3 Kollaborativa Funktioner

**Problem:** Flera pedagoger behöver ofta arbeta med samma planer.

**Förslag:**

```sql
-- Plan-samarbete
CREATE TABLE public.plan_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  invited_by uuid REFERENCES users(id),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(plan_id, user_id)
);

-- Aktivitetslogg
CREATE TABLE public.plan_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
```

**UI-komponenter:**
- `CollaboratorList` - Visa och hantera samarbetspartners
- `InviteDialog` - Bjud in via e-post
- `ActivityTimeline` - Visa senaste ändringar
- `RealTimeIndicators` - Visa vem som redigerar just nu (via Supabase Realtime)

### 2.4 Schemaläggning & Kalender

**Problem:** Pedagoger behöver kunna planera aktiviteter på specifika datum.

**Förslag:**

```sql
-- Schema-koppling
CREATE TABLE public.plan_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time time,
  recurrence_rule text, -- iCal RRULE-format
  group_id uuid, -- för barngrupper
  location text,
  notes text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plan_schedules_date ON public.plan_schedules(scheduled_date);
CREATE INDEX idx_plan_schedules_group ON public.plan_schedules(group_id);
```

**UI-komponenter:**
- `PlannerCalendar` - Vecko-/månadsvy med planer
- `ScheduleDialog` - Schemalägg plan på datum
- `RecurrenceEditor` - Konfigurera återkommande aktiviteter
- `DailyOverview` - Dagens planerade aktiviteter

---

## 3. UX-FÖRBÄTTRINGAR

### 3.1 Förbättrad Block-hantering

**Problem:** Att lägga till och redigera block kan vara klumpigt.

**Förslag:**

**Ny Block-editor:**
```tsx
// components/BlockDetailDrawer.tsx
type BlockDetailDrawerProps = {
  block: PlannerBlock;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<PlannerBlock>) => Promise<void>;
};

// Funktioner:
// - Inline duration-redigering med slider
// - Notes-editor med rich text
// - Game-info preview för lek-block
// - Förhandsgranskning av instruktioner
// - Alternativ-flag (is_optional) toggle
// - Timer-konfiguration
```

**Förbättrad Game-sökare:**
```tsx
// components/GamePickerModal.tsx
type GamePickerFilters = {
  search: string;
  durationRange: [number, number];
  energyLevel: 'low' | 'medium' | 'high' | 'all';
  locationType: 'indoor' | 'outdoor' | 'both' | 'all';
  groupSize: [number, number];
  ageRange: [number, number];
  purposes: string[];
};

// Funktioner:
// - Filter-panel med alla relevanta filter
// - Thumbnail-preview av lekar
// - Quick-add utan att stänga modalen
// - Senast använda lekar
// - Favorit-lekar
```

### 3.2 Visualisering & Översikt

**Problem:** Svårt att få överblick över planens struktur och tidsåtgång.

**Förslag:**

**Timeline-vy:**
```tsx
// components/PlanTimeline.tsx
// - Visuell tidslinje med proportionella block
// - Färgkodning per block-typ
// - Drag för att ändra duration
// - Klickbar för att redigera
// - Visa sammanlagd tid per typ
```

**Statistik-panel:**
```tsx
// components/PlanStats.tsx
type PlanStats = {
  totalDuration: number;
  gameCount: number;
  pauseCount: number;
  avgBlockDuration: number;
  energyDistribution: Record<string, number>;
  locationRequirements: string[];
};
```

### 3.3 Smart Block-rekommendation

**Problem:** Användare vet inte alltid vilka lekar som passar.

**Förslag:**

**AI-assisterad planering:**
```typescript
// POST /api/plans/[planId]/suggest-blocks
type SuggestionRequest = {
  duration: number;
  context: 'morning' | 'afternoon' | 'outdoor' | 'rainy_day';
  groupSize: number;
  ageRange: [number, number];
  existingBlocks: string[]; // undvik upprepning
};

type SuggestionResponse = {
  suggestions: {
    game: PlannerGameSummary;
    reason: string;
    score: number;
  }[];
};
```

**UI-integration:**
- "Föreslå lek"-knapp som öppnar rekommendations-panel
- Context-aware förslag baserat på tid på dagen
- Visa varför en lek rekommenderas

### 3.4 Undo/Redo & Optimistisk Uppdatering

**Problem:** Ingen möjlighet att ångra ändringar.

**Förslag:**

```typescript
// hooks/usePlannerHistory.ts
type PlannerAction = 
  | { type: 'add_block'; block: PlannerBlock }
  | { type: 'update_block'; blockId: string; before: Partial<PlannerBlock>; after: Partial<PlannerBlock> }
  | { type: 'delete_block'; block: PlannerBlock }
  | { type: 'reorder_blocks'; before: string[]; after: string[] }
  | { type: 'update_plan'; before: Partial<PlannerPlan>; after: Partial<PlannerPlan> };

function usePlannerHistory(maxSize = 20) {
  // State för undo/redo-stack
  // Funktion för att pusha actions
  // Undo/redo-funktioner
  // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
}
```

---

## 4. ENTERPRISE-SPECIFIKA FUNKTIONER

### 4.1 Analytics & Rapportering

**Problem:** Organisationer behöver mäta användning och effektivitet.

**Förslag:**

```sql
-- Analytics-vy
CREATE TABLE public.plan_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  total_plays integer DEFAULT 0,
  total_duration_played integer DEFAULT 0, -- minuter
  completion_rate numeric(5,2),
  avg_session_duration integer,
  last_played_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Aggregerad statistik per tenant
CREATE VIEW public.tenant_planner_stats AS
SELECT 
  p.owner_tenant_id as tenant_id,
  COUNT(DISTINCT p.id) as total_plans,
  COUNT(DISTINCT p.id) FILTER (WHERE p.visibility = 'tenant') as shared_plans,
  COUNT(DISTINCT pb.id) as total_blocks,
  SUM(p.total_time_minutes) as total_content_minutes,
  COUNT(DISTINCT pa.plan_id) FILTER (WHERE pa.last_played_at > now() - interval '30 days') as active_plans
FROM plans p
LEFT JOIN plan_blocks pb ON pb.plan_id = p.id
LEFT JOIN plan_analytics pa ON pa.plan_id = p.id
GROUP BY p.owner_tenant_id;
```

**Admin Dashboard:**
- Mest använda planer
- Populära lekar i planer
- Aktivitet över tid
- Export till CSV/Excel

### 4.2 Godkännande-workflow

**Problem:** I större organisationer kan det behövas kvalitetskontroll.

**Förslag:**

```sql
ALTER TABLE public.plans 
ADD COLUMN approval_status text DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected')),
ADD COLUMN approved_by uuid REFERENCES users(id),
ADD COLUMN approved_at timestamptz,
ADD COLUMN rejection_reason text;
```

**Workflow:**
1. Användare skapar plan (status: `draft`)
2. Användare skickar för granskning (status: `pending_review`)
3. Admin granskar och godkänner/avslår
4. Godkända planer kan delas inom tenant

### 4.3 Import/Export

**Problem:** Behov av att migrera data och dela med externa system.

**Förslag:**

```typescript
// API
// GET /api/plans/[planId]/export?format=json|pdf|ical
// POST /api/plans/import

type PlanExport = {
  version: '1.0';
  plan: {
    name: string;
    description: string;
    blocks: ExportBlock[];
    totalDuration: number;
  };
  metadata: {
    exportedAt: string;
    exportedBy: string;
    sourceSystem: 'lekbanken';
  };
};
```

**Funktioner:**
- JSON-export för backup/migrering
- PDF-export för utskrift
- iCal-export för kalenderintegration
- Import från JSON med konflikthantering

### 4.4 Tenant-specifika Inställningar

**Problem:** Olika organisationer har olika behov.

**Förslag:**

```sql
-- Tenant planner settings
INSERT INTO tenant_settings (tenant_id, key, value) VALUES
  -- Aktivera/inaktivera funktioner
  ('...', 'planner.templates.enabled', 'true'),
  ('...', 'planner.sharing.enabled', 'true'),
  ('...', 'planner.approval_workflow.enabled', 'false'),
  
  -- Standardvärden
  ('...', 'planner.default_pause_duration', '5'),
  ('...', 'planner.default_visibility', 'private'),
  
  -- Begränsningar
  ('...', 'planner.max_blocks_per_plan', '50'),
  ('...', 'planner.max_plans_per_user', '100');
```

---

## 5. TEKNISKA FÖRBÄTTRINGAR

### 5.1 Performance-optimeringar

**Caching:**
```typescript
// API med cache headers
export async function GET(request: NextRequest) {
  // ...
  return NextResponse.json({ plan }, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      'ETag': generateETag(plan),
    },
  });
}
```

**Optimistisk uppdatering:**
```typescript
// Uppdatera UI direkt, synka sedan med server
const handleAddBlock = async (type: BlockType) => {
  const tempId = `temp-${Date.now()}`;
  const optimisticBlock = createOptimisticBlock(type, tempId);
  
  // Uppdatera lokalt state direkt
  setLocalPlan(prev => ({
    ...prev,
    blocks: [...prev.blocks, optimisticBlock]
  }));
  
  try {
    const updated = await addBlock(activePlan.id, { block_type: type });
    updatePlanState(updated);
  } catch (err) {
    // Rollback
    setLocalPlan(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== tempId)
    }));
  }
};
```

### 5.2 Offline-stöd

**Problem:** Pedagoger arbetar ofta i miljöer med dålig uppkoppling.

**Förslag:**
- Service Worker för caching av planer
- IndexedDB för lokal lagring
- Synkronisering när uppkoppling återställs
- Konflikthantering vid samtidiga ändringar

### 5.3 Responsiv Design

**Förbättringar:**
- Mobil-optimerad block-lista (swipe för actions)
- Touch-friendly drag-and-drop
- Kompakt vy för små skärmar
- Fullskärmsläge för uppspelning

---

## 6. PRIORITERAD IMPLEMENTATION

### Fas 1: Grundläggande UX (Sprint 1-2)
1. **Förbättrad Game Picker** med filter
2. **Block Detail Drawer** för redigering
3. **Förbättrad SessionList** med sök och sortering
4. **Undo/Redo** för block-operationer
5. **Duplicera plan** i UI

### Fas 2: Organisation (Sprint 3-4)
1. **Plan Tags** och tagg-filter
2. **Plan Folders** med mappstruktur
3. **Template System** - spara och använda mallar
4. **Collaborators** - dela med kollegor

### Fas 3: Schemaläggning (Sprint 5-6)
1. **Calendar View** - vecko-/månadsvy
2. **Schedule Plans** - koppla till datum
3. **Recurrence** - återkommande aktiviteter
4. **Daily Overview** - dagens schema

### Fas 4: Enterprise (Sprint 7-8)
1. **Analytics Dashboard** - användningsstatistik
2. **Approval Workflow** (valfritt per tenant)
3. **Import/Export** - JSON och PDF
4. **Tenant Settings** - organisationsanpassning

---

## 7. SCHEMA-UPPGRADERINGAR (FULLSTÄNDIG)

```sql
-- ============================================================================
-- PLANNER DOMAIN ENTERPRISE UPGRADE
-- Migration: 20251230000000_planner_enterprise.sql
-- ============================================================================

-- 1) Template & Duplication Support
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category text,
ADD COLUMN IF NOT EXISTS template_source_id uuid REFERENCES plans(id),
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_plans_is_template ON public.plans(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_plans_template_category ON public.plans(template_category) WHERE is_template = true;

-- 2) Tagging System
CREATE TABLE IF NOT EXISTS public.plan_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_plan_tags_plan ON public.plan_tags(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tags_tag ON public.plan_tags(tag);

ALTER TABLE public.plan_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_tags_access" ON public.plan_tags FOR ALL USING (
  plan_id IN (
    SELECT id FROM public.plans 
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
       OR visibility = 'public'
  )
);

-- 3) Folder Organization
CREATE TABLE IF NOT EXISTS public.plan_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES plan_folders(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES users(id),
  owner_tenant_id uuid REFERENCES tenants(id),
  color text,
  icon text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES plan_folders(id);

CREATE INDEX IF NOT EXISTS idx_plan_folders_owner ON public.plan_folders(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_plan_folders_tenant ON public.plan_folders(owner_tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_folder ON public.plans(folder_id);

ALTER TABLE public.plan_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_folders_access" ON public.plan_folders FOR ALL USING (
  owner_user_id = auth.uid() OR owner_tenant_id = ANY(get_user_tenant_ids())
);

-- 4) Collaborators
CREATE TABLE IF NOT EXISTS public.plan_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  invited_by uuid REFERENCES users(id),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_collaborators_plan ON public.plan_collaborators(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_collaborators_user ON public.plan_collaborators(user_id);

ALTER TABLE public.plan_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_collaborators_owner" ON public.plan_collaborators FOR ALL USING (
  plan_id IN (SELECT id FROM public.plans WHERE owner_user_id = auth.uid())
  OR user_id = auth.uid()
);

-- 5) Activity Log
CREATE TABLE IF NOT EXISTS public.plan_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_activity_plan ON public.plan_activity_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_activity_time ON public.plan_activity_log(created_at DESC);

ALTER TABLE public.plan_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_activity_access" ON public.plan_activity_log FOR SELECT USING (
  plan_id IN (
    SELECT id FROM public.plans 
    WHERE owner_user_id = auth.uid()
       OR id IN (SELECT plan_id FROM plan_collaborators WHERE user_id = auth.uid())
  )
);

-- 6) Scheduling
CREATE TABLE IF NOT EXISTS public.plan_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time time,
  recurrence_rule text,
  group_id uuid,
  group_name text,
  location text,
  notes text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  created_by uuid REFERENCES users(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_schedules_date ON public.plan_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_schedules_plan ON public.plan_schedules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_schedules_status ON public.plan_schedules(status);

ALTER TABLE public.plan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_schedules_access" ON public.plan_schedules FOR ALL USING (
  plan_id IN (
    SELECT id FROM public.plans 
    WHERE owner_user_id = auth.uid()
       OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
  )
);

-- 7) Analytics
CREATE TABLE IF NOT EXISTS public.plan_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE UNIQUE,
  tenant_id uuid REFERENCES tenants(id),
  total_plays integer DEFAULT 0,
  total_duration_played integer DEFAULT 0,
  completion_rate numeric(5,2),
  avg_session_duration integer,
  last_played_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_analytics_tenant ON public.plan_analytics(tenant_id);

-- 8) Approval Workflow (optional feature)
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 9) Enhanced Favorites
CREATE TABLE IF NOT EXISTS public.plan_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_favorites_user ON public.plan_favorites(user_id);

-- 10) Update RLS for plans to include collaborators
DROP POLICY IF EXISTS "users_can_select_plans" ON public.plans;
CREATE POLICY "users_can_select_plans" ON public.plans FOR SELECT USING (
  owner_user_id = auth.uid()
  OR (visibility = 'tenant' AND owner_tenant_id = ANY(get_user_tenant_ids()))
  OR visibility = 'public'
  OR id IN (SELECT plan_id FROM plan_collaborators WHERE user_id = auth.uid())
);
```

---

## 8. KOMPONENTÖVERSIKT

### Nya Komponenter att Implementera

| Komponent | Prioritet | Komplexitet | Sprint |
|-----------|-----------|-------------|--------|
| `GamePickerModal` | P1 | Medium | 1 |
| `BlockDetailDrawer` | P1 | Medium | 1 |
| `PlanSearchBar` | P1 | Low | 1 |
| `DuplicatePlanButton` | P1 | Low | 1 |
| `PlanTimeline` | P2 | High | 2 |
| `TagSelector` | P2 | Medium | 3 |
| `FolderTree` | P2 | Medium | 3 |
| `TemplateGallery` | P2 | Medium | 4 |
| `CollaboratorList` | P3 | Medium | 4 |
| `CalendarView` | P3 | High | 5 |
| `ScheduleDialog` | P3 | Medium | 5 |
| `AnalyticsDashboard` | P4 | High | 7 |
| `ApprovalWorkflow` | P4 | Medium | 8 |

---

## 9. SLUTSATS

Planner-domänen i Lekbanken har en solid teknisk grund med bra datamodell och API-struktur. De föreslagna förbättringarna fokuserar på:

1. **Bättre UX** - Förbättrad block-hantering, sök och filter
2. **Organisation** - Tags, mappar och mallar
3. **Samarbete** - Dela och redigera tillsammans
4. **Schemaläggning** - Kalenderintegration
5. **Enterprise** - Analytics, godkännanden och inställningar

Den prioriterade implementationsplanen säkerställer att de mest värdefulla funktionerna levereras först, samtidigt som den tekniska skulden hålls låg genom en välstrukturerad utbyggnad av datamodellen.

**Rekommenderad första åtgärd:** Implementera Fas 1 (Grundläggande UX) som ger omedelbar användarnytta utan större arkitekturella förändringar.

---

*Rapport genererad: 2024-12-30*
*Författare: GitHub Copilot*
*Version: 1.0*
