# Browse Rework Notes

**Updated:** 2025-12-09

## What changed
- **Search API**: `/api/games/search` now enforces tenant entitlements (subscriptions/billing keys), supports products, main/sub purposes (server-side sub-purpose filter), energy, environment (`both` maps to no restriction), group sizes, players, age, time, sort, pagination, and logs to `browse_search_logs` (now including page + pageSize). Sorting includes `popular` (popularity_score + rating_count) and `rating` (rating_average + rating_count).
- **Filters API**: `/api/browse/filters?tenantId=` returns tenant-scoped products, main/sub purposes, and metadata on allowed products. Responses are cached per tenant for 5 minutes and exclude inactive products.
- **Featured/Related**: `/api/games/featured` (tenant-aware, entitlement-filtered, ordered by popularity → engagement → recency) and `/api/games/[id]/related` (scored by product + purpose overlap, tenant/enforcement aware) power browse + detail pages.
- **UI**: `features/browse` consumes the APIs with server-backed filters, pagination, sort, view toggle, featured rail, debounced search, load-more control, and no-access messaging.

## Usage guidance
- Prefer the new APIs from UI/SSR; avoid direct Supabase client browsing queries in favor of entitlement-aware endpoints.
- `environment: "both"` should be treated as “no environment filter” when sending search payloads.
- Pagination defaults: pageSize 12 (UI), max 50 (API); keep requests within these bounds.
- Logging: inserts into `browse_search_logs` are allowed via new insert policy (20251209000110). Ensure database is migrated.
- Metrics: new `games` columns `popularity_score`, `rating_average`, `rating_count` (migration `20251209000100_add_game_metrics.sql`) back sorting; keep them updated via background jobs or analytics pipeline.

## Legacy notes
- Legacy browse helpers in `lib/db/browse.ts` and `lib/services/gameService.ts` remain for backward compatibility but should be phased out in favor of the API routes above.
- Rating/sorting: `sort:"rating"` and `sort:"popular"` now use the new metric columns; API default sort is `relevance` (popularity_score → created_at fallback).

## Follow-ups
- If planner or other features still call legacy helpers, migrate them to the new APIs when convenient.
- Add UI empty/errored states for featured/related consumers if/when hooked up.
- Consider pre-computing popularity_score/rating aggregates to improve ranking quality.
