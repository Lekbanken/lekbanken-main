# Block 3 Execution Brief — Artifacts API Sanitering

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-10
- Last updated: 2026-03-21
- Last validated: -

> Archived Block 3 execution brief for artifacts API sanitization. Keep as implementation history, not as a current action brief.

**Scope:** Block 3 only — F8 (Artifacts API returns all variants regardless of visibility)  
**Goal:** Preview/library API returns only public variants; non-public variants never reach the browser  
**Status vid arkivering:** Ready for implementation

---

## 0. In-Scope Finding

**F8: Artifacts API returnerar alla varianter oavsett visibility**

| Property | Value |
|----------|-------|
| Finding ID | F8 |
| File | `app/api/games/[gameId]/artifacts/route.ts` |
| Severity | Medium — non-public variant content (leader_only, role_private) exposed to all authenticated users |
| Evidence | Route calls `getGameArtifacts()` → `mapArtifacts()` with no visibility filtering. `mapArtifacts()` at `lib/game-display/mappers.ts:670–698` maps ALL variants including `leader_only` and `role_private`. |
| Verified | 2026-03-10 — code inspection confirms no `.filter()` on visibility anywhere in the chain |

---

## 1. Exact Data Flow (Verified)

```
Library game detail page (page.tsx)
│   ↓  (NO artifacts in RSC payload — they are lazy-loaded)
│
GameDetailArtifacts component (client)
│   ↓  fetch(`/api/games/${game.id}/artifacts`)
│
GET /api/games/[gameId]/artifacts/route.ts
│   ├── requireGameAuth() + canViewGame() (access control ✅)
│   ├── getGameArtifacts(gameId)
│   │     └── Supabase RLS: game_artifacts.* + variants:game_artifact_variants(*)
│   │         ⚠️ RLS allows SELECT for "published games OR tenant member"
│   │         ⚠️ NO WHERE clause on variants.visibility
│   │
│   ├── Explicit field extraction (lines 41–55)
│   │     ⚠️ Extracts: visibility, visible_to_role_id, variant_order, media_ref
│   │     ⚠️ All visibility values passed through — no filtering
│   │
│   └── mapArtifacts() (lib/game-display/mappers.ts:670–698)
│         ⚠️ Maps ALL variants — no visibility filter
│         Output: GameArtifact[] with GameArtifactVariant[] including leader_only/role_private
│
Browser receives full variant list including non-public content
```

### What data leaks today

For a game with artifacts like:
- Keypad artifact: variant with `visibility: 'leader_only'` (contains answer code in body)
- Role secret: variant with `visibility: 'role_private'` (contains secret instructions)
- Public card: variant with `visibility: 'public'`

All three variants are returned in the JSON response. Any authenticated user who opens DevTools → Network → `/api/games/[id]/artifacts` sees the full body/content of leader_only and role_private variants.

### Parallel data flows NOT affected by this fix

| Consumer | How it gets artifacts | Visibility filtering | Impact of Block 3 |
|----------|----------------------|---------------------|-------------------|
| **Director Preview** (page.tsx) | `getGameByIdFull()` → `mapDbGameToDetailFull()` → passes `artifacts` prop to client → `mapGameArtifactsToCockpit()` | No filtering (intentional — host sees all) | **NONE** — different data path, doesn't use artifacts API route |
| **Play Session** (/api/play/sessions/[id]/artifacts) | Separate route with full visibility + role + reveal-state filtering | Yes — exemplary filtering with `sanitizeMetadataForParticipant()` | **NONE** — completely independent route |
| **Board** (/api/play/board/[code]) | Separate route, only revealed public artifacts | Yes | **NONE** |
| **Sandbox** (app/sandbox/artifacts/) | Uses own mock registry (`SandboxArtifactScenarioId`), no API call | N/A | **NONE** |
| **Builder/Admin** (ArtifactEditor/ArtifactWizard) | Direct Supabase writes, not reads through this route | N/A | **NONE** |

---

## 2. Edge-Case Analysis

### Edge case 1: Artifact with zero public variants after filtering

**Scenario:** A game has a "Leader Secret" artifact with 2 variants, both `leader_only`. After filtering, `variants: []`.

**Question:** Should the API return:
- **(A)** Artifact with `variants: []` — component shows artifact title/description but no variants
- **(B)** Filter out the whole artifact — component never sees it

**Analysis of component behavior (GameDetailArtifacts.tsx):**

```tsx
// Line 56: Returns null only if ALL artifacts === 0
if (hasFetched.current && !loading && artifacts.length === 0 && !error) return null;

// Lines 186–203: Variant rendering — guarded by length check
{artifact.variants && artifact.variants.length > 0 && (
  <div className="mt-3 pt-3 border-t border-border/40">
    ...
  </div>
)}
```

- If Option A: Artifact card renders with title, description, type badge, and tags — but no variants section. This is **safe and correct** behavior.
- If Option B: Artifact disappears entirely — potentially confusing if the game design mentions it by name.

**Recommendation: Option A (return artifact with `variants: []`)**

Reasoning:
1. The artifact's existence + title + description are public metadata (game_artifacts table has no visibility column — only variants do)
2. Component already handles `variants: []` correctly (no crash, clean render)
3. Hiding the artifact entirely would leak information about hidden variants ("artifact exists but you can't see it" vs "artifact doesn't exist")
4. Aligns with how the game builder works: artifact_type = 'keypad' communicates game design intent even without revealing variant content

### Edge case 2: Artifact with mixed visibility variants

**Scenario:** Artifact has 3 variants: 1 public, 1 leader_only, 1 role_private.

**Expected:** After filtering, artifact has `variants: [publicVariant]` with length 1. Component renders the single public variant. ✅ Standard case.

### Edge case 3: Artifact with no variants at all (variants undefined/null)

**Current behavior:** `mapArtifacts` already handles this — variant mapping uses optional chaining (`a.variants?.sort()`). Returns `undefined` for variants. Component guards with `artifact.variants && artifact.variants.length > 0`. ✅ Already safe.

### Edge case 4: metadata field containing secrets

**Question:** Does `artifact.metadata` contain sensitive data like `correctCode`?

**Analysis:** 
- The `game_artifacts.metadata` JSONB can contain `correctCode` for keypad artifacts
- The Play session route has explicit `sanitizeMetadataForParticipant()` that strips `correctCode`
- The GameDetails route currently passes `metadata` through without sanitization

**Decision:** This is a **separate concern** from variant visibility filtering. The `metadata` field on the parent artifact (not variant) may contain secrets. However:
1. The route's explicit extraction (lines 41–55) already only extracts variant fields, NOT `metadata` from parent artifact
2. Wait — let me verify...

**VERIFIED (route.ts lines 40–55):** The route extracts from each artifact: `id, title, description, artifact_type, artifact_order, tags, metadata`. It DOES pass `metadata` through. However, `mapArtifacts()` at mappers.ts:682 also passes `metadata` through to the client.

**Assessment:** Metadata sanitization (stripping `correctCode`) is a **separate finding** from F8. F8 is about variant visibility. Including metadata sanitization in Block 3 would expand scope. However, it's worth noting as a **stop condition** if `correctCode` is found in game_artifacts.metadata rather than only in variant-level metadata.

**Pragmatic note:** In the current ArtifactWizard templates, `correctCode` is stored in `artifact.metadata.correctCode` (parent level), NOT in variant metadata. The GameDetails route passes `metadata` through to the browser unfiltered. This means **any authenticated user can read the keypad answer code** via DevTools → Network. The Play session route handles this correctly with `sanitizeMetadataForParticipant()` (whitelist approach, lines 56–95 in Play artifacts route), but the GameDetails route has no equivalent.

**Recommendation: Include metadata sanitization in Block 3 scope (as step 2b).** The fix is 3 lines — strip `correctCode` from metadata in the same route. This is not scope creep; it's the same API boundary, same security concern (data that should not reach the browser in preview context), and the cost of doing it separately is higher than doing it now.

### Edge case 5: `visibility` column has unexpected value

**Current behavior:** `mapArtifacts()` already handles this with explicit equality check:
```typescript
visibility:
  v.visibility === 'public' ||
  v.visibility === 'leader_only' ||
  v.visibility === 'role_private'
    ? v.visibility
    : undefined,
```
If an unexpected value appears, visibility maps to `undefined`. The filter should treat `undefined` as non-public. ✅ Safe after fix.

---

## 3. Minimal Safe Implementation Order

### Step 1: Verify GameDetailArtifacts behavior with empty/filtered variants

**What:** Read and confirm `GameDetailArtifacts.tsx` handles:
- Artifact with `variants: []` → renders artifact card without variants section
- Artifact with `variants: undefined` → same behavior

**Status:** ✅ VERIFIED (see edge-case analysis above, lines 186–203)

### Step 2: Add variant visibility filter in route handler

**File:** `app/api/games/[gameId]/artifacts/route.ts`

**Change location:** After `getGameArtifacts(gameId)` call (line 36), BEFORE the explicit field extraction (line 40).

**Exact change:**

```diff
    const dbArtifacts = await getGameArtifacts(gameId)

+   // SECURITY: Filter to public-only variants for library/preview context
+   const publicArtifacts = dbArtifacts.map((a) => ({
+     ...a,
+     variants: a.variants?.filter((v) => v.visibility === 'public'),
+   }))
+
    // Map to canonical GameArtifact format
    const artifacts = mapArtifacts(
-     dbArtifacts.map((a) => ({
+     publicArtifacts.map((a) => ({
```

### Step 2b: Strip `correctCode` from artifact metadata

**Same file:** `app/api/games/[gameId]/artifacts/route.ts`

**Integrate into the same filtering step:**

```diff
+   // SECURITY: Filter variants + strip metadata secrets for library/preview context
+   const publicArtifacts = dbArtifacts.map((a) => {
+     const { correctCode, ...safeMetadata } = (a.metadata as Record<string, unknown>) ?? {};
+     return {
+       ...a,
+       metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : null,
+       variants: a.variants?.filter((v) => v.visibility === 'public'),
+     };
+   })
```

**Why this is safe to include:**
1. Same API boundary — same route, same fix
2. `correctCode` is explicitly documented as "HOST ONLY — NEVER shown to participants" (see `docs/admin/GAME_PROMPTING_GUIDE.md:169`)
3. The Play session route already strips it with `sanitizeMetadataForParticipant()`
4. `GameDetailArtifacts` component does NOT render `metadata` — only uses `metadata.spatial_artifact_id` for spatial map type, which is a safe public field
5. Cost: 1 additional line of destructuring

**Why filter before extraction, not in mapArtifacts():**
1. `mapArtifacts()` is a shared mapper — Director Preview page.tsx calls `mapDbGameToDetailFull()` which calls `mapArtifacts()` indirectly. Filtering inside the mapper would break Director Preview.
2. The route is the API boundary — filtering at the boundary is the safest pattern (matches Block 1 approach: strip in route/page, not in mapper)
3. The Play session route already has its own visibility filtering — no shared code needed

**What does NOT change:**
- `mapArtifacts()` at `lib/game-display/mappers.ts` — unchanged (shared mapper)
- `getGameArtifacts()` at `lib/services/games.server.ts` — unchanged (shared query)
- `GameDetailArtifacts.tsx` — unchanged (already handles filtered data)
- Director Preview data path — unchanged (uses `getGameByIdFull()`, not this route)
- Play session artifacts route — unchanged (has own filtering)
- Board route — unchanged (has own filtering)

### Step 3: Write contract test

**File:** `tests/unit/game-details/artifacts-contract.test.ts` (new)

**Tests to write:**

```typescript
describe('Artifacts API contract (F8)', () => {
  test('mapArtifacts with pre-filtered variants returns only public', () => {
    // Simulate what the route does: filter then map
    const dbArtifacts = [{
      id: 'a1', title: 'Test', artifact_order: 1,
      variants: [
        { id: 'v1', title: 'Public', visibility: 'public', variant_order: 1 },
        { id: 'v2', title: 'Leader', visibility: 'leader_only', variant_order: 2 },
        { id: 'v3', title: 'Role', visibility: 'role_private', variant_order: 3 },
      ],
    }];
    const filtered = dbArtifacts.map(a => ({
      ...a,
      variants: a.variants.filter(v => v.visibility === 'public'),
    }));
    const result = mapArtifacts(filtered);
    expect(result[0].variants).toHaveLength(1);
    expect(result[0].variants![0].visibility).toBe('public');
  });

  test('artifact with zero public variants returns empty variants array', () => {
    const dbArtifacts = [{
      id: 'a1', title: 'Secret', artifact_order: 1,
      variants: [
        { id: 'v1', title: 'Leader Only', visibility: 'leader_only', variant_order: 1 },
      ],
    }];
    const filtered = dbArtifacts.map(a => ({
      ...a,
      variants: a.variants.filter(v => v.visibility === 'public'),
    }));
    const result = mapArtifacts(filtered);
    expect(result).toHaveLength(1); // Artifact still returned
    expect(result[0].title).toBe('Secret');
    expect(result[0].variants).toHaveLength(0); // But no variants
  });

  test('artifact with no variants at all survives filtering', () => {
    const dbArtifacts = [{
      id: 'a1', title: 'NoVariants', artifact_order: 1,
    }];
    const filtered = dbArtifacts.map(a => ({
      ...a,
      variants: a.variants?.filter(v => v.visibility === 'public'),
    }));
    const result = mapArtifacts(filtered);
    expect(result).toHaveLength(1);
    expect(result[0].variants).toBeUndefined();
  });
});
```

### Step 4: Verify TypeScript and test suite

```bash
npx tsc --noEmit          # Must pass with 0 errors
npx vitest run            # Must pass with 0 failures
```

---

## 4. Acceptance Checks

### What disappears from API JSON

| Field | Before | After |
|-------|--------|-------|
| Variants with `visibility: 'leader_only'` | ✅ Present in response | ❌ Filtered out |
| Variants with `visibility: 'role_private'` | ✅ Present in response | ❌ Filtered out |
| Variant `body` for non-public variants | ✅ Exposed (e.g. keypad answer, role secret text) | ❌ Not reachable |
| Variant `visibleToRoleId` for role_private | ✅ Exposed | ❌ Not reachable |
| `metadata.correctCode` (keypad answer) | ✅ Exposed to all users | ❌ Stripped (F8b) |

### What remains visible

| Field | Status |
|-------|--------|
| Artifact `id`, `title`, `description`, `type`, `tags` | ✅ Unchanged — these are public game metadata |
| Artifact `metadata` | ✅ Returned — but with `correctCode` stripped (F8b) |
| Variants with `visibility: 'public'` | ✅ Unchanged |
| Public variant `title`, `body`, `mediaRef` | ✅ Unchanged |

### UI behavior that must remain intact

- [ ] `GameDetailArtifacts` renders artifact cards for all artifacts (even those with 0 public variants)
- [ ] Artifact type badges (card, token, prop, etc.) display correctly
- [ ] `spatial_map` artifacts with `SpatialMapArtifactRenderer` still render
- [ ] Variant count `(N)` reflects only public variants
- [ ] Empty variant list does not crash or show empty variant section
- [ ] Sandbox artifact viewer is unaffected (uses mock data, not API)
- [ ] Director Preview shows full data (uses different data path)

### Zero-public-variant behavior

- API returns the artifact with `variants: []`
- Component renders artifact card with title, description, tags, type badge
- Variant section (`{variantsLabel} (N)`) does NOT render (guarded by `artifact.variants.length > 0`)
- No crash, no error state

---

## 5. Regression Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Empty variant arrays cause crash in `GameDetailArtifacts` | **Very low** — code already guards with `artifact.variants && artifact.variants.length > 0` | Verified by code inspection + new test |
| Director Preview loses variant data | **None** — uses `getGameByIdFull()` → `mapDbGameToDetailFull()`, completely separate path | Documented, no code sharing with artifacts route |
| Play session artifacts affected | **None** — separate route with own filtering | Independent path |
| `mapArtifacts()` behaves differently | **None** — mapper is unchanged; filtering happens in route before mapper | Shared mapper untouched |
| Existing `mapArtifacts` null-safety tests break | **None** — tests use minimal mock data without visibility field; filter is applied in route, not mapper | Existing tests unaffected |
| `GameDetailArtifacts` shows wrong variant count | **None** — count comes from `artifact.variants.length` which will reflect filtered list | Natural behavior |
| Spatial map artifacts stop working | **Very low** — spatial map data is in `artifact.metadata.spatial_artifact_id`, not in variants | Verify manually |

### Tests that may need updates

| Test file | Current state | Needs update? |
|-----------|--------------|---------------|
| `tests/game-display/null-safety.test.ts` (mapArtifacts) | Tests undefined/empty input | **No** — mapper unchanged |
| `tests/game-display/mappers.test.ts` (mapArtifacts) | Tests basic mapping | **No** — mapper unchanged |
| `tests/game-display/config.test.ts` | Tests config visibility flags | **No** — `artifacts: true/false` is display flag, not variant filtering |

---

## 6. Stop Conditions

These discoveries should **pause Block 3** for re-evaluation:

1. ~~**`correctCode` in `game_artifacts.metadata`**~~ — **VERIFIED and INCLUDED in scope.** Keypad `correctCode` is stored in parent artifact metadata and exposed via the route. Included as step 2b (metadata strip). No longer a stop condition.

2. **Admin route shares this route handler** — If an admin/builder view fetches artifacts through the same `/api/games/[gameId]/artifacts` route and needs to see all variants, filtering here would break admin. Would need context-aware filtering or separate admin route. **Currently assessed as unlikely** — builder uses direct Supabase writes, not this read route.

3. **Other consumers of `getGameArtifacts()`** — If another caller (beyond this route) uses `getGameArtifacts()` and expects all variants, filtering at the service level would have been wrong. **Decision to filter in route (not service) eliminates this risk.**

4. **Variant `media_ref` points to access-controlled storage** — If non-public variant media files are stored in access-controlled buckets, the `mediaRef` URL alone (even without body) could be a leak vector. Currently assessed as low risk since we're removing the entire variant object.

---

## 7. Follow-Up Issues Identified During Research

| Issue | Severity | Recommendation |
|-------|----------|---------------|
| ~~**F8b: `metadata.correctCode` exposed**~~ | ~~High~~ | **INCLUDED in Block 3 scope** — step 2b strips `correctCode` from metadata in same route fix. Verified: Play session route already strips it via `sanitizeMetadataForParticipant()`. |
| **Director Preview passes all artifact data via RSC** | Low (by design) | Director Preview intentionally uses `mapDbGameToDetailFull()`. Host/admin access controls protect the route. Document as accepted risk. |
| **`mapGameArtifactsToCockpit()` discards variant data** | None | Maps only artifact-level fields (`title`, `description`, `type`). Variants are not mapped to Cockpit types at all. No impact. |

---

## 8. Summary

**Block 3 is a surgical, low-risk fix:**

- **1 file changed:** `app/api/games/[gameId]/artifacts/route.ts` (add `.filter()` before mapping)
- **1 file created:** `tests/unit/game-details/artifacts-contract.test.ts` (3 contract tests)
- **0 shared code modified:** mapper and service function unchanged
- **0 other consumers affected:** Director Preview, Play session, Board, Sandbox all use independent paths
- **Edge cases analyzed:** empty variants ✅, mixed visibility ✅, no variants ✅, unexpected visibility values ✅

**Estimated effort:** ~0.5–1 SP

**New finding tracked:** F8b (metadata.correctCode exposure) — included in Block 3 scope as step 2b. Verified against Play session route's `sanitizeMetadataForParticipant()` whitelist pattern.
