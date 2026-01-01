# LEKBANKEN — GAMIFICATION DOMAIN (ENTERPRISE MASTER PLAN)

Last updated: 2026-01-01
Owner: Gamification (bounded context)
Audience: Product, Engineering, Design, Ops

## Decision Log (Canonical)

| Decision | Chosen | Rationale | Revisit? |
|--------|--------|-----------|----------|
| Achievements scope | Hybrid (global + tenant) | Global baseline + tenant-specific additions without forking the whole system | Maybe |
| DiceCoin wallet | Per tenant | Avoid cross-tenant economy | Maybe |
| Ledger model | Append-only | Audit & reversibility | No |
| Admin awards | Manual + message | Motivation & recognition | No |
| Easter eggs | Hidden hints | Delight & mystery | No |
| Award Builder canonical source | Versioned export schema (UIs as clients) | Avoid split-brain; both builder UIs must import/export the same schema | Maybe |
| Currency naming | Keep `coin_*` in DB; DiceCoin in UI | Minimizes migration risk while keeping product language consistent | Maybe |
| Shop refunds | No refunds (MVP) | Simplest economy semantics; support via admin awards when needed | Maybe |
| Admin visibility default | Aggregates-by-default | Minimizes privacy risk; allow explicit support/debug access via capability | Maybe |

## Executive summary
Gamification i Lekbanken finns redan som en fungerande första vertikal slice: databas-tabeller för coins/progress/streaks, en snapshot-API (`/api/gamification`), samt UI för lekledare under `/app/gamification`. Achievements har ett etablerat schema (Play Domain) och en omfattande Admin-baserad “badge/achievement builder” (Utmärkelseskaparen) med wizard/editor UI.

Nästa steg är att lyfta detta till enterprise-nivå för LEKLEDARE (inte deltagare):
- Konsolidera domängränser (Gamification vs Play vs Participants) och definiera ett stabilt event-kontrakt.
- Göra DiceCoin ledger-baserad med idempotens, revisionsspår, och anti-cheat.
- Göra achievements “locked/unlocked + hints + easter eggs” enligt krav på DiceCoin-sidan.
- Etablera admin-flöden för manuella awards (system_admin + tenant_admin) med audit log och tenant-scope.
- Introducera Shop/Inventory/DisplaySlots för dashboard-cosmetics som växer med levels.

Dokumentet är en körplan: inventering → målbild → roadmap → implementation.

## Current status (as of 2026-01-01)

### What is done (implemented in repo)
- ✅ Event contract v1 + server-side trigger evaluation (coins + achievements) via service role.
- ✅ DiceCoin ledger hardening v1 via DB functions + server API endpoints (idempotent, race-safe).
- ✅ Achievements overview UX (unlocked + locked + easter egg rule) + pinning 1–3 achievements to dashboard.
- ✅ Minimal Shop backend (items + purchase + inventory + apply/loadout).
- ✅ Admin manual awards (coins + message) with audit trail.
- ✅ Admin analytics dashboards + service-only DB functions.
- ✅ Phase 3 capabilities implemented: award approvals, automation rules, anomaly heuristics, daily rollups.

### What remains (mostly decisions + consolidation)
- 🔶 Consolidate Award Builder into a single canonical export/persistence model (requires review).
- 🔶 Implement hybrid achievements scope in DB (global + tenant) and align seed/scripts/queries.

### How to keep this plan up to date
- When a TODO below is completed: mark it `[x]`, add a short note with date and link to PR/commit.
- When a decision is made: update “Decision Log (Canonical)” and the relevant “Open decisions” item.

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

Scope decision (2026-01-01): Hybrid definitions
- Global achievements: `tenant_id = NULL`
- Tenant achievements: `tenant_id = <tenant>`
- UX rule: DiceCoin-sidan visar en merged view (global + tenant) scoped to current tenant.

### Shop
- Målbild: cosmetics-only i MVP (ingen betalning), köps med DiceCoin.
- Refunds (MVP): inga refunds. Support/compensation sker via admin awards (audit + idempotency).
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
  - add fields: `is_easter_egg boolean`, `hint_text`, `visibility_scope`, `tenant_id` (nullable; NULL = global)
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
- ✅ Implemented: personal progression reads are capability-gated in DB (self/system_admin/tenant admin only).
  - Reference: `supabase/migrations/20251231180000_gamification_rls_tighten_personal.sql`.

Admin visibility decision (2026-01-01): aggregates-by-default
- Tenant admins should primarily see aggregates; per-user access should be explicit (capability + policy + audit intent).

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

### RLS intent notes (v1)

Syfte: göra policy-intentioner tydliga så vi inte “råkar” ge mer åtkomst än tänkt när domänen växer.

- Wallet/Ledger (`user_coins`, `coin_transactions`, `apply_coin_transaction_v1`):
  - Lekledare: läsa egen balans + egen historik.
  - Tenant admin (owner/admin): läsa inom tenant för support/utredning; mutationer via admin-API (inte direkt klient-write).
  - Service role: enda actor som får skapa/muta “finansiella” entries (append-only + reversals).

- Progress/Streaks (`user_progress`, `user_streaks`):
  - Lekledare: läsa/uppdatera sin egen progression (helst via server), aldrig skriva andra användares rader.
  - Tenant admin: i normalfallet aggregat; individ-read endast om uttrycklig capability/behörighet.

- Achievements:
  - Definitions (`achievements`): läsbart för alla authenticated; skrivs av admin tooling/service role.
  - Unlocks (`user_achievements`): lekledare läser sin egen; tenant admin får endast se andra vid explicit admin-behov.

- Leader profile / pins / cosmetics (`leader_profile`):
  - Lekledare: läsa/uppdatera sin egen pinned list + loadout.
  - Tenant admin: read-only för support/debug, inte för “browsing”.

- Shop + inventory (`shop_items`, `shop_prices`, `user_purchases`, `player_cosmetics`, `user_powerup_inventory`):
  - Lekledare: läsa katalog + sin egen inventory/purchases; köp sker via service-only DB functions.
  - Tenant admin: se aggregat + ev. stöd-read för support; undvik write via klient.

- Admin + audit (`tenant_audit_logs`, award approvals/requests):
  - Endast admin (owner/admin) och system_admin ska kunna läsa inom scope; service role skriver alltid.

- Events + analytics (`gamification_events`, daily summaries):
  - Skriv endast via server/service role (idempotent ingestion).
  - Läs: admin-scoped (tenant/system) för dashboards, inte för vanliga lekledare.

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
- ✅ Implemented: idempotency under concurrency is serialized per key (via `pg_advisory_xact_lock(...)`).
- ✅ Implemented: EXECUTE on coin-mutation functions is restricted to `service_role` (revoked from public/anon/authenticated).
- Reference: migration `supabase/migrations/20251231153500_apply_coin_transaction_v1_concurrency_and_grants.sql`.

### Step 5 — Analytics
- [x] Emit events + store for reporting.
- [x] Build admin dashboards.

Implementation notes (current repo state):
- Admin analytics dashboard is implemented:
  - UI: `/admin/gamification/analytics`
  - API: `GET /api/admin/gamification/analytics`
  - DB: `public.admin_get_gamification_analytics_v5(...)` (service role only)

## Open decisions (max 10, only the ones that matter)
1. ✅ Achievements scope decided (2026-01-01): Hybrid (global + tenant) via nullable `tenant_id`.
2. ✅ Canonical Award Builder decided (2026-01-01): versioned export schema is source of truth; UIs are clients.
3. ✅ Currency naming decided (2026-01-01): keep `coin_*` in DB; DiceCoin in UI.
4. ✅ Admin visibility default decided (2026-01-01): aggregates-by-default; explicit per-user access only.
5. Level model: fixed curve vs configurable per tenant?
6. How to represent easter egg achievements in DB (`is_easter_egg`, `hint_text`)?
7. ✅ Refunds decided (2026-01-01): no refunds in MVP.
8. Do we need approvals for tenant_admin awards above threshold in Phase 2?
  - ✅ Implemented in Phase 3: awards above `GAMIFICATION_AWARD_APPROVAL_THRESHOLD` create a pending request requiring system_admin approve/reject.
9. Where do we persist dashboard cosmetics: `users` profile prefs vs dedicated `leader_profile` table?
10. Event ingestion: DB-triggered vs API-based (recommended: API-based for validation/idempotency).

## TODO backlog (remaining work)

### A) Decisions to lock (blockers)
- [x] Decide achievements scope: global-only vs tenant-scoped definitions (`achievements.tenant_id?`).
  - 2026-01-01: decided Hybrid (global + tenant).
- [x] Decide canonical Award Builder source of truth + export schema versioning strategy.
  - 2026-01-01: decided versioned export schema (UIs as clients).
- [x] Decide currency naming strategy: keep `coin_*` or migrate toward DiceCoin naming (DB + API + UI).
  - 2026-01-01: decided keep `coin_*` in DB; DiceCoin in UI.
- [x] Decide refunds policy for Shop purchases (allowed? windows? reversal semantics?).
  - 2026-01-01: decided no refunds in MVP.
- [x] Decide default admin visibility model: per-user balances vs aggregates-by-default (capability gated).
  - 2026-01-01: decided aggregates-by-default.
- [ ] Decide level model governance: fixed curve vs configurable per tenant (and where it is authored).

### B) Award Builder consolidation (requires review)
- [ ] Define canonical export format (versioned) and map fields required by gamification UX:
  - `is_easter_egg`, `hint_text`, `unlock_criteria`.
- [ ] Add thin persistence layer so Admin Achievements UI persists to DB without reworking builder UX.
- [ ] Add “Publish scope” controls aligned with roles: global (system_admin) vs tenant (tenant_admin).

### C) Role/RLS harmonization
- [x] Audit advanced achievements/challenges tables/policies for legacy role assumptions (e.g. `role = 'admin'`) and align with `system_admin/tenant_admin/lekledare`.
  - 2026-01-01: updated advanced achievements admin policies to treat tenant admin as `owner|admin` (migration: `supabase/migrations/20260101121000_advanced_achievements_rls_admin_roles_v1.sql`).
- [x] Verify that tenant-level reads of personal progression are capability-gated (no tenant-member leakage).
  - 2026-01-01: already enforced via `supabase/migrations/20251231180000_gamification_rls_tighten_personal.sql`.
- [x] Add a short “RLS intent” note per table family (wallet/ledger/unlocks/inventory) to reduce drift.
  - 2026-01-01: added “RLS intent notes (v1)” in this document.

### D) Operational hardening
- [x] Add reconciliation runbook for wallets vs ledger and how to recover from partial failures.
  - 2026-01-01: added `docs/gamification/GAMIFICATION_RECONCILIATION_RUNBOOK.md`.
- [x] Add monitoring/alerts for:
  - idempotency collisions/spikes,
  - abnormal mint/burn bursts,
  - award approval queue backlog.
  - 2026-01-01: added `docs/gamification/GAMIFICATION_MONITORING_ALERTS.md`.
- [x] Confirm rate limiting posture for event ingestion + admin award endpoints.
  - 2026-01-01: applied `applyRateLimitMiddleware` to `/api/gamification/events` (api) and admin award endpoints (strict).

### E) Documentation alignment
- [ ] Keep this plan’s “Inventory” section aligned with current routes/DB objects when new features land.
- [ ] Add a short changelog entry here when major mechanics change (ledger semantics, shop rules, award approvals).

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
