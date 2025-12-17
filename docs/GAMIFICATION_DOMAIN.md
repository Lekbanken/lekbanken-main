# GAMIFICATION DOMAIN

## Metadata
- **Status:** Active (partial implementation)
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code (`app/app/gamification/**`, `app/api/gamification/**`, `features/gamification/**`, `lib/services/*Service.ts`) + Supabase migrations (achievements, coins, streaks, progress, challenges, events, leaderboards)

## Scope
Gamification Domain owns:
- **Achievements & badges**: Unlockable milestones with icons, descriptions, conditions
- **Coin system**: In-game currency balance + earn/spend transaction ledger
- **Streaks**: Daily engagement tracking (current + best streak)
- **Progression**: User levels, XP, and advancement
- **Challenges**: Community and time-limited challenges (daily/weekly/special)
- **Events**: Limited-time events with seasonal rewards
- **Leaderboards**: Global and tenant-scoped rankings
- **Personalization**: User preferences for gamification display

Non-goals:
- Realtime play mechanics (Play Domain)
- Billing/payment (Billing Domain)
- Social interactions beyond leaderboards (Social Domain)

## Related docs
- Play Domain sessions/runtime: `docs/PLAY_DOMAIN.md`
- Accounts/auth/RBAC: `docs/ACCOUNTS_DOMAIN.md`

## Related code (repo-anchored)

### UI routes
- Gamification hub: `app/app/gamification/page.tsx` → `features/gamification/GamificationPage.tsx`
- Achievements: `app/app/profile/achievements/page.tsx`
- Challenges: `app/app/challenges/page.tsx`
- Leaderboard: `app/app/leaderboard/page.tsx`
- Rewards shop: `app/app/shop/page.tsx`

### API endpoints
- `GET/POST /api/gamification` (snapshot: achievements, coins, streaks, progress)
  - Reads: achievements, user_achievements, user_coins, coin_transactions, user_streaks, user_progress
  - Returns serialized `GamificationPayload` with mapped data

### Core gamification components
- `features/gamification/components/ProgressOverview.tsx` (level + XP bar)
- `features/gamification/components/AchievementsSection.tsx` (grid of badges)
- `features/gamification/components/CoinsSection.tsx` (balance + recent transactions)
- `features/gamification/components/StreakSection.tsx` (current + best streak)
- `features/gamification/components/CallToActionSection.tsx` (motivation)
- `components/AchievementBadge.tsx` (reusable badge display + unlock animation)

### Services
- `lib/services/achievementService.ts`
  - `getAllAchievements()` / `getAchievementById(id)`
  - `getUserAchievementProgress(userId)` / `getUserAchievements(userId)`
  - `checkAchievementCondition(condition, value)` / `unlockAchievement(userId, achievementId)`
  - `syncAchievementsFromEvents(userId)` (auto-unlock logic)
  
- `lib/services/progressionService.ts`
  - `calculateXpForLevel(level)` / `calculateLevelFromXP(totalXP)`
  - `getUserProgression(userId)` / `updateUserProgress(userId, xpChange)`
  - `getUserStreak(userId)` / `updateStreak(userId, lastPlayDate)`
  
- `lib/services/leaderboardService.ts`
  - `getGlobalLeaderboard(limit, offset)` / `getTenantLeaderboard(tenantId, limit, offset)`
  - `getGameLeaderboard(gameId, limit, offset)`
  - `getPersonalRank(userId, leaderboardType)`
  
- `lib/services/achievementsAdvancedService.ts` (challenges, events, seasonal achievements)
  - `getCommunityCharacteristics(tenantId)` / `getActiveChallenges(tenantId)`
  - `joinChallenge(userId, challengeId)` / `updateChallengeProgress(userId, challengeId, value)`
  - `getUpcomingEvents(tenantId)` / `getLimitedTimeEvents(tenantId)`
  - `getSeasonalAchievements(tenantId, seasonNumber)`

## Core concepts

### Achievement model
- **Metadata**: name, description, icon_url, badge_color
- **Unlock condition**: condition_type (e.g., "session_count", "score_milestone") + condition_value
- **Status**: locked, in_progress, or unlocked
- **Association**: per user (user_achievements row with unlocked_at)

### Coins (in-game currency)
- **Balance**: user_coins.balance (current amount)
- **Totals**: total_earned, total_spent (cumulative)
- **Ledger**: coin_transactions log with type (earn/spend), amount, description
- **Uniqueness**: UNIQUE(user_id, tenant_id) — scoped per tenant

### Streaks
- **Current**: current_streak_days (resets if no play in 48 hours)
- **Best**: best_streak_days (personal record)
- **Tracking**: last_active_date, updated_at

### Progression (Levels & XP)
- **Level**: current level (starts at 1)
- **XP mechanics**:
  - XP_PER_LEVEL = 1000
  - POINTS_TO_XP = 0.1 (1 point = 0.1 XP)
  - Each level requires cumulative XP: level * 1000
- **Tracking**: current_xp (progress towards next level), next_level_xp

### Challenges (advanced)
- **Types**: daily, weekly, special, community
- **Difficulty**: easy, normal, hard, legendary
- **Target**: target_value (e.g., "play 3 games")
- **Rewards**: reward_points, optional reward_currency_amount
- **Progress**: challenge_participation tracks user's progress_value and completion status
- **Participation**: UNIQUE(challenge_id, user_id) — one row per user per challenge

### Events (limited-time)
- **Types**: seasonal, special, collaboration, anniversary
- **Rewards**: can be badge, cosmetic, points, or currency
- **Availability**: starts_at / ends_at (server enforces time gates)
- **Tracking**: event_rewards table stores claimed status per user

### Seasonal achievements
- **Scope**: tied to season_name and season_number
- **Rarity**: common, rare, epic, legendary (affects reward_bonus_percent)
- **Exclusivity**: exclusive_to_season flag for limited availability
- **Availability**: released_at / available_until (window per season)

### Leaderboard rankings
- **Scope**: global (all), tenant (scoped), game-specific (per game)
- **Metrics**: 
  - total_score, total_sessions, avg_score, best_score
  - achievement_count, seasonal_achievement_count, total_achievement_points
- **Rank**: computed rank (row_number over score)
- **Seasonality**: optional season_number for seasonal leaderboards

## Data model (Supabase)

### Core tables (gamification_core migration)
From `supabase/migrations/20251209133000_gamification_core.sql`:
- `user_coins` (UNIQUE(user_id, tenant_id))
  - balance, total_earned, total_spent
  - RLS: user reads own, service role manages
  
- `coin_transactions`
  - type (earn/spend), amount, description, created_at
  - RLS: user reads own, service role inserts
  
- `user_streaks` (UNIQUE(user_id, tenant_id))
  - current_streak_days, best_streak_days, last_active_date
  - RLS: user reads own, service role manages
  
- `user_progress` (UNIQUE(user_id, tenant_id))
  - level, current_xp, next_level_xp
  - RLS: user reads own, service role manages

### Advanced tables (achievements_advanced_domain migration)
From `supabase/migrations/20251129000012_achievements_advanced_domain.sql`:
- `community_challenges`
  - challenge_type (score/participation/speed/cooperation), difficulty, target_value
  - reward_points, reward_currency_amount
  - status (active/completed/archived), starts_at, ends_at
  - RLS: tenant members can view; admins manage
  
- `challenge_participation` (UNIQUE(challenge_id, user_id))
  - progress_value, completed, completed_at, reward_claimed
  - RLS: users view/update own
  
- `limited_time_events`
  - event_type, theme, reward_type, reward_amount
  - starts_at / ends_at, status (upcoming/active/ended)
  - RLS: tenant members view; admins manage
  
- `event_rewards`
  - event_id, reward_id, reward_name, claimed, claimed_at
  - RLS: users view own
  
- `seasonal_achievements`
  - season_name, season_number, achievement_id
  - rarity, exclusive_to_season, reward_bonus_percent
  - available_until (window per season)
  - UNIQUE(tenant_id, season_name, achievement_id)
  - RLS: tenant members view
  
- `achievement_leaderboards`
  - achievement_count, seasonal_achievement_count, total_achievement_points
  - rank, season_number
  - UNIQUE(tenant_id, user_id, season_number)
  - RLS: tenant members view

### Shared base tables
- `achievements` (exists in earlier migrations, shared schema)
  - id, name, description, icon_url, badge_color
  - condition_type, condition_value
  
- `user_achievements`
  - achievement_id, user_id, unlocked_at
  - RLS: users view own

## Auth and access model
- API endpoint (`GET /api/gamification`) uses `createServerRlsClient()` (RLS-enforced)
- Reads across all gamification tables are scoped to authenticated user
- Coins, streaks, progress are scoped to (user_id, tenant_id) pair
- Challenge/event participation is user-scoped
- Leaderboards visible to all tenant members

## Validation & logic

### Progression mechanics
- **XP source**: Points from play sessions (POINTS_TO_XP = 0.1)
- **Level-up**: Automatic when current_xp >= XP_PER_LEVEL for next level
- **Streak reset**: 48 hours since last_active_date
- **Achievement unlock**: Condition check (e.g., session_count, score_milestone)

### Challenge & event states
- **Challenge**: created (status=active) → user joins → tracks progress → marks completed → claims reward
- **Event**: created (status=upcoming) → starts (status=active) → ends (status=ended)
- **Reward claiming**: event_rewards.claimed flag tracks whether user has taken reward

## Known gaps / tech debt (repo-anchored)
- Challenge/event management UIs exist (`app/app/challenges/page.tsx`, `app/app/events/page.tsx`) but are mock data (not yet wired to DB)
- Shop (`app/app/shop/page.tsx`) is mock; not yet integrated with coin balance
- Seasonal leaderboards structure exists but season rotation logic not yet implemented
- Streak reset logic (48-hour window) not automated; relies on manual trigger
- No audit trail for challenge completion or event reward claims
- Achievement auto-unlock from events not yet implemented in API

## Validation checklist
- Fetch gamification snapshot via `GET /api/gamification` returns all 4 subsections (achievements, coins, streak, progress)
- Achievement badges render correctly with locked/unlocked states
- Level bar reflects current XP vs next level XP
- Streak counter updates after play session
- Coin balance reads correctly from user_coins
- Leaderboard page fetches and ranks users correctly
- Challenge join/progress tracking works (once connected to DB)
- Seasonal achievements filter by active season
- Event rewards claim workflow works end-to-end
