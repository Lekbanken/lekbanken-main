# Standardbilder Audit Report

**Date:** 2025-01-08 (Updated: 2026-02-08)  
**Status:** ✅ COMPLETE  
**Goal:** Make imported games 100% production-ready by auto-assigning cover images (standardbilder)

---

## 0. Design Invariants

These are the **hard guarantees** this system provides:

| Invariant | Enforcement |
|-----------|-------------|
| Max one cover per game | DB: `game_media_unique_cover` partial unique index |
| Never overwrite existing cover | TS: Check before insert + catch duplicate key |
| Deterministic selection | Hash function: `hash(game_key) % templates.length` |
| Race-safe | PostgreSQL `23505` → treated as `already_has_cover` |
| Alt-text for accessibility | Auto-set to `game.name` on insert |

**Where to change selection logic:** [lib/import/assignCoverFromTemplates.ts](../lib/import/assignCoverFromTemplates.ts)

---

## 1. Current System Architecture

### 1.1 How Cover Images are Stored

Cover images are stored via the **`game_media`** junction table:

```sql
-- Junction table linking games to media
CREATE TABLE game_media (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  media_id UUID REFERENCES media(id),
  kind game_media_kind,  -- ENUM: 'cover' | 'gallery'
  position INTEGER DEFAULT 0,
  alt_text TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP
);
```

**Key Finding:** There is NO `cover_media_id` column on the `games` table itself.  
Cover is resolved by: `game_media WHERE kind = 'cover' LIMIT 1`

### 1.2 How Standard Images are Organized

Standard images use the **`media_templates`** table:

```sql
CREATE TABLE media_templates (
  id UUID PRIMARY KEY,
  template_key TEXT UNIQUE,           -- e.g., "kognition-fokus-1"
  name TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id),      -- Optional product filter
  main_purpose_id UUID REFERENCES purposes(id), -- Required purpose
  sub_purpose_id UUID REFERENCES purposes(id),  -- Optional sub-purpose
  media_id UUID REFERENCES media(id),           -- The actual image
  priority INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 1.3 Current Builder Flow (StandardImagePicker)

Location: `app/admin/games/builder/components/StandardImagePicker.tsx`

```typescript
// Fetches templates filtered by mainPurposeId only
const { data: standardImages } = useSWR(
  mainPurposeId ? `/api/media?type=template&mainPurposeId=${mainPurposeId}` : null,
  fetcher
);
```

**Current Limitation:** The picker only filters by `main_purpose_id`, ignoring `product_id`.

### 1.4 How Games Link to Products & Purposes

```sql
-- games table has these FK columns:
product_id UUID REFERENCES products(id),
main_purpose_id UUID REFERENCES purposes(id)
```

Both are nullable - imported games may have `main_purpose_id` but NOT `product_id`.

---

## 2. Historical Gap (Now Fixed)

> **✅ Fixed 2026-02-08** - This section documents the original problem that has now been solved.

When a game was imported via the JSON import pipeline:

1. ✅ Game metadata saved (name, description, etc.)
2. ✅ Phases, steps, roles, artifacts, triggers created
3. ✅ `main_purpose_id` resolved from JSON (e.g., "Kognition & Fokus")
4. ⚠️ **`product_id` is NULL** (not specified in JSON schema) - *still true, but not blocking*
5. ✅ **Cover image now auto-assigned** via `assignCoverFromTemplates()`

**Previous Manual Work (No Longer Needed):**
- ~~Admin must open game in builder~~
- ~~Select a standard image from picker~~
- ~~Save game~~

**Current Flow:** Import → Auto-cover → Done ✓

---

## 3. Proposed Solutions

### 3.1 Option A: At-Import Auto-Assignment

**When:** During RPC `import_game_batch()` execution  
**Logic:**

```typescript
// After game is created with main_purpose_id
const eligibleTemplates = await supabase
  .from('media_templates')
  .select('id, media_id')
  .eq('main_purpose_id', game.main_purpose_id)
  .order('priority', { ascending: false })
  .order('is_default', { ascending: false });

if (eligibleTemplates.length > 0) {
  // Deterministic selection: hash game_key → pick index
  const idx = hashCode(game.game_key) % eligibleTemplates.length;
  const selected = eligibleTemplates[idx];
  
  await supabase.from('game_media').insert({
    game_id: game.id,
    media_id: selected.media_id,
    kind: 'cover',
    position: 0,
    tenant_id: null // Platform scope
  });
}
```

**Pros:**
- Zero manual work after import
- Deterministic = same game_key always gets same image
- Can be added to existing RPC

**Cons:**
- Requires template coverage for all purposes in use
- No product-level differentiation at import time

### 3.2 Option B: Mass-Action in /admin/games

**When:** After import, via bulk action  
**UI:** Checkbox selection + "Tilldela standardbild" button

```typescript
// Mass action handler
async function assignStandardImages(gameIds: string[]) {
  for (const gameId of gameIds) {
    const game = await fetchGame(gameId);
    
    // Skip if already has cover
    const existingCover = await supabase
      .from('game_media')
      .select('id')
      .eq('game_id', gameId)
      .eq('kind', 'cover')
      .single();
    
    if (existingCover.data) continue;
    
    // Find eligible templates
    const templates = await supabase
      .from('media_templates')
      .select('id, media_id')
      .eq('main_purpose_id', game.main_purpose_id)
      .order('priority', { ascending: false });
    
    if (templates.data?.length) {
      const idx = hashCode(game.game_key!) % templates.data.length;
      await supabase.from('game_media').insert({
        game_id: gameId,
        media_id: templates.data[idx].media_id,
        kind: 'cover',
        position: 0,
      });
    }
  }
}
```

**Pros:**
- Admin can review before assignment
- Can filter games without cover first
- Supports incremental rollout

**Cons:**
- Requires manual action (1 click, but still)
- Need UI implementation

### 3.3 Option C: Hybrid Approach (Recommended)

1. **At Import:** If `main_purpose_id` has templates → auto-assign  
2. **Mass-Action:** Available as backup for edge cases  
3. **Coverage Dashboard:** Show purpose × product matrix with template counts

---

## 4. Implementation Plan

### Phase 1: Database Prep
- [x] `media_templates` table exists
- [x] Seed script exists (`scripts/seed-standard-images.ts`)
- [ ] **TODO:** Seed templates for all active purposes

### Phase 2: Import Enhancement ✅ IMPLEMENTED
- [x] Created `lib/import/assignCoverFromTemplates.ts`
- [x] Integrated in `app/api/games/csv-import/route.ts` after RPC success
- [x] Added 8 unit tests in `tests/unit/import/assignCoverFromTemplates.test.ts`
- [x] All 103 import tests passing
- [x] No TypeScript errors
- [x] `coverStats` returned in import response and displayed in UI
- [x] `alt_text` set to game name for accessibility

### Phase 2.5: Database Constraint ✅ IMPLEMENTED
- [x] Migration: `20260208000000_game_media_unique_cover.sql`
- [x] Partial unique index: `game_media (game_id) WHERE kind = 'cover'`
- [x] Cleanup duplicates before creating index
- [x] TS handles `23505` duplicate key as `already_has_cover`

### Phase 3: Admin UI (Optional but Nice)
- [ ] Add "Saknar cover" filter to GameAdminPage
- [ ] Add bulk action "Tilldela standardbild"
- [ ] Add coverage matrix to /admin/media

---

## 5. Hash Function Recommendation

```typescript
/**
 * Simple string hash for deterministic image selection.
 * Same game_key always gets same image (within available set).
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

---

## 6. Files Modified

| File | Change |
|------|--------|
| `lib/import/assignCoverFromTemplates.ts` | **NEW** - Core cover assignment logic |
| `app/api/games/csv-import/route.ts` | Integrated cover assignment after RPC success |
| `tests/unit/import/assignCoverFromTemplates.test.ts` | **NEW** - 8 unit tests |
| `types/csv-import.ts` | Added `CoverStats`, `CoverStatsByPurpose` types |
| `features/admin/games/components/GameImportDialog.tsx` | Display `coverStats` in import result UI |
| `supabase/migrations/20260208000000_game_media_unique_cover.sql` | **NEW** - Unique cover constraint |

---

## 7. Data Requirements

For auto-assignment to work, need templates for these purposes:

| Main Purpose | Current Templates | Status |
|--------------|-------------------|--------|
| Kognition & Fokus | ? | ⏳ Audit needed |
| Kommunikation | ? | ⏳ Audit needed |
| Teambuilding | ? | ⏳ Audit needed |
| ... | ... | ... |

**Action Item:** Run query to identify gaps:

```sql
SELECT p.name, p.id, COUNT(mt.id) as template_count
FROM purposes p
LEFT JOIN media_templates mt ON mt.main_purpose_id = p.id
WHERE p.parent_id IS NULL  -- Main purposes only
GROUP BY p.id, p.name
ORDER BY template_count ASC;
```

---

## 8. Success Criteria

- [x] Imported games have cover image automatically (when templates exist)
- [x] Deterministic selection (same game_key → same image)
- [x] No TypeScript errors
- [x] No RPC changes required for GPT JSON format
- [x] Admin can override via builder (existing flow works)
- [x] Idempotent: never overwrites existing cover
- [x] Race-safe: DB constraint + TS duplicate key handling
- [x] Observable: `coverStats` in import response + UI display
- [x] Accessible: `alt_text` auto-set to game name
- [ ] **TODO:** Seed templates for all active purposes (data requirement)

---

## 9. API Response Format

After successful import, the response includes `coverStats`:

```typescript
{
  success: true,
  importRunId: "uuid",
  stats: { total: 10, created: 8, updated: 2, skipped: 0 },
  coverStats: {
    assigned: 7,
    skippedExisting: 2,
    missingTemplates: 1,
    missingTemplatesByPurpose: [
      { purposeId: "uuid-or-null", count: 1 }
    ]
  },
  errors: [],
  warnings: []
}
```

**UI Display** (in GameImportDialog):
```
Standardbilder
✓ 7 spel fick standardbild
ℹ 2 spel hade redan standardbild
⚠ 1 spel saknar standardbilder

Saknade standardbilder per syfte:
• Syfte abc12345...: 1
```

---

## 10. How to Add Templates / Coverage Workflow

### Option A: Via Admin UI (single templates)

1. **Identify gaps**: Import shows `missingTemplatesByPurpose` with purpose names
2. **Upload images**: Go to `/admin/media` → Upload → Set `main_purpose_id`
3. **Create template**: In `media_templates` table, create entry linking `media_id` to `main_purpose_id`
4. **Re-import**: Games with that purpose will now get covers

### Option B: Via Seed Script (bulk / recommended)

For bulk coverage, use the existing seed script:

```bash
npx ts-node scripts/seed-standard-images.ts
```

The script:
- Reads images from a configured source
- Creates `media` entries for each
- Links them to `media_templates` with appropriate `main_purpose_id`

**Tip:** Modify the script's purpose mapping to match your active purposes.

### Identifying Gaps

Run this query to see which purposes lack templates:

```sql
SELECT p.name, p.id, COUNT(mt.id) as template_count
FROM purposes p
LEFT JOIN media_templates mt ON mt.main_purpose_id = p.id
WHERE p.parent_id IS NULL  -- Main purposes only
GROUP BY p.id, p.name
ORDER BY template_count ASC;
```

Or simply import a batch of games - the UI will show exactly which purposes are missing templates (with names, not just IDs).

---

## Summary

**Status:** ✅ **COMPLETE** - Production-ready standardbilder system.

**What was built:**
1. **Auto-cover at import** - Games get covers from `media_templates` via hash-based selection
2. **Observability** - `coverStats` returned in API and displayed in import dialog
3. **Data integrity** - Partial unique index ensures max one cover per game
4. **Race safety** - Duplicate key errors treated as "already has cover"
5. **Accessibility** - `alt_text` auto-set to game name

**Key Files:**
- [lib/import/assignCoverFromTemplates.ts](../lib/import/assignCoverFromTemplates.ts) - Core logic
- [app/api/games/csv-import/route.ts](../app/api/games/csv-import/route.ts) - Integration point
- [features/admin/games/components/GameImportDialog.tsx](../features/admin/games/components/GameImportDialog.tsx) - UI display
- [supabase/migrations/20260208000000_game_media_unique_cover.sql](../supabase/migrations/20260208000000_game_media_unique_cover.sql) - DB constraint

**Remaining Work:** Seed `media_templates` for all active purposes to achieve 100% coverage.
