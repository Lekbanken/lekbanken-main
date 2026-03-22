# Accessibility Audit Checklist - Play UI

## Metadata

- Owner: -
- Status: draft
- Date: 2025-12-28
- Last updated: 2026-03-21
- Last validated: -

> Draft WCAG checklist and audit worklist for the participant-facing play UI.

This document provides a WCAG 2.1 AA compliance checklist for the participant-facing play experience.

## Status Legend

- ✅ Implemented
- 🔄 In Progress
- 🔲 Planned
- ⚠️ Needs Review

---

## 1. Perceivable

### 1.1 Text Alternatives

| Requirement | Status | Notes |
|-------------|--------|-------|
| All images have meaningful alt text | 🔲 | Audit all images in play UI |
| Decorative images marked with `alt=""` | 🔲 | |
| Icon buttons have accessible names | 🔲 | Use `aria-label` for icon-only buttons |
| Complex images have long descriptions | 🔲 | Use `aria-describedby` for diagrams |

### 1.2 Time-based Media

| Requirement | Status | Notes |
|-------------|--------|-------|
| Prerecorded audio has captions | 🔲 | For clue audio content |
| Video content has captions | 🔲 | If video clues are supported |
| Audio descriptions for video | 🔲 | |

### 1.3 Adaptable

| Requirement | Status | Notes |
|-------------|--------|-------|
| Semantic HTML structure | 🔄 | Review heading hierarchy |
| Proper landmarks (main, nav, etc.) | 🔲 | Add ARIA landmarks to play views |
| Reading order matches visual order | ✅ | |
| Orientation not locked | ✅ | Responsive design |

### 1.4 Distinguishable

| Requirement | Status | Notes |
|-------------|--------|-------|
| Color contrast 4.5:1 (text) | 🔲 | Use `getContrastRatio()` utility |
| Color contrast 3:1 (large text) | 🔲 | Large text = 18pt+ or 14pt bold |
| Color contrast 3:1 (UI components) | 🔲 | Buttons, inputs, focus rings |
| Text resizable to 200% | ✅ | Relative units used |
| Non-text content 3:1 contrast | 🔲 | Icons, charts, focus indicators |
| No info conveyed by color alone | 🔄 | Add icons/text to colored status |
| Audio control (pause/stop) | 🔲 | For audio clues |

---

## 2. Operable

### 2.1 Keyboard Accessible

| Requirement | Status | Notes |
|-------------|--------|-------|
| All functionality keyboard accessible | 🔄 | Test all interactive elements |
| No keyboard trap | 🔄 | Verify modal escape works |
| Keyboard shortcuts documented | ✅ | See `KEYBOARD_SHORTCUTS` |
| Skip links provided | ✅ | `getSkipLinkProps()` utility |

### 2.2 Enough Time

| Requirement | Status | Notes |
|-------------|--------|-------|
| Timing adjustable | ✅ | Time bank feature |
| Pause/resume available | ✅ | Session pause implemented |
| Moving content pausable | 🔲 | Animations respect `prefers-reduced-motion` |
| Auto-updating content pausable | 🔲 | |
| Session timeout warning | 🔲 | Warn before session expires |

### 2.3 Seizures & Physical Reactions

| Requirement | Status | Notes |
|-------------|--------|-------|
| No content flashes >3 times/sec | 🔲 | Audit all animations |
| Reduced motion support | ✅ | `useReducedMotion()` hook |
| Motion can be disabled | ✅ | Respects user preference |

### 2.4 Navigable

| Requirement | Status | Notes |
|-------------|--------|-------|
| Bypass blocks (skip links) | ✅ | Implemented |
| Page titles descriptive | 🔲 | Update title per phase/step |
| Focus order logical | 🔄 | Test tabbing sequence |
| Link purpose clear | 🔲 | Avoid "click here" |
| Multiple ways to find pages | ✅ | N/A for single-page app |
| Headings & labels descriptive | 🔲 | Review all heading text |
| Focus visible | ✅ | Tailwind focus:ring styles |

### 2.5 Input Modalities

| Requirement | Status | Notes |
|-------------|--------|-------|
| Pointer gestures have alternatives | ✅ | All clickable = keyboard |
| Pointer cancellation | ✅ | Native button behavior |
| Label in name | 🔲 | Visible labels match accessible names |
| Motion actuation alternatives | ✅ | No motion-only features |

---

## 3. Understandable

### 3.1 Readable

| Requirement | Status | Notes |
|-------------|--------|-------|
| Page language set | ✅ | `<html lang="sv">` or `lang="en"` |
| Language of parts marked | 🔲 | For mixed-language content |
| Unusual words explained | 🔲 | Tooltips for game-specific terms |

### 3.2 Predictable

| Requirement | Status | Notes |
|-------------|--------|-------|
| No unexpected context change on focus | ✅ | |
| No unexpected context change on input | ✅ | Forms submit on explicit action |
| Consistent navigation | ✅ | Same nav structure throughout |
| Consistent identification | ✅ | Same icons/labels for same actions |

### 3.3 Input Assistance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Error identification | 🔲 | Screen reader announces errors |
| Labels & instructions | ✅ | All inputs labeled |
| Error suggestions | 🔲 | Provide correction hints |
| Error prevention (legal/financial) | ✅ | N/A - no such transactions |

---

## 4. Robust

### 4.1 Compatible

| Requirement | Status | Notes |
|-------------|--------|-------|
| Valid HTML | 🔲 | Run HTML validator |
| Name, role, value | 🔄 | ARIA attributes properly set |
| Status messages announced | ✅ | `aria-live` regions |

---

## Implementation Tools

### Utility Functions (`lib/accessibility/a11y-utils.ts`)

```typescript
// Focus management
trapFocus(container)
announceToScreenReader(message, priority)

// Color contrast
getContrastRatio(color1, color2)
meetsContrastRequirement(ratio, isLargeText)

// Keyboard
KEYBOARD_SHORTCUTS
registerShortcut(key, handler, options)

// ARIA helpers
getTimerAriaLabel(seconds, isPaused, isWarning)
getStepProgressAriaLabel(currentStep, totalSteps, stepTitle)
getPhaseProgressAriaLabel(currentPhase, totalPhases, phaseName)

// Motion & contrast preferences
prefersReducedMotion()
prefersHighContrast()
getAnimationDuration(normalDuration)
getContrastColor(normalColor, highContrastColor)

// Skip links
getSkipLinkProps(targetId, label)

// Form accessibility
getFormFieldProps(id, label, options)

// Live regions
createLiveRegion(priority)
```

### React Hooks (`lib/accessibility/a11y-hooks.ts`)

```typescript
// Preference detection
useReducedMotion()
useHighContrast()

// Announcements
useAnnounce()
useLiveRegion(priority)

// Keyboard
useKeyboardShortcuts(shortcuts)

// Focus
useFocusReturn()
useRovingTabIndex(items, options)

// Timer
useTimerAnnouncements(seconds, isPaused, enabled)

// Component helpers
useModalA11y(isOpen, titleId, descriptionId)
useAlertA11y(type)
```

---

## Testing Checklist

### Manual Testing

- [ ] Navigate entire play flow with keyboard only
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify 200% zoom is usable
- [ ] Test with high contrast mode
- [ ] Verify reduced motion is respected
- [ ] Check focus indicators are visible

### Automated Testing

- [ ] Run axe-core accessibility scanner
- [ ] Validate HTML with W3C validator
- [ ] Check color contrast with contrast checker
- [ ] Run Lighthouse accessibility audit

### Screen Reader Testing

| Screen Reader | Browser | Status |
|---------------|---------|--------|
| NVDA | Firefox | 🔲 |
| NVDA | Chrome | 🔲 |
| VoiceOver | Safari | 🔲 |
| VoiceOver | Chrome | 🔲 |
| JAWS | Chrome | 🔲 |

---

## Priority Issues

### Critical (Must Fix)

1. Audit all play UI components for keyboard accessibility
2. Verify color contrast on timer warning states
3. Add screen reader announcements for state changes
4. Implement skip links on play pages

### High (Should Fix)

1. Add ARIA landmarks to play layout
2. Review heading hierarchy in step content
3. Add `aria-label` to all icon buttons
4. Test focus trap in modals/dialogs

### Medium (Nice to Have)

1. Add keyboard shortcut help overlay
2. Implement custom focus indicators for high contrast
3. Add audio cue alternatives (visual indicators)
4. Create accessibility settings panel

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Components](https://inclusive-components.design/)
