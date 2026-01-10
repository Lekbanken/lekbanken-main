# Phase 4.1: Security Hardening for Achievement APIs

**Document Status:** Complete  
**Phase:** 4.1 (Hardening)  
**Date:** 2025-01-10

---

## Overview

Phase 4.1 addresses security concerns identified in the GPT review of Phase 4:

1. **P0.1**: Block client-stat spoofing in production (`/check`)
2. **P0.2**: Defense-in-depth tenant + status filtering (`/check`)
3. **P1.1**: Race-safe idempotency via insert-first pattern (`/unlock`)
4. **P1.2**: Metadata size limits (`/unlock`)

---

## Threat Model

### Client Stats Spoofing (P0.1)
- **Risk**: Authenticated users can send fabricated stats (e.g., `totalGames: 9999`) to unlock condition-based achievements without earning them.
- **Impact**: Undermines gamification integrity.
- **Mitigation**: Block stats-requiring triggers in production; allow only `first_login` and `profile_completed`.

### Tenant Bypass (P0.2)
- **Risk**: `checkAndUnlockAchievements` might return achievements from other tenants if filtering is incomplete.
- **Impact**: Users could see/claim tenant-specific achievements they shouldn't access.
- **Mitigation**: Post-unlock filtering to ensure only active + accessible achievements are returned.

### Race Condition on Unlock (P1.1)
- **Risk**: Concurrent requests could cause duplicate inserts before the "check existing" query returns.
- **Impact**: Database constraint violations or duplicate records.
- **Mitigation**: Insert-first pattern; handle duplicate violation gracefully.

### Metadata Abuse (P1.2)
- **Risk**: Unbounded metadata could be used for storage abuse or injection attacks.
- **Impact**: Database bloat, potential JSON parsing issues.
- **Mitigation**: Enforce key count, string length, and total size limits.

---

## Files Modified

### 1. `app/api/gamification/achievements/unlock/route.ts`

**Changes:**

1. **Added metadata validation function** (`validateMetadata`):
   - Max 25 keys
   - Max 200 characters per string value
   - Max 8KB serialized size

2. **Metadata validation in POST handler**:
   - Returns 400 if metadata exceeds limits

3. **Insert-first idempotency pattern**:
   - Attempts insert directly
   - On duplicate violation (code 23505), returns `alreadyUnlocked: true`
   - Removes race condition window

**Before:**
```typescript
// Check if already unlocked
const { data: existingUnlock } = await serviceClient...
if (existingUnlock) { return ... }
// Insert
const { data: unlock, error } = await serviceClient.insert(...)
if (error) { return 500 }
```

**After:**
```typescript
// Insert directly (race-safe)
const { data: unlock, error } = await serviceClient.insert(...)
if (error) {
  if (isDuplicate) {
    // Fetch existing and return alreadyUnlocked
    return { success: true, alreadyUnlocked: true, ... }
  }
  return 500
}
```

---

### 2. `app/api/gamification/achievements/check/route.ts`

**Changes:**

1. **Environment detection**:
   ```typescript
   const IS_PRODUCTION = process.env.NODE_ENV === 'production';
   ```

2. **Trigger classification**:
   ```typescript
   const STAT_FREE_TRIGGERS = ['first_login', 'profile_completed'];
   const STATS_REQUIRED_TRIGGERS = ['game_completed', 'streak_updated', 'coins_earned', 'level_up', 'custom'];
   ```

3. **Production guard (P0.1)**:
   - In production, stats-requiring triggers return 400 with error code `STATS_NOT_SERVER_AUTHORITATIVE`
   - Clear message explaining the limitation

4. **Defense-in-depth filtering (P0.2)**:
   - After unlock, each achievement is validated:
     - Must have `status = 'active'`
     - Must be global (`tenant_id IS NULL`) OR match user's tenant
   - Non-matching achievements are logged and excluded from response

5. **Dev warning**:
   - In non-production, response includes `warning: "client_stats_trusted_dev_only"` when client stats are used

---

## Database Dependencies

The unique constraint required for race-safe idempotency already exists:

```sql
-- From: 20251231193000_user_achievements_idempotency_v1.sql
CREATE UNIQUE INDEX idx_user_achievements_unique_v1
  ON public.user_achievements (
    user_id,
    achievement_id,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
```

**No new migrations required.**

---

## API Behavior Changes

### `/api/gamification/achievements/unlock`

| Scenario | Before | After |
|----------|--------|-------|
| Metadata > 8KB | Accepted | 400 error |
| Concurrent duplicate requests | Possible race | Gracefully returns `alreadyUnlocked` |

### `/api/gamification/achievements/check`

| Scenario | Before | After |
|----------|--------|-------|
| `game_completed` in production | Trusts client stats | 400 error with `STATS_NOT_SERVER_AUTHORITATIVE` |
| `first_login` in production | Works | Works (no change) |
| Any trigger in dev | Trusts client stats | Works + warning in response |
| Achievement from wrong tenant returned | Possible | Filtered out + warning logged |

---

## Testing

### Manual Test: Unlock Idempotency

```bash
# First unlock (success)
curl -X POST http://localhost:3000/api/gamification/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"achievementId": "<uuid>"}'
# Response: { "success": true, "alreadyUnlocked": false, ... }

# Second unlock (idempotent)
curl -X POST http://localhost:3000/api/gamification/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"achievementId": "<uuid>"}'
# Response: { "success": true, "alreadyUnlocked": true, ... }
```

### Manual Test: Check Production Block

```bash
# Set NODE_ENV=production, then:
curl -X POST http://localhost:3000/api/gamification/achievements/check \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"trigger": "game_completed", "stats": {"totalGames": 10}}'
# Response: 400 { "error": "STATS_NOT_SERVER_AUTHORITATIVE", ... }

# Stat-free trigger still works:
curl -X POST http://localhost:3000/api/gamification/achievements/check \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"trigger": "first_login"}'
# Response: 200 { "success": true, ... }
```

### Manual Test: Metadata Limits

```bash
# Large metadata (should fail)
curl -X POST http://localhost:3000/api/gamification/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"achievementId": "<uuid>", "context": {"metadata": {"key1": "x".repeat(9000)}}}'
# Response: 400 { "error": "Invalid metadata", "details": "..." }
```

---

## Rollback Plan

If issues arise:

1. **Revert `/unlock`**: Remove metadata validation and restore read-then-insert pattern
2. **Revert `/check`**: Remove `IS_PRODUCTION` guard and defense-in-depth filtering

Both changes are additive (guards and validations) and don't alter DB schema, making rollback safe.

---

## Future Work (Phase 4.2)

To fully enable `game_completed` and other stats-based triggers in production:

1. **Server-side stats computation**:
   - Query `session_analytics` for session counts
   - Query `coin_transactions` for coin totals
   - Query `user_progress` for scores

2. **Migrate `/check` to context-only**:
   - Change signature: `checkAchievements(trigger, context)` where context = `{ sessionId, gameId }`
   - Server computes stats from DB based on context

3. **Remove dev warning** once server stats are authoritative

---

## Summary

| Issue | Severity | Status |
|-------|----------|--------|
| Client stats spoofing in production | P0 | ✅ Fixed (blocked) |
| Tenant/status filtering on returns | P0 | ✅ Fixed |
| Race condition in unlock | P1 | ✅ Fixed |
| Metadata size abuse | P1 | ✅ Fixed |

**Phase 4.1 Hardening: Complete**
