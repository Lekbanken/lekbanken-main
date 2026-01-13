# 🔍 Demo Implementation Verification Prompt

**Purpose:** Use this prompt in VS Code Claude to verify Sprint 1 implementation
**Branch:** `claude/lekbanken-demo-analysis-Iomf5`
**Status:** Sprint 1 Complete - Ready for Verification

---

## 📋 Your Task

You are a senior code reviewer verifying the implementation of enterprise demo mode in Lekbanken. **Sprint 1 (32h)** has been completed by another Claude instance. Your job is to:

1. ✅ Verify all files were created correctly
2. ✅ Check code quality and patterns
3. ✅ Validate security implementation
4. ✅ Test database migrations (dry-run)
5. ✅ Identify potential issues
6. ✅ Suggest improvements

---

## 🎯 Sprint 1 Scope - What Was Implemented

### Day 1: RLS Policies & Security (8h)
**Files:**
- `supabase/migrations/20260114_demo_rls_policies.sql` (6 policies)
- `tests/rls/demo-policies.test.sql` (6 test cases)
- `.github/workflows/rls-tests.yml` (CI pipeline)

**Objective:** Database-level security enforcement

### Day 2: Database Foundation (8h)
**Files:**
- `supabase/migrations/20260114_demo_foundation.sql`
- `supabase/seeds/01_demo_tenant.sql`
- `supabase/seeds/02_demo_content.sql`

**Objective:** Schema extensions + demo tenant + content curation

### Day 3: Ephemeral Auth System (8h)
**Files:**
- `lib/auth/ephemeral-users.ts`
- `lib/utils/demo-detection.ts`
- `app/auth/demo/route.ts`
- `app/api/demo/status/route.ts`
- `app/api/demo/track/route.ts`
- `app/api/demo/convert/route.ts`

**Objective:** On-demand user creation + API layer

### Day 4: UI Components (8h)
**Files:**
- `hooks/useIsDemo.ts`
- `components/demo/DemoBanner.tsx`
- `components/demo/DemoFeatureGate.tsx`
- `app/demo-expired/page.tsx`
- `app/app/layout-client.tsx` (modified)

**Objective:** Client-side demo experience

---

## ✅ Verification Checklist

Run through each section and report findings.

### 1. File Existence Check

Verify all expected files exist:

```bash
# Run this to check all files
ls -la supabase/migrations/20260114_demo_rls_policies.sql
ls -la supabase/migrations/20260114_demo_foundation.sql
ls -la supabase/seeds/01_demo_tenant.sql
ls -la supabase/seeds/02_demo_content.sql
ls -la tests/rls/demo-policies.test.sql
ls -la .github/workflows/rls-tests.yml
ls -la lib/auth/ephemeral-users.ts
ls -la lib/utils/demo-detection.ts
ls -la app/auth/demo/route.ts
ls -la app/api/demo/status/route.ts
ls -la app/api/demo/track/route.ts
ls -la app/api/demo/convert/route.ts
ls -la hooks/useIsDemo.ts
ls -la components/demo/DemoBanner.tsx
ls -la components/demo/DemoFeatureGate.tsx
ls -la app/demo-expired/page.tsx
```

**Expected:** All files should exist with reasonable file sizes (not empty).

---

### 2. RLS Policies Review

**File:** `supabase/migrations/20260114_demo_rls_policies.sql`

**Critical Checks:**

- [ ] **Policy 1:** `demo_tenant_write_protection` - Blocks demo tenant updates
- [ ] **Policy 2:** `demo_tenant_delete_protection` - Blocks demo tenant deletion
- [ ] **Policy 3:** `demo_content_access` - Demo users only see `is_demo_content = true`
- [ ] **Policy 4:** `demo_user_flag_protection` - Prevents `is_demo_user` flag tampering
- [ ] **Policy 5:** `demo_no_public_sessions` - Blocks public session creation
- [ ] **Policy 6:** `demo_session_ownership` - Isolates sessions per user

**Security Questions:**
1. Do policies check `auth.uid()` correctly?
2. Is `system_admin` exception properly implemented?
3. Are there any SQL injection risks?
4. Do policies handle NULL values safely?

**Validate SQL Syntax:**
```bash
# Dry-run check (if you have psql)
psql -f supabase/migrations/20260114_demo_rls_policies.sql --dry-run
```

---

### 3. Test Harness Review

**File:** `tests/rls/demo-policies.test.sql`

**Checks:**
- [ ] Test 1: Demo user CANNOT modify demo tenant (expect: error)
- [ ] Test 2: Demo user only sees curated content (expect: ~15-20 activities)
- [ ] Test 3: System admin CAN modify demo tenant (expect: success)
- [ ] Test 4: Demo user cannot change `is_demo_user` flag (expect: error)
- [ ] Test 5: Demo user cannot create public sessions (expect: error)
- [ ] Test 6: Demo user CAN create private sessions (expect: success)

**Questions:**
1. Are test users properly created/cleaned up?
2. Do tests use `BEGIN`/`ROLLBACK` to avoid side effects?
3. Are assertions clear (RAISE NOTICE vs RAISE EXCEPTION)?

---

### 4. Database Foundation Review

**File:** `supabase/migrations/20260114_demo_foundation.sql`

**Schema Changes:**
- [ ] `activities.is_demo_content` column (boolean, default false)
- [ ] `profiles.is_demo_user` column (boolean, default false)
- [ ] `profiles.is_ephemeral` column (boolean, default false)
- [ ] `profiles.demo_last_used_at` column (timestamptz, nullable)
- [ ] `profiles.demo_session_count` column (integer, default 0)
- [ ] `demo_sessions` table (11 columns, proper indexes)
- [ ] RLS enabled on `demo_sessions`
- [ ] Helper functions: `add_demo_feature_usage()`, `mark_demo_session_converted()`, `get_current_demo_session_id()`
- [ ] Auto-updated `updated_at` trigger

**Questions:**
1. Are indexes created on all foreign keys?
2. Are CHECK constraints used where appropriate?
3. Do functions use `SECURITY DEFINER` safely?
4. Are column defaults sensible?

**Test Migration:**
```bash
# If you have Supabase CLI
supabase db reset --debug
```

---

### 5. Seed Data Review

**File:** `supabase/seeds/01_demo_tenant.sql`

**Checks:**
- [ ] Demo tenant UUID: `00000000-0000-0000-0000-000000000001`
- [ ] `demo_flag = true`
- [ ] Settings JSONB includes `features_enabled` and `features_disabled`
- [ ] Demo facilitator profile created
- [ ] Membership created

**File:** `supabase/seeds/02_demo_content.sql`

**Strategy:**
- [ ] Uses Option 2: Automated top-20 selection (for MVP)
- [ ] Includes curation guidelines
- [ ] Verification queries present
- [ ] Warning if < 10 or > 30 activities

**Questions:**
1. Is the demo tenant ID consistent across seeds?
2. Are there any hardcoded emails that might conflict?

---

### 6. Ephemeral Auth System Review

**File:** `lib/auth/ephemeral-users.ts`

**Security:**
- [ ] `generateSecurePassword()` uses `crypto.randomBytes(32)` (256-bit)
- [ ] Email format: `demo-{timestamp}-{random}@temp.lekbanken.internal`
- [ ] `createEphemeralDemoUser()` uses admin API (not client)
- [ ] Profile marked with `is_ephemeral = true`
- [ ] Membership created in demo tenant
- [ ] Error handling present

**Questions:**
1. Are passwords secure enough (32 bytes = 256 bits)?
2. Is email uniqueness guaranteed?
3. Are errors logged but not exposed?

**File:** `lib/utils/demo-detection.ts`

**Functionality:**
- [ ] `isDemoMode()` - Server-side check
- [ ] `getDemoSession()` - Returns session details
- [ ] `getDemoTier()` - Returns 'free' | 'premium' | null
- [ ] `isDemoFeatureAvailable()` - Feature gate logic
- [ ] `canPerformDemoAction()` - Permission check

**Questions:**
1. Do functions handle unauthenticated requests?
2. Is error handling comprehensive?
3. Are database queries optimized (single select)?

---

### 7. API Routes Review

**File:** `app/auth/demo/route.ts`

**Endpoints:**
- [ ] `POST /auth/demo` - Creates ephemeral user & redirects
- [ ] `GET /auth/demo` - Checks availability
- [ ] `DELETE /auth/demo` - Ends session early

**Security:**
- [ ] Premium tier requires access code (`DEMO_PREMIUM_ACCESS_CODE`)
- [ ] Redirect URL is same-origin validated
- [ ] Rate limiting ready (not yet implemented)
- [ ] Cookie is HttpOnly

**Questions:**
1. Is access code validation secure?
2. Are there timing attack risks?
3. Is redirect validation bulletproof?

**Files:** `app/api/demo/status/route.ts`, `app/api/demo/track/route.ts`, `app/api/demo/convert/route.ts`

**Check:**
- [ ] All use `createClient()` from server
- [ ] Error handling present
- [ ] Return types consistent (JSON)
- [ ] No sensitive data leaked in errors

---

### 8. Client Components Review

**File:** `hooks/useIsDemo.ts`

**Hooks:**
- [ ] `useIsDemo()` - Main hook
- [ ] `useIsDemoMode()` - Boolean only
- [ ] `useDemoTier()` - Tier only
- [ ] `useTrackDemoFeature()` - Tracking
- [ ] `useConvertDemo()` - Conversion

**Behavior:**
- [ ] Fetches status on mount
- [ ] Polls every 60 seconds
- [ ] Shows warning at 10 minutes
- [ ] Redirects on expiry
- [ ] Uses `'use client'` directive

**Questions:**
1. Is polling interval reasonable (60s)?
2. Are there memory leaks (cleanup in useEffect)?
3. Is error state handled gracefully?

**File:** `components/demo/DemoBanner.tsx`

**UI:**
- [ ] Persistent top banner
- [ ] Tier indicator (free/premium colors)
- [ ] Time remaining display
- [ ] Warning state (amber bg < 10 min)
- [ ] Upgrade CTA button
- [ ] Dismissible (X button)
- [ ] Responsive (mobile + desktop)

**Accessibility:**
- [ ] `role="banner"`
- [ ] `aria-label` present
- [ ] `aria-hidden` on icons
- [ ] Focus states on buttons

**File:** `components/demo/DemoFeatureGate.tsx`

**Components:**
- [ ] `DemoFeatureGate` - Full overlay lock
- [ ] `DemoButtonGate` - Disabled button variant
- [ ] `DemoFeatureBadge` - Free/Premium label

**Feature List:**
```typescript
const FREE_TIER_DISABLED_FEATURES = [
  'export_data',
  'invite_users',
  'modify_tenant_settings',
  'access_billing',
  'create_public_sessions',
  'advanced_analytics',
  'custom_branding',
];
```

**Questions:**
1. Is feature list consistent across client and server?
2. Is blur/overlay performant?

---

### 9. Integration Review

**File:** `app/app/layout-client.tsx` (modified)

**Changes:**
- [ ] Import: `import { DemoBanner } from '@/components/demo/DemoBanner'`
- [ ] Layout: Flexbox wrapper for banner + shell
- [ ] Banner renders conditionally (only if `isDemoMode = true`)

**Questions:**
1. Does flexbox layout break existing UI?
2. Is z-index correct (banner above content)?

**File:** `app/demo-expired/page.tsx`

**UI:**
- [ ] Clock icon
- [ ] Clear heading
- [ ] CTA: "Create Free Account"
- [ ] CTA: "Start Another Demo" (form POST)
- [ ] Footer: "Already have account? Log in"

**Questions:**
1. Are links correct?
2. Is conversion tracking called?

---

### 10. Code Quality Review

**Patterns to Check:**

1. **TypeScript:**
   - [ ] Strict types used (no `any`)
   - [ ] Interfaces defined for complex types
   - [ ] Enums used where appropriate

2. **Error Handling:**
   - [ ] Try/catch in async functions
   - [ ] Errors logged (console.error)
   - [ ] User-friendly error messages

3. **Security:**
   - [ ] No secrets in code
   - [ ] SQL injection prevented (parameterized queries)
   - [ ] XSS prevented (no dangerouslySetInnerHTML)
   - [ ] CSRF tokens not needed (Supabase handles)

4. **Performance:**
   - [ ] Database queries optimized (indexes, select specific columns)
   - [ ] No N+1 queries
   - [ ] Polling intervals reasonable

5. **Conventions:**
   - [ ] Follows Lekbanken patterns (Catalyst UI, not Shadcn)
   - [ ] Uses Heroicons (not emojis)
   - [ ] Uses next-intl patterns (when needed)
   - [ ] Server/client components properly separated

---

## 🚨 Critical Security Checks

Must-verify items:

1. **RLS Bypass Risk:**
   ```sql
   -- Test: Can demo user modify demo tenant by calling Supabase directly?
   -- Expected: NO (RLS should block)
   ```

2. **Credential Leakage:**
   ```typescript
   // Check: Is DEMO_USER_PASSWORD in environment variables?
   // Check: Are ephemeral passwords sufficiently random?
   ```

3. **Access Code Security:**
   ```typescript
   // Check: Is DEMO_PREMIUM_ACCESS_CODE in environment?
   // Check: Is timing attack possible?
   ```

4. **Cookie Security:**
   ```typescript
   // Check: Is demo_session_id cookie HttpOnly?
   // Check: Is Secure flag set in production?
   ```

---

## 📊 Expected Implementation Stats

Based on Masterprompt estimate:

| Metric | Expected | Verify |
|--------|----------|--------|
| Total Files | 21 files (16 new, 1 modified) | _____ files |
| Total LOC | ~2,900 lines | _____ lines |
| Migrations | 2 files | _____ files |
| Seeds | 2 files | _____ files |
| RLS Policies | 6 policies | _____ policies |
| Test Cases | 6 tests | _____ tests |
| API Routes | 4 routes | _____ routes |
| React Components | 3 components | _____ components |
| Hooks | 1 hook file | _____ files |
| Commits | 4 commits (Day 1-4) | _____ commits |

---

## 🔧 Testing Instructions

If you want to test locally:

### 1. Database Tests
```bash
# Start Supabase local
supabase start

# Run migrations
supabase db reset

# Run RLS tests
DB_URL=$(supabase status -o env | grep DATABASE_URL | cut -d '=' -f2-)
psql "$DB_URL" -f tests/rls/demo-policies.test.sql

# Expected: All tests pass
```

### 2. Type Checking
```bash
# Check TypeScript
npm run type-check

# Expected: No errors
```

### 3. Linting
```bash
# Run ESLint
npm run lint

# Expected: No errors (or minor warnings)
```

### 4. Build Test
```bash
# Try to build
npm run build

# Expected: Successful build
```

---

## 📝 Verification Report Template

After completing checks, provide a report:

```markdown
# Sprint 1 Verification Report

## ✅ PASSED
- [List what passed verification]

## ⚠️ WARNINGS
- [List non-critical issues]

## ❌ FAILED
- [List critical issues that must be fixed]

## 💡 SUGGESTIONS
- [List improvements for Sprint 2]

## 🎯 OVERALL ASSESSMENT
- [ ] Ready for Sprint 2
- [ ] Needs fixes before proceeding
- [ ] Needs major revision

## 📊 STATS
- Files verified: ____ / 21
- Code quality: ____ / 10
- Security score: ____ / 10
- Test coverage: ____ %

## 🚀 NEXT STEPS
1. [What to do next]
```

---

## 🎓 Context Documents

Reference if needed:

1. **docs/demo_current_state.md** - What existed before
2. **docs/demo_technical_spec.md** - Complete architecture
3. **docs/MASTERPROMPT_DEMO_IMPLEMENTATION.md** - Implementation guide
4. **docs/demo_decisions_needed.md** - Decisions (all completed)

---

## 💬 Questions for Code Author

If you find issues, here are suggested questions:

1. Why was X approach chosen over Y?
2. How is Z scenario handled?
3. Is there a reason for hardcoding A?
4. Should B be configurable via environment?
5. What happens if C condition occurs?

---

**Start verification now. Work through each section systematically. Report findings in the template format.**

**Good luck! 🚀**
