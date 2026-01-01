# LEKBANKEN — GAMIFICATION DOMAIN (ENTERPRISE MASTER PLAN)

Last updated: 2025-12-31
Owner: Gamification (bounded context)
Audience: Product, Engineering, Design, Ops

## Decision Log (Canonical)

| Decision | Chosen | Rationale | Revisit? |
|--------|--------|-----------|----------|
| Achievements scope | Global per user | Same leader across tenants | Maybe |
| DiceCoin wallet | Per tenant | Avoid cross-tenant economy | Maybe |
| Ledger model | Append-only | Audit & reversibility | No |
| Admin awards | Manual + message | Motivation & recognition | No |
| Easter eggs | Hidden hints | Delight & mystery | No |

## Executive summary
Gamification i Lekbanken finns redan som en fungerande första vertikal slice: databas-tabeller för coins/progress/streaks, en snapshot-API (`/api/gamification`), samt UI för lekledare under `/app/gamification`. Achievements har ett etablerat schema (Play Domain) och en omfattande Admin-baserad “badge/achievement builder” (Utmärkelseskaparen) med wizard/editor UI.

Nästa steg är att lyfta detta till enterprise-nivå för LEKLEDARE (inte deltagare):
- Konsolidera domängränser (Gamification vs Play vs Participants) och definiera ett stabilt event-kontrakt.
- Göra DiceCoin ledger-baserad med idempotens, revisionsspår, och anti-cheat.
- Göra achievements “locked/unlocked + hints + easter eggs” enligt krav på DiceCoin-sidan.
- Etablera admin-flöden för manuella awards (system_admin + tenant_admin) med audit log och tenant-scope.
- Introducera Shop/Inventory/DisplaySlots för dashboard-cosmetics som växer med levels.

Dokumentet är en körplan: inventering → målbild → roadmap → implementation.

## Inventory (What exists today)

### UI routes (App)
- `/app/gamification` → använder `GamificationPage` och laddar snapshot från `/api/gamification`.
  - Kod: `app/app/gamification/page.tsx`, `features/gamification/GamificationPage.tsx`
- Coins history (mock): `/app/profile/coins`
  - Kod: `app/app/profile/coins/page.tsx`
- Shop (mock): `/app/shop`
  - Kod: `app/app/shop/page.tsx` (mockItems + UI)
- Sandbox gamification module:
  - Kod: `app/sandbox/gamification/page.tsx`

### UI components (Gamification)
- `features/gamification/*`
  - Snapshot client: `features/gamification/api.ts` (calls `/api/gamification`)
  - Types: `features/gamification/types.ts`
  - Sections:
    - `features/gamification/components/ProgressOverview.tsx`
    - `features/gamification/components/AchievementsSection.tsx`
    - `features/gamification/components/AchievementCard.tsx`
    - `features/gamification/components/CoinsSection.tsx`
    - `features/gamification/components/StreakSection.tsx`

### Admin UI (Achievements / Award Builder)
- Admin Achievements page:
  - Route: `/admin/achievements`
  - Kod: `app/admin/achievements/page.tsx` → `features/admin/achievements/AchievementAdminPage.tsx`
- RBAC permission mapping exists:
  - Kod: `features/admin/shared/hooks/useRbac.ts` (permission key: `admin.achievements.*`)
- “Badge Builder” / editor UI (Utmärkelseskaparen) verkar existera i två spår:
  1) Admin achievements editor/wizard:
     - Kod: `features/admin/achievements/editor/*` (t.ex. `AchievementEditorWizard.tsx`)
  2) Standalone builder (sandbox/tooling):
     - Kod: `components/achievements/AchievementBuilder.tsx` + `components/achievements/store.ts`
- Notera: `features/admin/achievements/AchievementAdminPage.tsx` använder i dagsläget mock-data (`features/admin/achievements/data.ts`) och ser inte ut att vara kopplad till DB ännu.

### API routes (Gamification / Journey)
- Gamification snapshot:
  - GET `/api/gamification`
  - Kod: `app/api/gamification/route.ts`
  - Läser: `achievements`, `user_achievements`, `user_coins`, `coin_transactions`, `user_streaks`, `user_progress`
- Journey snapshot:
  - GET `/api/journey/snapshot`
  - Kod: `app/api/journey/snapshot/route.ts`
  - Läser: `user_coins`, `user_streaks`, `user_progress`, counts i `achievements` och `user_achievements`
- Journey feed:
  - GET `/api/journey/feed`
  - Kod: `app/api/journey/feed/route.ts`
  - Källor: `coin_transactions`, `user_achievements`, `game_sessions`, `plan_play_progress`

### Services (client-side)
- `lib/services/achievementService.ts` (client supabase):
  - Läser achievements och user_achievements
  - Kan insert i `user_achievements` via client (kan vara RLS-blockat i praktiken)
- `lib/services/achievementsAdvancedService.ts`:
  - CRUD-liknande funktioner för `community_challenges`, `limited_time_events`, etc
  - Använder `as any` för att kringgå typing → indikation att detta inte är “production hardened” ännu.

### Database schema & migrations (Supabase)

**Gamification core (coins/progress/streaks):**
- Migration: `supabase/migrations/20251209133000_gamification_core.sql`
  - Tables:
    - `public.user_coins` (balance, total_earned, total_spent, unique(user_id, tenant_id))
    - `public.coin_transactions` (type earn/spend, amount, description, created_at)
    - `public.user_streaks` (current/best/last_active_date)
    - `public.user_progress` (level/current_xp/next_level_xp)
  - RLS: enabled
  - Policies:
    - Select: `auth.uid() = user_id OR tenant_id = ANY(get_user_tenant_ids())`
    - Service role can modify

**Achievements (Play Domain):**
- Migration: `supabase/migrations/20251129000002_play_domain.sql`
  - Tables:
    - `public.achievements` (achievement_key, name, description, icon_url, badge_color, condition_type, condition_value)
    - `public.user_achievements` (achievement_id, user_id, tenant_id, unlocked_at)
  - RLS: enabled
  - Policies:
    - achievements: authenticated can select
    - user_achievements: select own OR tenant members (via `get_user_tenant_ids()`)
    - user_achievements: service_role can insert
  - Seed data: 5 achievements (session_count + score_milestone)

**Achievements → Media integration:**
- Migration: `supabase/migrations/20251210120100_achievements_media_migration.sql`
  - Adds `achievements.icon_media_id` FK → `public.media(id)`
  - Keeps `icon_url` as deprecated/legacy

**Achievements advanced (challenges/events/leaderboards):**
- Migration: `supabase/migrations/20251129000012_achievements_advanced_domain.sql`
  - Tables:
    - `public.community_challenges`
    - `public.challenge_participation`
    - `public.limited_time_events`
    - `public.event_rewards`
    - `public.seasonal_achievements`
    - `public.achievement_leaderboards`
  - RLS policies reference `user_tenant_memberships.role = 'admin'` (måste harmoniseras med rollerna system_admin/tenant_admin/lekledare)

**Participants (NOT scope, but exists):**
- Migration: `supabase/migrations/20241211_participants_live_progress.sql`
  - Tables: `public.participant_game_progress`, `public.participant_achievement_unlocks`
- Migration: `supabase/migrations/20241210_create_participants_domain.sql`
  - Table: `public.participant_activity_log`
- API route (service role): `app/api/participants/progress/unlock-achievement/route.ts`

### Gaps vs requirements (high-level)
- DiceCoin-sidan (“/app/gamification”) visar achievements men:
  - Locked achievements visas inte som frågetecken (namn visas idag).
  - “Visa alla utmärkelser” visas bara om achievements > 6, och leder till `/app/profile/achievements` (som inte är inventerad/konfirmerad som implementerad i nuläget).
  - Easter egg-regeln (frågetecken utan hint) finns inte.
- DiceCoin ledger är delvis på plats (`coin_transactions`), men saknar enterprise-egenskaper (idempotency, atomicity/constraints, reconciliation, reason codes).
- Admin-sända utmärkelser (manual awards + message) saknas som domän och UI.
- Shop är UI-mock, saknar DB-modell (items, inventory, purchases, refunds, display slots).

## Goals & Non-goals

### Goals
- Gamification för LEKLEDARE: progression, motivation, och “dashboard cosmetics” som känns premium.
- Enterprise: multi-tenant, auditability, anti-cheat, performance (pagination, caching, summaries), observability.
- Admin-driven: system_admin + tenant_admin ska kunna styra och mäta adoption/engagemang.
- Stabilt event-kontrakt för triggers så vi kan lägga till triggers utan breaking changes.

### Non-goals
- Deltagar-gamification (participants) är inte primär scope i denna plan (kan stödjas i framtiden).
- Betalning/Stripe för Shop i MVP.
- Ombyggnad av Utmärkelseskaparen utan granskning (se “Proposed changes…”).

## Personas & Use-cases (LEKLEDARE + admins)

### Lekledare
- Se nivå/XP och vad som låses upp.
- Se DiceCoin-balance + transaktionshistorik.
- Se alla achievements: unlocked + locked (frågetecken + unlock criteria), samt easter eggs (frågetecken utan hint).
- Välja 1–3 achievements att visa på Dashboard.
- Köpa cosmetics i Shop och applicera på Dashboard (ramar, backgrounds, profilramar, profilbilder, showcase-items).

### Tenant admin
- Se gamification adoption och jämförelser inom tenant.
- Skicka manuella awards/belöningar (tenant scope) med meddelande.
- Sätta/aktivera kampanjer (t.ex. “Planner week”: extra coins/XP för plan publicering).

### System admin
- Global styrning: templates, globala awards, globala policies.
- Möjlighet att skicka manuella awards globalt.
- Audit & investigations (anti-cheat, rollback/refunds).

## Domain boundaries & ownership (Gamification vs Admin vs Media vs Analytics)

### Gamification owns
- DiceCoin wallet + ledger + purchase/refund logic
- Levels/XP model
- User achievement unlock state (lekledare)
- Inventory + display slots + cosmetic application
- Trigger evaluation (from events) and awarding rules

### Admin owns
- Admin workflows + permission/capabilities UX
- Management UI: campaign tools, manual awards, analytics views
- (But underlying enforcement is in DB RLS + service role)

### Media owns
- Asset storage and metadata for:
  - achievement icons (`achievements.icon_media_id`)
  - cosmetics assets (frames/backgrounds/avatars)

### Analytics owns
- Event ingestion/warehouse-ready logs
- Aggregated dashboards, materialized summaries
- Audit logs for admin actions and financial-like transactions

## Core mechanics (Levels, DiceCoin, Achievements, Shop, Dashboard cosmetics)

### Levels
- Bas: `user_progress.level/current_xp/next_level_xp` finns.
- Målbild:
  - Level gates: låser upp nya UI slots, cosmetics categories, och “quality-of-life” (t.ex. fler display slots, fler dashboard frames).
  - Level design styrs av konfigurerbara level definitions (inte hårdkod i UI).

### DiceCoin
- Målbild:
  - Ledger-first: varje earn/spend/refund är en immutabel ledger entry.
  - Balans är derivat (materialized) och kan rekonsilieras.
  - Idempotency keys för att undvika dubbel-utbetalning.

### Achievements
- Definitions (created by us via Award Builder) + user unlocks.
- DiceCoin-sidan ska visa alla:
  - Unlocked: full info
  - Locked: frågetecken + unlock criteria/hint
  - Easter egg: frågetecken utan hint
- Lekledare kan “pin” 1–3 achievements till dashboard.

### Shop
- Målbild: cosmetics-only i MVP (ingen betalning), köps med DiceCoin.
- Categories:
  - profilbilder
  - ramar till containers i dashboard
  - ramar till profilbild
  - bakgrunder till containers
  - display-utmärkelser / showcase items

### Dashboard cosmetics
- Koncept: `DisplaySlots` (1–3 achievements) + `CosmeticLoadout` (ramar/bg/avatar).
- Progression: “dashboard växer” med levels + purchases.

## Data model (tables, enums, RLS policies, indexes)

### Current tables (exists)
- `user_coins`, `coin_transactions`, `user_progress`, `user_streaks`
- `achievements`, `user_achievements`
- Advanced: `community_challenges`, `challenge_participation`, `limited_time_events`, `event_rewards`, `seasonal_achievements`, `achievement_leaderboards`

### Target model (additions / refactors)
- `gamification_events` (append-only):
  - `id`, `event_type`, `actor_user_id`, `tenant_id`, `occurred_at`, `source`, `idempotency_key`, `metadata jsonb`
- `dicecoin_ledger_entries` (append-only):
  - `id`, `tenant_id`, `user_id`, `direction` (credit/debit), `amount`, `reason_code`, `source_event_id`, `idempotency_key`, `created_at`
- `dicecoin_wallets` (materialized):
  - `tenant_id`, `user_id`, `balance`, `updated_at`
- `gamification_levels` (config):
  - `level`, `required_xp`, `unlocks jsonb`, `created_at`
- `achievement_definitions` (future-proof wrapper) OR extend `achievements`:
  - add fields: `is_easter_egg boolean`, `hint_text`, `visibility_scope`, `tenant_id?` (decision)
- `leader_profile`:
  - `user_id`, `tenant_id`, `display_achievement_ids uuid[] (max 3)`, `cosmetic_loadout jsonb`
- Shop:
  - `shop_items`, `shop_prices`, `shop_purchases`, `user_inventory_items`
  - `cosmetic_assets` (or via `media` + typed metadata)

### RLS and capabilities principles
- UI capabilities: driven by existing RBAC/capabilities layer.
- DB enforcement:
  - Lekledare: only own wallet/ledger/inventory/profile.
  - Tenant admin: can view tenant aggregates and manage tenant-scoped awards/campaigns.
  - System admin: global scope.
- NOTE (risk): current policies for coins/user_achievements allow tenant members to select other users’ rows via `tenant_id = ANY(get_user_tenant_ids())`. This should likely be restricted to tenant admins only.

### RLS target matrix (no SQL yet)

Goal: minska tenant-leakage för “personlig progression” utan att blocka enterprise-admin behov.

| Table | Lekledare (self) | Tenant admin | System admin | Service role |
|------|------------------|------------|-------------|--------------|
| `user_progress` | SELECT/UPDATE own | SELECT tenant (and optionally UPDATE via admin tools) | SELECT all | INSERT/UPDATE as needed |
| `user_streaks` | SELECT/UPDATE own | SELECT tenant | SELECT all | INSERT/UPDATE as needed |
| `user_coins` / `dicecoin_wallets` | SELECT own | SELECT tenant | SELECT all | INSERT/UPDATE as needed |
| `coin_transactions` / `dicecoin_ledger_entries` | SELECT own | SELECT tenant | SELECT all | INSERT only (append-only) + reversal entries |
| `achievements` (definitions) | SELECT | SELECT | SELECT | INSERT/UPDATE (admin tooling) |
| `user_achievements` (unlocks) | SELECT own | SELECT tenant | SELECT all | INSERT only (unlocks) |
| `leader_profile` (pinned + cosmetics) | SELECT/UPDATE own | SELECT tenant (support/debug only) | SELECT all | INSERT/UPDATE as needed |
| `shop_items` / `shop_prices` | SELECT | SELECT (tenant scope if applicable) | SELECT all | INSERT/UPDATE |
| `user_inventory_items` | SELECT/UPDATE own (equip) | SELECT tenant | SELECT all | INSERT (grants/purchases) |
| `admin_award_actions` / audit | NO ACCESS | SELECT tenant | SELECT all | INSERT |

Notes:
- “UPDATE own” ovan betyder i praktiken: write paths via server/API; client writes bör undvikas även om RLS kan tillåta.
- Tenant admin access till individdata bör vara explicit (capability + policy), inte en bieffekt av “tenant member”.
- Ledger ska vara append-only: inga deletes/updates på entries; reversals = nya entries.

### Indexing and performance
- Ledger: `(tenant_id, user_id, created_at desc)` + `(idempotency_key)` unique.
- Achievements overview: `user_achievements(user_id, unlocked_at desc)`.
- Admin lists: cursor pagination on `(tenant_id, created_at desc)`.

## Eventing & triggers (what actions produce XP/coins/awards)

### Event contract (v1)
Backbone för XP, DiceCoin, Achievements, Streaks och Analytics. Endast beskrivning (ingen kod ännu).

- `event_type: string`
- `actor_user_id: uuid`
- `tenant_id: uuid | null`
- `source: 'planner' | 'play' | 'admin' | 'system'`
- `idempotency_key: string`
- `metadata: jsonb`
- `created_at: timestamptz`

Implementation notes (current repo state):
- Event log table: `public.gamification_events` (append-only)
- `tenant_id` supports `NULL` for global events (schema aligned to Contract v1).
- Ingestion endpoint: `POST /api/gamification/events` (writes via service role, idempotent)
  - Optional: can mint coins for an event (admin/system only), using deterministic coin idempotency key derived from `eventId`.
- Planner emits server-side events on real actions:
  - `plan_created` from `POST /api/plans`
  - `plan_published` from `POST /api/plans/[planId]/publish`
  - `plan_visibility_changed` from `POST /api/plans/[planId]/visibility`
 - Play emits server-side events:
  - `session_completed` from `PATCH /api/play/sessions/[id]` when host ends session
  - `run_completed` from `POST /api/play/runs/[runId]/progress` when run status becomes `completed`

### Source events (initial)
- Planner:
  - `plan_created`, `plan_published`, `plan_visibility_changed`, `plan_play_started`, `plan_play_completed`
- Play:
  - `session_completed`, `run_completed`
- Content:
  - `game_created`, `game_published`
- Engagement:
  - `login_streak_updated`

### Trigger evaluation
- Deterministic + idempotent.
- Runs server-side (service role) on ingestion, not in client.
- Produces:
  - XP delta
  - DiceCoin ledger entries
  - Achievement unlocks

Implementation notes (current repo state):
- Initial deterministic rewards are wired into `logGamificationEventV1` (service role).
  - Rule v1: `play:session_completed` → +2 DiceCoin (idempotent by `evt:${eventId}:coins`).
  - Rule v1: `play:run_completed` → +1 DiceCoin (idempotent by `evt:${eventId}:coins`).
  - Rule v1: `planner:plan_created` → +5 DiceCoin (idempotent by `evt:${eventId}:coins`).
  - Rule v1: `planner:plan_published` → +10 DiceCoin (idempotent by `evt:${eventId}:coins`).
- Event-driven achievement unlocks are wired into `logGamificationEventV1` (service role).
  - Minimal v1: unlock achievements where `achievements.condition_type == eventType` and `condition_value` is NULL/<=1.
  - Milestones v1: on `session_completed` and `run_completed` events, evaluate `session_count` achievements by counting `session_completed` events.
  - Milestones v1: on `session_completed` and `run_completed` events, evaluate `score_milestone`/`best_score` using the user’s best completed `game_sessions.score` within tenant.
  - Milestones v1: on `session_completed` and `run_completed` events, evaluate `total_score` using the user’s total completed `game_sessions.score` within tenant.

## Admin workflows (system_admin + tenant_admin)

### Manual awards + message
- System admin:
  - Select 1..N users (global)
  - Pick award type (coins / XP / achievement unlock / cosmetic grant)
  - Add message
  - Submit → produces audit log + ledger entries (idempotent)
- Tenant admin:
  - Same workflow but enforced tenant scope

### Campaigns
- Define campaign:
  - timeframe
  - rules (extra coins/XP for event_types)
  - budget caps
- Track results: adoption, activity lift, cost.

## UX & UI blueprint (screens, components, navigation, progressive disclosure)

### IA (App)
- `/app/gamification` (DiceCoin hub)
  - Progress overview (level/xp + next unlock)
  - Achievements preview + “Visa alla utmärkelser”
  - Coins summary + “Se transaktionshistorik”
  - Streak + CTA
- `/app/gamification/achievements` (new / planned)
  - Grid: unlocked + locked
  - Locked card: “?” icon
  - Hint text for non-easter-egg
  - Easter egg: no hint
  - Filter/sort later (Phase 2)
- `/app/shop` (planned: real)
- `/app/dashboard` (planned updates)
  - Display slots (1–3 achievements)
  - Cosmetic loadout editor (progressively unlocked)

### Components (planned)
- `AchievementGrid`, `AchievementLockedCard`, `AchievementUnlockedCard`
- `DiceCoinBalanceCard`, `LedgerList` (paged)
- `ShopCategoryTabs`, `ShopItemCard`, `PurchaseConfirmation`
- `LoadoutEditor`, `DisplaySlotPicker`

### Progressive disclosure
- Show next unlock at current level.
- Locked achievements show minimal info + hint; no hint for easter eggs.
- Shop: lock categories until level threshold.

## Security, anti-cheat, abuse prevention
- Ledger idempotency + reconciliation.
- Rate limiting on event ingestion.
- Validation of event sources (server-only).
- Admin actions require capability + audit trail.
- Prevent tenant data leakage (tighten RLS vs current).

## Analytics & reporting (what to measure, dashboards)

### Metrics
- DAU/WAU (lekledare), retention, streak distribution.
- Coins economy:
  - mint rate, burn rate, balance distribution
  - fraud signals (bursts, repeated idempotency violations)
- Achievements:
  - unlock funnel per achievement
  - time-to-unlock
- Shop:
  - conversion to purchase, most popular cosmetics
  - impact on engagement

### Dashboards
- Tenant admin: adoption + campaign results.
- System admin: global economy health + abuse monitoring.

## MVP → Phase 2 → Phase 3 roadmap

### MVP (value + stability)
- Ledger-based DiceCoin (server-side issuance/spend)
- Achievements overview UI with locked/? + hints + easter egg rule
- Display 1–3 achievements on dashboard
- Minimal Shop backend: cosmetics items + purchase + inventory + apply loadout
- Admin manual awards (coins + message) with audit log

### Phase 2
- Campaign engine + templates
- More cosmetics categories + bundles
- Better level/unlock design tooling
- Admin analytics dashboards

### Phase 3
- ✅ Enterprise approvals for large awards (manual awards above threshold)
  - Threshold: `GAMIFICATION_AWARD_APPROVAL_THRESHOLD` (default `500`)
  - Admin UI: `/admin/gamification/awards` (requests list + system_admin approve/reject)
- ✅ Automation rules (“if X then reward Y”)
  - Admin UI: `/admin/gamification/automation`
  - Analytics: included in `/admin/gamification/analytics` (total + top rules)
- ✅ Advanced anomaly detection (basic heuristics in analytics)
- ✅ Materialized summary tables for very large tenants (daily rollups)
  - DB: `public.gamification_daily_summaries`
  - Refresh (service only): `public.refresh_gamification_daily_summaries_v1(p_tenant_id, p_days)`

## Implementation plan (step-by-step with checklists)

### Step 1 — Inventory hardening (now)
- [x] Confirm all existing gamification-related tables in `types/supabase.ts` and migrations.
- [x] Identify which Award Builder is canonical (admin wizard vs standalone builder) and document contract.
- [x] Identify all write paths for coins/xp/achievements (should be server-only).

### Step 2 — Define bounded context + contracts
- [x] Finalize event contract v1.
- [x] Finalize ledger schema + idempotency policy.
- [x] Decide achievements scope: global vs tenant.

### Step 3 — Security & RLS
- [x] Tighten select policies to prevent normal tenant members reading other users’ wallets.
- [x] Add explicit admin policies based on tenant_admin/system_admin.

### Step 4 — MVP build
- [x] Add ledger write API (service role) + wallet materialization.
- [x] Add achievements overview screen + UX rules.
- [x] Add dashboard display slots + persistence.
- [x] Add minimal shop: items + purchase + inventory + apply.
- [x] Add admin manual award UI + API + audit.

Implementation notes (current repo state):
- Coin ledger hardening v1 is implemented via a DB function + server-only API endpoint:
  - DB: `public.apply_coin_transaction_v1(...)` (idempotent, atomic wallet update)
  - API: `POST /api/gamification/coins/transaction` (tenant_admin/system_admin only)

- Minimal Shop MVP is implemented (items + purchase + inventory + powerups):
  - API: `GET/POST /api/shop`
  - DB: `public.purchase_shop_item_v1(...)` (service role)
  - Inventory: `player_cosmetics`, `user_purchases`, `user_powerup_inventory`

- Admin manual awards are implemented (coins + message + audit trail):
  - API: `POST /api/admin/gamification/awards`
  - DB: `public.admin_award_coins_v1(...)` + `tenant_audit_logs`

- RLS tightening for personal progression (implemented as migration):
  - Restricts tenant-wide reads on `user_coins`, `coin_transactions`, `user_progress`, `user_streaks`, `user_achievements`
  - Allows only: self, `system_admin`, or explicit tenant admin roles (owner/admin)

- Dashboard showcase (pins) is implemented:
  - DB: `public.leader_profile.display_achievement_ids` (max 3)
  - API: `GET/POST /api/gamification/pins` (tenant-scoped)
  - UI: toggle pins in `/app/gamification/achievements` and display on `/app` dashboard

Hardening notes:
- For true idempotency under concurrency, the DB function should serialize calls per idempotency key (e.g. `pg_advisory_xact_lock(...)`).
- Restrict EXECUTE on coin-mutation functions to `service_role` only.

### Step 5 — Analytics
- [x] Emit events + store for reporting.
- [x] Build admin dashboards.

Implementation notes (current repo state):
- Admin analytics dashboard is implemented:
  - UI: `/admin/gamification/analytics`
  - API: `GET /api/admin/gamification/analytics`
  - DB: `public.admin_get_gamification_analytics_v5(...)` (service role only)

## Open decisions (max 10, only the ones that matter)
1. Should `achievements` be global-only or tenant-scoped (add `tenant_id`)?
2. Canonical Award Builder: which implementation is “source of truth”?
3. Coin currency naming: DiceCoin everywhere (UI + DB naming) vs keep `coin_*` tables.
4. RLS rule: should tenant admins see per-user balances, or only aggregates by default?
5. Level model: fixed curve vs configurable per tenant?
6. How to represent easter egg achievements in DB (`is_easter_egg`, `hint_text`)?
7. Should purchases be refundable? If yes, what policy + ledger reversal rules?
8. Do we need approvals for tenant_admin awards above threshold in Phase 2?
  - ✅ Implemented in Phase 3: awards above `GAMIFICATION_AWARD_APPROVAL_THRESHOLD` create a pending request requiring system_admin approve/reject.
9. Where do we persist dashboard cosmetics: `users` profile prefs vs dedicated `leader_profile` table?
10. Event ingestion: DB-triggered vs API-based (recommended: API-based for validation/idempotency).

## Proposed changes to Award Builder (MUST be isolated; no changes without review)

Requires review.

Observations:
- Det finns minst två builder-implementationer (admin wizard/editor + standalone builder). Detta skapar risk för drift och “split brain”.

Proposals (no implementation without approval):
1. Establish one canonical export format + versioning (e.g. `award_builder_export.version` + schema).
2. Add a thin persistence layer so Admin Achievements UI saves to DB (without changing the builder UX).
3. Add explicit fields needed by gamification UX rules:
   - `is_easter_egg`
   - `hint_text`
   - `unlock_criteria` (structured, not just free text)
4. Add a “Publish scope” control aligned to roles: global (system_admin) vs tenant (tenant_admin).
