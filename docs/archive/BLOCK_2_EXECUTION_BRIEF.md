# Block 2 Execution Brief

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-10
- Last updated: 2026-03-21
- Last validated: -

> Archived Block 2 execution brief kept as planning history after the workstream moved on. Do not treat it as an active implementation brief.

**Förutsättning:** Block 1 ✅ KLAR (2026-03-10) — manuell verifiering pågår  
**Syfte:** Pre-execution review för Block 2 — Kontextutvidgning  
**Status vid arkivering:** BRIEF — ej exekverad

---

## 0. Critical Architectural Correction

**The implementation plan (Block 2.1) contains a misconception about Director Preview that must be corrected before execution.**

### What the plan says

> Director Preview uses `mode="preview"` trots att den borde ha egen mode (F11). Config-expansionen möjliggör korrekt visibility.

Block 2.1 lists Director Preview's `director-preview-client.tsx` as a file to change from `mode="preview"` → `mode="facilitator"`.

### What the code actually shows

**Director Preview does NOT use `GameDetailMode` at all.**

The `mode="preview"` at `director-preview-client.tsx:57` refers to `DirectorModeDrawer`'s own discriminated union type:

```typescript
// features/play/components/DirectorModeDrawer.tsx
export type DirectorModeDrawerProps =
  | DirectorModeDrawerSessionProps  // mode: 'session' — live with callbacks
  | DirectorModeDrawerPreviewProps  // mode: 'preview' — offline, no side-effects
```

This is a **Play domain type** (`'session' | 'preview'`), completely separate from `GameDetailMode` (`'preview' | 'admin' | 'host'`).

**Evidence:**
- Director Preview imports: `DirectorModeDrawer` from `@/features/play/components/`
- Director Preview does NOT import: `GameDetailMode`, `getSectionConfig`, `SECTION_VISIBILITY`, `GameDetailProvider`, or any `GameDetail*` component
- Director Preview renders zero GameDetails section components — it uses Cockpit components from the Play domain
- Director Preview shows full data because it loads via `getGameByIdFull()` + `mapDbGameToDetailFull()` → mapped to Cockpit types. No section visibility config is involved.

### Impact on Block 2

| Planned change | Validity | Corrected action |
|---------------|----------|------------------|
| Add `'facilitator'` to `GameDetailMode` | ✅ Valid | Proceed as planned |
| Add `SECTION_VISIBILITY.facilitator` config | ✅ Valid | Proceed as planned |
| Change Director Preview `mode="preview"` → `mode="facilitator"` | ❌ **Wrong target** | No change needed — Director Preview is a separate system |
| Update sandbox with 4th mode | ✅ Valid | Proceed as planned |

**F11 is a naming/semantic mismatch in the Play domain, not a GameDetails domain issue.** Changing `DirectorModeDrawer`'s type union from `'session' | 'preview'` to something else (e.g., `'session' | 'offline'`) would be a Play domain refactor, not a GameDetails config change. This is out of scope for Block 2.

---

## 1. In-scope findings

| Finding | Description | What Block 2 addresses |
|---------|-------------|----------------------|
| ~~F11~~ | Director Preview uses wrong mode | **CORRECTED:** F11 is about DirectorModeDrawer naming, not GameDetailMode. Removing from Block 2 scope. |
| F15 | Config has only 3 modes — no facilitator concept | Add `'facilitator'` mode for future GameDetails pages that need facilitator-level visibility |
| (new) | Sandbox cannot test facilitator visibility | Add 4th mode toggle to sandbox |

### Revised Block 2 scope

With Director Preview removed, Block 2 reduces to:

1. **Expand `GameDetailMode` union** with `'facilitator'`
2. **Add `SECTION_VISIBILITY.facilitator` config** with appropriate visibility
3. **Update sandbox** with 4th mode toggle
4. **Update tests** to cover the new mode
5. *(Optional)* Add `getContextCapabilities()` helper

### Why still do Block 2?

Even without the Director Preview motivation, `facilitator` mode provides value:
- **Correctness:** If a future page needs to show GameDetails components with facilitator access (e.g., a "prepare for session" view), the mode must exist
- **Design completeness:** The capability matrix in `GAMEDETAILS_CONTEXT_ARCHITECTURE.md` already documents `facilitator` as a needed mode
- **Sandbox testing:** Enables testing that `leaderTips` renders correctly for facilitators vs hidden for preview

**Decision required:** Does Block 2 still make sense with reduced scope? If there's no immediate consumer for `facilitator` mode, it could be deferred until one exists (YAGNI). See Stop Condition S3.

---

## 2. Exact call sites

### Files that MUST change

| # | File | Line(s) | Current code | Required change |
|---|------|---------|-------------|-----------------|
| C1 | `components/game/GameDetails/config.ts` | 19 | `type GameDetailMode = 'preview' \| 'admin' \| 'host'` | Add `\| 'facilitator'` |
| C2 | `components/game/GameDetails/config.ts` | 58–152 | `SECTION_VISIBILITY: Record<GameDetailMode, SectionVisibility>` with 3 entries | Add `facilitator: { ... }` entry |
| C3 | `app/sandbox/app/game-detail/page.tsx` | 528 | `(['preview', 'admin', 'host'] as const)` | Add `'facilitator'` to tuple |
| C4 | `app/sandbox/app/game-detail/page.tsx` | 535 | Ternary label: `m === 'preview' ? ... : m === 'admin' ? ... : 'Host (Play)'` | Add facilitator label branch |

### Files that SHOULD change (tests)

| # | File | Line(s) | Current code | Required change |
|---|------|---------|-------------|-----------------|
| T1 | `tests/game-display/config.test.ts` | 32 | `const MODES: GameDetailMode[] = ['preview', 'admin', 'host']` | Add `'facilitator'` |
| T2 | `tests/unit/game-details/config-visibility.test.ts` | — | Tests for preview/admin/host leaderTips | Add facilitator leaderTips assertions |

### Files that do NOT change (verified)

| File | Why no change |
|------|--------------|
| `app/app/games/[gameId]/page.tsx` | Hardcodes `'preview'` — correct, library always uses preview |
| `app/app/games/[gameId]/director-preview/*` | Uses Play domain's DirectorModeDrawer, NOT GameDetailMode |
| `components/game/GameDetails/GameDetailContext.tsx` | Accepts generic `GameDetailMode` — already compatible |
| `components/game/GameDetails/*.tsx` (all section components) | Receive config via props, mode-agnostic |
| `getSectionConfig()` function body | Uses `SECTION_VISIBILITY[mode]` lookup — already generic |
| `features/play/components/DirectorModeDrawer.tsx` | Different type system entirely |

---

## 3. TypeScript blast radius map

Adding `'facilitator'` to the union triggers TypeScript errors at exactly **one location**:

```
components/game/GameDetails/config.ts:58
  → SECTION_VISIBILITY: Record<GameDetailMode, SectionVisibility>
  → Missing property 'facilitator' in type '{ preview: ...; admin: ...; host: ...; }'
```

**Why only one error?** The architecture is config-driven by design:
- `getSectionConfig()` uses `SECTION_VISIBILITY[mode]` — Record lookup, no switch/if chain
- Components receive config via props — mode-agnostic
- `GameDetailProvider` (unused, F10) accepts generic `GameDetailMode`
- No `switch(mode)` or `if (mode === 'preview')` conditionals exist anywhere in the GameDetails domain

**Runtime-only risks (typescript will NOT catch):**

| Location | Risk | Severity |
|---------|------|----------|
| Sandbox mode toggle (line 528) | Hardcoded `as const` tuple — `'facilitator'` won't appear | **Medium** — sandbox unusable for new mode |
| Sandbox label mapping (line 535) | Ternary chain — facilitator shows raw string or falls to else | **Low** — cosmetic |
| Test MODES constant (line 32) | Array literal — facilitator not tested | **Medium** — coverage gap |

---

## 4. Minimal safe implementation order

### Step 1: Type expansion + config entry

**File:** `components/game/GameDetails/config.ts`

```diff
- export type GameDetailMode = 'preview' | 'admin' | 'host';
+ export type GameDetailMode = 'preview' | 'admin' | 'host' | 'facilitator';
```

Then add config entry. **Key decision — what should facilitator see?**

| Section | preview | facilitator | Rationale |
|---------|---------|-------------|-----------|
| `leaderTips` | `false` | **`true`** | Primary differentiator — facilitators need tips |
| `adminActions` | `false` | **`false`** | Facilitators are not admins |
| All other sections | same as preview | **same as preview** | Facilitator sees everything preview sees, plus leader content |

```typescript
facilitator: {
  header: true, badges: true, about: true, steps: true, materials: true,
  safety: true, preparation: true, phases: true, gallery: true, roles: true,
  artifacts: true, triggers: true, quickFacts: true, sidebar: true,
  adminActions: false,
  accessibility: true, requirements: true, board: true, tools: true,
  leaderTips: true,  // ← The key difference from preview
  metadata: true, outcomes: true,
},
```

**Verify:** `npx tsc --noEmit` → should pass with 0 errors after this step.

### Step 2: Update tests

**File:** `tests/game-display/config.test.ts`

```diff
- const MODES: GameDetailMode[] = ['preview', 'admin', 'host'];
+ const MODES: GameDetailMode[] = ['preview', 'admin', 'host', 'facilitator'];
```

This automatically expands the existing test matrix from 3×3=9 to 4×3=12 combinations.

**File:** `tests/unit/game-details/config-visibility.test.ts`

Add:
```typescript
test('facilitator mode shows leaderTips across all playModes', () => {
  expect(getSectionConfig('facilitator', 'basic').leaderTips).toBe(true);
  expect(getSectionConfig('facilitator', 'facilitated').leaderTips).toBe(true);
  expect(getSectionConfig('facilitator', 'participants').leaderTips).toBe(true);
});

test('facilitator mode hides adminActions', () => {
  expect(getSectionConfig('facilitator', 'basic').adminActions).toBe(false);
});
```

**Verify:** `npx vitest run` → all tests pass.

### Step 3: Update sandbox

**File:** `app/sandbox/app/game-detail/page.tsx`

Line 528:
```diff
- {(['preview', 'admin', 'host'] as const).map((m) => (
+ {(['preview', 'admin', 'host', 'facilitator'] as const).map((m) => (
```

Line 535 (label mapping):
```diff
- {m === 'preview' ? 'Preview (Library)' : m === 'admin' ? 'Admin' : 'Host (Play)'}
+ {m === 'preview' ? 'Preview (Library)' : m === 'admin' ? 'Admin' : m === 'host' ? 'Host (Play)' : 'Facilitator'}
```

**Verify:** Visual inspection in sandbox — toggle to facilitator, confirm leaderTips visible.

### Step 4 (optional): Capability helpers

Only if explicitly requested. Skip by default (YAGNI).

---

## 5. Acceptance checks

### What should DIFFER between `preview` and `facilitator`

| Aspect | `preview` | `facilitator` | How to verify |
|--------|----------|---------------|--------------|
| `leaderTips` visibility | `false` | `true` | `getSectionConfig('facilitator', anyPlayMode).leaderTips === true` |
| Sandbox toggle label | "Preview (Library)" | "Facilitator" | Visual in sandbox |

### What must REMAIN IDENTICAL

| Aspect | Verification |
|--------|-------------|
| `adminActions` in facilitator = `false` (same as preview) | `getSectionConfig('facilitator', anyPlayMode).adminActions === false` |
| All other 20 section visibilities identical to preview | Test: facilitator config keys match preview except `leaderTips` |
| `playMode` filtering works identically for facilitator | Test: `getSectionConfig('facilitator', 'basic').roles === false` |
| Library page still uses `'preview'` | Code inspection — hardcoded string unchanged |
| Director Preview unchanged | Code inspection — no files touched |
| All existing tests pass | `npx vitest run` |

### What must NOT be broadened in scope

| Guard | Rationale |
|-------|-----------|
| No new sections added | Block 2 only adds a mode, not new visibility flags |
| No component changes | Components are mode-agnostic — they receive config via props |
| No mapper changes | `mapDbGameToDetailPreview` / `mapDbGameToDetailFull` unchanged |
| No API changes | Roles/artifacts/triggers routes unchanged |
| No Play domain changes | `DirectorModeDrawer` type is out of scope |
| No `GameDetailProvider` activation | F10 — unused provider stays unused |

---

## 6. Regression risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Unexpected `Record<GameDetailMode, ...>` elsewhere | **Very Low** — research found only `SECTION_VISIBILITY` | High | `npx tsc --noEmit` catches this |
| `switch(mode)` with missing facilitator case | **None** — no switch statements found in GameDetails domain | — | N/A |
| Sandbox shows undefined label for facilitator | **Certain** if label mapping not updated | Low (cosmetic) | Update ternary in Step 3 |
| Test MODES array not updated | **Certain** if not explicitly changed | Medium (coverage gap) | Update in Step 2 |
| Someone assumes facilitator = admin permissions | **Low** | Medium | `adminActions: false` + test assertion |
| Director Preview visual regression | **None** — no Director Preview files touched | — | Code inspection confirms 0 changes |
| Existing 1767 tests break | **Very Low** — additive change, no existing behavior modified | High | `npx vitest run` gate |

---

## 7. Stop conditions

| ID | Discovery | Action |
|----|-----------|--------|
| S1 | `npx tsc --noEmit` reveals >1 error location after type expansion | **PAUSE** — investigate unexpected consumers. Each must be evaluated for correct facilitator behavior. |
| S2 | Any component has `if (mode === 'preview')` logic that should include facilitator | **PAUSE** — this means facilitator mode would silently get wrong behavior. Audit the conditional. |
| S3 | No concrete consumer for `facilitator` mode exists or is planned | **DECISION POINT** — consider deferring Block 2 until a consumer exists (YAGNI). Adding a mode with no consumer adds maintenance cost with no value. |
| S4 | Tests reveal that facilitator and preview have identical configs (only `leaderTips` differs) and no page will use it | **DECISION POINT** — same as S3. The mode may be premature. |
| S5 | `GameDetailProvider` (F10) turns out to be consumed somewhere we missed | **PAUSE** — verify it handles 4 modes correctly. |

---

## 8. Implementation plan correction

**The following changes to `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md` should be applied when Block 2 is approved:**

1. **Block 2.1:** Remove Director Preview from "Exakta filer som ändras" — it's not a GameDetailMode consumer
2. **F11 in traceability:** Re-classify as "Play domain naming issue — out of scope for GameDetails plan"
3. **Block 2 "Varför nu":** Remove the Director Preview motivation. Replace with: "Facilitator-mode enables correct leaderTips visibility for facilitator-facing views and completes the capability matrix."

---

## 9. Effort assessment

With Director Preview removed from scope, Block 2 is significantly smaller:

| Item | Effort |
|------|--------|
| Type + config expansion | ~15 min |
| Test updates | ~15 min |
| Sandbox toggle | ~10 min |
| Verification (tsc + vitest) | ~5 min |
| **Total** | **~45 min** (was estimated 4–6 SP) |

This is a ~1 SP task at most. The original 4–6 SP estimate included the (now-removed) Director Preview work and TypeScript blast radius investigation.
