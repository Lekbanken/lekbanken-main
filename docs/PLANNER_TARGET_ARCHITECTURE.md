# PLANNER — MÅLARKITEKTUR & IMPLEMENTATION

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-30
- Last updated: 2026-03-21
- Last validated: -

> Historical snapshot of an earlier planner target architecture document, superseded as canonical guidance by the current root planner triplet.

**Version:** 1.0  
**Datum:** 2025-12-30  
**Status:** Arkitekturförslag baserat på verifierat facit  
**Tracking:** Detta dokument uppdateras löpande under implementation

---

## IMPLEMENTATION STATUS

### Sprint 1: Foundation ✅ COMPLETE
- [x] `lib/auth/capabilities.ts` - deriveCapabilities ✅
- [x] Lägg till `_capabilities` i plan-responses ✅
- [x] `useActionFeedback` hook ✅
- [x] Byt ut global error state i PlannerPage ✅
- [x] Mutation-endpoints returnerar endast entity ✅
- [x] Pagination i `/api/plans/search` ✅
- [x] DELETE `/api/plans/[planId]` ✅
- [x] Auto-save för notes ✅
- [x] Confirmation dialog för delete ✅

### Sprint 2: Versioning 🔄 IN PROGRESS
- [x] Migration: plan_versions, plan_version_blocks, runs ✅
- [x] plans.status + current_version_id (i migration) ✅
- [x] Types: PlannerStatus, PlannerVersion ✅
- [x] POST /api/plans/[planId]/publish ✅
- [x] GET /api/plans/[planId]/versions ✅
- [x] Client API: publishPlan, fetchPlanVersions ✅
- [x] StatusBadge component ✅
- [x] "Publicera"-knapp i UI ✅
- [ ] Kör migration i Supabase
- [ ] Regenerera TypeScript types
- [ ] Migrera plan_play_progress → runs

### Sprint 3: Play Separation ✅ COMPLETE
- [x] Run, RunStep, RunProgress types ✅
- [x] POST /api/play/[planId]/start ✅
- [x] GET /api/play/runs/[runId] ✅
- [x] POST /api/play/runs/[runId]/progress ✅
- [x] features/play/api.ts - startRun, fetchRun, updateRunProgress ✅
- [x] Server-genererade steps (generateStepsFromBlocks) ✅
- [x] PlayPlanPage refactor (uses new Run model) ✅
- [x] Backward compatibility för legacy plans ✅

### Sprint 4: Cleanup ✅ COMPLETE
- [x] Migration: 20251230120000_planner_cleanup.sql (DROP plan_games) ✅
- [x] Deleted lib/db/plans.ts (434 lines dead code) ✅
- [x] Updated lib/db/index.ts (removed plans exports) ✅
- [x] Removed fetchPlayablePlan from features/planner/api.ts ✅
- [x] Removed onUpdateBlock prop from SessionEditor ✅
- [x] Removed handleUpdateBlock from PlannerPage ✅

---

## 1. MÅLBILD

### Vision
Planner blir ett **authoring-verktyg** för lekplaner. Play blir en separat **runtime-domän** som konsumerar publicerade versioner. Separationen möjliggör:

- Redigering utan att störa pågående genomföranden
- Versionerad historik med rollback-möjlighet
- Templates som första steg mot delningsbar content
- Enterprise-ready multi-tenant med konsekvent RBAC

### Designprinciper

| Princip | Konsekvens |
|---------|------------|
| **Server är auktoritativ** | Duration, capabilities, version-state beräknas server-side |
| **Planner ≠ Play** | Authoring och runtime har separata datamodeller |
| **Capabilities, inte roller** | Client får capabilities-objekt, inte roll-strängar |
| **Optimistisk UX, pessimistisk validering** | Snabb feedback lokalt, server validerar alltid |
| **Inkrementell migration** | Inga breaking changes i MVP |

---

## 2. BOUNDED CONTEXTS & ANSVAR

```
┌─────────────────────────────────────────────────────────────────┐
│                         PLANNER DOMAIN                          │
│  Ansvar: Authoring, versioning, templates, visibility           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Plan      │  │   Version    │  │   Template   │           │
│  │  (metadata)  │──│  (snapshot)  │  │  (reusable)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │    Block     │  │VersionBlock  │                             │
│  │   (draft)    │  │  (frozen)    │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ publish()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          PLAY DOMAIN                            │
│  Ansvar: Runtime, progress, timer, session state                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     Run      │  │  RunStep     │  │ RunProgress  │           │
│  │  (session)   │──│  (derived)   │──│   (state)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Ansvarsfördelning

| Koncept | Ägare | Livscykel |
|---------|-------|-----------|
| `Plan` | Planner | Skapas → redigeras → arkiveras |
| `PlanBlock` | Planner | Följer plan, muteras fritt i draft |
| `PlanVersion` | Planner | Skapas vid publish, immutable |
| `PlanVersionBlock` | Planner | Snapshot av blocks vid publish |
| `Template` | Planner | Kopieras till ny plan |
| `Run` | Play | Skapas när user startar, avslutas/abandoneras |
| `RunProgress` | Play | Uppdateras under genomförande |

---

## 3. REKOMMENDERAD MÅLARKITEKTUR

### 3.1 Dataflöde

```
[Planner UI] ──► [Planner API] ──► [plans, plan_blocks] (draft)
                      │
                      │ POST /publish
                      ▼
               [plan_versions, plan_version_blocks] (immutable)
                      │
                      │ GET /play-ready
                      ▼
[Play UI] ◄─── [Play API] ◄─── [runs, run_progress]
```

### 3.2 Versioneringsmodell

**Draft = Working Copy**
- `plans` + `plan_blocks` är alltid draft
- Redigeras fritt utan att påverka publicerat

**Published Version = Snapshot**
- `plan_versions` skapas vid explicit "Publicera"
- `plan_version_blocks` kopierar blocks med game-data denormaliserat
- Immutable efter skapande

**Konsumtion**
- Play konsumerar **senaste publicerade version** (eller specifik version)
- Om ingen version finns: plan är "opublicerad" och kan inte spelas

### 3.3 States för Plan

```typescript
type PlanStatus = 
  | 'draft'           // Aldrig publicerad
  | 'published'       // Har minst en version, draft = published
  | 'modified'        // Har version men draft ≠ senaste version
  | 'archived';       // Soft-deleted, ej synlig i listor
```

---

## 4. DATAMODELL (INKL. MIGRATIONSPLAN)

### 4.1 Nya tabeller

#### `plan_versions`
```sql
CREATE TABLE plan_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  name            text NOT NULL,
  description     text,
  total_time_minutes integer NOT NULL,
  metadata        jsonb DEFAULT '{}',
  published_at    timestamptz NOT NULL DEFAULT now(),
  published_by    uuid NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(plan_id, version_number)
);

-- RLS: samma läsregler som plans, ingen UPDATE/DELETE
```

#### `plan_version_blocks`
```sql
CREATE TABLE plan_version_blocks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id     uuid NOT NULL REFERENCES plan_versions(id) ON DELETE CASCADE,
  position            integer NOT NULL,
  block_type          plan_block_type_enum NOT NULL,
  duration_minutes    integer NOT NULL DEFAULT 0,
  title               text,
  notes               text,
  is_optional         boolean DEFAULT false,
  
  -- Denormaliserad game-data (frozen vid publish)
  game_id             uuid,  -- Referens för audit, men data är kopierad
  game_snapshot       jsonb, -- { name, instructions, min_players, ... }
  
  metadata            jsonb DEFAULT '{}'
);
```

#### `runs` (Play-domän)
```sql
CREATE TABLE runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id uuid NOT NULL REFERENCES plan_versions(id),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  tenant_id       uuid REFERENCES tenants(id),
  status          plan_run_status_enum NOT NULL DEFAULT 'not_started',
  started_at      timestamptz,
  completed_at    timestamptz,
  current_step    integer DEFAULT 0,
  elapsed_seconds integer DEFAULT 0,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  
  -- En aktiv run per user per version
  UNIQUE(plan_version_id, user_id) WHERE status IN ('not_started', 'in_progress')
);

-- RLS: user kan endast se/ändra sina egna runs
```

#### `plan_templates` (MVP-stubb)
```sql
CREATE TABLE plan_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_plan_id  uuid REFERENCES plans(id),
  source_version_id uuid REFERENCES plan_versions(id),
  name            text NOT NULL,
  description     text,
  category        text,  -- Fritext MVP, enum senare
  tags            text[] DEFAULT '{}',
  is_public       boolean DEFAULT false,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  tenant_id       uuid REFERENCES tenants(id),
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);
```

### 4.2 Ändringar i befintliga tabeller

#### `plans` – lägg till status
```sql
ALTER TABLE plans 
ADD COLUMN status text NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'published', 'modified', 'archived'));

ALTER TABLE plans
ADD COLUMN current_version_id uuid REFERENCES plan_versions(id);
```

### 4.3 Tabeller som avvecklas

| Tabell | Åtgärd | Tidpunkt |
|--------|--------|----------|
| `plan_games` | DROP efter verifiering att ingen kod använder | Step D |
| `plan_play_progress` | Migrera data till `runs`, sedan DROP | Step C |

### 4.4 Migrationsplan

#### Step A: Introduce (icke-breaking)
```
Migration: 20251231_planner_versioning_prep.sql
- CREATE plan_versions
- CREATE plan_version_blocks  
- CREATE runs
- CREATE plan_templates (stubb)
- ALTER plans ADD status, current_version_id
- Trigger: sätt status='draft' för alla existerande plans
```

#### Step B: Dual-Write / Adapter
```
- Ny publish-endpoint skriver till plan_versions
- PlayPlanPage kan läsa från ANTINGEN:
  - plan_versions (om finns) 
  - ELLER legacy plan_blocks (fallback)
- plan_play_progress synkas till runs vid läsning
```

#### Step C: Cutover
```
- Migrera all plan_play_progress → runs
- PlayPlanPage läser ENDAST från runs
- Deprecation warning på legacy endpoints
```

#### Step D: Cleanup
```
Migration: 202502XX_planner_cleanup.sql
- DROP plan_games
- DROP plan_play_progress
- Ta bort lib/db/plans.ts
- Ta bort fallback-kod i PlayPlanPage
```

---

## 5. API-KONTRAKT

### 5.1 Övergripande principer

| Princip | Implementation |
|---------|----------------|
| **Light list, full detail** | List returnerar id, name, status, updatedAt. Detail returnerar allt. |
| **Patch returns entity** | Mutation returnerar endast ändrad entitet, inte hela plan |
| **Capabilities i response** | Varje plan-response inkluderar `_capabilities` objekt |
| **Standardiserade fel** | `{ error: { code, message, details? } }` |

### 5.2 Routes

#### Behålls (med modifikationer)

| Route | Ändring |
|-------|---------|
| `POST /api/plans` | Oförändrad |
| `POST /api/plans/search` | Lägg till pagination, returnera light payload |
| `GET /api/plans/[planId]` | Returnera full payload + `_capabilities` |
| `PATCH /api/plans/[planId]` | Returnera endast ändrade fält + `updatedAt` |
| `POST /api/plans/[planId]/blocks` | Returnera endast nytt block |
| `PATCH /api/plans/[planId]/blocks/[blockId]` | Returnera endast uppdaterat block |
| `DELETE /api/plans/[planId]/blocks/[blockId]` | Returnera `{ deleted: true, planTotalTime }` |
| `POST /api/plans/[planId]/blocks/reorder` | Returnera `{ positions: [...], planTotalTime }` |

#### Nya routes

| Route | Metod | Syfte |
|-------|-------|-------|
| `/api/plans/[planId]/publish` | POST | Skapa ny version |
| `/api/plans/[planId]/versions` | GET | Lista versioner |
| `/api/plans/[planId]/versions/[versionId]` | GET | Hämta specifik version |
| `/api/plans/[planId]` | DELETE | Soft-delete (status=archived) |
| `/api/play/[planId]/start` | POST | Skapa/återuppta run |
| `/api/play/runs/[runId]` | GET | Hämta run med steps |
| `/api/play/runs/[runId]/progress` | POST | Uppdatera progress |
| `/api/templates` | GET, POST | Lista/skapa templates |
| `/api/templates/[templateId]/instantiate` | POST | Skapa plan från template |

#### Avvecklas (efter migration)

| Route | Ersätts av |
|-------|------------|
| `/api/plans/[planId]/play` | `/api/play/[planId]/start` |
| `/api/plans/[planId]/progress` | `/api/play/runs/[runId]/progress` |

### 5.3 Response Shapes

#### Plan List (light)
```typescript
interface PlanListItem {
  id: string;
  name: string;
  status: PlanStatus;
  visibility: PlanVisibility;
  totalTimeMinutes: number;
  blockCount: number;
  currentVersionNumber: number | null;
  updatedAt: string;
  _capabilities: PlanCapabilities;
}

interface PlanListResponse {
  plans: PlanListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### Plan Detail (full)
```typescript
interface PlanDetail {
  id: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  visibility: PlanVisibility;
  totalTimeMinutes: number;
  currentVersionNumber: number | null;
  blocks: PlanBlock[];
  privateNote: string | null;
  tenantNote: string | null;
  createdAt: string;
  updatedAt: string;
  _capabilities: PlanCapabilities;
}
```

#### Capabilities Object
```typescript
interface PlanCapabilities {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canSetVisibilityPublic: boolean;
  canCreateTemplate: boolean;
  canStartRun: boolean;
}
```

#### Error Standard
```typescript
interface ApiError {
  error: {
    code: string;           // 'PLAN_NOT_FOUND', 'VALIDATION_ERROR', etc.
    message: string;        // User-safe message
    details?: unknown;      // Dev details (only in dev mode)
  };
}
```

---

## 6. RBAC / POLICY

### 6.1 Capability-baserad modell

```typescript
// lib/auth/capabilities.ts

export type Capability = 
  | 'planner.plan.read'
  | 'planner.plan.update'
  | 'planner.plan.delete'
  | 'planner.plan.publish'
  | 'planner.plan.visibility.public'
  | 'planner.template.create'
  | 'planner.template.publish'
  | 'play.run.start'
  | 'play.run.read';

export interface CapabilityContext {
  userId: string;
  globalRole: GlobalRole;
  tenantMemberships: Array<{
    tenantId: string;
    role: TenantRole;
  }>;
}

export function deriveCapabilities(
  ctx: CapabilityContext,
  resource: { type: 'plan'; plan: Plan } | { type: 'template'; template: Template }
): Set<Capability> {
  const caps = new Set<Capability>();
  
  if (resource.type === 'plan') {
    const plan = resource.plan;
    const isOwner = plan.ownerUserId === ctx.userId;
    const isTenantMember = ctx.tenantMemberships.some(m => m.tenantId === plan.ownerTenantId);
    const isTenantAdmin = ctx.tenantMemberships.some(m => 
      m.tenantId === plan.ownerTenantId && m.role === 'tenant_admin'
    );
    const isSystemAdmin = ctx.globalRole === 'system_admin';
    
    // READ
    if (plan.visibility === 'public' || isOwner || isTenantMember || isSystemAdmin) {
      caps.add('planner.plan.read');
    }
    
    // UPDATE/DELETE - owner or tenant admin (BESLUT: tenant_admin kan hantera tenant-planer)
    if (isOwner || (isTenantAdmin && plan.visibility !== 'private') || isSystemAdmin) {
      caps.add('planner.plan.update');
      caps.add('planner.plan.delete');
      caps.add('planner.plan.publish');
    }
    
    // PUBLIC VISIBILITY - only system_admin
    if (isSystemAdmin) {
      caps.add('planner.plan.visibility.public');
    }
    
    // TEMPLATE - owner or system_admin
    if (isOwner || isSystemAdmin) {
      caps.add('planner.template.create');
    }
    
    // RUN - anyone who can read
    if (caps.has('planner.plan.read')) {
      caps.add('play.run.start');
    }
  }
  
  return caps;
}
```

### 6.2 Integration med API

```typescript
// I varje API route
const caps = deriveCapabilities(ctx, { type: 'plan', plan });

if (!caps.has('planner.plan.update')) {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: 'Du har inte behörighet att redigera denna plan' } },
    { status: 403 }
  );
}

// Returnera capabilities i response
return NextResponse.json({
  ...planData,
  _capabilities: capabilitiesToObject(caps)
});
```

### 6.3 RLS-komplement

RLS förblir sista försvarslinjen. Capabilities-logik i application layer är för UX/API guards.

```sql
-- RLS ska spegla samma logik
CREATE POLICY "users_can_update_authorized_plans" ON plans
FOR UPDATE USING (
  owner_user_id = auth.uid()
  OR (
    visibility != 'private' 
    AND EXISTS (
      SELECT 1 FROM tenant_members tm 
      WHERE tm.tenant_id = plans.owner_tenant_id 
      AND tm.user_id = auth.uid() 
      AND tm.role = 'tenant_admin'
    )
  )
  OR is_global_admin(auth.uid())
);
```

### 6.4 Arkitekturbeslut: Tenant-admin

**BESLUT:** Ja, `tenant_admin` får redigera/radera tenant-planer (visibility ≠ private).

**Motivering:**
- Organisationer behöver kunna hantera content även om skaparen är borta
- Private planer förblir personliga
- Följer enterprise-mönster

---

## 7. UX-DESIGN

### 7.1 Action-Level Feedback

**Bort:** Global `error` state som tar över hela sidan

**In:** Per-action feedback

```typescript
// features/planner/hooks/useActionFeedback.ts
export function useActionFeedback() {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const withFeedback = async <T>(
    actionId: string,
    action: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ): Promise<T | null> => {
    setPending(prev => new Set(prev).add(actionId));
    try {
      const result = await action();
      if (options?.successMessage) {
        toast({ title: options.successMessage, variant: 'success' });
      }
      return result;
    } catch (e) {
      toast({ 
        title: options?.errorMessage ?? 'Något gick fel', 
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive' 
      });
      return null;
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };
  
  return { pending, isPending: (id: string) => pending.has(id), withFeedback };
}
```

### 7.2 Saving Indicators

| Fält | Indikator | Beteende |
|------|-----------|----------|
| Title/Description | Inline "Sparar..." → "Sparat" | Auto-save med debounce |
| Notes (private/tenant) | Inline "Sparar..." → "Sparat" | **Ändring: Auto-save** |
| Visibility | Button loading state | Omedelbar |
| Block mutation | Row loading overlay | Omedelbar |

**BESLUT:** Auto-save för notes (enhetligt med title/description)

### 7.3 Progressive Disclosure

```tsx
// SessionEditor.tsx
<Tabs defaultValue="basic">
  <TabsList>
    <TabsTrigger value="basic">Grundläggande</TabsTrigger>
    <TabsTrigger value="notes">Anteckningar</TabsTrigger>
    <TabsTrigger value="settings">Inställningar</TabsTrigger>
  </TabsList>
  
  <TabsContent value="basic">
    {/* Blocks, drag-drop, add button */}
  </TabsContent>
  
  <TabsContent value="notes">
    {/* Private + Tenant notes */}
  </TabsContent>
  
  <TabsContent value="settings">
    {/* Visibility, version history, delete */}
  </TabsContent>
</Tabs>
```

### 7.4 Destructive Action Confirmation

```tsx
// components/ui/ConfirmDialog.tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="sm">
      <TrashIcon />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Radera block?</AlertDialogTitle>
      <AlertDialogDescription>
        Detta går inte att ångra.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Avbryt</AlertDialogCancel>
      <AlertDialogAction onClick={onDelete}>Radera</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 7.5 Empty/Loading States

| Scenario | Komponent | Innehåll |
|----------|-----------|----------|
| Ingen plan vald | SessionEditor | "Välj en plan eller skapa ny" |
| Plan utan blocks | BlockList | "Lägg till första aktiviteten" + CTA |
| Laddar blocks | BlockList | Skeleton rows |
| Laddar plan | PlannerPage | Full-page skeleton |
| Sökning ger 0 | SearchResults | "Inga resultat" + förslag |

---

## 8. PLAY-INTEGRATION

### 8.1 Nytt flöde

```
1. User klickar "Starta plan" i Planner
2. POST /api/play/[planId]/start
   - Server hittar senaste publicerade version
   - Om ingen version: returnera error "Planen måste publiceras först"
   - Skapa eller återuppta Run
   - Returnera RunWithSteps (server-genererad step-struktur)
3. Redirect till /app/play/run/[runId]
4. PlayRunPage renderar steps från server-response
5. Progress sparas via POST /api/play/runs/[runId]/progress
```

### 8.2 Server-genererad Step-struktur

```typescript
// Returneras från /api/play/[planId]/start
interface RunWithSteps {
  run: {
    id: string;
    status: RunStatus;
    currentStep: number;
    elapsedSeconds: number;
  };
  steps: RunStep[];
  totalDurationMinutes: number;
}

interface RunStep {
  index: number;
  type: 'game' | 'pause' | 'preparation' | 'custom';
  title: string;
  durationMinutes: number;
  isOptional: boolean;
  // Game-specifik data (denormaliserad från version)
  game?: {
    id: string;
    name: string;
    instructions: string[];  // Redan parsade steg
    minPlayers: number;
    maxPlayers: number;
    imageUrl?: string;
  };
  notes?: string;
}
```

### 8.3 Progress-hantering

**Primär källa:** Server (`runs` tabell)

**Fallback:** localStorage (för offline/snabb restore)

**Synk-strategi:**
```typescript
// PlayRunPage.tsx
const [localState, setLocalState] = useLocalStorage<RunProgress>(`run:${runId}`);

// Vid mount: server-state är auktoritativ
useEffect(() => {
  const serverState = await fetchRunProgress(runId);
  if (serverState.updatedAt > localState?.updatedAt) {
    setLocalState(serverState);
  }
}, []);

// Vid mutation: skriv lokalt först, debounce till server
const updateProgress = (update: Partial<RunProgress>) => {
  const newState = { ...localState, ...update, updatedAt: Date.now() };
  setLocalState(newState);
  debouncedSaveToServer(runId, newState);
};
```

**Konflikthantering:** Server wins om `updatedAt` är nyare.

---

## 9. MVP vs FRAMTID

### MVP (Sprint 1-3)

| Feature | Sprint | Beskrivning |
|---------|--------|-------------|
| Capabilities-system | 1 | `deriveCapabilities` + API-integration |
| Action-level feedback | 1 | Toast-baserad, ta bort global error |
| Patch-responses | 1 | Mutation returns entity only |
| Pagination | 1 | `/api/plans/search` med limit/offset |
| DELETE plan | 1 | Soft-delete med UI |
| Auto-save notes | 1 | Konsekvent med title/desc |
| Plan status field | 2 | draft/published/modified/archived |
| plan_versions tabell | 2 | Grundstruktur |
| Publish-endpoint | 2 | Skapa version snapshot |
| runs tabell | 2 | Ersätt plan_play_progress |
| Server-genererade steps | 3 | Flytta mappning till server |
| PlayRunPage refactor | 3 | Konsumera runs API |
| plan_templates stubb | 3 | Tabell + basic CRUD |

### Post-MVP (Sprint 4+)

| Feature | Prioritet | Beskrivning |
|---------|-----------|-------------|
| Version history UI | Medium | Lista + visa äldre versioner |
| Rollback till version | Medium | Återställ draft från version |
| Template marketplace | Low | Sök/filtrera templates |
| Audit log | Low | Spåra alla ändringar |
| Schedule integration | Low | Koppla plan till kalender |
| Bulk operations | Low | Multi-select delete/move |
| Undo/Redo | Low | Command pattern för editor |

---

## 10. STEGVIS IMPLEMENTATIONSPLAN

### Sprint 1: Foundation (Vecka 1-2)

**Mål:** Konsekvent RBAC, bättre UX, optimerade payloads

| Dag | Uppgift | Status |
|-----|---------|--------|
| 1 | Skapa `lib/auth/capabilities.ts` med `deriveCapabilities` | ⏳ |
| 1 | Lägg till `_capabilities` i alla plan-responses | ⬜ |
| 2 | Implementera `useActionFeedback` hook | ⬜ |
| 2 | Byt ut global error state i PlannerPage | ⬜ |
| 3 | Ändra mutation-endpoints att returnera endast entity | ⬜ |
| 3 | Uppdatera client API-funktioner | ⬜ |
| 4 | Lägg till pagination i `/api/plans/search` | ⬜ |
| 4 | Implementera DELETE `/api/plans/[planId]` | ⬜ |
| 5 | Auto-save för notes | ⬜ |
| 5 | Confirmation dialog för delete block/plan | ⬜ |

**Definition of Done:**
- [ ] Inga globala error-takeovers
- [ ] Alla mutations returnerar patch-response
- [ ] Pagination fungerar med page/pageSize
- [ ] DELETE plan fungerar i UI

### Sprint 2: Versioning (Vecka 3-4)

| Dag | Uppgift | Status |
|-----|---------|--------|
| 1 | Migration: skapa plan_versions, plan_version_blocks, runs | ⬜ |
| 1 | Migration: lägg till status + current_version_id på plans | ⬜ |
| 2 | Implementera `POST /api/plans/[planId]/publish` | ⬜ |
| 2 | Implementera `GET /api/plans/[planId]/versions` | ⬜ |
| 3 | UI: "Publicera"-knapp i SessionEditor | ⬜ |
| 3 | UI: Visa version-badge och status | ⬜ |
| 4 | Migrera plan_play_progress → runs (bakgrundsjobb) | ⬜ |
| 4 | Skapa `/api/play/[planId]/start` | ⬜ |
| 5 | Dual-read i PlayPlanPage (version eller fallback) | ⬜ |

**Definition of Done:**
- [ ] Planer kan publiceras
- [ ] Versioner listas
- [ ] Runs skapas vid start
- [ ] Ingen dataförlust vid migration

### Sprint 3: Play Separation (Vecka 5-6)

| Dag | Uppgift | Status |
|-----|---------|--------|
| 1 | Implementera `buildRunSteps` server-side | ⬜ |
| 1 | `/api/play/runs/[runId]` returnerar RunWithSteps | ⬜ |
| 2 | Refactor PlayRunPage att konsumera nya API:t | ⬜ |
| 2 | Ta bort client-side step-mappning | ⬜ |
| 3 | Implementera `/api/play/runs/[runId]/progress` | ⬜ |
| 3 | Synk-logik: localStorage ↔ server | ⬜ |
| 4 | Skapa plan_templates tabell | ⬜ |
| 4 | Basic `/api/templates` CRUD | ⬜ |
| 5 | "Spara som mall"-knapp i SessionEditor | ⬜ |
| 5 | "Skapa från mall" i SessionList | ⬜ |

**Definition of Done:**
- [ ] PlayRunPage använder server-genererade steps
- [ ] Progress sparas i runs-tabellen
- [ ] Templates kan skapas och instansieras

### Sprint 4: Cleanup (Vecka 7)

| Dag | Uppgift | Status |
|-----|---------|--------|
| 1 | Verifiera att plan_play_progress inte används | ⬜ |
| 1 | Drop plan_games tabell | ⬜ |
| 2 | Ta bort lib/db/plans.ts | ⬜ |
| 2 | Ta bort fallback-kod | ⬜ |
| 3 | Ta bort onUpdateBlock prop | ⬜ |
| 3 | Ta bort oanvänd footer-spara-knapp | ⬜ |
| 4 | Accessibility-pass: keyboard nav för blocks | ⬜ |
| 5 | Dokumentation + release notes | ⬜ |

---

## 11. TESTPLAN

### 11.1 Unit Tests

| Modul | Testfokus |
|-------|-----------|
| `deriveCapabilities` | Alla kombinationer av roller + visibility |
| `validatePlanPayload` | Edge cases, XSS, max-lengths |
| `buildRunSteps` | Game-mappning, optional blocks, tom plan |
| `computeTotalDuration` (server) | Summering, 0-fall, null-fall |

### 11.2 Integration Tests

| Flöde | Assertion |
|-------|-----------|
| Create → Update → Publish | Version skapas, draft ≠ version |
| Publish → Start Run | Run skapas med rätt version |
| Update draft after publish | Status = modified |
| Tenant-admin updates tenant plan | Tillåtet |
| User updates annan users private plan | 403 |

### 11.3 E2E Tests (Playwright)

| Scenario | Steg |
|----------|------|
| Full authoring flow | Login → Skapa plan → Lägg till blocks → Publicera → Starta |
| Run completion | Starta run → Navigera genom alla steg → Complete |
| Visibility change | Ändra till public (som admin) → Verifiera synlighet |
| Template flow | Skapa template → Instansiera → Redigera kopia |
| Error handling | Simulera nätverksfel → Toast visas → Retry fungerar |

---

## 12. RISKER & AVVÄGNINGAR

### 12.1 Risker

| Risk | Sannolikhet | Påverkan | Mitigering |
|------|-------------|----------|------------|
| Migrationsbug förlorar data | Låg | Hög | Backup före migration, dual-write period |
| Capabilities-logik ur synk med RLS | Medium | Medium | Gemensamma tester, RLS som sista linje |
| Versionering komplicerar UX | Medium | Medium | Tydlig status-badge, "Publicera" som explicit action |
| localStorage/server-konflikt | Medium | Låg | Server wins, toast om konflikt |
| Performance vid stora plans | Låg | Medium | Pagination, lazy-load blocks |

### 12.2 Avvägningar

| Beslut | Alternativ | Valt | Motivering |
|--------|------------|------|------------|
| Denormalisera game i version | Referens vs Snapshot | Snapshot | Plan-version ska vara immutable, game kan ändras |
| Tenant-admin redigerar andras planer | Ja/Nej | Ja | Enterprise-krav, följer org-hierarki |
| Auto-save notes | Auto/Manual | Auto | Konsekvent UX, lägre dataförlust |
| localStorage som fallback | Ja/Nej | Ja | Offline-support, snabbare restore |
| Soft-delete vs hard-delete | Soft/Hard | Soft | Återställning möjlig, compliance |

---

## 13. CHECKLISTA "DONE WHEN" (MVP)

### Sprint 1 ✅
- [ ] `deriveCapabilities` finns och används av alla plan-endpoints
- [ ] `_capabilities` returneras i alla plan-responses
- [ ] Global error state är borttagen från PlannerPage
- [ ] Toasts visas vid fel/success per action
- [ ] Mutation-endpoints returnerar endast ändrad entitet
- [ ] `/api/plans/search` stödjer `page` och `pageSize`
- [ ] `DELETE /api/plans/[planId]` fungerar (soft-delete)
- [ ] Delete-knapp finns i UI med confirmation
- [ ] Notes sparas med auto-save

### Sprint 2 ✅
- [ ] `plan_versions` och `plan_version_blocks` tabeller finns
- [ ] `runs` tabell finns
- [ ] `plans.status` och `plans.current_version_id` finns
- [ ] `POST /api/plans/[planId]/publish` skapar version
- [ ] "Publicera"-knapp finns i SessionEditor
- [ ] Status-badge visas (draft/published/modified)
- [ ] `plan_play_progress` data migrerad till `runs`

### Sprint 3 ✅
- [ ] `/api/play/[planId]/start` returnerar `RunWithSteps`
- [ ] Steps genereras server-side, inte i client
- [ ] PlayRunPage använder nya API:t
- [ ] Progress sparas i `runs` via `/api/play/runs/[runId]/progress`
- [ ] `plan_templates` tabell finns
- [ ] Templates kan skapas från publicerad plan
- [ ] Plan kan skapas från template

### Sprint 4 ✅ COMPLETE
- [x] `plan_games` tabell borttagen (migration: 20251230120000_planner_cleanup.sql)
- [x] `lib/db/plans.ts` borttagen (434 rader dead code)
- [x] `lib/db/index.ts` uppdaterad (plans exports borttagna)
- [x] `fetchPlayablePlan` borttagen från features/planner/api.ts
- [x] `onUpdateBlock` prop borttagen från SessionEditor
- [x] `handleUpdateBlock` borttagen från PlannerPage
- [x] `updateBlock` import borttagen från PlannerPage

---

## 14. OPEN QUESTIONS

1. **Schedule-integration:** Ska planer kunna kopplas till kalender/datum i framtiden? Om ja, påverkar det `runs`-modellen (scheduled run vs ad-hoc run)?

2. **Offline-first Play:** Ska Play stödja fullständig offline-mode (Service Worker + IndexedDB)? Påverkar sync-strategi.

3. **Multi-language templates:** Ska templates stödja översättningar, eller hanteras det på game-nivå?

4. **Run-historik:** Hur länge ska avslutade runs sparas? Retention policy behövs för GDPR.

5. **Version-diff:** Ska det finnas UI för att visa skillnad mellan versioner? Påverkar vad som lagras i version-snapshot.

---

## 15. IMPLEMENTATION LOG

### 2025-12-30

#### Started Sprint 1
- Created `lib/auth/capabilities.ts` ⏳

---

*Dokumentet uppdateras löpande under implementation.*
