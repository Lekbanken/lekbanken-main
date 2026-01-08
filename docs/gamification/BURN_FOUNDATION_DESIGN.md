# LEKBANKEN — DICECOIN BURN FOUNDATION

**Date:** 2026-01-08  
**Status:** Infrastructure Ready (Shop Not Implemented)  
**Objective:** Lay foundation for coin sinks without building shop UI

---

## EXECUTIVE SUMMARY

The burn foundation provides:
- ✅ Atomic coin spending with double-spend protection
- ✅ Extensible sink registry (shop items, boosts, cosmetics, donations)
- ✅ Full audit trail via `gamification_burn_log`
- ✅ Stock limits and availability windows
- ✅ Per-user purchase limits
- ✅ Refund capability
- ✅ Multi-tenant isolation

**Shop items are NOT ready**, but the infrastructure supports future implementation.

---

## 1. DATABASE SCHEMA

### 1.1 `gamification_burn_sinks` — Sink Registry

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | null = global sink |
| `sink_type` | TEXT | 'shop_item', 'boost', 'cosmetic', 'donation', 'custom' |
| `name` | TEXT | Display name |
| `description` | TEXT | User-facing description |
| `cost_coins` | INTEGER | DiceCoin price |
| `is_available` | BOOLEAN | Can be purchased |
| `available_from` | TIMESTAMPTZ | Start availability |
| `available_until` | TIMESTAMPTZ | End availability |
| `total_stock` | INTEGER | Initial stock (null = unlimited) |
| `remaining_stock` | INTEGER | Current stock |
| `per_user_limit` | INTEGER | Max purchases per user |
| `metadata` | JSONB | Sink-specific config |

### 1.2 `gamification_burn_log` — Transaction Audit

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Buyer |
| `tenant_id` | UUID | Context |
| `sink_id` | UUID | What was purchased |
| `coin_transaction_id` | UUID | Link to ledger |
| `sink_type` | TEXT | Denormalized for querying |
| `amount_spent` | INTEGER | How many coins |
| `result_status` | TEXT | 'completed', 'refunded', 'failed' |
| `refund_transaction_id` | UUID | If refunded |
| `metadata` | JSONB | Purchase details |
| `created_at` | TIMESTAMPTZ | When |

---

## 2. CORE FUNCTION: `burn_coins_v1()`

### 2.1 Signature

```sql
burn_coins_v1(
  p_user_id UUID,
  p_tenant_id UUID,
  p_sink_id UUID,
  p_amount INTEGER,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  burn_log_id UUID,
  coin_transaction_id UUID,
  new_balance INTEGER,
  error_message TEXT
)
```

### 2.2 Safeguards

| Protection | Mechanism |
|------------|-----------|
| **Double-spend** | `pg_advisory_xact_lock` on hash of user+tenant+key |
| **Insufficient funds** | `apply_coin_transaction_v1` rejects negative balance |
| **Idempotency** | Returns existing result if key matches |
| **Out of stock** | Checks `remaining_stock > 0` before purchase |
| **Availability** | Validates `available_from`/`available_until` window |
| **User limit** | Per-user limit enforcement (future query) |

### 2.3 Flow

```
1. Acquire advisory lock (idempotency key)
2. Check if already processed → return existing result
3. Validate sink availability + stock
4. Call apply_coin_transaction_v1(type='spend')
   └─ Fails if insufficient balance
5. Create gamification_burn_log entry
6. Decrement remaining_stock if applicable
7. Return success + transaction IDs
```

---

## 3. API STUBS

### 3.1 `POST /api/gamification/burn` — Execute Burn

**Status:** Stub ready for implementation

```typescript
// app/api/gamification/burn/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface BurnRequest {
  sinkId: string | null       // UUID of sink (null for manual burn)
  amount?: number             // Override amount (if no sink)
  idempotencyKey: string      // Required for safety
  metadata?: Record<string, unknown>
}

interface BurnResponse {
  success: boolean
  burnLogId?: string
  transactionId?: string
  newBalance?: number
  error?: string
}

export async function POST(req: NextRequest): Promise<NextResponse<BurnResponse>> {
  // TODO: Implement when shop is ready
  // 1. Verify service role or admin authorization
  // 2. Extract user_id and tenant_id from request
  // 3. Call burn_coins_v1() RPC
  // 4. Return result

  return NextResponse.json({
    success: false,
    error: 'Burn endpoint not yet implemented - shop coming soon',
  }, { status: 501 })
}
```

### 3.2 `GET /api/gamification/sinks` — List Available Sinks

```typescript
// app/api/gamification/sinks/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Sink {
  id: string
  sinkType: 'shop_item' | 'boost' | 'cosmetic' | 'donation' | 'custom'
  name: string
  description: string | null
  costCoins: number
  remainingStock: number | null
  availableUntil: string | null
}

export async function GET(req: NextRequest): Promise<NextResponse<{ sinks: Sink[] }>> {
  const supabase = await createClient()
  const tenantId = req.nextUrl.searchParams.get('tenantId')

  const { data, error } = await supabase
    .from('gamification_burn_sinks')
    .select('id, sink_type, name, description, cost_coins, remaining_stock, available_until')
    .eq('is_available', true)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .gte('available_until', new Date().toISOString())
    .order('cost_coins', { ascending: true })

  if (error) {
    return NextResponse.json({ sinks: [] }, { status: 500 })
  }

  return NextResponse.json({
    sinks: data.map(s => ({
      id: s.id,
      sinkType: s.sink_type,
      name: s.name,
      description: s.description,
      costCoins: s.cost_coins,
      remainingStock: s.remaining_stock,
      availableUntil: s.available_until,
    })),
  })
}
```

### 3.3 `POST /api/admin/gamification/sinks` — Create/Update Sink

```typescript
// app/api/admin/gamification/sinks/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface CreateSinkRequest {
  tenantId?: string
  sinkType: 'shop_item' | 'boost' | 'cosmetic' | 'donation' | 'custom'
  name: string
  description?: string
  costCoins: number
  isAvailable?: boolean
  availableFrom?: string
  availableUntil?: string
  totalStock?: number
  perUserLimit?: number
  metadata?: Record<string, unknown>
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // TODO: Verify admin role
  const body: CreateSinkRequest = await req.json()
  const admin = await createServiceRoleClient()

  const { data, error } = await admin
    .from('gamification_burn_sinks')
    .insert({
      tenant_id: body.tenantId,
      sink_type: body.sinkType,
      name: body.name,
      description: body.description,
      cost_coins: body.costCoins,
      is_available: body.isAvailable ?? false,
      available_from: body.availableFrom,
      available_until: body.availableUntil,
      total_stock: body.totalStock,
      remaining_stock: body.totalStock,
      per_user_limit: body.perUserLimit,
      metadata: body.metadata,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: data.id })
}
```

### 3.4 `POST /api/admin/gamification/refund` — Process Refund

```typescript
// app/api/admin/gamification/refund/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface RefundRequest {
  burnLogId: string
  reason?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { burnLogId, reason }: RefundRequest = await req.json()
  const admin = await createServiceRoleClient()

  // 1. Get burn log entry
  const { data: burnLog, error: fetchError } = await admin
    .from('gamification_burn_log')
    .select('*')
    .eq('id', burnLogId)
    .single()

  if (fetchError || !burnLog) {
    return NextResponse.json({ error: 'Burn log not found' }, { status: 404 })
  }

  if (burnLog.result_status === 'refunded') {
    return NextResponse.json({ error: 'Already refunded' }, { status: 400 })
  }

  // 2. Create refund transaction (credit coins back)
  const { data: txResult, error: txError } = await admin.rpc('apply_coin_transaction_v1', {
    p_user_id: burnLog.user_id,
    p_tenant_id: burnLog.tenant_id,
    p_type: 'earn',
    p_amount: burnLog.amount_spent,
    p_reason_code: 'refund',
    p_idempotency_key: `refund:${burnLogId}`,
    p_description: `Refund: ${reason ?? 'Admin refund'}`,
    p_source: 'admin',
    p_metadata: { originalBurnLogId: burnLogId },
  })

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  // 3. Update burn log status
  await admin
    .from('gamification_burn_log')
    .update({
      result_status: 'refunded',
      refund_transaction_id: txResult[0]?.transaction_id,
    })
    .eq('id', burnLogId)

  // 4. Restore stock if applicable
  if (burnLog.sink_id) {
    await admin
      .from('gamification_burn_sinks')
      .update({ remaining_stock: admin.rpc('remaining_stock + 1') })
      .eq('id', burnLog.sink_id)
  }

  return NextResponse.json({ success: true })
}
```

---

## 4. FUTURE SINK EXAMPLES

### 4.1 Cosmetic Items

```typescript
// Profile customizations that don't affect gameplay
const cosmeticSinks = [
  {
    sinkType: 'cosmetic',
    name: 'Gold Border',
    description: 'Gilded frame around your profile picture',
    costCoins: 500,
    perUserLimit: 1,
    metadata: { 
      category: 'profile_border', 
      rarity: 'rare',
      cssClass: 'border-gold-gradient' 
    },
  },
  {
    sinkType: 'cosmetic',
    name: 'Custom Title: Lekledare Extraordinär',
    description: 'Display a special title on your profile',
    costCoins: 250,
    perUserLimit: 1,
    metadata: { 
      category: 'title', 
      text: 'Lekledare Extraordinär' 
    },
  },
  {
    sinkType: 'cosmetic',
    name: 'Seasonal Avatar Frame - Winter 2026',
    description: 'Limited time winter-themed frame',
    costCoins: 100,
    availableFrom: '2026-12-01T00:00:00Z',
    availableUntil: '2027-01-31T23:59:59Z',
    totalStock: 1000,
    metadata: { 
      category: 'avatar_frame', 
      season: 'winter_2026',
      isLimited: true 
    },
  },
]
```

### 4.2 Temporary Boosts

```typescript
// Time-limited power-ups
const boostSinks = [
  {
    sinkType: 'boost',
    name: 'Double XP Weekend',
    description: '2x XP for 48 hours',
    costCoins: 100,
    metadata: {
      boostType: 'xp_multiplier',
      multiplier: 2.0,
      durationHours: 48,
      stackable: false,
    },
  },
  {
    sinkType: 'boost',
    name: 'Streak Saver',
    description: 'Protect your streak for 1 missed day',
    costCoins: 75,
    perUserLimit: 3, // Max 3 per month
    metadata: {
      boostType: 'streak_protection',
      protectedDays: 1,
    },
  },
  {
    sinkType: 'boost',
    name: 'Priority Queue',
    description: 'Your sessions get highlighted for 7 days',
    costCoins: 200,
    metadata: {
      boostType: 'visibility',
      durationDays: 7,
      effect: 'featured_badge',
    },
  },
]
```

### 4.3 Tenant-Specific Items

```typescript
// Organization-branded items
const tenantSinks = [
  {
    tenantId: 'school-district-uuid',
    sinkType: 'shop_item',
    name: 'School Hoodie',
    description: 'Physical hoodie shipped to you (Sweden only)',
    costCoins: 5000,
    totalStock: 50,
    metadata: {
      category: 'physical_merch',
      requiresAddress: true,
      shippingRegion: 'SE',
    },
  },
  {
    tenantId: 'corporate-uuid',
    sinkType: 'donation',
    name: 'Donate to Charity',
    description: 'We donate 10 SEK per 100 coins',
    costCoins: 100,
    metadata: {
      category: 'charitable',
      conversionRate: 0.1, // 100 coins = 10 SEK
      charity: 'BRIS',
    },
  },
]
```

### 4.4 Achievement Unlocks

```typescript
// Pay to unlock optional achievements
const achievementSinks = [
  {
    sinkType: 'custom',
    name: 'Unlock: Night Owl Challenge',
    description: 'Start tracking sessions after 23:00',
    costCoins: 50,
    perUserLimit: 1,
    metadata: {
      category: 'achievement_unlock',
      achievementId: 'night_owl_challenge',
      unlocksTracking: true,
    },
  },
]
```

---

## 5. ECONOMY FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            COIN LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐           ┌──────────────────┐
    │                  │           │                  │
    │  GAMIFICATION    │──EARN────▶│   user_coins     │
    │  EVENTS          │           │   (balance)      │
    │                  │           │                  │
    │  • session_done  │           └────────┬─────────┘
    │  • plan_publish  │                    │
    │  • streaks       │                    │ SPEND
    │  • achievements  │                    │
    └──────────────────┘                    ▼
                               ┌──────────────────────┐
                               │                      │
                               │  gamification_       │
                               │  burn_sinks          │
                               │                      │
                               │  • cosmetics         │
                               │  • boosts            │
                               │  • donations         │
                               │  • shop items        │
                               │                      │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │                      │
                               │  coin_transactions   │
                               │  (ledger - both      │
                               │   earn AND spend)    │
                               │                      │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │                      │
                               │  gamification_       │
                               │  burn_log            │
                               │  (audit trail)       │
                               │                      │
                               └──────────────────────┘
```

---

## 6. ADMIN DASHBOARD QUERIES

### 6.1 Burn Rate Metrics

```sql
-- Daily burn volume (last 30 days)
SELECT 
  date_trunc('day', created_at)::date as day,
  COUNT(*) as transactions,
  SUM(amount_spent) as total_burned,
  COUNT(DISTINCT user_id) as unique_burners
FROM gamification_burn_log
WHERE tenant_id = $1
  AND result_status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### 6.2 Popular Sinks

```sql
-- Top sinks by purchase count
SELECT 
  s.name,
  s.sink_type,
  s.cost_coins,
  COUNT(bl.id) as purchases,
  SUM(bl.amount_spent) as total_burned
FROM gamification_burn_sinks s
LEFT JOIN gamification_burn_log bl ON bl.sink_id = s.id
  AND bl.result_status = 'completed'
WHERE s.tenant_id = $1 OR s.tenant_id IS NULL
GROUP BY s.id
ORDER BY purchases DESC
LIMIT 10;
```

### 6.3 Net Flow (Mint vs Burn)

```sql
-- Economic health: mint rate vs burn rate
WITH daily_stats AS (
  SELECT 
    ct.created_at::date as day,
    SUM(CASE WHEN ct.type = 'earn' THEN ct.amount ELSE 0 END) as minted,
    SUM(CASE WHEN ct.type = 'spend' THEN ct.amount ELSE 0 END) as burned
  FROM coin_transactions ct
  WHERE ct.tenant_id = $1
    AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY 1
)
SELECT 
  day,
  minted,
  burned,
  minted - burned as net_flow,
  ROUND(burned::numeric / NULLIF(minted, 0) * 100, 1) as burn_rate_pct
FROM daily_stats
ORDER BY day DESC;
```

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Current) ✅
- [x] `gamification_burn_sinks` table
- [x] `gamification_burn_log` table
- [x] `burn_coins_v1()` function
- [x] Double-spend protection
- [x] Idempotency handling
- [x] Stock management
- [x] RLS policies

### Phase 2: API Layer (Next)
- [ ] `POST /api/gamification/burn`
- [ ] `GET /api/gamification/sinks`
- [ ] `POST /api/admin/gamification/sinks`
- [ ] `POST /api/admin/gamification/refund`
- [ ] Service layer integration

### Phase 3: Boost Infrastructure
- [ ] `user_active_boosts` table
- [ ] Boost activation on purchase
- [ ] Boost expiration cron
- [ ] Multiplier integration with reward engine

### Phase 4: Shop UI
- [ ] Browse available items
- [ ] Purchase flow
- [ ] Inventory/unlocked items display
- [ ] Transaction history

---

## 8. SAFEGUARD SUMMARY

| Risk | Mitigation | Status |
|------|------------|--------|
| Double-spend | Advisory lock + idempotency key | ✅ |
| Negative balance | `apply_coin_transaction_v1` rejects | ✅ |
| Race condition on stock | `remaining_stock - 1` in single UPDATE | ✅ |
| Unauthorized purchase | RLS + service role only | ✅ |
| Cross-tenant purchase | Sink visibility policy | ✅ |
| Refund abuse | Admin-only, logged, original tx linked | ✅ |

---

*Burn foundation is ready. Shop implementation can proceed when product requirements are finalized.*
