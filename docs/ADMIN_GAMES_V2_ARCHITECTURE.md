# Admin Games V2 - Scalable Game Management System

## Metadata
- **Owner**: System Admin Team
- **Status**: Active
- **Created**: 2026-01-08
- **Last Updated**: 2026-01-08

## Overview

This document describes the redesigned `/admin/games` area, built for managing thousands of games with powerful filtering, bulk operations, and a clear separation between browsing/managing (admin overview) and authoring (Game Builder).

### Core Principles

1. **Builder is sacred**: The existing Game Builder remains the single place for creating and editing games. This system complements it, never replaces it.

2. **Scale-first**: Designed for 10,000+ games with server-side pagination, cached queries, and virtualization-ready architecture.

3. **Admin-optimized**: High information density, keyboard shortcuts, bulk operations, and saved filter presets.

4. **Config-driven**: Game types, play modes, and UI options are defined in configuration, not hardcoded.

---

## Architecture

### Directory Structure

```
features/admin/games/v2/
├── index.ts                    # Public exports
├── types.ts                    # Type definitions
├── config.ts                   # Config-driven definitions
├── GameAdminPageV2.tsx         # Main page component
└── components/
    ├── GameCardDrawer.tsx      # Detail drawer (read-only view)
    ├── GameFilterPanel.tsx     # Advanced filtering
    └── GameBulkActions.tsx     # Bulk operation framework

app/api/admin/games/
├── search/
│   ├── route.ts               # Server-side search API
│   └── helpers.ts             # Query builders, validation
└── bulk/
    └── route.ts               # Bulk operations API
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
├─────────────────────────────────────────────────────────────────┤
│  GameAdminPageV2                                                 │
│  ├── GameFilterBar (compact inline filters)                     │
│  ├── GameFilterPanel (full sidebar panel)                       │
│  ├── GameBulkActionsBar (selection toolbar)                     │
│  ├── Game Table (server-rendered rows)                          │
│  └── GameCardDrawer (detail view)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/admin/games/search                                    │
│  ├── Auth check (system_admin/superadmin)                       │
│  ├── Filter parsing (Zod validation)                            │
│  ├── Query building (Supabase)                                  │
│  └── Response enrichment (validation state, counts)             │
│                                                                  │
│  POST /api/admin/games/bulk                                      │
│  ├── Auth check                                                  │
│  ├── Operation dispatch                                          │
│  └── Result aggregation                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
├─────────────────────────────────────────────────────────────────┤
│  games                   (main table)                            │
│  game_steps              (step content)                          │
│  game_phases             (phase definitions)                     │
│  game_roles              (role definitions)                      │
│  game_media              (cover images, etc.)                    │
│  game_secondary_purposes (M:M purpose mapping)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### GameAdminPageV2

The main page orchestrates all components and manages state.

**Responsibilities:**
- Load games via server-side search API
- Manage filter state and URL persistence
- Handle game selection for bulk operations
- Coordinate opening of drawer and builder

**State Management:**
- `games: GameAdminRow[]` - Current page of games
- `filters: GameAdminFilters` - All filter/sort/pagination state
- `selection: useBulkSelection()` - Selected games for bulk ops
- `selectedGame: GameAdminRow | null` - Game for drawer

### GameCardDrawer

A read-only detail view that opens as a right-side drawer.

**Tabs:**
1. **Overview** - Cover, quick stats, status, validation issues
2. **Content** - Schema info, step/phase/role counts, feature status
3. **Availability** - Scope (global/tenant), product association
4. **Metadata** - Player counts, age range, duration, purposes
5. **History** - Timestamps, import source, changelog (future)

**Key Behavior:**
- Opens when clicking a row (NOT when clicking Builder button)
- "Open in Game Builder" button navigates to builder
- Read-only view - all edits go through Builder

### GameFilterPanel

Advanced filtering with collapsible groups.

**Filter Groups:**
1. **Classification** - Purpose, age range, duration
2. **Play & Execution** - Play mode, players, energy, location
3. **Lifecycle & Quality** - Status, validation state
4. **Ownership & Scope** - Source, tenant, global flag
5. **Technical** - Content version, schema version

**Features:**
- Collapsible groups with active filter counts
- Multi-select dropdowns for enum fields
- Range inputs for numeric fields
- Filter preset save/load (future)
- URL persistence for shareable links

### GameBulkActionsBar

Appears when games are selected, provides bulk operations.

**Available Operations:**
- Publish / Unpublish
- Revalidate
- Export (CSV/JSON)
- Archive
- Delete (with confirmation)

**UX Patterns:**
- Shows selected count and "select all" option
- Confirmation dialogs for destructive actions
- Progress feedback during execution
- Clear selection after success

---

## API Contracts

### POST /api/admin/games/search

**Request:**
```typescript
{
  search?: string;           // Full-text search
  classification?: {
    mainPurposes?: string[];
    ageMin?: number;
    ageMax?: number;
    durationMin?: number;
    durationMax?: number;
  };
  playExecution?: {
    playModes?: ('basic' | 'facilitated' | 'participants')[];
    minPlayers?: number;
    maxPlayers?: number;
    energyLevels?: ('low' | 'medium' | 'high')[];
    locationType?: ('indoor' | 'outdoor' | 'both')[];
  };
  lifecycle?: {
    statuses?: ('draft' | 'published')[];
    validationStates?: ('valid' | 'warnings' | 'errors' | 'pending')[];
  };
  ownership?: {
    tenantIds?: string[];
    isGlobal?: boolean;
  };
  technical?: {
    gameContentVersions?: string[];
  };
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'status' | 'play_mode';
  sortOrder?: 'asc' | 'desc';
  page?: number;            // Default: 1
  pageSize?: number;        // Default: 25, max: 100
}
```

**Response:**
```typescript
{
  games: GameAdminRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  metadata: {
    appliedFilters?: GameAdminFilters;
  };
}
```

### POST /api/admin/games/bulk

**Request:**
```typescript
{
  operation: 'publish' | 'unpublish' | 'revalidate' | 'archive' | 'delete' | ...;
  gameIds: string[];
  params?: Record<string, unknown>;
}
```

**Response:**
```typescript
{
  success: boolean;
  affected: number;
  failed: number;
  errors?: Array<{ gameId: string; error: string }>;
  warnings?: Array<{ gameId: string; warning: string }>;
}
```

---

## Type System

### Core Types

```typescript
// Extended game row for admin views
type GameAdminRow = {
  // Base fields from games table
  id: string;
  name: string;
  status: 'draft' | 'published';
  play_mode: 'basic' | 'facilitated' | 'participants' | null;
  // ... other fields
  
  // Joined relations
  owner?: { id: string; name: string | null } | null;
  main_purpose?: { id: string; name: string | null } | null;
  media?: Array<{ kind: string; media: MediaRow | null }>;
  
  // Computed/enriched fields
  step_count?: number;
  phase_count?: number;
  role_count?: number;
  validation_state?: ValidationState;
  validation_errors?: string[];
  validation_warnings?: string[];
};

// Validation states
type ValidationState = 
  | 'valid'      // All checks passed
  | 'warnings'   // Playable but has warnings
  | 'errors'     // Has blocking errors
  | 'pending'    // Not yet validated
  | 'outdated';  // Schema changed since validation
```

### Filter Types

Each filter group has its own type for clarity and maintainability:

```typescript
type ClassificationFilters = { mainPurposes?: string[]; ageMin?: number; ... };
type PlayExecutionFilters = { playModes?: PlayMode[]; ... };
type LifecycleFilters = { statuses?: GameStatus[]; ... };
type OwnershipFilters = { tenantIds?: string[]; isGlobal?: boolean; ... };
type TechnicalFilters = { gameContentVersions?: string[]; ... };

type GameAdminFilters = {
  search?: string;
  classification?: ClassificationFilters;
  playExecution?: PlayExecutionFilters;
  lifecycle?: LifecycleFilters;
  ownership?: OwnershipFilters;
  technical?: TechnicalFilters;
  sortBy?: GameSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};
```

---

## Configuration System

The configuration file (`config.ts`) defines all extensible options:

- **Game Types**: Categories like Activity, Escape Room, Quiz
- **Play Modes**: Basic, Facilitated, Participants with feature sets
- **Validation States**: Visual representation and severity
- **Bulk Actions**: Available operations with permissions
- **Table Columns**: Column visibility and ordering
- **Feature Flags**: Future features that can be toggled

This approach allows:
1. Adding new game types without code changes
2. Modifying validation rules dynamically
3. A/B testing new features
4. Database-driven configuration in the future

---

## Performance Considerations

### Current Implementation

1. **Server-side pagination**: Only fetches current page (25-100 items)
2. **Indexed queries**: Uses existing database indexes
3. **Debounced search**: 300ms debounce on text input
4. **Cached reference data**: Purposes, tenants, products cached

### Future Optimizations (Feature Flagged)

1. **Virtualized list**: React-window for 10,000+ rows
2. **Query caching**: SWR or React Query with stale-while-revalidate
3. **Infinite scroll**: Alternative to pagination
4. **Search indexing**: pg_trgm or external search (Meilisearch)

---

## Security

### Access Control

- All admin APIs require authentication
- Role check: `system_admin` or `superadmin` required
- RLS policies remain enforced at database level

### Bulk Operation Safety

- Maximum 500 items per bulk operation
- Confirmation required for destructive actions
- Audit logging for all bulk operations (future)

---

## Future Roadmap

### Phase 1 (Current) ✅
- [x] Server-side search API
- [x] Advanced filtering
- [x] Game Card drawer
- [x] Bulk operations
- [x] Table-first layout

### Phase 2 (Planned)
- [ ] URL-persisted filters
- [ ] Saved filter presets
- [ ] Keyboard shortcuts
- [ ] Column configuration UI
- [ ] Export improvements

### Phase 3 (Future)
- [ ] AI-assisted tagging
- [ ] AI quality scoring
- [ ] Duplicate detection
- [ ] Review/approval workflow
- [ ] System badges (Verified, Featured)
- [ ] Virtualized list for 10k+ games

---

## Migration Notes

### Using V2 (New System)

To use the new admin page, update the page file:

```typescript
// app/admin/games/page.tsx
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { GameAdminPageV2 } from '@/features/admin/games/v2';

export default async function GamesAdminPage() {
  await requireSystemAdmin('/admin');
  return <GameAdminPageV2 />;
}
```

### Fallback to V1

The original `GameAdminPage` remains available for fallback:

```typescript
import { GameAdminPage } from '@/features/admin/games/GameAdminPage';
```

### Breaking Changes

None - V2 is additive and the original components remain unchanged.

---

## Related Documents

- [ADMIN_GAME_BUILDER_V1.md](./ADMIN_GAME_BUILDER_V1.md) - Game Builder documentation
- [GAMES_DOMAIN.md](./GAMES_DOMAIN.md) - Games domain architecture
- [ADMIN_DESIGN_SYSTEM.md](./ADMIN_DESIGN_SYSTEM.md) - Admin UI patterns
