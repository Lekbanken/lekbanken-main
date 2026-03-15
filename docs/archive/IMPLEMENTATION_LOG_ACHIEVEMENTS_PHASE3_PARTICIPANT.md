# Achievements Phase 3: Participant-Facing Badge Showcase

## Overview

Phase 3 implements participant-facing achievement features including tenant-aware filtering,
celebratory notifications, and programmatic awarding APIs for game completion triggers.

## Implementation Date

2025-01-11 (with security review fixes applied 2025-01-11)

## Security Review Fixes Applied

Following external security review (GPT-4 analysis), the following P0/P1 issues were addressed:

### P0 Fixes (Critical Security)

1. **Tenant Resolution Source** - Changed from `user_progress.tenant_id` to `user_tenant_memberships`
   - Reason: user_progress is not authoritative for tenant context
   - New approach: Query memberships, prefer `is_primary`, fallback to single membership

2. **Service Role for Inserts** - Changed to use `createServiceRoleClient()` for insert operations
   - Reason: RLS policies block user-level inserts on `user_achievements`
   - Pattern: Use RLS client for auth/reads, service role for privileged writes

3. **Server-Side Tenant Binding** - `tenant_id` on unlock records is now set server-side only
   - Reason: Prevents cross-tenant unlock via manipulated payload
   - Implementation: Never read tenant from client request

### P1 Fixes (UX/Data Consistency)

4. **localStorage Namespace** - Changed from global key to `${prefix}:${userId}:${tenantId}`
   - Reason: Prevents cross-user or cross-tenant notification suppression
   - Hook now accepts `userId` and `tenantId` options

### Known Limitations (Documented)

5. **Stats Spoofing Risk** - The `/check` endpoint accepts client-provided stats
   - Status: Documented as TODO with warning comments
   - Mitigation: In production, stats should be computed server-side from DB
   - Current: Acceptable for development, requires refactor for high-trust scenarios

## Changes Summary

### 1. Tenant-Aware Achievement Filtering

**File:** `lib/services/achievementService.ts`

Added three new tenant-aware functions at the end of the service:

```typescript
// Get achievements visible to a user based on tenant context
export async function getAchievementsForTenant(tenantId: string | null): Promise<Achievement[]>

// Get user's progress for tenant-scoped achievements
export async function getUserAchievementProgressForTenant(
  userId: string, 
  tenantId: string | null
): Promise<AchievementProgress[]>

// Get stats filtered by tenant
export async function getUserAchievementStatsForTenant(
  userId: string, 
  tenantId: string | null
)
```

**Logic:**
- Returns global achievements (tenant_id IS NULL) + tenant's active achievements
- Filters by `status = 'active'`
- Respects tenant boundaries

---

### 2. Gamification API Tenant Filtering

**File:** `app/api/gamification/route.ts`

**Before:** Query returned ALL achievements regardless of tenant or status.

**After:** 
1. First fetches user's progress to get tenant context
2. Builds filtered query: `status = 'active'` AND (`tenant_id IS NULL` OR `tenant_id = userTenant`)
3. Users only see global achievements + their organization's achievements

**Key Changes:**
```typescript
// Get tenant context first
const progressRes = await supabase
  .from("user_progress")
  .select("level,current_xp,next_level_xp,tenant_id")
  .eq("user_id", userId)
  .single();

const tenantId = progressRes.data?.tenant_id ?? null;

// Build filtered achievements query
let achievementsQuery = supabase
  .from("achievements")
  .select("...")
  .eq("status", "active");

if (tenantId) {
  achievementsQuery = achievementsQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
} else {
  achievementsQuery = achievementsQuery.is("tenant_id", null);
}
```

---

### 3. Achievement Notification Component

**File:** `features/gamification/components/AchievementNotification.tsx`

A celebratory notification overlay for newly unlocked achievements:

- **Design:** Amber/gold gradient card with trophy icon
- **Animation:** CSS-only bounce-in with confetti particles
- **Accessibility:** Reduced motion support, proper ARIA labels
- **Auto-dismiss:** 6 seconds default (configurable)

**Features:**
- Deterministic confetti generation (pure render, no Math.random during render)
- Exit animation on dismiss
- Displays achievement name, description, icon, and points

**CSS Animations Added to `app/globals.css`:**
- `animate-bounce-in` - Spring-like entrance
- `animate-confetti` - Falling confetti particles
- `animate-scale-pop` - Badge pop effect
- `animate-fade-in-delayed` - Staggered points reveal

---

### 4. Achievement Notification Hook

**File:** `features/gamification/hooks/useAchievementNotifications.ts`

Manages notification queue with localStorage persistence:

```typescript
const {
  current,          // Current achievement being shown
  dismiss,          // Dismiss current notification
  queueAchievements, // Queue multiple achievements
  queueAchievement,  // Queue single achievement
  clearQueue,        // Clear all pending
  hasBeenSeen,       // Check if already shown
  pendingCount,      // Number pending
} = useAchievementNotifications({
  userId: user?.id,      // Namespace per user
  tenantId: tenantId,    // Namespace per tenant
});
```

**Behavior:**
- Tracks seen achievements in localStorage (`lekbanken_seen_achievements:${userId}:${tenantId}`)
- Queues notifications to show one at a time
- Filters duplicates automatically
- Namespaced by user+tenant to prevent cross-contamination

---

### 5. Programmatic Awarding APIs

#### Direct Unlock Endpoint

**File:** `app/api/gamification/achievements/unlock/route.ts`

```
POST /api/gamification/achievements/unlock
```

Request:
```json
{
  "achievementId": "uuid",
  "context": {
    "gameId": "uuid",
    "sessionId": "uuid",
    "metadata": {}
  }
}
```

Response:
```json
{
  "success": true,
  "alreadyUnlocked": false,
  "achievement": {
    "id": "...",
    "name": "...",
    "description": "...",
    "iconUrl": "...",
    "points": 100
  },
  "unlockedAt": "2025-01-11T..."
}
```

**Security:**
- Requires authenticated user
- Uses `createServiceRoleClient()` for inserts (RLS compliance)
- Tenant resolved from `user_tenant_memberships`, not user_progress
- Validates achievement exists and is active
- Checks tenant access (global OR user's tenant)
- `tenant_id` on insert is set server-side (never from client)
- Handles duplicate unlock gracefully (idempotent)

---

#### Condition-Based Check Endpoint

**File:** `app/api/gamification/achievements/check/route.ts`

```
POST /api/gamification/achievements/check
```

Request:
```json
{
  "trigger": "game_completed",
  "stats": {
    "totalGames": 10,
    "totalScore": 5000,
    "bestScore": 1000,
    "sessionCount": 25
  }
}
```

Response:
```json
{
  "success": true,
  "trigger": "game_completed",
  "unlockedCount": 2,
  "achievements": [
    {
      "id": "...",
      "name": "First Victory",
      "description": "Complete your first game",
      "iconUrl": "...",
      "points": 50,
      "unlockedAt": "..."
    }
  ]
}
```

**Supported Triggers:**
- `game_completed`
- `streak_updated`
- `coins_earned`
- `level_up`
- `first_login`
- `profile_completed`
- `custom`

**Security:**
- Uses `createServiceRoleClient()` for DB operations
- Tenant resolved from `user_tenant_memberships`
- **WARNING:** Stats are client-provided (spoof risk)
  - TODO: Compute stats server-side from DB in production

---

## File Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/services/achievementService.ts` | Modified | Added 3 tenant-aware functions |
| `app/api/gamification/route.ts` | Modified | Tenant-filtered achievements query |
| `features/gamification/components/AchievementNotification.tsx` | Created | Celebratory notification UI |
| `features/gamification/hooks/useAchievementNotifications.ts` | Created | Queue management hook |
| `app/globals.css` | Modified | Added achievement animations |
| `app/api/gamification/achievements/unlock/route.ts` | Created | Direct unlock API |
| `app/api/gamification/achievements/check/route.ts` | Created | Condition-based check API |

---

## Usage Example

### Showing Achievement Notifications

```tsx
import { AchievementNotification } from '@/features/gamification/components/AchievementNotification';
import { useAchievementNotifications } from '@/features/gamification/hooks/useAchievementNotifications';

function GameCompletionHandler() {
  const { current, dismiss, queueAchievements } = useAchievementNotifications();

  const handleGameComplete = async () => {
    const response = await fetch('/api/gamification/achievements/check', {
      method: 'POST',
      body: JSON.stringify({ trigger: 'game_completed', stats: { totalGames: 10 } }),
    });
    const data = await response.json();
    
    if (data.achievements.length > 0) {
      queueAchievements(data.achievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        iconUrl: a.iconUrl,
        points: a.points,
      })));
    }
  };

  return (
    <>
      {/* Game UI */}
      <AchievementNotification 
        achievement={current} 
        onDismiss={dismiss} 
      />
    </>
  );
}
```

---

## Testing Checklist

- [ ] Verify gamification API returns filtered achievements
- [ ] Test notification component appears on achievement unlock
- [ ] Confirm notification auto-dismisses after 6 seconds
- [ ] Check localStorage persistence of seen achievements (namespaced)
- [ ] Test `/api/gamification/achievements/unlock` endpoint
- [ ] Test `/api/gamification/achievements/check` endpoint
- [ ] Verify tenant isolation (user can't unlock other tenant's achievements)
- [ ] Test reduced motion settings

### Security Test Cases (from review)

- [ ] **Multi-tenant user**: Switch active tenant, verify achievements list changes
- [ ] **Cross-tenant unlock attempt**: Send unlock with achievementId from another tenant → expect 403
- [ ] **Replay/idempotency**: Unlock same achievement twice → `alreadyUnlocked=true`, no duplicate rows
- [ ] **Client spoof prevention**: Send `/check` with manipulated stats → verify behavior (documented risk)

---

## Dependencies

- `@heroicons/react` - Icons (already installed)
- CSS animations only - no framer-motion required

---

## Related Documents

- [IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md](./IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md) - System admin achievements
- [IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md](./IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md) - Tenant admin achievements
- [GAMIFICATION_DOMAIN.md](./GAMIFICATION_DOMAIN.md) - Overall gamification architecture
