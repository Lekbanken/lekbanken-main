# LEKBANKEN — LEADERBOARD DESIGN

## Metadata

- Owner: -
- Status: active
- Date: 2026-01-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active leaderboard behavior reference. Verify concrete route and component names against current code before using this document for implementation changes.

**Execution status:** Implementation Complete  
**Objective:** Default inclusion with user opt-out and anti-gaming measures

---

## EXECUTIVE SUMMARY

The leaderboard system provides:
- ✅ **Default inclusion** — All users appear on leaderboards by default
- ✅ **User opt-out** — Simple toggle to hide from rankings
- ✅ **Multi-scope rankings** — All-time, monthly, weekly, daily
- ✅ **Multiple metrics** — Coins, XP, level, streaks
- ✅ **Anti-gaming detection** — Risk scoring for suspicious activity
- ✅ **Admin controls** — Manual exclusion capability

---

## 1. SCHEMA OVERVIEW

### 1.1 Core Tables

| Table | Purpose |
|-------|---------|
| `user_gamification_preferences` | Stores opt-out preferences |
| `v_gamification_leaderboard` | View that filters opted-out users |
| `gamification_daily_earnings` | Period-based rankings |

### 1.2 `user_gamification_preferences` Schema

```sql
CREATE TABLE user_gamification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Leaderboard settings
  leaderboard_visible BOOLEAN NOT NULL DEFAULT TRUE,  -- DEFAULT: VISIBLE
  leaderboard_opted_out_at TIMESTAMPTZ,               -- When opted out
  
  -- Other preferences
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, tenant_id)
);
```

### 1.3 Leaderboard View

```sql
CREATE VIEW v_gamification_leaderboard AS
SELECT
  uc.tenant_id,
  uc.user_id,
  u.email,
  uc.balance,
  uc.total_earned,
  uc.total_spent,
  up.level,
  up.current_xp,
  us.current_streak_days,
  us.best_streak_days,
  rank() OVER (PARTITION BY uc.tenant_id ORDER BY uc.total_earned DESC) AS rank_by_earned,
  rank() OVER (PARTITION BY uc.tenant_id ORDER BY up.current_xp DESC) AS rank_by_xp
FROM user_coins uc
JOIN users u ON u.id = uc.user_id
LEFT JOIN user_progress up ON up.user_id = uc.user_id 
  AND up.tenant_id IS NOT DISTINCT FROM uc.tenant_id
LEFT JOIN user_streaks us ON us.user_id = uc.user_id 
  AND us.tenant_id IS NOT DISTINCT FROM uc.tenant_id
LEFT JOIN user_gamification_preferences gp ON gp.user_id = uc.user_id 
  AND gp.tenant_id IS NOT DISTINCT FROM uc.tenant_id
WHERE COALESCE(gp.leaderboard_visible, TRUE) = TRUE;  -- Default: visible
```

---

## 2. API SURFACE

### 2.1 Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/gamification/leaderboard` | Fetch rankings |
| GET | `/api/gamification/leaderboard/preferences` | Get user's opt-out status |
| POST | `/api/gamification/leaderboard/preferences` | Toggle visibility |

### 2.2 Admin Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/gamification/leaderboard` | Dashboard stats |
| POST | `/api/admin/gamification/leaderboard/abuse-check` | Check user risk |
| PATCH | `/api/admin/gamification/leaderboard` | Exclude/reinstate user |

### 2.3 Request/Response Examples

**GET /api/gamification/leaderboard**
```typescript
// Query params
?tenantId=uuid&type=coins_earned&period=weekly&limit=50

// Response
{
  type: "coins_earned",
  period: "weekly",
  tenantId: "...",
  entries: [
    {
      rank: 1,
      userId: "...",
      displayName: "Maria S.",
      avatarUrl: "...",
      value: 245,
      level: 5,
      isCurrentUser: false
    },
    // ...
  ],
  currentUserRank: 12,
  currentUserEntry: { ... },
  totalParticipants: 156,
  updatedAt: "2026-01-08T12:00:00Z"
}
```

**POST /api/gamification/leaderboard/preferences**
```typescript
// Request
{
  tenantId: "uuid",
  visible: false  // Opt out
}

// Response
{
  success: true,
  visible: false
}
```

---

## 3. DEFAULT INCLUSION BEHAVIOR

### 3.1 Rules

1. **New users** → Automatically visible on leaderboards
2. **No preference record** → Treated as `leaderboard_visible = TRUE`
3. **Opted-out users** → Have explicit record with `leaderboard_visible = FALSE`
4. **Visibility is per-tenant** → User can be visible in one org, hidden in another

### 3.2 Database Default

```sql
leaderboard_visible BOOLEAN NOT NULL DEFAULT TRUE
```

### 3.3 View Logic

```sql
WHERE COALESCE(gp.leaderboard_visible, TRUE) = TRUE
--    ^^^^^^^^ If no preference record exists, assume TRUE (visible)
```

---

## 4. USER OPT-OUT FLOW

### 4.1 UI Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETTINGS PAGE                                │
│  /app/[tenant]/settings/privacy                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEADERBOARD VISIBILITY                                 │   │
│  │                                                         │   │
│  │  [Toggle: ON]  Visa mig på topplistan                   │   │
│  │                                                         │   │
│  │  När aktiverat syns ditt namn och poäng på             │   │
│  │  organisationens topplista.                             │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Example

```tsx
// components/settings/LeaderboardToggle.tsx
'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'

interface Props {
  tenantId: string
}

export function LeaderboardToggle({ tenantId }: Props) {
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/gamification/leaderboard/preferences?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setVisible(data.visible)
        setLoading(false)
      })
  }, [tenantId])

  const handleToggle = async (newValue: boolean) => {
    setVisible(newValue)
    
    await fetch('/api/gamification/leaderboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, visible: newValue }),
    })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Visa mig på topplistan</p>
        <p className="text-sm text-muted-foreground">
          {visible 
            ? 'Ditt namn och poäng visas för andra' 
            : 'Du är dold från topplistan'}
        </p>
      </div>
      <Switch checked={visible} onCheckedChange={handleToggle} />
    </div>
  )
}
```

### 4.3 Leaderboard Display

```tsx
// components/gamification/Leaderboard.tsx
'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface LeaderboardEntry {
  rank: number
  displayName: string
  avatarUrl: string | null
  value: number
  level?: number
  isCurrentUser: boolean
}

interface Props {
  tenantId: string
  type?: 'coins_earned' | 'xp_total' | 'streak_current'
  period?: 'all_time' | 'monthly' | 'weekly'
  limit?: number
}

export function Leaderboard({ tenantId, type = 'coins_earned', period = 'all_time', limit = 10 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/gamification/leaderboard?tenantId=${tenantId}&type=${type}&period=${period}&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries)
        setCurrentUserRank(data.currentUserRank)
        setLoading(false)
      })
  }, [tenantId, type, period, limit])

  if (loading) return <LeaderboardSkeleton />

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div 
          key={entry.rank}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg",
            entry.isCurrentUser && "bg-primary/10 border border-primary/20",
            entry.rank <= 3 && "bg-yellow-50"
          )}
        >
          <span className="w-8 text-center font-bold">
            {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
          </span>
          <Avatar src={entry.avatarUrl} fallback={entry.displayName[0]} />
          <div className="flex-1">
            <p className="font-medium">
              {entry.displayName}
              {entry.isCurrentUser && <span className="text-xs ml-2">(Du)</span>}
            </p>
            {entry.level && (
              <p className="text-xs text-muted-foreground">Nivå {entry.level}</p>
            )}
          </div>
          <span className="font-bold">{entry.value.toLocaleString()}</span>
        </div>
      ))}
      
      {/* Show current user's rank if not in top N */}
      {currentUserRank && currentUserRank > limit && (
        <div className="border-t pt-2 mt-4">
          <p className="text-sm text-muted-foreground text-center">
            Din placering: <span className="font-bold">#{currentUserRank}</span>
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## 5. ANTI-GAMING CONSIDERATIONS

### 5.1 Risk Factors

| Factor | Weight | Threshold |
|--------|--------|-----------|
| High earning velocity | 25 | >200 coins/day avg |
| High event frequency | 20 | >50 events/day avg |
| Session spam | 30 | >20 sessions/24h |
| New account abuse | 25 | >150 coins/day in first week |

### 5.2 Risk Scoring

```typescript
function calculateRiskScore(factors: RiskFactors): number {
  let score = 0
  
  // Earning velocity
  if (factors.avgCoinsPerDay > 200) score += 25
  if (factors.avgEventsPerDay > 50) score += 20
  if (factors.sessionsLast24h > 20) score += 30
  if (factors.isNewAccount && factors.avgCoinsPerDay > 150) score += 25
  
  return Math.min(score, 100)
}

// Risk levels:
// 0-24:  Low risk (normal activity)
// 25-49: Medium risk (monitor)
// 50-74: High risk (review recommended)
// 75-100: Critical (action recommended)
```

### 5.3 Admin Review Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 ADMIN: LEADERBOARD REVIEW                       │
│  /admin/gamification/leaderboard                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FLAGGED USERS                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ User          │ Risk Score │ Reason           │ Action    │ │
│  ├───────────────┼────────────┼──────────────────┼───────────┤ │
│  │ Erik L.       │   75 🔴    │ 22 sessions/24h  │ [Review]  │ │
│  │ Sara K.       │   50 🟡    │ New + high earn  │ [Review]  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  USER DETAIL VIEW                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Risk Assessment                                           │ │
│  │                                                           │ │
│  │ Score: 75/100                                             │ │
│  │                                                           │ │
│  │ Reasons:                                                  │ │
│  │ • 22 sessions in 24h (abnormal)                          │ │
│  │ • High earning velocity: 245 coins/day avg               │ │
│  │                                                           │ │
│  │ Recommendations:                                          │ │
│  │ • Review session logs for legitimate activity            │ │
│  │ • Consider temporary leaderboard exclusion               │ │
│  │                                                           │ │
│  │ [ Exclude from Leaderboard ] [ Dismiss Alert ]           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Automatic Protections

| Protection | How |
|------------|-----|
| Softcap | Diminishing returns after 100 coins/day |
| Multiplier cap | Max 2.0× bonus |
| Cooldowns | Daily/weekly limits on repeated triggers |
| Idempotency | Can't trigger same event twice |

### 5.5 Manual Interventions

```typescript
// Admin can exclude a user
await adminSetLeaderboardExclusion(tenantId, userId, true, 'Suspicious activity')

// This:
// 1. Sets leaderboard_visible = false
// 2. Logs the action to gamification_events
// 3. User disappears from rankings
```

---

## 6. UI INTEGRATION POINTS

### 6.1 File Locations

| Component | Path |
|-----------|------|
| Settings toggle | `app/[tenant]/settings/privacy/page.tsx` |
| Leaderboard widget | `components/gamification/Leaderboard.tsx` |
| Admin review | `app/admin/gamification/leaderboard/page.tsx` |
| Dashboard widget | `features/gamification/LeaderboardWidget.tsx` |

### 6.2 Data Hooks

```typescript
// hooks/useLeaderboard.ts
export function useLeaderboard(tenantId: string, options?: LeaderboardOptions) {
  return useQuery({
    queryKey: ['leaderboard', tenantId, options],
    queryFn: () => getLeaderboard(tenantId, options),
    staleTime: 60_000, // Cache for 1 minute
  })
}

// hooks/useLeaderboardPreferences.ts
export function useLeaderboardPreferences(tenantId: string) {
  return useQuery({
    queryKey: ['leaderboard-preferences', tenantId],
    queryFn: () => getLeaderboardPreferences(tenantId),
  })
}
```

### 6.3 Navigation Entry Points

```
/app/[tenant]/
├── dashboard/
│   └── widgets/
│       └── LeaderboardWidget  ← Show top 5 + user rank
├── leaderboard/
│   └── page.tsx              ← Full leaderboard view
└── settings/
    └── privacy/
        └── page.tsx          ← Opt-out toggle

/admin/
└── gamification/
    ├── leaderboard/
    │   └── page.tsx          ← Stats + flagged users
    └── economy/
        └── page.tsx          ← Mint/burn metrics
```

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Core (Complete ✅)
- [x] `user_gamification_preferences` table
- [x] `set_leaderboard_visibility()` function
- [x] `v_gamification_leaderboard` view
- [x] Service layer (`gamification-leaderboard.server.ts`)
- [x] API routes

### Phase 2: UI (Pending)
- [ ] Settings page toggle component
- [ ] Leaderboard widget component
- [ ] Full leaderboard page
- [ ] Period/type selector

### Phase 3: Admin (Pending)
- [ ] Admin stats dashboard
- [ ] Flagged users list
- [ ] User detail + exclusion UI
- [ ] Activity audit log viewer

---

## 8. GDPR / PRIVACY NOTES

| Aspect | Compliance |
|--------|------------|
| Default consent | Visible by default is acceptable for gamification |
| Opt-out available | User can toggle off at any time |
| Data displayed | Display name (masked email if no name), not PII |
| Cross-tenant | Visibility is per-tenant, not global |
| Right to erasure | DELETE CASCADE removes preferences |

---

*Leaderboard system is ready for UI integration.*
