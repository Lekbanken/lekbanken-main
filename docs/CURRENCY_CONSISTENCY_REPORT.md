# Currency Consistency Report

## Summary

This document tracks the implementation of consistent currency vocabulary across the Lekbanken product.

**Completed:** 2025-01-XX  
**Status:** ✅ COMPLETE

---

## Vocabulary Standard

| Concept | Term | Plural | Short | Notes |
|---------|------|--------|-------|-------|
| Virtual currency | DiceCoin | DiceCoin | DC | No plural form - always "DiceCoin" |
| Experience points | XP | XP | XP | Unchanged |
| Real money | NOK/SEK/kr | - | - | Used for Stripe/billing only |

---

## New Canonical Files

### 1. `components/DiceCoinIcon.tsx`
Canonical icon component with size presets:
- Props: `size` (xs/sm/md/lg/xl or number), `className`, `title`
- Uses: `/icons/app-nav/lekvaluta.png`

### 2. `lib/currency.ts`
Currency formatting utilities:
- `DICECOIN_NAME = "DiceCoin"`
- `DICECOIN_SHORT = "DC"`
- `DICECOIN_SYMBOL = "🎲"`
- `formatDiceCoin(amount)` → "42 DiceCoin"
- `formatXP(amount)` → "1,234 XP"

---

## Files Modified

### i18n Files (sv.json, en.json, no.json)

| Key Path | Before | After |
|----------|--------|-------|
| `admin.leaderboard.stats.totalCoins` | "Total coins" | "Totalt DiceCoin" |
| `admin.leaderboard.table.coins` | "Coins" | "DiceCoin" |
| `admin.leaderboard.metricSort.coins` | "Sort: Coins" | "Sort: DiceCoin" |
| `admin.gamification.dicecoinXp.xpTab.table.coins` | "Coins" | "DiceCoin" |
| `admin.gamification.modules.dicecoinXp.features.coinTransactions` | "Coin transactions" | "DiceCoin transactions" |
| `app.shop.coins` | "Coins/Mynt/Mynter" | "DiceCoin" |
| `app.course.coins` | "coins/mynt/mynter" | "DiceCoin" |
| `app.challenge.rewards.coins` | "+{amount} coins/mynt/mynter" | "+{amount} DiceCoin" |

### Component Files

| File | Change |
|------|--------|
| `components/app/nav-items.tsx` | `alt="Poäng"` → `alt="DiceCoin"` |
| `components/CoinIdle.tsx` | `ariaLabel="Lekbanken coin"` → `ariaLabel="DiceCoin"` |
| `components/journey/JourneyStats.tsx` | `label: 'Mynt'` → `label: 'DiceCoin'` |
| `components/journey/JourneyActions.tsx` | `label: 'Mynt'` → `label: 'DiceCoin'` |
| `features/gamification/components/CoinsSection.tsx` | "mynt" → "DiceCoin" (2x) |

### API/Route Files

| File | Change |
|------|--------|
| `app/api/journey/feed/route.ts` | "Spenderade/Tjänade X mynt" → "X DiceCoin" |
| `app/app/learning/course/[slug]/page.tsx` | "+X mynt" → "+X DiceCoin" (2x) |

### Database Seeds

| File | Change |
|------|--------|
| `supabase/migrations/20251231241500_seed_coin_multiplier_powerup.sql` | "Mynt-boost (24h)" → "DiceCoin-boost (24h)" |

---

## Exceptions (Intentionally Unchanged)

### Database Schema
- Column names: `coins`, `coin_transactions`, `coins_earned`, `total_earned`, `total_spent`
- Table names: `coin_transactions`, `user_coins`
- **Rationale:** Schema changes require migrations and could break existing data

### Internal Code
- Service layer variables and parameters
- Type definitions in `types/supabase.ts`
- Test fixtures
- **Rationale:** Internal code terminology doesn't affect user experience

### Documentation
- Technical docs referencing database columns
- **Rationale:** Should match actual DB schema

### Real Money Terms
- "NOK", "SEK", "kr" in billing contexts
- Stripe-related terminology
- **Rationale:** These refer to actual currency, not virtual currency

---

## Validation

- [x] TypeScript compilation: `npx tsc --noEmit --skipLibCheck` ✅
- [x] No UI-facing "Coins", "Mynt", "Mynter" strings remaining
- [x] All i18n values use "DiceCoin" consistently
- [x] XP terminology unchanged (as intended)

---

## Usage Guidelines for Developers

### When adding new currency displays:

```tsx
import { DiceCoinIcon } from '@/components/DiceCoinIcon';
import { formatDiceCoin, DICECOIN_NAME } from '@/lib/currency';

// Icon with amount
<DiceCoinIcon size="sm" /> {formatDiceCoin(amount)}

// Just the name
<span>{DICECOIN_NAME}</span>

// Short form for tight spaces
<span>{DICECOIN_SHORT}</span> // "DC"
```

### i18n keys:

Use existing keys like `app.shop.coins` which now return "DiceCoin".

### Don't:
- Use "coins", "mynt", "Coins", "Mynt", "Mynter" in new UI strings
- Pluralize DiceCoin (always singular)
- Change database column names without migration plan
