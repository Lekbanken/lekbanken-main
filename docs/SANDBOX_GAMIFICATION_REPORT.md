# Gamification Sandbox Report

## Summary
Gamification is implemented across app-facing pages (DiceCoin overview, achievements, event log, coin history, shop) and admin tooling (awards, automation rules, levels, campaigns, analytics, marketplace, badge library). Most UI surfaces are present but depend on Supabase data, tenant context, and authenticated sessions.  

The sandbox now includes a dedicated hub and subpages under `/sandbox/gamification` that render mock previews and link to the live routes and APIs for manual testing.

## Inventory
| Area | Component / Route | Where it lives (file path) | UI status | Reachable via menu? | Notes |
| --- | --- | --- | --- | --- | --- |
| Sandbox | `/sandbox/gamification` | `app/sandbox/gamification/page.tsx` | ✅ | Yes | Hub with mock previews + links. |
| Sandbox | `/sandbox/gamification/dicecoin` | `app/sandbox/gamification/dicecoin/page.tsx` | ✅ | Yes | Coin UI previews, links to awards + ledger. |
| Sandbox | `/sandbox/gamification/achievements` | `app/sandbox/gamification/achievements/page.tsx` | ✅ | Yes | Achievement previews + progress card. |
| Sandbox | `/sandbox/gamification/badges` | `app/sandbox/gamification/badges/page.tsx` | ✅ | Yes | Badge rendering + builder context. |
| Sandbox | `/sandbox/gamification/rewards` | `app/sandbox/gamification/rewards/page.tsx` | ✅ | Yes | Shop preview + links to real pages. |
| Sandbox | `/sandbox/gamification/library-exports` | `app/sandbox/gamification/library-exports/page.tsx` | ✅ | Yes | Export schema snapshot + API links. |
| Sandbox | `/sandbox/achievements` | `app/sandbox/achievements/page.tsx` | ✅ | Yes | Legacy badge + scoreboard preview. |
| App | `/app/gamification` | `app/app/gamification/page.tsx`, `features/gamification/GamificationPage.tsx` | ✅ | Yes | Uses `/api/gamification` snapshot. |
| App | `/app/gamification/achievements` | `app/app/gamification/achievements/page.tsx`, `features/gamification/AchievementsOverviewPage.tsx` | ✅ | Yes | Uses `/api/gamification` + `/api/gamification/pins`. |
| App | `/app/gamification/events` | `app/app/gamification/events/page.tsx` | ✅ | Yes | Read-only event log; requires auth. |
| App | `/app/profile/coins` | `app/app/profile/coins/page.tsx` | ✅ | Yes | Ledger view; depends on coin tables. |
| App | `/app/shop` | `app/app/shop/page.tsx` | ⚠️ | Yes | Depends on `/api/shop`. |
| Admin | `/admin/library/badges` | `app/admin/library/badges/page.tsx`, `features/admin/library/badges/LibraryBadgesPage.tsx` | ⚠️ | Yes | Depends on `award_builder_exports` + auth. |
| Admin | `/admin/gamification/awards` | `app/admin/gamification/awards/page.tsx` | ⚠️ | No | Manual awards + approvals; not in admin nav. |
| Admin | `/admin/gamification/automation` | `app/admin/gamification/automation/page.tsx` | ⚠️ | No | Automation rules; not in admin nav. |
| Admin | `/admin/gamification/levels` | `app/admin/gamification/levels/page.tsx` | ⚠️ | Yes | Levels config; in admin nav. |
| Admin | `/admin/gamification/campaigns` | `app/admin/gamification/campaigns/page.tsx` | ⚠️ | No | Campaign list + detail; not in admin nav. |
| Admin | `/admin/gamification/analytics` | `app/admin/gamification/analytics/page.tsx` | ⚠️ | No | Gamification analytics; not in admin nav. |
| Admin | `/admin/marketplace` | `app/admin/marketplace/page.tsx` | ⚠️ | Yes | Marketplace admin; depends on API. |
| API | `/api/gamification/*` | `app/api/gamification/route.ts`, `app/api/gamification/coins/transaction/route.ts`, `app/api/gamification/events/route.ts`, `app/api/gamification/pins/route.ts` | ❌ | n/a | Snapshot, events, pins, coin transactions. |
| API | `/api/admin/gamification/*` | `app/api/admin/gamification/awards/route.ts`, `app/api/admin/gamification/awards/requests/[requestId]/route.ts`, `app/api/admin/gamification/automation/route.ts`, `app/api/admin/gamification/levels/route.ts`, `app/api/admin/gamification/campaigns/route.ts`, `app/api/admin/gamification/campaigns/[campaignId]/analytics/route.ts`, `app/api/admin/gamification/campaign-templates/route.ts`, `app/api/admin/gamification/analytics/route.ts`, `app/api/admin/gamification/analytics/rollups/refresh/route.ts` | ❌ | n/a | Awards, automation, levels, campaigns, analytics. |
| API | `/api/admin/award-builder/exports/*` | `app/api/admin/award-builder/exports/route.ts`, `app/api/admin/award-builder/exports/[exportId]/route.ts` | ❌ | n/a | Award builder exports API. |
| API | `/api/shop/*` | `app/api/shop/route.ts`, `app/api/shop/powerups/consume/route.ts` | ❌ | n/a | Shop overview + powerup consume. |
| Backend | Gamification services | `lib/services/gamification-*.server.ts` | ❌ | n/a | Event logging + reward application (server-only). |
| DB | Core gamification schema | `supabase/migrations/20251209133000_gamification_core.sql` | ❌ | n/a | Base tables + enums. |
| DB | Coin transactions | `supabase/migrations/20251231153500_apply_coin_transaction_v1_concurrency_and_grants.sql` | ❌ | n/a | RPC + coin ledger logic. |
| DB | Events + analytics | `supabase/migrations/20251231161000_gamification_events_v1.sql`, `supabase/migrations/20251231172000_gamification_events_tenant_nullable.sql`, `supabase/migrations/20251231251000_admin_gamification_analytics_v1.sql` (plus v2-v5), `supabase/migrations/20251231282000_gamification_daily_summaries_v1.sql` | ❌ | n/a | Event log + analytics rollups. |
| DB | Award builder exports | `supabase/migrations/20260101152000_award_builder_exports_v1.sql` | ❌ | n/a | Export storage for badges. |

## Test Paths
1. App DiceCoin flow: `/app/gamification` → `/app/gamification/achievements` → `/app/profile/coins` → `/app/gamification/events`.
2. Admin awards flow: `/admin/gamification/awards` (manual award) → `/app/profile/coins` (verify balance) → `/admin/gamification/analytics`.
3. Badge builder export flow: `/admin/library/badges` (create/edit) → `/api/admin/award-builder/exports` (verify JSON) → `/docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md` (schema check).
4. Rewards flow: `/admin/marketplace` (publish item) → `/app/shop` (buy item) → `/app/profile/coins` (balance change).

## Gaps
- Admin pages for awards, automation, campaigns, and gamification analytics are present but not linked in the admin sidebar (`app/admin/components/admin-nav-config.tsx`).
- Reward rule logic is hardcoded in `lib/services/gamification-rewards.server.ts` with no admin UI for rule management.
- Gamification event logging is server-only; only per-user event log exists in the app (`/app/gamification/events`), no global admin log UI is visible.
