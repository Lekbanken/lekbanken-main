# Phase 4: Auto-Award Integration & Profile Showcase

**Document Status:** Complete  
**Phase:** 4 of 4 (Participant Achievement Experience)  
**Date:** 2025-01-08

---

## Overview

Phase 4 integrates the achievement system into the gameplay loop and profile experience:
1. **Auto-award hook** - Automatically triggers achievement checks on events
2. **Profile showcase** - Displays achievements on the main profile page
3. **Achievement history** - Shows recent unlocks with timestamps
4. **Session completion hook** - Triggers achievements when games end

---

## Files Created

### 1. `features/gamification/hooks/useAchievementAutoAward.ts`

**Purpose:** Hook for automatically checking and awarding achievements.

**Key Features:**
- `checkAchievements(trigger, stats)` - Check for achievements based on trigger type
- `unlockAchievement(id, context)` - Directly unlock a specific achievement
- Integrates with `useAchievementNotifications` for toast display
- Supports triggers: `game_completed`, `streak_updated`, `coins_earned`, `level_up`, etc.

**Usage:**
```tsx
const { checkAchievements, current, dismiss } = useAchievementAutoAward({
  userId: user?.id,
  tenantId,
});

// After game completion:
await checkAchievements('game_completed', { totalGames: 10, bestScore: 500 });
```

---

### 2. `features/profile/components/ProfileAchievementsShowcase.tsx`

**Purpose:** Achievement preview component for the profile page.

**Key Features:**
- Displays up to 6 achievements (configurable via `maxDisplay`)
- Progress bar showing unlock percentage
- Link to full achievements page
- Prioritizes recently unlocked achievements
- Option to show locked achievements with `showLocked` prop

---

### 3. `features/profile/components/AchievementHistory.tsx`

**Purpose:** List of recent achievement unlocks with relative timestamps.

**Key Features:**
- Shows most recent unlocks (default: 5)
- Relative time formatting (e.g., "5 min sedan", "Igår")
- Compact mode for sidebar placement
- Includes achievement badge, name, description

---

### 4. `features/play/hooks/useSessionAchievements.ts`

**Purpose:** Hook that triggers achievement checks when a play session ends.

**Key Features:**
- Watches `status` from `useLiveSession`
- Detects transition to 'ended' state
- Triggers `game_completed` achievement check
- Prevents duplicate triggers per session
- Provides access to current notification for display

**Usage:**
```tsx
// In ParticipantPlayView:
const { currentNotification, dismissNotification } = useSessionAchievements({
  sessionId,
  status, // from useLiveSession
  userId: user?.id,
  tenantId,
  context: { gameId, gameTitle },
});
```

---

### 5. `features/gamification/hooks/index.ts`

**Purpose:** Barrel export for gamification hooks.

**Exports:**
- `useAchievementNotifications`
- `useAchievementAutoAward`
- `useSessionManagement`
- `useTokenManagement`
- `AchievementNotificationData` type

---

## Files Modified

### 1. `features/profile/ProfilePage.tsx`

**Changes:**
- Added import for `ProfileAchievementsShowcase`
- Inserted achievements showcase card after avatar section

**Location:** After "Profilbild" card, before "Säkerhet & MFA" card

---

## Integration Points

### Profile Page Integration

The `ProfileAchievementsShowcase` is now rendered in the profile page:

```tsx
{/* Achievements Showcase */}
{user?.id && <ProfileAchievementsShowcase userId={user.id} maxDisplay={6} showLocked />}
```

### Play Session Integration

To enable auto-award on session completion, add to `ParticipantPlayView`:

```tsx
import { useSessionAchievements } from '@/features/play/hooks/useSessionAchievements';
import { AchievementNotification } from '@/features/gamification/components/AchievementNotification';

// Inside component:
const { currentNotification, dismissNotification } = useSessionAchievements({
  sessionId,
  status,
  userId: user?.id,
  tenantId,
});

// In JSX:
{currentNotification && (
  <AchievementNotification
    achievement={currentNotification}
    onDismiss={dismissNotification}
  />
)}
```

---

## API Dependencies

These hooks depend on the Phase 3 APIs:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/gamification/achievements/check` | Condition-based unlock |
| `POST /api/gamification/achievements/unlock` | Direct achievement unlock |

---

## Security Notes

1. **Client-side stats are placeholders** - The `checkAchievements` call sends stats from client, but server-side computation is recommended for production (documented in P2 from Phase 3 security review)

2. **No tenant spoofing** - Uses the same secure server-side tenant resolution from Phase 3

3. **Guest participants** - The hooks skip achievement checks when `userId` is null (guests)

---

## Testing Checklist

- [ ] Profile page shows achievements showcase
- [ ] Clicking "Visa alla" navigates to full achievements page
- [ ] Progress bar shows correct percentage
- [ ] Recently unlocked achievements appear first
- [ ] Locked achievements display correctly (grayscale)
- [ ] Achievement history shows relative timestamps
- [ ] Session end triggers achievement check (when integrated)
- [ ] Notifications appear for newly unlocked achievements
- [ ] Guest participants don't trigger checks (no errors)

---

## Future Improvements

1. **Server-side stats computation** - Move totalGames, bestScore, etc. to server
2. **Achievement animations** - Add celebratory effects for milestone achievements
3. **Push notifications** - Notify users of achievements earned offline
4. **Achievement sharing** - Allow users to share badges on social media
5. **Leaderboards** - Show top achievers per tenant

---

## Phase Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database schema & API foundation | ✅ Complete |
| Phase 2 | Admin CMS for achievements | ✅ Complete |
| Phase 3 | Participant API & notifications | ✅ Complete |
| Phase 4 | Auto-award & profile showcase | ✅ Complete |

---

**Next Steps:** 
- Integrate `useSessionAchievements` into `ParticipantPlayView` (optional)
- Add achievement notification component to play view layout
- Configure achievements in admin panel
