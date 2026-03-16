# 🚀 Browse Scaling Implementation Plan

> **Datum:** 2026-01-30  
> **Status:** Audit Complete, Ready for Implementation  
> **Prioritet:** Kritisk – Blockerande för import av 150+ lekar

---

## 📊 Executive Summary

### Nuläge vs Målbild

| Dimension | Nuläge | Målbild | Gap |
|-----------|--------|---------|-----|
| **Pagination** | Offset-baserad | Cursor-baserad | 🔴 |
| **Payload/spel** | ~15-50 KB (full + relations) | ~1-2 KB (summary) | 🔴 |
| **Initial load** | 12 spel client-side | 24-36 spel SSR | 🟡 |
| **Index** | Bra grund, saknar composites | Full coverage | 🟡 |
| **Translation** | DB-baserad finns (bra!) | Aktivera i Browse | 🟢 |
| **Import** | Saknar external_ref | Full idempotens | 🟡 |

### Uppskattad payload-förbättring

```
INNAN: 24 spel × 30 KB = 720 KB per request
EFTER: 24 spel × 1.5 KB = 36 KB per request
= 95% reduktion ✅
```

---

## Fas 1: API Payload Optimization (DAG 1-2)

### 1.1 Skapa Summary-Only Select

**Problem:** API returnerar `*` med alla relationer, mappas sedan till `GameSummary`.

**Lösning:** Explicit select med bara summary-fält.

```typescript
// Ny konstant i helpers.ts
export const GAME_SUMMARY_SELECT = `
  id,
  game_key,
  name,
  short_description,
  energy_level,
  location_type,
  time_estimate_min,
  duration_max,
  min_players,
  max_players,
  age_min,
  age_max,
  play_mode,
  difficulty,
  popularity_score,
  rating_average,
  rating_count,
  status,
  created_at,
  product_id,
  main_purpose_id,
  is_demo_content,
  cover_image:game_media!inner(
    media:media(url)
  ).filter(kind.eq.cover).limit(1),
  product:products!product_id(id,name,product_key),
  main_purpose:purposes!main_purpose_id(id,name)
` as const;
```

**Filer att ändra:**
- [helpers.ts](app/api/games/search/helpers.ts) - lägg till `GAME_SUMMARY_SELECT`
- [route.ts](app/api/games/search/route.ts) - använd den istället för `*`

### 1.2 Cursor Pagination Schema

**Ändra i `searchSchema`:**

```typescript
// helpers.ts - uppdatera schema
export const searchSchema = z.object({
  // ... existing fields ...
  
  // Ersätt page/pageSize med:
  pageSize: z.number().int().min(1).max(48).default(24),
  cursor: z.object({
    popularityScore: z.number(),
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
  }).optional(),
  
  // Behåll page för backward compatibility (deprecated)
  page: z.number().int().min(1).optional(),
});
```

### 1.3 Cursor-baserad Query Logic

```typescript
// route.ts - ny cursor-logik
if (cursor) {
  // Keyset pagination: "less popular than cursor OR same but older OR same but lower id"
  query = query.or(`
    popularity_score.lt.${cursor.popularityScore},
    and(popularity_score.eq.${cursor.popularityScore},created_at.lt.${cursor.createdAt}),
    and(popularity_score.eq.${cursor.popularityScore},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})
  `);
}

// Sort måste alltid vara stabil
query = query
  .order('popularity_score', { ascending: false })
  .order('created_at', { ascending: false })
  .order('id', { ascending: false });
```

### 1.4 Ny Response Shape

```typescript
interface SearchResponse {
  games: GameSummary[];        // Endast summary-data
  total?: number;              // Optional för cursor (dyrt att räkna)
  hasMore: boolean;
  nextCursor?: {
    popularityScore: number;
    createdAt: string;
    id: string;
  };
  metadata: {
    allowedProducts: string[];
    isDemoMode?: boolean;
  };
}
```

---

## Fas 2: Database Index Optimization (DAG 2)

### 2.1 Migration: Composite Index för Cursor

```sql
-- supabase/migrations/20260130_browse_indexes.sql

-- Cursor pagination index (critical for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_cursor_sort 
ON games (popularity_score DESC, created_at DESC, id DESC)
WHERE status = 'published';

-- Common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_product 
ON games (status, product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_purpose 
ON games (status, main_purpose_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_playmode 
ON games (status, play_mode);

-- Player range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_players_range 
ON games (min_players, max_players)
WHERE status = 'published';
```

### 2.2 Verifiera Child Table Indexes

```sql
-- Bekräfta att dessa finns (för EXISTS-filter)
-- game_steps: idx_game_steps_game_order (game_id)
-- game_phases: idx_game_phases_game_order (game_id)
-- game_roles: idx_game_roles_game_order (game_id)
-- game_artifacts: idx_game_artifacts_game_order (game_id)
-- game_materials: idx_game_materials_unique_locale (game_id, locale)
```

---

## Fas 3: Frontend Infinite Scroll (DAG 3-4)

### 3.1 Ny Hook: useInfiniteGames

```typescript
// hooks/use-infinite-games.ts
import { useInfiniteQuery } from '@tanstack/react-query';

interface Cursor {
  popularityScore: number;
  createdAt: string;
  id: string;
}

export function useInfiniteGames(filters: FilterState) {
  return useInfiniteQuery({
    queryKey: ['games', 'browse', filters],
    queryFn: async ({ pageParam }) => {
      const res = await fetch('/api/games/search', {
        method: 'POST',
        body: JSON.stringify({
          ...filters,
          pageSize: 24,
          cursor: pageParam,
        }),
      });
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as Cursor | undefined,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

### 3.2 Intersection Observer för Infinite Scroll

```typescript
// components/game/InfiniteGameGrid.tsx
'use client';

import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function InfiniteGameGrid({ filters }: Props) {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteGames(filters);
  
  const { ref, inView } = useInView({ threshold: 0 });
  
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);
  
  const games = data?.pages.flatMap(p => p.games) ?? [];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {games.map(game => (
        <GameCard key={game.id} game={game} />
      ))}
      
      {/* Skeleton cards vid loading */}
      {isFetchingNextPage && (
        <>
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
          <GameCardSkeleton />
        </>
      )}
      
      {/* Trigger för nästa sida */}
      {hasNextPage && <div ref={ref} className="col-span-full h-10" />}
    </div>
  );
}
```

### 3.3 SSR First Page

```typescript
// app/app/browse/page.tsx
import { createServerRlsClient } from '@/lib/supabase/server';
import { InfiniteGameGrid } from '@/components/game/InfiniteGameGrid';

export default async function BrowsePage({ searchParams }) {
  const supabase = await createServerRlsClient();
  
  // Server-side first page fetch
  const initialData = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/games/search`, {
    method: 'POST',
    body: JSON.stringify({ pageSize: 24 }),
    cache: 'no-store', // Or revalidate
  }).then(r => r.json());
  
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <InfiniteGameGrid 
          initialData={initialData}
          filters={parseFilters(searchParams)} 
        />
      </HydrationBoundary>
    </Suspense>
  );
}
```

---

## Fas 4: Translation för Browse (DAG 4-5)

### 4.1 Locale-parameter i Search API

```typescript
// helpers.ts - lägg till i schema
export const searchSchema = z.object({
  // ... existing ...
  locale: z.enum(['sv', 'en', 'no']).default('sv'),
});
```

### 4.2 Join med game_translations

```typescript
// route.ts - uppdatera select
const locale = parsed.data.locale;

const GAME_SUMMARY_SELECT_LOCALIZED = `
  id,
  game_key,
  energy_level,
  location_type,
  time_estimate_min,
  duration_max,
  min_players,
  max_players,
  age_min,
  age_max,
  play_mode,
  difficulty,
  popularity_score,
  rating_average,
  rating_count,
  status,
  created_at,
  product_id,
  main_purpose_id,
  is_demo_content,
  
  -- Fallback: locale-specifik först, sen default
  translations:game_translations!inner(
    title,
    short_description
  ),
  
  cover_image:game_media(
    media:media(url)
  ),
  product:products(id, name, product_key),
  main_purpose:purposes(id, name)
`;

// Lägg till filter på translations
query = query
  .select(GAME_SUMMARY_SELECT_LOCALIZED, { count: 'exact' })
  .eq('game_translations.locale', locale);
```

### 4.3 Fallback-logik

```typescript
// Om ingen translation för locale, fallback till 'sv'
const { data, error } = await query;

// Post-process: använd name/short_description som fallback
const gamesWithFallback = (data ?? []).map(game => ({
  ...game,
  title: game.translations?.[0]?.title ?? game.name,
  shortDescription: game.translations?.[0]?.short_description ?? game.short_description,
}));
```

---

## Fas 5: Import-beredskap (DAG 5-6)

### 5.1 Migration: external_ref column

```sql
-- supabase/migrations/20260130_import_support.sql

-- Unique external reference for idempotent imports
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS external_ref TEXT;

-- Index for fast lookup during import
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_games_external_ref 
ON games (external_ref) 
WHERE external_ref IS NOT NULL;

-- Import source tracking
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS import_source TEXT;

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
```

### 5.2 Import Validation Schema

```typescript
// lib/import/game-import-schema.ts
import { z } from 'zod';

export const gameImportRowSchema = z.object({
  external_ref: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  short_description: z.string().max(300).optional(),
  product_key: z.string(), // Lookup product_id
  purpose_name: z.string().optional(), // Lookup main_purpose_id
  energy_level: z.enum(['low', 'medium', 'high']).optional(),
  location_type: z.enum(['indoor', 'outdoor', 'both']).optional(),
  time_estimate_min: z.number().int().positive().optional(),
  min_players: z.number().int().positive().optional(),
  max_players: z.number().int().positive().optional(),
  age_min: z.number().int().positive().optional(),
  age_max: z.number().int().positive().optional(),
  play_mode: z.enum(['basic', 'facilitated', 'participants']).default('basic'),
  
  // Translations
  translations: z.record(z.enum(['sv', 'en', 'no']), z.object({
    title: z.string(),
    short_description: z.string().optional(),
    instructions: z.array(z.string()).optional(),
  })).optional(),
});

export type GameImportRow = z.infer<typeof gameImportRowSchema>;
```

### 5.3 Import Pipeline

```typescript
// lib/import/game-import-pipeline.ts

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

export async function importGames(
  rows: unknown[],
  options: { dryRun?: boolean; batchSize?: number } = {}
): Promise<ImportResult> {
  const { dryRun = false, batchSize = 50 } = options;
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  
  // Validate all rows first
  const validated: Array<{ row: number; data: GameImportRow }> = [];
  
  for (let i = 0; i < rows.length; i++) {
    const parsed = gameImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.failed++;
      for (const issue of parsed.error.issues) {
        result.errors.push({
          row: i + 1,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    } else {
      validated.push({ row: i + 1, data: parsed.data });
    }
  }
  
  if (dryRun) {
    result.success = validated.length;
    return result;
  }
  
  // Batch insert with upsert on external_ref
  for (let i = 0; i < validated.length; i += batchSize) {
    const batch = validated.slice(i, i + batchSize);
    // ... upsert logic with conflict on external_ref
  }
  
  return result;
}
```

---

## Fas 6: Safety Guardrails (DAG 6)

### 6.1 API Hard Caps

```typescript
// helpers.ts - redan finns men förtydliga
pageSize: z.number()
  .int()
  .min(1)
  .max(48) // HARD CAP
  .default(24),
```

### 6.2 Empty State & "Too Broad" Hint

```typescript
// BrowsePage.tsx
if (total > 500 && !hasActiveFilters) {
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        Över 500 lekar matchar. Använd filter för att begränsa resultatet.
      </p>
      <FilterSuggestions />
    </div>
  );
}
```

### 6.3 Debounce på filter-input

```typescript
// hooks/use-browse-filters.ts
const debouncedSearch = useDebouncedValue(search, 300);
```

### 6.4 Performance Logging

```typescript
// route.ts - lägg till timing
const startTime = performance.now();
const { data, error, count } = await query;
const duration = performance.now() - startTime;

if (duration > 500) {
  console.warn(`[SLOW QUERY] /api/games/search took ${duration}ms`, {
    filters: parsed.data,
    resultCount: count,
  });
}
```

---

## Checklista för Implementation

### Dag 1-2: Backend
- [ ] Skapa `GAME_SUMMARY_SELECT` konstant
- [ ] Uppdatera route.ts att använda summary select
- [ ] Lägg till cursor-parameter i schema
- [ ] Implementera cursor-pagination logik
- [ ] Uppdatera response shape med nextCursor
- [ ] Testa att payload är ~1-2 KB per spel

### Dag 2: Database
- [ ] Skapa migration för composite indexes
- [ ] Kör migration mot staging
- [ ] Verifiera EXPLAIN ANALYZE på typiska queries

### Dag 3-4: Frontend
- [ ] Skapa `useInfiniteGames` hook
- [ ] Skapa `InfiniteGameGrid` component
- [ ] Lägg till intersection observer för auto-load
- [ ] Uppdatera BrowsePage med SSR first page
- [ ] Testa scroll-performance med 100+ kort

### Dag 4-5: Translation
- [ ] Lägg till locale-parameter i search schema
- [ ] Uppdatera select att joina game_translations
- [ ] Implementera fallback-logik
- [ ] Testa med no/en locale

### Dag 5-6: Import
- [ ] Skapa migration för external_ref
- [ ] Skapa import validation schema
- [ ] Skapa import pipeline med dry-run
- [ ] Testa import av 10 → 50 → 150 spel

### Dag 6: Safety
- [ ] Verifiera hard cap fungerar
- [ ] Lägg till "too broad" hint
- [ ] Lägg till performance logging
- [ ] Sätt upp alert för slow queries

---

## Risker & Mitigering

| Risk | Sannolikhet | Impact | Mitigering |
|------|-------------|--------|------------|
| RLS blir långsam med cursor | Medium | High | Testa tidigt, förenkla policy vid behov |
| Translation join slår performance | Low | Medium | Lateral join eller post-fetch join |
| Infinite scroll memory leak | Low | Medium | React Query garbage collection |
| Import duplicerar data | Medium | High | Enforce external_ref UNIQUE |

---

## Framtida förbättringar (Post-MVP)

1. **Virtualisering** - `react-virtual` när >200 synliga kort
2. **Search index** - pg_trgm eller ElasticSearch för fritext
3. **Edge caching** - Vercel Edge Cache för populära filter-combos
4. **Precomputed views** - Materialized view för "most popular per product"

---

## Appendix: Befintlig Translation-modell

✅ **Ni har redan rätt modell!** Ingen stor refactor behövs.

```
game_translations (game_id, locale) ← Summary text
game_steps       (game_id, locale) ← Step content
game_phases      (game_id, locale) ← Phase names
game_roles       (game_id, locale) ← Role content
game_artifacts   (game_id, locale) ← Artifact text
game_board_config (game_id, locale) ← Board messages
```

**Enda ändringen:** Börja använda `game_translations` i Browse API.
