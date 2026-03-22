# Accessibility Audit (#20) — Cross-cutting

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed cross-cutting accessibility audit from the launch-readiness cycle. Use this as a bounded quality snapshot rather than an active operating document.

**Status:** ✅ GPT-calibrated  
**Date:** 2026-03-12  
**GPT Calibration:** 2026-03-12 — A11Y-001 P2→P3, A11Y-004 P2→P3. All other severities confirmed.  
**Scope:** Keyboard navigation, focus management, ARIA attributes, color contrast, images/media, forms, semantic HTML, animations/motion, screen reader support, component library  
**Method:** Static code analysis + subagent deep scan + independent verification. Claims verified against actual source code. Sandbox pages excluded (gated in production).

---

## Executive Summary

**8 findings (0 P0, 0 P1, 2 P2, 6 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 2 | Post-launch hardening |
| P3 | 6 | Polish |

The accessibility foundation is **substantially better than typical Next.js projects**. A dedicated `lib/accessibility/` library provides `trapFocus()`, `useReducedMotion()`, `useHighContrast()`, `useAnnounce()`, `useLiveRegion()`, and `announceToScreenReader()`. Form components (`input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`) all implement `aria-invalid` and `aria-describedby` correctly. Radix UI primitives provide keyboard navigation, focus trapping, and ARIA roles automatically. `prefers-reduced-motion` is handled in `globals.css` and several key components. `aria-live` regions exist in 8+ play components.

**Key context:** No accessibility-related runtime crashes or functional blockers found. All findings are UX quality improvements, not safety issues.

---

## Findings

### A11Y-001 — Custom `role="button"` Divs Missing Space Key Handler (P3)

**Files:** `app/admin/games/builder/components/StepEditor.tsx` line 151, `features/gamification/GamificationPage.tsx` line 245, and 4 others  
**Risk:** WCAG 2.1.1 requires buttons to activate on both Enter and Space. Custom `role="button"` divs only handle Enter.

**Evidence:**
```tsx
// StepEditor.tsx:151
<div onClick={onEdit} role="button" tabIndex={0} 
     onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
// ← Space key not handled
```

6 instances found: `StepEditor.tsx`, `GamificationPage.tsx`, `NotificationBell.tsx`, `UserListItem.tsx`, `OrganisationListItem.tsx`, `PinnedArtifactBar.tsx`.

**Mitigating factors:**
- Radix UI buttons (the vast majority) handle both keys automatically
- These are admin/internal-facing UI elements
- Mouse users unaffected

**Recommendation:** Add `|| e.key === ' '` to keyDown handlers, or replace with `<button>` elements.

---

### A11Y-002 — Toast Notifications Not in aria-live Region (P2)

**File:** `components/ui/toast.tsx`  
**Risk:** Toast messages appear visually but are not announced to screen readers. Screen reader users may miss important feedback.

**Evidence:**
- Custom toast implementation (not Radix Toast)
- No `aria-live="polite"` wrapper on toast container
- Toast has hardcoded `aria-label="Stang"` (typo, should be "Stäng") — already tracked in i18n audit

**Mitigating factors:**
- Core play UI uses dedicated `aria-live` regions (TypewriterText, SessionFeedback, StoryOverlay, CountdownOverlay, AlphaKeypad, ChipLane, KeypadGrid — 8+ components)
- `announceToScreenReader()` utility exists in `lib/accessibility/a11y-utils.ts` — could be called from toast
- Toasts are supplementary feedback, not the only feedback channel

**Recommendation:** Wrap toast container in `aria-live="polite"` region, or call `announceToScreenReader()` when toast appears.

---

### A11Y-003 — `prefers-reduced-motion` Coverage Incomplete (P2)

**Risk:** While `globals.css` handles custom animations and several components check reduced motion, Tailwind's built-in `animate-*` classes (animate-spin, animate-pulse) are not all covered.

**Evidence:**
- ✅ `globals.css` handles: `animate-shake`, `animate-bounce-in`, `animate-confetti`, `animate-scale-pop`, `animate-fade-in-delayed`, `animate-soft-pulse`
- ✅ `useReducedMotion()` hook exists in `lib/accessibility/a11y-hooks.ts`
- ✅ `useTypewriter.ts` and `useSound.ts` check `prefers-reduced-motion`
- ✅ `CountdownOverlay.tsx` checks reduced motion
- ✅ CSS modules (`CoinIdle.module.css`, `ParticleField.tsx`, `SceneBackgroundEffect.tsx`) have `@media (prefers-reduced-motion: reduce)` guards
- ⚠️ Tailwind's default `animate-spin`, `animate-pulse`, `animate-ping` not covered in global CSS

**Mitigating factors:**
- `animate-spin` is used on loading spinners — brief and functional, not decorative
- `animate-pulse` is used on skeleton loaders — functional feedback
- The most important animations (play UI, gamification, confetti) ARE covered
- Tailwind v4 may support `motion-reduce:` modifier for individual classes

**Recommendation:** Add Tailwind defaults to the `globals.css` reduced-motion block, or use `motion-reduce:animate-none` on individual instances.

---

### A11Y-004 — Route Changes Don't Manage Focus or Announce (P3)

**Risk:** When navigating between pages, focus stays on the previous element position. Screen reader users may not know the page changed.

**Evidence:**
- No `useEffect` hook found that focuses `<main>` or `<h1>` after route change
- No `aria-live` region announcing page title changes
- `announceToScreenReader()` utility exists but is not called on navigation

**Mitigating factors:**
- Next.js App Router resets scroll position on navigation
- Page titles update via `generateMetadata()` — screen readers may detect `<title>` changes
- Radix Dialog/Sheet properly manage focus within modals
- This is a common gap in virtually all Next.js applications

**Recommendation:** Post-launch: add a layout-level hook that announces page title on route change, or focuses `<main>` with `tabIndex={-1}`.

---

### A11Y-005 — Hardcoded Accessibility Strings (P3)

**Files:** `components/ui/toast.tsx` line 149, `components/ui/tooltip.tsx` line ~160  
**Risk:** Two hardcoded ARIA strings — one with a typo.

**Evidence:**
```tsx
// toast.tsx:149
aria-label="Stang"  // Typo — should be "Stäng"

// tooltip.tsx
aria-label="Mer information"  // Swedish, not translated
```

**Mitigating factors:**
- All other aria-labels in the codebase properly use `t()` calls
- Only 2 instances in production code
- Already tracked in i18n audit (I18N-005)

**Recommendation:** Replace with `tActions("close")` and `t("tooltip.moreInfo")`. Quick fix.

---

### A11Y-006 — Color Contrast Risk with `text-gray-*` Classes (P3)

**Risk:** Some admin pages use `text-gray-300/400/500` directly instead of semantic tokens. These may fail WCAG AA 4.5:1 contrast ratio on light backgrounds.

**Evidence:**
- ~20 instances of hardcoded `text-gray-*` classes in admin/internal pages
- `text-muted-foreground` (semantic token) is the preferred pattern and is used in 30+ components
- `opacity-40/50` on disabled elements can reduce contrast below threshold

**Mitigating factors:**
- Most UI uses semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card`) which are theme-aware
- Affected files are primarily admin-facing
- Dark mode via `dark:` classes adjusts colors
- No contrast issues verified on public-facing pages (marketing, play, browse)

**Recommendation:** Post-launch: audit admin pages with WebAIM Contrast Checker. Replace hardcoded `text-gray-*` with semantic tokens.

---

### A11Y-007 — Audio Playback Missing Captions/Transcripts (P3)

**File:** `components/play/AudioPlayer.tsx`  
**Risk:** Audio content in play sessions uses native `<audio controls>` without `<track>` captions or transcripts. WCAG 1.2.1 applies if audio contains speech.

**Evidence:**
- Native `<audio>` element with browser-default controls
- No `<track>` tags or WebVTT files found
- No transcript UI

**Mitigating factors:**
- Audio is optional game content (clues/background), not core instructional material
- Session coaches control what audio is uploaded — they can provide text alternatives in the game step
- No video content found in production codebase
- Audio is a secondary play mechanic, not the primary interaction

**Recommendation:** Document as known limitation. If audio contains critical speech content, add transcript support post-launch.

---

### A11Y-008 — `<aside>` Landmark Missing `aria-label` (P3)

**Files:** GameDetails sidebar components  
**Risk:** Screen readers announce "complementary" landmark but can't describe its purpose without an `aria-label`.

**Evidence:**
- `<aside>` used in GameDetails layout
- No `aria-label` attribute

**Mitigating factors:**
- Other landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`) are properly present
- Expandable sections within GameDetails use `role="region"` with `aria-label` (✅ implemented 2026-03-10)
- Single `<aside>` instance — low blast radius

**Recommendation:** Add `aria-label={t("gameDetails.sidebar")}` to `<aside>` element. 1-line fix.

---

## Positive Findings

| # | Area | Detail |
|---|------|--------|
| P1 | Accessibility Library | Dedicated `lib/accessibility/` with `trapFocus()`, `useReducedMotion()`, `useHighContrast()`, `useAnnounce()`, `useLiveRegion()`, `announceToScreenReader()`. Well-designed composable API. |
| P2 | Form ARIA Complete | `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx` all implement `aria-invalid={hasError}` + `aria-describedby` linking error messages. Verified in source. |
| P3 | Radix UI Foundation | 8+ Radix primitives (Dialog, Sheet, Select, Switch, Checkbox, Tabs, Slider, DropdownMenu) provide automatic focus trapping, Escape-to-close, keyboard navigation, ARIA roles. |
| P4 | Focus Ring Consistency | 30+ components use `focus-visible:ring-2 ring-primary`. No plain `outline-none` without `focus-visible` replacement. |
| P5 | aria-live Regions | 8+ play components have `aria-live="polite"/"assertive"`: TypewriterText, SessionFeedback, StoryOverlay, CountdownOverlay, AlphaKeypad, ChipLane, KeypadGrid, ActingAsTenantBanner. |
| P6 | Reduced Motion Support | `globals.css` covers 6 custom animations. `useTypewriter.ts`, `useSound.ts`, `CountdownOverlay.tsx` check `prefers-reduced-motion`. CSS modules have guards. `useReducedMotion()` hook available. |
| P7 | Image Alt Text | 64+ `next/image` instances with proper alt text. 15+ decorative images marked `alt=""`. SVG icons use `aria-hidden="true"`. |
| P8 | Semantic HTML | All landmarks present: `<main>`, `<header>`, `<footer>`, `<nav>`, `<section>`, `<article>`, `<aside>`. Heading hierarchy (`h1`→`h2`→`h3`) consistent across pages. |
| P9 | sr-only Labels | 20+ instances of `className="sr-only"` for visually hidden but screen-reader-accessible text. Used in form labels, dialog close buttons, action buttons. |
| P10 | Keyboard Handlers | 50+ `onKeyDown` handlers across production code. Planner BlockRow handles Enter/Escape. Gamification skill tree has keyboard shortcuts. |
| P11 | GameDetails A11y Sprint | Recent sprint added `aria-expanded` + `aria-controls` + `role="region"` + `aria-label` + focus restoration with `requestAnimationFrame`. Documented as ✅ KLAR (2026-03-10). |
| P12 | Focus Restoration | `requestAnimationFrame(() => ref.current?.focus())` pattern used in GameDetailTriggers, GameDetailRoles, GameDetailArtifacts — ensures DOM painted before focus. |
| P13 | MFA Input Design | Multi-digit MFA input and recovery code input with proper focus management between fields. `autoFocus` with correct timing. |
| P14 | E2E Accessibility Tests | `tests/e2e/accessibility.spec.ts` exists — tests for `aria-invalid`, error messages, role attributes. |

---

## Severity Distribution

| ID | Finding | Severity | Launch Action |
|----|---------|----------|---------------|
| A11Y-001 | Custom role="button" missing Space key | P3 | Add Space handler or use `<button>` |
| A11Y-002 | Toast not in aria-live region | P2 | Wrap in aria-live or use announceToScreenReader |
| A11Y-003 | prefers-reduced-motion coverage gaps | P2 | Add Tailwind defaults to globals.css |
| A11Y-004 | Route changes don't manage focus | P3 | Common Next.js gap — add post-launch |
| A11Y-005 | Hardcoded aria-label strings | P3 | Fix typo + translate (2 strings) |
| A11Y-006 | Color contrast risk in admin pages | P3 | Audit with contrast checker post-launch |
| A11Y-007 | Audio missing captions/transcripts | P3 | Document — audio is optional game content |
| A11Y-008 | Aside landmark missing aria-label | P3 | 1-line fix |

---

## Remediation Milestones

### M1 — Quick Fixes (Post-launch, 1-2 hours)

- [ ] Fix `aria-label="Stang"` typo in `components/ui/toast.tsx`
- [ ] Translate `aria-label="Mer information"` in `components/ui/tooltip.tsx`
- [ ] Add `aria-label` to `<aside>` in GameDetails sidebar
- [ ] Add Tailwind `animate-spin`, `animate-pulse`, `animate-ping` to `globals.css` reduced-motion block

### M2 — Button Accessibility (Post-launch, 2-3 hours)

- [ ] Add Space key handler to 6 `role="button"` divs
- [ ] Or replace with `<button>` elements where appropriate

### M3 — Screen Reader Improvements (Post-launch, 3-4 hours)

- [ ] Wrap toast container in `aria-live="polite"` region
- [ ] Add route change focus management (focus `<main>` or announce page title)
- [ ] Call `announceToScreenReader()` for important state changes

### M4 — Audit & Polish (Post-launch)

- [ ] Run axe DevTools on all public pages
- [ ] Run WebAIM Contrast Checker on admin pages with `text-gray-*`
- [ ] Replace hardcoded `text-gray-*` with semantic tokens where contrast fails
- [ ] Document audio caption approach if audio contains speech

---

## Appendix: Key Architecture Reference

| Component | File | Purpose |
|-----------|------|---------|
| Focus trap | `lib/accessibility/a11y-utils.ts` | `trapFocus()` for modals |
| Reduced motion hook | `lib/accessibility/a11y-hooks.ts` | `useReducedMotion()` |
| High contrast hook | `lib/accessibility/a11y-hooks.ts` | `useHighContrast()` |
| Announce hook | `lib/accessibility/a11y-hooks.ts` | `useAnnounce()` |
| Live region hook | `lib/accessibility/a11y-hooks.ts` | `useLiveRegion()` |
| Announce utility | `lib/accessibility/a11y-utils.ts` | `announceToScreenReader()` |
| Reduced motion CSS | `app/globals.css` lines 187+ | `@media (prefers-reduced-motion: reduce)` guard |
| Input component | `components/ui/input.tsx` | `aria-invalid` + `aria-describedby` |
| Textarea component | `components/ui/textarea.tsx` | `aria-invalid` + `aria-describedby` |
| Select component | `components/ui/select.tsx` | `aria-invalid` + `aria-describedby` |
| E2E a11y tests | `tests/e2e/accessibility.spec.ts` | Automated accessibility tests |
