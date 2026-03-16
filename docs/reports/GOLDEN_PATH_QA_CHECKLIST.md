# Golden Path QA Checklist — Participant Play

> **Date:** 2026-02-21  
> **Scope:** Core participant loop: Step → Timer → Artifact highlight → Decision blocking → Story overlay → Signals  
> **Goal:** Verify "premium mobile-first fullscreen" experience on the standard game path.

---

## Prerequisites

- Active session with a linked game (at least 3 steps, 1 artifact, 1 decision, 1 story overlay configured)
- Participant token in `sessionStorage`
- Mobile device (or Chrome DevTools mobile emulator, 375×812)
- Both light and dark mode tested

---

## QA Scenarios

### 1. Step Transition — No Layout Shift

- [ ] Navigate to `/play/session/[CODE]` as participant
- [ ] Host advances steps 1 → 2 → 3
- [ ] **Verify:** Step card animates in (fade + slide from bottom), no layout shift above the step card
- [ ] **Verify:** Step progress dots update instantly (current dot gets ring highlight)
- [ ] **Verify:** Step number badge, "Steg X av Y" text, and tag all update correctly
- [ ] **Verify:** If step has `display_mode: typewriter`, text types in; advancing mid-typewriter resets cleanly

### 2. Timer — Traffic Light Progression

- [ ] Host starts a timer (e.g. 60 seconds)
- [ ] **Verify:** Timer renders in green, transitions to yellow (< 30%), then red (< 10%)
- [ ] **Verify:** Progress bar animates smoothly (no jumps)
- [ ] **Verify:** Timer reaches 0 → shows "Tiden är slut!" with red styling, no crash
- [ ] **Verify:** Host pauses timer → Timer shows "Pausad" state
- [ ] **Verify:** Timer is hidden when session ends

### 3. Artifact Highlight — Visible but Never Auto-Opens

- [ ] Host adds/reveals an artifact mid-step
- [ ] **Verify:** Artifact button in action bar gains pulsing ping dot (highlight badge)
- [ ] **Verify:** Artifact drawer does NOT auto-open
- [ ] **Verify:** Tapping "📦 Artefakter" opens drawer AND clears the highlight badge
- [ ] **Verify:** Artifact count badge updates
- [ ] **Verify:** Highlight badge reappears on subsequent artifact updates

### 4. Artifact Drawer — Clear States

- [ ] Open artifact drawer
- [ ] **Verify:** Standard artifacts show visibility badges (Offentlig / Privat / Roll / Markerad) via i18n
- [ ] **Verify:** Keypad artifact shows lock state (🔐 → 🔓 → 🔒) with clear status text
- [ ] **Verify:** Conversation cards collection loads lazily (skeleton → content)
- [ ] **Verify:** Puzzle artifacts load lazily (skeleton → content)
- [ ] **Verify:** Close button and refresh button both work
- [ ] **Verify:** No layout shift when drawer opens/closes

### 5. Decision — Blocking Vote (Premium Flow)

- [ ] Host opens a decision with 3 options
- [ ] **Verify:** Blocking modal appears with backdrop blur (cannot interact with stage)
- [ ] **Verify:** Options have large tap targets with custom radio indicators
- [ ] **Verify:** Selecting an option highlights it (border + background change)
- [ ] **Verify:** Tapping "Skicka röst" shows **confirmation step** ("Du röstar på: X. Vill du skicka?")
- [ ] **Verify:** "Tillbaka" returns to option selection
- [ ] **Verify:** "Ja, skicka röst" submits and shows **success state** (checkmark + "Röst skickad!")
- [ ] **Verify:** Success state shows "Inväntar resultat..." text
- [ ] **Verify:** Page scroll is locked while modal is open
- [ ] **Verify:** Body scroll lock restores correctly after vote

### 6. Decision — Priority over Story/Countdown

- [ ] Host triggers decision AND story overlay simultaneously
- [ ] **Verify:** Decision modal appears (highest priority)
- [ ] **Verify:** Story overlay does NOT appear until decision is dismissed
- [ ] **Verify:** After voting, story overlay appears automatically
- [ ] **Verify:** Countdown never appears while decision or story is active

### 7. Story Overlay — No Flicker on Duplicate Events

- [ ] Host triggers story overlay
- [ ] **Verify:** Story overlay renders once, no flicker
- [ ] **Verify:** If host re-triggers the same story text, it does NOT re-open (de-dupe ref works)
- [ ] **Verify:** Participant skip button respects `allowParticipantSkip` flag
- [ ] **Verify:** Closing story overlay clears de-dupe ref (same story CAN be re-triggered later)

### 8. Signals — Send and Receive

- [ ] Participant sends a signal (e.g. READY)
- [ ] **Verify:** Signal button shows send feedback
- [ ] Host sends a signal to all participants
- [ ] **Verify:** Signal toast appears from bottom with animation (fade + slide)
- [ ] **Verify:** Signal toast has backdrop blur, auto-dismisses after 4 seconds
- [ ] **Verify:** Signal toast does not overlap with blocking modals

### 9. Session Paused / Ended States

- [ ] Host pauses session
- [ ] **Verify:** Pause overlay appears (yellow card with PauseCircle icon)
- [ ] **Verify:** Timer shows "Pausad" if a timer was running
- [ ] **Verify:** Action bar (artifacts/decisions) remains visible but stage shows paused state
- [ ] Host ends session
- [ ] **Verify:** Ended card appears (gray, "Sessionen är avslutad")
- [ ] **Verify:** All blocking overlays dismiss immediately
- [ ] **Verify:** Action bar hides
- [ ] **Verify:** Timer hides

### 10. Offline / Degraded Connection

- [ ] Open Chrome DevTools → Network → Offline
- [ ] **Verify:** Connection badge changes from "Live" to "✕" (offline)
- [ ] **Verify:** Last known state remains visible (no blank screen)
- [ ] Re-enable network
- [ ] **Verify:** Connection badge returns to "Live"
- [ ] **Verify:** Recovery-only poll (60s) fetches fresh data
- [ ] **Verify:** Realtime reconnects and updates resume

### 11. Tab Background / Resume

- [ ] During active step with timer, background the tab (switch to another tab)
- [ ] Wait 30+ seconds, return to tab
- [ ] **Verify:** Timer recalculates from server state (no stale time display)
- [ ] **Verify:** If host advanced steps while tab was backgrounded, the new step renders
- [ ] **Verify:** No duplicate overlays or stale modals

### 12. Dark Mode + Safe Areas

- [ ] Toggle to dark mode (OS or app setting)
- [ ] **Verify:** All components render with correct dark mode colours
- [ ] **Verify:** Timer traffic lights visible in dark mode (green/yellow/red on dark bg)
- [ ] **Verify:** Decision modal backdrop works in dark mode
- [ ] On a device with notch/home indicator:
  - [ ] **Verify:** Header respects `safe-area-inset-top`
  - [ ] **Verify:** Stage content respects `safe-area-inset-bottom`
  - [ ] **Verify:** No content hidden behind notch or home indicator

---

## Pass Criteria

All 12 scenarios must pass on:
- [ ] Mobile (iOS Safari, Chrome Android or emulated)
- [ ] Desktop (Chrome/Firefox)

**No layout shift during step changes.**  
**Decision modal always blocks interaction.**  
**Artifact highlight visible but never auto-opens.**  
**Story overlay never competes with decision (priority holds).**  
**All interactions feel responsive on mobile.**
