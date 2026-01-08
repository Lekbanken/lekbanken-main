# LEKBANKEN — ADMIN GAMIFICATION DASHBOARD DESIGN

**Version:** 1.0  
**Created:** 2026-01-08  
**Status:** MVP Implemented  

---

## 1. OVERVIEW

The Admin Gamification Dashboard provides real-time visibility into the DiceCoin economy, enabling admins to monitor health, detect abuse, and manage reward rules.

### 1.1 MVP Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Mint Rate** | Coins minted in 24h/7d with trend | ✅ Implemented |
| **Burn Rate** | Coins burned in 24h/7d with trend | ✅ Implemented |
| **Top Earners** | Leaderboard with risk scoring | ✅ Implemented |
| **Rule Toggles** | Enable/disable automation rules | ✅ Implemented |
| **Suspicious Activity** | Flagged users with risk factors | ✅ Implemented |

### 1.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD UI                       │
│           /admin/gamification/dashboard                     │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTES                             │
│  GET  /api/admin/gamification/dashboard → Full snapshot     │
│  GET  /api/admin/gamification/rules     → List rules        │
│  PATCH /api/admin/gamification/rules    → Toggle rule       │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│               SERVICE LAYER (server-only)                   │
│  lib/services/gamification-admin-dashboard.server.ts        │
│                                                             │
│  ├─ getEconomyMetrics(tenantId)                            │
│  ├─ getTopEarners(tenantId, limit)                         │
│  ├─ getSuspiciousActivities(tenantId, threshold)           │
│  ├─ getAutomationRules(tenantId)                           │
│  ├─ toggleAutomationRule(ruleId, isActive)                 │
│  └─ getDashboardSnapshot(filters)                          │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                           │
│                                                             │
│  Tables:                                                    │
│  ├─ coin_transactions (earn/spend ledger)                  │
│  ├─ user_coins (current balances)                          │
│  ├─ gamification_daily_earnings (per-day aggregates)       │
│  ├─ gamification_events (event log)                        │
│  ├─ gamification_automation_rules (reward rules)           │
│  └─ user_gamification_preferences (flags)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API REFERENCE

### 2.1 GET /api/admin/gamification/dashboard

Returns full dashboard snapshot.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tenantId` | uuid | null | Filter by tenant (null = global) |
| `section` | string | 'full' | 'full', 'economy', 'earners', 'suspicious', 'rules' |
| `topN` | number | 10 | Number of top earners to return |
| `riskThreshold` | number | 50 | Min risk score for suspicious list |

**Response (section='full'):**

```typescript
{
  economy: {
    mintRate24h: number,
    mintRate7d: number,
    mintRateChange: number,      // % vs previous 7d
    totalMinted: number,
    burnRate24h: number,
    burnRate7d: number,
    burnRateChange: number,
    totalBurned: number,
    netFlow24h: number,          // mint - burn
    netFlow7d: number,
    inflationRate: number,       // net as % of supply
    totalSupply: number,
    activeUsers24h: number,
    avgBalancePerUser: number,
  },
  topEarners: [
    {
      userId: string,
      displayName: string,
      email: string | null,
      avatarUrl: string | null,
      coinsEarned24h: number,
      coinsEarned7d: number,
      coinsEarnedTotal: number,
      xpTotal: number,
      level: number,
      eventCount24h: number,
      riskScore: number,         // 0-100
    }
  ],
  suspiciousActivities: [
    {
      userId: string,
      displayName: string,
      email: string | null,
      riskScore: number,
      riskFactors: [
        {
          type: 'high_velocity' | 'session_spam' | 'event_flood' | 'new_account' | 'pattern_anomaly',
          severity: 'low' | 'medium' | 'high',
          description: string,
          value: number,
          threshold: number,
        }
      ],
      lastActivityAt: string,
      coinsEarned24h: number,
      eventCount24h: number,
      status: 'pending' | 'reviewed' | 'cleared' | 'suspended',
    }
  ],
  rules: [
    {
      id: string,
      tenantId: string | null,
      name: string,
      eventType: string,
      rewardAmount: number,
      xpAmount: number | null,
      baseMultiplier: number,
      cooldownType: string | null,
      isActive: boolean,
      triggerCount24h: number,
      triggerCount7d: number,
      createdAt: string,
      updatedAt: string,
    }
  ],
  generatedAt: string,
}
```

### 2.2 GET /api/admin/gamification/rules

List automation rules with trigger statistics.

### 2.3 PATCH /api/admin/gamification/rules

Toggle rule active state.

**Request Body:**

```typescript
{
  ruleId: string,
  isActive: boolean,
  tenantId?: string,  // For tenant-scoped auth check
}
```

**Response:**

```typescript
{
  success: boolean,
  ruleId: string,
  isActive: boolean,
}
```

---

## 3. ECONOMY METRICS

### 3.1 Mint Rate Calculation

```sql
-- 24h mint rate
SELECT SUM(amount)
FROM coin_transactions
WHERE type = 'earn'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND (tenant_id = $1 OR $1 IS NULL);
```

### 3.2 Burn Rate Calculation

```sql
-- 24h burn rate
SELECT ABS(SUM(amount))
FROM coin_transactions
WHERE type = 'spend'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND (tenant_id = $1 OR $1 IS NULL);
```

### 3.3 Rate Change

Compares current 7-day period to previous 7-day period:

```
change = ((current_7d - prev_7d) / prev_7d) * 100
```

### 3.4 Inflation Rate

```
inflationRate = (netFlow7d / totalSupply) * 100
```

---

## 4. RISK SCORING ALGORITHM

The system uses heuristic-based risk scoring (0-100) to flag suspicious activity.

### 4.1 Risk Factors

| Factor | Trigger | Points |
|--------|---------|--------|
| **High Velocity** | >150 coins in 24h | 10-30 |
| **Event Flood** | >40 events in 24h | 10-30 |
| **Session Spam** | Peak day >3x average | 15-25 |
| **New Account** | <3 days + high activity | 15-25 |
| **Pattern Anomaly** | Softcap hit 3+ times/week | 10-20 |

### 4.2 Severity Thresholds

| Severity | Points | Action |
|----------|--------|--------|
| Low | 10 | Yellow indicator |
| Medium | 15-20 | Orange indicator |
| High | 25-30 | Red indicator, flag for review |

### 4.3 Risk Score Calculation

```typescript
function calculateDetailedRisk(analysis) {
  let totalRisk = 0
  const factors = []
  
  // High velocity
  if (analysis.coinsEarned24h > 150) {
    const severity = analysis.coinsEarned24h > 300 ? 'high' : 
                     analysis.coinsEarned24h > 200 ? 'medium' : 'low'
    totalRisk += severity === 'high' ? 30 : severity === 'medium' ? 20 : 10
    factors.push({ type: 'high_velocity', severity, ... })
  }
  
  // ... other factors
  
  return { riskScore: Math.min(100, totalRisk), riskFactors: factors }
}
```

---

## 5. UI COMPONENTS

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Economy Dashboard                           [Refresh]        │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Mint 24h │ │ Burn 24h │ │ Net Flow │ │ Active Users     │ │
│ │   1,234  │ │    456   │ │   +778   │ │      89          │ │
│ │   +12%   │ │   -5%    │ │          │ │                  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Supply   │ │ Inflation│ │ Minted   │ │ Avg Balance      │ │
│ │  45,678  │ │   1.7%   │ │ 123,456  │ │      512         │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
├─────────────────────────┬───────────────────────────────────┤
│   TOP EARNERS (7d)      │    SUSPICIOUS ACTIVITY            │
│ ┌─────────────────────┐ │ ┌─────────────────────────────┐   │
│ │ # User       7d Risk│ │ │ ⚠️ Power User               │   │
│ │ 1 Alice    507  [30]│ │ │   Risk: 72 [High]           │   │
│ │ 2 Bob      384  [15]│ │ │   - high_velocity           │   │
│ │ 3 Charlie  298  [0] │ │ │   - event_flood             │   │
│ │ ...                 │ │ │   Status: pending           │   │
│ └─────────────────────┘ │ └─────────────────────────────┘   │
├─────────────────────────┴───────────────────────────────────┤
│   AUTOMATION RULES                                          │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Rule            Event                    24h   Active │   │
│ │ Session Done    play:session_completed   156   [ON]   │   │
│ │ Plan Published  planner:plan_published    23   [ON]   │   │
│ │ Daily Login     engagement:daily_login   445   [OFF]  │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Component Hierarchy

```
app/admin/gamification/dashboard/page.tsx
├─ EconomyPanel
│  └─ AdminStatCard × 8
├─ TopEarnersPanel
│  └─ Table with RiskBadge
├─ SuspiciousActivityPanel
│  └─ Cards with RiskFactor list
└─ RulesPanel
   └─ Table with Switch toggles
```

---

## 6. ACCESS CONTROL

### 6.1 Permission Checks

| Role | Global Dashboard | Tenant Dashboard | Toggle Rules |
|------|------------------|------------------|--------------|
| System Admin | ✅ | ✅ | ✅ |
| Tenant Owner | ❌ | ✅ (own) | ✅ (own) |
| Tenant Admin | ❌ | ✅ (own) | ✅ (own) |
| Member | ❌ | ❌ | ❌ |

### 6.2 RLS Policies

All queries use service role with explicit permission checks:

```typescript
// Verify admin access
const { data: isAdmin } = await supabase.rpc('is_system_admin')
if (!isAdmin && tenantId) {
  const { data: hasTenantRole } = await supabase.rpc('has_tenant_role', {
    p_tenant_id: tenantId,
    p_roles: ['owner', 'admin'],
  })
  if (!hasTenantRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Aggregation Queries

Current implementation fetches individual rows and aggregates in JS. For production scale:

1. **Materialized Views**: Pre-aggregate daily stats
2. **Time-series Partitioning**: Partition `coin_transactions` by month
3. **Caching**: Cache dashboard snapshot for 1-5 minutes
4. **Background Jobs**: Calculate metrics via cron, store in cache table

### 7.2 Recommended Indexes

```sql
-- Already exist in migration:
CREATE INDEX idx_gamification_daily_earnings_user_date
  ON gamification_daily_earnings(user_id, tenant_id, earning_date DESC);

-- Consider adding:
CREATE INDEX idx_coin_transactions_type_created
  ON coin_transactions(type, created_at DESC);
```

---

## 8. FUTURE ENHANCEMENTS

### 8.1 Phase 2 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Real-time Updates | WebSocket/SSE for live metrics | Medium |
| Time Range Selector | 24h/7d/30d/custom periods | Medium |
| Export Reports | CSV/PDF economy reports | Low |
| Alert Rules | Email/Slack on thresholds | Medium |
| Trend Charts | Historical mint/burn graphs | Medium |

### 8.2 Advanced Analytics

- **Cohort Analysis**: Compare user segments
- **Prediction Models**: Forecast supply growth
- **A/B Testing**: Rule effectiveness comparison
- **Fraud ML**: Machine learning abuse detection

---

## 9. FILE INVENTORY

| File | Purpose |
|------|---------|
| [lib/services/gamification-admin-dashboard.server.ts](../../lib/services/gamification-admin-dashboard.server.ts) | Service layer with all metrics functions |
| [app/api/admin/gamification/dashboard/route.ts](../../app/api/admin/gamification/dashboard/route.ts) | Dashboard API endpoint |
| [app/api/admin/gamification/rules/route.ts](../../app/api/admin/gamification/rules/route.ts) | Rule toggle API |
| [app/admin/gamification/dashboard/page.tsx](../../app/admin/gamification/dashboard/page.tsx) | Dashboard UI page |

---

## 10. INTEGRATION CHECKLIST

- [x] Service layer with economy metrics
- [x] Service layer with top earners + risk scoring
- [x] Service layer with suspicious activity detection
- [x] Service layer with rule management
- [x] Dashboard API route
- [x] Rule toggle API route
- [x] React dashboard page component
- [x] Economy stats panel
- [x] Top earners table with risk badges
- [x] Suspicious activity cards
- [x] Rule toggle switches
- [ ] Add link in `/admin/gamification` hub page
- [ ] Add navigation breadcrumb
- [ ] Performance optimization (caching)
- [ ] Real-time updates

---

*This document describes the MVP admin gamification dashboard for Lekbanken.*
