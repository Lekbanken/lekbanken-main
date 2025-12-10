# DECISION CRITERIA – Architecture & Refactoring Guidelines

**Purpose:** Define clear decision-making criteria for all architectural and code changes during validation and refactoring phases.

**Principle:** When in doubt, **prefer consistency over perfection** and **user approval over autonomous changes**.

---

## 1. When to Refactor vs Rebuild

### Refactor (Improve Existing)

**Criteria:**
- ✅ Code is working
- ✅ Test coverage exists
- ✅ Only minor improvements needed
- ✅ Users depend on current behavior
- ✅ Risk of breaking is low

**Examples:**
- Replace `any` with proper types
- Add JSDoc comments
- Extract duplicate code to utility
- Improve variable names
- Add error handling

**Estimated Effort:** < 4 hours per component

**Decision:** REFACTOR

---

### Rebuild (Start Fresh)

**Criteria:**
- ❌ Code is fundamentally broken
- ❌ No tests, unclear behavior
- ❌ Uses deprecated patterns (pre-Catalyst, old auth)
- ❌ Security issues
- ❌ Blocking other work

**Examples:**
- Custom UI components (replace with Catalyst)
- Old authentication system (replace with Supabase)
- Legacy state management (replace with modern patterns)
- Deprecated API routes

**Estimated Effort:** > 8 hours per component

**Decision:** REBUILD

---

### Decision Matrix

| Factor | Refactor | Rebuild |
|--------|----------|---------|
| Working correctly | ✅ Yes | ❌ No |
| Security issues | ❌ No | ✅ Yes |
| Test coverage | ✅ >50% | ❌ <50% |
| Used by multiple features | ✅ Yes | ⚠️ Consider impact |
| Follows current patterns | ✅ Yes | ❌ No (legacy) |
| Estimated effort | ✅ <4h | ❌ >8h |
| **Decision** | **REFACTOR** | **REBUILD** |

---

## 2. When to Delete vs Archive

### Delete Immediately

**Criteria:**
- ❌ 0 usage count (verified with `list_code_usages`)
- ❌ No tests reference it
- ❌ Clearly obsolete (comments like "TODO: remove")
- ❌ No dependencies

**Examples:**
```typescript
// OldButton.tsx - UNUSED
// grep_search: 0 results
// list_code_usages: 0
// Decision: DELETE
```

**Process:**
1. Verify 0 usage
2. Check Git history (when last modified?)
3. If >6 months old + 0 usage → DELETE
4. If recent (< 3 months) → ARCHIVE first

---

### Archive (Move to `archive/` folder)

**Criteria:**
- ⚠️ Low usage (1-2 uses)
- ⚠️ Unclear purpose
- ⚠️ Might be needed for reference

**Process:**
```bash
# Move to archive
mkdir -p archive/components/
mv components/MysteryWidget.tsx archive/components/

# Add note
echo "Archived: 2025-12-10. Was used in X. Might need for reference." > archive/components/MysteryWidget.tsx.README.md
```

**Review Period:** 2 weeks. If not needed, DELETE.

---

### Keep

**Criteria:**
- ✅ Active usage (3+ uses)
- ✅ Part of core functionality
- ✅ Well-documented

**Decision:** KEEP

---

## 3. When to Consult User

### Autonomous (Proceed Without Approval)

**Safe Changes:**
- ✅ Documentation updates
- ✅ Code formatting (Prettier)
- ✅ Adding type annotations
- ✅ Fixing typos
- ✅ Adding comments
- ✅ Refactoring internal implementation (no API change)
- ✅ Deleting verified unused code (0 usage)

**Rationale:** No risk to functionality, easy to revert.

---

### Require Approval (Ask First)

**Risky Changes:**
- ⚠️ Changing API contracts (request/response shapes)
- ⚠️ Modifying database schema
- ⚠️ Deleting code with 1+ usage
- ⚠️ Changing RLS policies
- ⚠️ Replacing components with different UX
- ⚠️ Changing authentication flow
- ⚠️ Removing features
- ⚠️ Breaking changes

**Process:**
1. Create validation report
2. Highlight risky changes
3. Present to user
4. Wait for approval
5. Proceed only after ✅

**Example:**
```markdown
## Risky Change: Replace LoginForm

**Current:** Custom form with email/password
**Proposed:** Catalyst form with email/password + social auth

**Impact:** UI will look different, users might be confused
**Risk:** Medium (UX change)

**Recommendation:** Requires your approval
```

---

### Decision Matrix

| Change Type | Risk Level | Approval Needed | Can Revert Easily |
|-------------|------------|-----------------|-------------------|
| Documentation | None | ❌ No | ✅ Yes (Git) |
| Type annotations | Low | ❌ No | ✅ Yes |
| Refactor (same API) | Low | ❌ No | ✅ Yes |
| Delete unused code | Low | ❌ No | ✅ Yes (Git) |
| API contract change | High | ✅ YES | ⚠️ Maybe |
| Database migration | High | ✅ YES | ⚠️ Difficult |
| RLS policy change | High | ✅ YES | ⚠️ Risky |
| UI/UX change | Medium | ✅ YES | ✅ Yes |
| Remove feature | High | ✅ YES | ⚠️ Difficult |

---

## 4. Component Replacement Strategy

### Replace with Catalyst UI Kit

**When:**
- Component is UI-only (Button, Input, Card, etc.)
- Catalyst has equivalent
- No custom business logic

**Process:**
1. Identify all usages (`list_code_usages`)
2. Check Catalyst equivalent exists
3. Create migration plan:
   ```typescript
   // Before
   <Button variant="primary">Click</Button>
   
   // After
   <CatalystButton color="blue">Click</CatalystButton>
   ```
4. Replace one-by-one
5. Test each replacement
6. Delete old component when all replaced

**Decision:** REPLACE

---

### Keep Custom Component

**When:**
- No Catalyst equivalent
- Contains domain-specific logic
- Complex composition of multiple Catalyst components

**Examples:**
- `GameCard` (uses Catalyst Card + Badge + Button + custom logic)
- `ParticipantList` (complex list with drag-drop)
- `RoleCard` (domain-specific to Participants)

**Decision:** KEEP (but use Catalyst primitives internally)

---

## 5. API Endpoint Decisions

### Modernize Endpoint

**When:**
- Uses old patterns (non-standard responses)
- Missing type safety
- No error handling
- Performance issues

**Process:**
1. Document current behavior
2. Create new typed endpoint
3. Migrate frontend to new endpoint
4. Deprecate old endpoint (add warning)
5. Remove after migration complete

**Example:**
```typescript
// Old: app/api/old-games/route.ts
// Returns: any

// New: app/api/games/route.ts
// Returns: TypedResponse<Game[]>

// Migration period: 2 weeks
```

**Decision:** MODERNIZE

---

### Keep Endpoint

**When:**
- Follows current patterns
- Type-safe
- Good performance
- Well-tested

**Decision:** KEEP

---

### Delete Endpoint

**When:**
- 0 usage (frontend doesn't call it)
- Functionality moved elsewhere
- Security risk

**Process:**
1. Verify 0 usage (grep_search in frontend)
2. Check if third-parties use it (webhooks, etc.)
3. If internal + 0 usage → DELETE
4. If external → DEPRECATE first, then delete

---

## 6. Database Schema Changes

### Safe Changes (Additive)

**Allowed without approval:**
- ✅ Adding new nullable columns
- ✅ Adding new tables
- ✅ Adding indexes
- ✅ Adding RLS policies (more restrictive)

**Example:**
```sql
-- Safe: Adding optional column
ALTER TABLE games 
  ADD COLUMN IF NOT EXISTS difficulty_level int;
```

**Decision:** PROCEED

---

### Risky Changes (Breaking)

**Require approval:**
- ⚠️ Dropping columns
- ⚠️ Changing column types
- ⚠️ Removing tables
- ⚠️ Changing RLS policies (less restrictive)

**Process:**
1. Document current schema
2. Explain why change is needed
3. Show migration plan
4. Get approval
5. Test on staging
6. Deploy to production

**Example:**
```sql
-- Risky: Changing type
ALTER TABLE games 
  ALTER COLUMN status TYPE varchar(50); -- Was text

-- Requires:
-- 1. User approval
-- 2. Data migration plan
-- 3. Staging test
```

**Decision:** REQUIRE APPROVAL

---

## 7. Performance Optimization

### Optimize Now

**Criteria:**
- ❌ Query > 1 second
- ❌ N+1 queries detected
- ❌ Missing obvious index
- ❌ Loading full table (need pagination)

**Examples:**
```typescript
// BAD: N+1 query
for (const game of games) {
  const steps = await fetchSteps(game.id); // N queries!
}

// GOOD: Single query with join
const gamesWithSteps = await fetchGamesWithSteps();
```

**Decision:** FIX IMMEDIATELY

---

### Defer Optimization

**Criteria:**
- ✅ Query < 200ms
- ✅ No obvious bottleneck
- ✅ Premature optimization

**Decision:** DEFER (document for future)

---

### Decision Matrix

| Query Time | Action | Priority |
|------------|--------|----------|
| < 100ms | ✅ OK, no action | - |
| 100-500ms | ⚠️ Monitor | P2 |
| 500ms-1s | ⚠️ Optimize | P1 |
| > 1s | ❌ Fix now | P0 |

---

## 8. Testing Strategy

### Write Tests

**When:**
- New features
- Bug fixes (regression test)
- Refactored code (ensure behavior unchanged)
- API endpoints (contract testing)
- RLS policies (security testing)

**Decision:** WRITE TESTS

---

### Skip Tests (Temporarily)

**When:**
- Prototype/spike
- Documentation-only change
- Will be deleted soon

**Decision:** SKIP (but document as tech debt)

---

### Test Coverage Targets

| Code Type | Target Coverage | Priority |
|-----------|----------------|----------|
| API routes | 80% | P0 |
| RLS policies | 100% | P0 |
| Business logic | 70% | P1 |
| UI components | 50% | P2 |
| Utilities | 80% | P1 |

---

## 9. Documentation Standards

### Document Now

**When:**
- Public API (used by other domains)
- Complex business logic
- Non-obvious behavior
- Security-critical code

**Format:**
```typescript
/**
 * Generates unique session code for participant sessions.
 * 
 * Uses charset without confusing characters (no 0O, 1IL, etc.)
 * 
 * @returns 6-character code (e.g., "H3K9QF")
 * @throws Error if cannot generate unique code after 100 attempts
 * 
 * @example
 * const code = generateSessionCode();
 * // => "A4D7PR"
 */
function generateSessionCode(): string {
  // ...
}
```

**Decision:** ADD DOCS

---

### Defer Documentation

**When:**
- Internal helper (not exported)
- Self-explanatory (e.g., `formatDate`)
- Temporary code

**Decision:** DEFER

---

## 10. Breaking Changes Policy

### Allowed Breaking Changes

**Only with user approval:**
- API contract changes (request/response)
- Database schema changes (drop columns)
- RLS policy changes (less permissive)
- UI/UX changes (different user experience)

**Process:**
1. Document current behavior
2. Explain why breaking change needed
3. Show migration path
4. Get approval
5. Implement with feature flag (if possible)
6. Gradual rollout

---

### Forbidden Breaking Changes

**Never:**
- Remove features without deprecation period
- Break existing integrations (webhooks, APIs)
- Delete user data without backup

**Decision:** DO NOT PROCEED

---

## 11. Code Quality Standards

### Minimum Standards (Must Meet)

- ✅ TypeScript (no `any` without @ts-ignore comment)
- ✅ ESLint passes
- ✅ Prettier formatted
- ✅ No console.log in production
- ✅ Error handling (try/catch or error boundaries)
- ✅ RLS policies on all tables

**If code doesn't meet:** REFACTOR before merging

---

### Nice-to-Have (P2)

- JSDoc comments
- Unit tests
- Performance optimizations
- Accessibility features

**If missing:** Document as tech debt, proceed

---

## 12. Urgency Matrix

### P0 (Critical – Fix Immediately)

- Security vulnerabilities
- Data loss risk
- Production down
- Blocking other work
- RLS missing on tables

**Timeline:** Fix within 24 hours

---

### P1 (Important – Fix Soon)

- Performance issues (>1s queries)
- Missing features (documented but not implemented)
- Legacy code (high usage)
- Type safety issues
- Missing tests on critical paths

**Timeline:** Fix within 1 week

---

### P2 (Nice-to-Have – Future)

- Documentation improvements
- Code cleanup (low usage legacy)
- Minor optimizations
- Nice-to-have features

**Timeline:** Backlog

---

## 13. Summary Decision Tree

```
┌─────────────────────────────────────┐
│ Code Change Needed?                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Is it working correctly?             │
├──────────────┬───────────────────────┤
│ YES          │ NO                    │
▼              ▼                       
Refactor       Rebuild                 
               │
               ▼
┌──────────────────────────────────────┐
│ Is it safe (no breaking changes)?   │
├──────────────┬───────────────────────┤
│ YES          │ NO                    │
▼              ▼                       
Proceed        Get Approval            
               │
               ▼
┌──────────────────────────────────────┐
│ Approved?                            │
├──────────────┬───────────────────────┤
│ YES          │ NO                    │
▼              ▼                       
Implement      Document & Defer        
```

---

## 14. Escalation Path

### Level 1: AI Decision (Autonomous)

- Documentation
- Code formatting
- Type annotations
- Delete verified unused code

**Action:** Proceed, document in commit message

---

### Level 2: Report to User (Approval Needed)

- API changes
- Database migrations
- UI/UX changes
- Feature removal

**Action:** Create report, wait for approval

---

### Level 3: User Decision Required

- Architecture changes
- Security policy changes
- Breaking changes
- Large refactoring (>2 days)

**Action:** Present options, user decides

---

**Document Owner:** Architecture Team  
**Last Updated:** 2025-12-10  
**Next Review:** After Phase 1 completion
