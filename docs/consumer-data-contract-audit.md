# Consumer Data Contract Audit

**Sprint 4.7 — Browse & Planner Data Correctness**

> Status: ✅ COMPLETE  
> Date: 2026-02-02

---

## Executive Summary

This audit verifies that `/app/browse` and `/app/planner/plans` consume game data correctly from their respective APIs. Both consumers use well-defined mappers with explicit type contracts. No direct JSON column parsing or legacy fallback issues were found.

---

## 1. Browse Page (`/app/browse`)

### Data Flow

```
User → BrowsePage.tsx
        ↓
    POST /api/games/search
        ↓
    GAME_SUMMARY_SELECT (explicit column list)
        ↓
    applyTranslation() (locale-specific title/description)
        ↓
    Response: DbGame[]
        ↓
    mapBrowseGameToSummary() (adapter in BrowsePage.tsx)
        ↓
    mapDbGameToSummary() (lib/game-display/mappers.ts)
        ↓
    GameSummary type
        ↓
    GameCard component
```

### Data Source

| Item | Value |
|------|-------|
| API Endpoint | `POST /api/games/search` |
| Query Type | Supabase select with explicit columns (`GAME_SUMMARY_SELECT`) |
| Mapper | `mapDbGameToSummary()` from `lib/game-display/mappers.ts` |
| Output Type | `GameSummary` from `lib/game-display/types.ts` |

### Fields Rendered in GameCard

| Field | Type in GameSummary | Source Column | Used In |
|-------|---------------------|---------------|---------|
| `id` | `string` (required) | `games.id` | Links, reactions |
| `title` | `string` (required) | `_translatedTitle` → `translations.title` → `games.name` | Card title |
| `shortDescription` | `string?` | `_translatedShortDescription` → `translations.short_description` → `games.description` | Card body |
| `coverUrl` | `string?` | `game_media[kind=cover].media.url` | Card image |
| `durationMin` | `number?` | `games.time_estimate_min` | Duration badge |
| `durationMax` | `number?` | `games.duration_max` | Duration badge |
| `minPlayers` | `number?` | `games.min_players` | Players badge |
| `maxPlayers` | `number?` | `games.max_players` | Players badge |
| `ageMin` | `number?` | `games.age_min` | Age badge |
| `ageMax` | `number?` | `games.age_max` | Age badge |
| `energyLevel` | `'low'|'medium'|'high'?` | `games.energy_level` | Energy badge |
| `playMode` | `'basic'|'facilitated'|'participants'?` | `games.play_mode` | PlayMode badge/styling |
| `purpose` | `string?` | `purposes.name` via `main_purpose_id` | Category label |
| `product` | `string?` | `products.name` via `product_id` | Product label |
| `rating` | `number?` | `games.rating_average` | Star rating |
| `isFavorite` | `boolean?` | Separate reactions API call | Heart icon |

### Contract Notes

- ✅ All fields are optional except `id` and `title`
- ✅ `playMode` uses canonical enum values matching DB constraint
- ✅ `energyLevel` uses canonical enum values
- ✅ Translation fallback chain is deterministic: locale → first available → base field
- ✅ No direct JSON parsing in UI — all structured by mapper

---

## 2. Planner (`/app/planner/plans` and `/app/planner/plan/[planId]`)

### Data Flow

```
User → PlanLibraryPage / PlanWizard
        ↓
    fetchPlans() / fetchPlan() (features/planner/api.ts)
        ↓
    POST /api/plans/search   or   GET /api/plans/[planId]
        ↓
    fetchPlanWithRelations() (lib/services/planner.server.ts)
        ↓
    Supabase join: plans → plan_blocks → games → game_translations
        ↓
    buildPlanModel() + mapGameSummary()
        ↓
    Response: PlannerPlan (with PlannerBlock[] containing PlannerGameSummary)
        ↓
    UI Components (BlockCard, GameCard picker)
```

### Data Source

| Item | Value |
|------|-------|
| API Endpoint | `GET /api/plans/[planId]`, `POST /api/plans/search` |
| Query Type | Supabase select with nested relations |
| Mapper | `buildPlanModel()` + `mapGameSummary()` in `planner.server.ts` |
| Output Types | `PlannerPlan`, `PlannerBlock`, `PlannerGameSummary` from `types/planner.ts` |

### Fields in PlannerGameSummary

| Field | Type | Source Column | Used In |
|-------|------|---------------|---------|
| `id` | `string` | `games.id` | Block reference |
| `title` | `string` | `translations.title` → `games.name` | Block title |
| `shortDescription` | `string?` | `translations.short_description` → `games.description` | Block preview |
| `durationMinutes` | `number?` | `games.time_estimate_min` | Block duration, total time |
| `coverUrl` | `string?` | `game_media[kind=cover].media.url` | Block thumbnail |
| `energyLevel` | `string?` | `games.energy_level` | Visual indicator |
| `locationType` | `string?` | `games.location_type` | Filter/display |

### Fields in PlannerPlayBlock (for play view)

| Field | Type | Source | Used In |
|-------|------|--------|---------|
| `game.steps[]` | `{ title, description?, durationMinutes? }[]` | `game_translations.instructions` | Step-by-step display |
| `game.materials` | `string[]?` | `game_translations.materials` | Materials list |
| `game.summary` | `string?` | `translations.short_description` | Play overview |

### Contract Notes

- ✅ `PlannerGameSummary` is a subset of `GameSummary` — compatible mapping
- ✅ Duration is `durationMinutes` (not min/max range) — derived from `time_estimate_min`
- ✅ Translation fallback uses same `pickTranslation()` logic as Browse
- ✅ `energyLevel` and `locationType` are strings (less strict than Browse)
- ⚠️ `play_mode` is NOT in `PlannerGameSummary` — Planner doesn't distinguish facilitated/participants in blocks
- ✅ Steps are parsed from `instructions` JSON array with safe fallback

---

## 3. Contract Correctness Check

### UUIDs

| Consumer | Field | Format | Status |
|----------|-------|--------|--------|
| Browse | `game.id` | Raw UUID (no prefix) | ✅ |
| Planner | `block.id`, `game.id` | Raw UUID | ✅ |

### Enums

| Consumer | Field | Valid Values | Status |
|----------|-------|--------------|--------|
| Browse | `playMode` | `basic`, `facilitated`, `participants` | ✅ Matches DB |
| Browse | `energyLevel` | `low`, `medium`, `high` | ✅ Matches DB |
| Planner | `energyLevel` | `string` (lenient) | ✅ No validation issues |

### Null vs Undefined

| Consumer | Field | Convention | Status |
|----------|-------|------------|--------|
| Browse | `coverUrl` | `string | null` | ✅ Matches `GameSummary` |
| Browse | `shortDescription` | `string?` (undefined) | ✅ |
| Planner | `durationMinutes` | `number | null` | ✅ Explicit null |
| Planner | `game` | `PlannerGameSummary | null` | ✅ For non-game blocks |

### PlayMode-Specific Data

| PlayMode | Browse | Planner |
|----------|--------|---------|
| `basic` | Standard card, no special data | N/A |
| `facilitated` | PlayMode badge shown | Phases not in PlannerGameSummary |
| `participants` | PlayMode badge + border styling | Roles not in PlannerGameSummary |

⚠️ **Note:** Planner does NOT load phases/roles for game blocks. This is intentional — Planner shows summary, not full game content. If Planner later needs phase timing, it would need to extend the select.

---

## 4. Risk Assessment

### Low Risk ✅

- Both consumers use centralized mappers
- Types are well-defined and exported
- No legacy field fallbacks or ad-hoc JSON parsing

### Medium Risk ⚠️

- **Planner play view** parses `instructions` JSON from translations
  - Mitigation: `mapInstructionsToSteps()` has safe fallback to title-only step
  - Test coverage: Contract test validates step structure

### No Risk Found ❌

- Direct column access bypassing mappers
- Hardcoded field names not matching DB schema
- Mixed null/undefined conventions

---

## 5. Test Coverage

Created tests in:
- `tests/unit/app/browse-data-contract.test.ts`
- `tests/unit/app/planner-data-contract.test.ts`

These tests:
1. Create golden game objects matching DB response shape
2. Run through the actual mappers used by Browse/Planner
3. Assert all rendering-critical fields exist and have correct types
4. Verify enum values are within allowed sets
5. Test fallback behavior for missing translations

---

## 6. Recommendations

### Immediate (Done)

- ✅ Contract tests added
- ✅ Documentation complete

### Future (Optional)

1. Consider adding `playMode` to `PlannerGameSummary` if block styling should vary
2. Consider extracting `GAME_SUMMARY_SELECT` to shared constant for reuse
3. Add runtime validation (Zod) at API boundaries for extra safety

---

## Appendix: File References

| File | Purpose |
|------|---------|
| `app/api/games/search/route.ts` | Browse search endpoint |
| `app/api/games/search/helpers.ts` | `GAME_SUMMARY_SELECT`, schemas |
| `lib/game-display/mappers.ts` | `mapDbGameToSummary()`, `mapDbGameToDetail()` |
| `lib/game-display/types.ts` | `GameSummary`, `GameDetailData` |
| `lib/services/planner.server.ts` | `fetchPlanWithRelations()`, `mapGameSummary()` |
| `types/planner.ts` | `PlannerPlan`, `PlannerBlock`, `PlannerGameSummary` |
| `features/browse/BrowsePage.tsx` | Browse UI + local adapter |
| `components/game/GameCard/GameCard.tsx` | GameCard rendering |
