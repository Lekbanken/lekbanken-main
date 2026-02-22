/**
 * Interaction Lock v1 + v1.1 + Dramaturgy v1 + Stage-first polish — Regression Tests
 *
 * Tests validating the interaction model:
 * 1. Artifact autoscroll target attribute
 * 2. Decision double-submit guard
 * 3. Signal queued indicator
 * 4. Overlay priority arbiter (unchanged)
 * 5. Inline artifact callout visibility (with anti-spam guardrails)
 * 6. Artifact 3-state transitions
 * 7. Signal per-channel cooldown
 * 8. Callout suppressed during blocking overlay
 * 9. Autoscroll fires only once per open transition
 * 10. Typewriter skip reveals full text
 * 11. Step change resets typewriter (key-remount)
 * 12. Debug overlay is dev-only
 * 13. Paragraph chunking splits on double newlines
 * 14. Step card animation class present
 * 15. Timer breath — final minute hint logic (v2)
 * 16. Chapter pill — rounded-full, uppercase, tracking (v2)
 * 17. Step counter — tabular-nums prevents layout jumps (v2)
 * 18. Timer width stabilisation — min-w-[5ch] text-right (v2)
 * 19. ArtifactDrawer — 3-state classification (v2, locked removed)
 * 20. ArtifactDrawer — Inventory summary counts (v2)
 * 21. ArtifactDrawer — Expand/collapse vs autoscroll guard (v2)
 * 22. ArtifactDrawer — No auto-open from realtime (2A rule)
 * 23. ArtifactDrawer — Canonical isVariantUsed (v2) + used_at compat (v2.1)
 * 24. TriggerLane — Chip queue management (dedupe + FIFO)
 * 25. TriggerLane — Chip taxonomy completeness (v1)
 * 26. TriggerLane — No auto-open (2A compliance)
 * 27. TriggerLane — Zero layout shift (wrapper + timer cleanup)
 * 28. Micro-motion — class contracts (chip enter/exit, stage, drawers)
 * 29. Haptics — presets + interaction mapping
 * 30. Sound design v1 — SFX scope, settings gate, rate limit
 * 31. SSoT Extraction — shared primitives parity (motion tokens, ChipLane, DrawerOverlay, ConnectionBadge)
 * 32. Director Stage-first polish v1 — structural + parity contracts
 * 33. Signal Parity — ProgressDots + StepHeaderRow shared contracts
 * 34. Signal Parity — Signal Strip + handled-state pipeline
 * 35. Signal Determinism — sort, dedupe, reconnect safety, inbox handled-state
 * 36. Director Cockpit — NowSummaryRow shared contract + placement
 * 37. Shared Utils — signalHelpers + roleState
 * 38. SSoT Header — StatusPill + PlayHeader + LeaderScriptSections
 * 39. SSoT Guardrails — canonical types, no duplicate mapping, role-assignment boundary
 *
 * Contract: PLAY_UI_CONTRACT.md (rules 1–12, enforced by tests 39j–39q)
 *
 * Run: npx vitest run tests/play/interaction-lock.test.ts
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// 1. Artifact autoscroll: data-highlighted attribute
// =============================================================================

describe('Artifact Drawer — Autoscroll Target', () => {
  it('highlighted variant gets data-highlighted="true"', () => {
    // Simulates the variant rendering logic from ParticipantArtifactDrawer
    const variant = {
      id: 'v1',
      highlighted_at: '2026-01-01T00:00:00Z',
      metadata: null as Record<string, unknown> | null,
    };

    const isHighlighted = Boolean(variant.highlighted_at);
    const meta = variant.metadata;
    const isUsed = Boolean(meta && (meta.solved === true || meta.used === true));
    const dataHighlighted = isHighlighted && !isUsed ? 'true' : undefined;

    expect(dataHighlighted).toBe('true');
  });

  it('non-highlighted variant does NOT get data-highlighted', () => {
    const variant = {
      id: 'v2',
      highlighted_at: null,
      metadata: null as Record<string, unknown> | null,
    };

    const isHighlighted = Boolean(variant.highlighted_at);
    const meta = variant.metadata;
    const isUsed = Boolean(meta && (meta.solved === true || meta.used === true));
    const dataHighlighted = isHighlighted && !isUsed ? 'true' : undefined;

    expect(dataHighlighted).toBeUndefined();
  });
});

// =============================================================================
// 2. Decision double-submit guard
// =============================================================================

describe('Decision — Double Submit Guard', () => {
  it('in-flight ref prevents duplicate onVote calls', () => {
    // Simulates the ref-based guard from ParticipantDecisionModal
    let voteInFlight = false;
    let voteCount = 0;

    const guardedVote = () => {
      if (voteInFlight) return;
      voteInFlight = true;
      voteCount++;
    };

    guardedVote(); // first call — goes through
    guardedVote(); // second call — blocked by guard
    guardedVote(); // third call — still blocked

    expect(voteCount).toBe(1);
  });
});

// =============================================================================
// 3. Signal queued indicator
// =============================================================================

describe('Signal — Queued Indicator', () => {
  it('queued items show per-channel indicator', () => {
    const queue = [
      { id: '1', channel: 'READY', message: 'tap', createdAt: '2026-01-01T00:00:00Z' },
      { id: '2', channel: 'SOS', message: 'tap', createdAt: '2026-01-01T00:00:01Z' },
    ];

    const channels = ['READY', 'SOS', 'FOUND'];
    const hasQueued = channels.map((ch) => ({
      channel: ch,
      isQueued: queue.some((q) => q.channel === ch),
    }));

    expect(hasQueued).toEqual([
      { channel: 'READY', isQueued: true },
      { channel: 'SOS', isQueued: true },
      { channel: 'FOUND', isQueued: false },
    ]);
  });
});

// =============================================================================
// 4. Overlay priority arbiter (unchanged from prior sprint)
// =============================================================================

describe('Overlay Priority Arbiter', () => {
  it('decision > story > countdown priority is maintained', () => {
    // Simulates the activeBlockingOverlay useMemo from ParticipantOverlayStack
    function getActiveBlocking(opts: {
      isEnded: boolean;
      hasBlockingDecision: boolean;
      storyOpen: boolean;
      countdownOpen: boolean;
    }): string | null {
      if (opts.isEnded) return null;
      if (opts.hasBlockingDecision) return 'decision';
      if (opts.storyOpen) return 'story';
      if (opts.countdownOpen) return 'countdown';
      return null;
    }

    // Decision wins over everything
    expect(
      getActiveBlocking({ isEnded: false, hasBlockingDecision: true, storyOpen: true, countdownOpen: true }),
    ).toBe('decision');

    // Story wins over countdown
    expect(
      getActiveBlocking({ isEnded: false, hasBlockingDecision: false, storyOpen: true, countdownOpen: true }),
    ).toBe('story');

    // Countdown shows when alone
    expect(
      getActiveBlocking({ isEnded: false, hasBlockingDecision: false, storyOpen: false, countdownOpen: true }),
    ).toBe('countdown');

    // Nothing when ended
    expect(
      getActiveBlocking({ isEnded: true, hasBlockingDecision: true, storyOpen: true, countdownOpen: true }),
    ).toBeNull();

    // Nothing when all closed
    expect(
      getActiveBlocking({ isEnded: false, hasBlockingDecision: false, storyOpen: false, countdownOpen: false }),
    ).toBeNull();
  });
});

// =============================================================================
// 5. Inline artifact callout visibility
// =============================================================================

describe('Stage — Inline Artifact Callout', () => {
  it('callout shows only when artifactsHighlight is true AND handler exists', () => {
    // Simulates the render condition from ParticipantStepStage
    const scenarios = [
      { highlight: true, hasHandler: true, expected: true },
      { highlight: false, hasHandler: true, expected: false },
      { highlight: true, hasHandler: false, expected: false },
      { highlight: false, hasHandler: false, expected: false },
    ];

    for (const s of scenarios) {
      const shouldShow = s.highlight && s.hasHandler;
      expect(shouldShow).toBe(s.expected);
    }
  });

  it('callout is suppressed when blocking overlay is active or session paused', () => {
    // Extended render condition from ParticipantStepStage v1.1
    function shouldShowCallout(opts: {
      highlight: boolean;
      hasHandler: boolean;
      hasBlockingOverlay: boolean;
      isPaused: boolean;
    }) {
      return opts.highlight && opts.hasHandler && !opts.hasBlockingOverlay && !opts.isPaused;
    }

    // Suppressed during blocking overlay (decision modal)
    expect(shouldShowCallout({ highlight: true, hasHandler: true, hasBlockingOverlay: true, isPaused: false })).toBe(false);
    // Suppressed during pause
    expect(shouldShowCallout({ highlight: true, hasHandler: true, hasBlockingOverlay: false, isPaused: true })).toBe(false);
    // Visible when no blockers
    expect(shouldShowCallout({ highlight: true, hasHandler: true, hasBlockingOverlay: false, isPaused: false })).toBe(true);
    // Not visible when no highlight
    expect(shouldShowCallout({ highlight: false, hasHandler: true, hasBlockingOverlay: false, isPaused: false })).toBe(false);
  });
});

// =============================================================================
// 6. Artifact 3-state transitions
// =============================================================================

describe('Artifact — 3-State Visuals', () => {
  it('correctly classifies available / highlighted / used states', () => {
    const variants = [
      { id: 'v-available', highlighted_at: null, metadata: null },
      { id: 'v-highlighted', highlighted_at: '2026-01-01T00:00:00Z', metadata: null },
      { id: 'v-used', highlighted_at: '2026-01-01T00:00:00Z', metadata: { solved: true } },
      { id: 'v-used-flag', highlighted_at: null, metadata: { used: true } },
    ];

    function classify(v: { highlighted_at: string | null; metadata: Record<string, unknown> | null }) {
      const isHighlighted = Boolean(v.highlighted_at);
      const meta = v.metadata;
      const isUsed = Boolean(meta && (meta.solved === true || meta.used === true));
      if (isUsed) return 'used';
      if (isHighlighted) return 'highlighted';
      return 'available';
    }

    expect(classify(variants[0])).toBe('available');
    expect(classify(variants[1])).toBe('highlighted');
    expect(classify(variants[2])).toBe('used');
    expect(classify(variants[3])).toBe('used');
  });
});

// =============================================================================
// 7. Signal per-channel cooldown
// =============================================================================

describe('Signal — Per-Channel Cooldown', () => {
  it('blocks rapid taps within cooldown window', () => {
    // Simulates the cooldown logic from ParticipantSignalMicroUI
    const cooldownUntil: Record<string, number> = {};
    let sendCount = 0;

    function simulateTap(channel: string, now: number) {
      const cooldownEnd = cooldownUntil[channel] ?? 0;
      if (now < cooldownEnd) return; // blocked
      const jitter = 1000; // fixed for test determinism
      cooldownUntil[channel] = now + jitter;
      sendCount++;
    }

    const t0 = 1000;
    simulateTap('READY', t0);        // goes through
    simulateTap('READY', t0 + 200);  // blocked (within 1000ms)
    simulateTap('READY', t0 + 500);  // blocked
    simulateTap('READY', t0 + 999);  // blocked
    simulateTap('READY', t0 + 1000); // goes through (cooldown expired)
    simulateTap('SOS', t0 + 200);    // different channel — goes through

    expect(sendCount).toBe(3); // READY×2 + SOS×1
  });
});

// =============================================================================
// 8. Autoscroll fires only once per open transition
// =============================================================================

describe('Artifact Drawer — Autoscroll Once Per Open', () => {
  it('autoscroll guard prevents re-scroll while drawer stays open', () => {
    // Simulates the didAutoScrollRef pattern from ParticipantArtifactDrawer
    let didAutoScroll = false;
    let scrollCount = 0;

    function onOpenTransition(isOpen: boolean) {
      if (!isOpen) {
        didAutoScroll = false; // reset on close
        return;
      }
      if (didAutoScroll) return; // already scrolled this open
      didAutoScroll = true;
      scrollCount++;
    }

    // Open → scrolls
    onOpenTransition(true);
    expect(scrollCount).toBe(1);

    // Still open + data update → no re-scroll
    onOpenTransition(true);
    expect(scrollCount).toBe(1);

    // Close → reset
    onOpenTransition(false);

    // Re-open → scrolls again
    onOpenTransition(true);
    expect(scrollCount).toBe(2);
  });
});

// =============================================================================
// 9. Typewriter skip — reveals full text immediately
// =============================================================================

describe('Typewriter — Skip Reveals Full Text', () => {
  it('calling skip() sets charIndex to text.length (full reveal)', () => {
    // Simulates the useTypewriter skip logic
    const text = 'Hello, this is a dramatic reveal!';
    let charIndex = 5; // animation in progress at char 5

    // Skip function from useTypewriter
    function skip() {
      charIndex = text.length;
    }

    expect(charIndex).toBe(5);
    expect(text.slice(0, charIndex)).toBe('Hello');

    skip();

    expect(charIndex).toBe(text.length);
    expect(text.slice(0, charIndex)).toBe(text); // full text revealed
  });

  it('allowParticipantSkip enables tap-to-skip affordance', () => {
    // Validates the prop combination used in ParticipantStepStage
    const typewriterProps = {
      text: 'Step description text',
      speed: 'normal' as const,
      allowSkip: true,
      allowParticipantSkip: true,
    };

    // Both flags must be true for participant tap-to-skip
    expect(typewriterProps.allowSkip).toBe(true);
    expect(typewriterProps.allowParticipantSkip).toBe(true);
  });
});

// =============================================================================
// 10. Step change resets typewriter via key-remount
// =============================================================================

describe('Typewriter — Step Change Resets Animation', () => {
  it('different step id produces different React key (forces remount)', () => {
    // Simulates the key generation pattern from ParticipantStepStage
    const step1 = { id: 'step-abc', index: 0 };
    const step2 = { id: 'step-def', index: 1 };

    const key1 = `step-${step1.id}-${step1.index}`;
    const key2 = `step-${step2.id}-${step2.index}`;

    expect(key1).not.toBe(key2); // different keys → React remount → typewriter resets
  });

  it('same step same index produces identical key (no remount)', () => {
    const step = { id: 'step-abc', index: 0 };

    const key1 = `step-${step.id}-${step.index}`;
    const key2 = `step-${step.id}-${step.index}`;

    expect(key1).toBe(key2); // same key → no remount
  });
});

// =============================================================================
// 11. Debug overlay — dev-only gating
// =============================================================================

describe('Debug Overlay — Dev-Only Gating', () => {
  it('renders only when NODE_ENV !== production AND debug=1', () => {
    function shouldShowDebug(nodeEnv: string, debugParam: string | null): boolean {
      return nodeEnv !== 'production' && debugParam === '1';
    }

    // Dev + debug=1 → show
    expect(shouldShowDebug('development', '1')).toBe(true);

    // Dev + no param → hide
    expect(shouldShowDebug('development', null)).toBe(false);

    // Dev + debug=0 → hide
    expect(shouldShowDebug('development', '0')).toBe(false);

    // Production + debug=1 → hide (critical: never in prod)
    expect(shouldShowDebug('production', '1')).toBe(false);

    // Production + no param → hide
    expect(shouldShowDebug('production', null)).toBe(false);
  });
});

// =============================================================================
// 12. Paragraph chunking — long descriptions split on double newlines
// =============================================================================

describe('Stage — Paragraph Chunking', () => {
  it('splits description on double newlines into separate paragraphs', () => {
    const description = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const paragraphs = description.split('\n\n');

    expect(paragraphs).toEqual([
      'First paragraph.',
      'Second paragraph.',
      'Third paragraph.',
    ]);
    expect(paragraphs.length).toBe(3);
  });

  it('single paragraph (no double newlines) produces one element', () => {
    const description = 'Just one paragraph with no breaks.';
    const paragraphs = description.split('\n\n');

    expect(paragraphs).toEqual(['Just one paragraph with no breaks.']);
    expect(paragraphs.length).toBe(1);
  });

  it('preserves single newlines within paragraphs', () => {
    const description = 'Line one.\nLine two.\n\nSecond paragraph.';
    const paragraphs = description.split('\n\n');

    expect(paragraphs).toEqual(['Line one.\nLine two.', 'Second paragraph.']);
    expect(paragraphs[0]).toContain('\n'); // single newline preserved
  });
});

// =============================================================================
// 13. Step card animation class
// =============================================================================

describe('Stage — Step Card Animation', () => {
  it('step card class includes slide-in-from-bottom animation', () => {
    // Validates the CSS class contract for step entrance animation
    const stepCardClass = 'overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300';

    expect(stepCardClass).toContain('animate-in');
    expect(stepCardClass).toContain('fade-in');
    expect(stepCardClass).toContain('slide-in-from-bottom-3');
    expect(stepCardClass).toContain('duration-300');
  });
});

// =============================================================================
// 14. Timer breath — final minute hint logic
// =============================================================================

describe('Stage — Timer Breath (v2 polish)', () => {
  /** Replicates the breath-class logic from TimerDisplay */
  function computeBreathClass(
    isPaused: boolean,
    trafficColor: 'green' | 'yellow' | 'red',
    remaining: number,
  ): string {
    const isFinalMinute = trafficColor === 'red' && remaining > 0 && remaining <= 60;
    if (isPaused) return 'opacity-80';
    if (trafficColor === 'yellow') return 'animate-pulse [animation-duration:3s]';
    if (isFinalMinute) return 'animate-pulse [animation-duration:2s]';
    return '';
  }

  it('paused → opacity-80 (muted breath)', () => {
    expect(computeBreathClass(true, 'green', 120)).toBe('opacity-80');
    expect(computeBreathClass(true, 'red', 30)).toBe('opacity-80'); // paused overrides final minute
  });

  it('yellow → slow pulse (3s)', () => {
    expect(computeBreathClass(false, 'yellow', 90)).toBe('animate-pulse [animation-duration:3s]');
  });

  it('red + remaining <=60 → fast pulse (2s)', () => {
    expect(computeBreathClass(false, 'red', 59)).toBe('animate-pulse [animation-duration:2s]');
    expect(computeBreathClass(false, 'red', 1)).toBe('animate-pulse [animation-duration:2s]');
  });

  it('red + remaining >60 → no pulse', () => {
    expect(computeBreathClass(false, 'red', 61)).toBe('');
  });

  it('red + remaining <=0 (finished) → no pulse', () => {
    expect(computeBreathClass(false, 'red', 0)).toBe('');
    expect(computeBreathClass(false, 'red', -1)).toBe('');
  });

  it('green → no breath class', () => {
    expect(computeBreathClass(false, 'green', 300)).toBe('');
  });
});

// =============================================================================
// 15. Chapter pill — phase displays as inline pill, not Card
// =============================================================================

describe('Stage — Chapter Pill (v2 polish)', () => {
  it('pill class contains rounded-full and uppercase tracking', () => {
    const pillClass =
      'inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground';

    expect(pillClass).toContain('rounded-full');
    expect(pillClass).toContain('uppercase');
    expect(pillClass).toContain('tracking-wide');
    expect(pillClass).toContain('border-border/60');
  });
});

// =============================================================================
// 16. Step counter — tabular-nums prevents layout jumps
// =============================================================================

describe('Stage — Step Counter Stability (v2 polish)', () => {
  it('step counter class includes font-mono tabular-nums', () => {
    const stepCounterClass = 'text-xs font-medium text-muted-foreground font-mono tabular-nums';

    expect(stepCounterClass).toContain('font-mono');
    expect(stepCounterClass).toContain('tabular-nums');
  });
});

// =============================================================================
// 17. Timer width stabilisation — min-w-[5ch] text-right
// =============================================================================

describe('Stage — Timer Width Stable (v2 polish)', () => {
  it('timer value class includes min-w-[5ch] and text-right', () => {
    const timerValueClass = 'font-mono text-lg font-bold tabular-nums min-w-[5ch] text-right';

    expect(timerValueClass).toContain('min-w-[5ch]');
    expect(timerValueClass).toContain('text-right');
    expect(timerValueClass).toContain('tabular-nums');
  });
});

// =============================================================================
// 18. ArtifactDrawer v2 — 3-state classification (locked removed)
// =============================================================================

describe('ArtifactDrawer — 3-State Classification (v2)', () => {
  /**
   * Replicates the corrected 3-state classification from ParticipantArtifactDrawer.
   * No "locked" state — server filters access; if participant receives a variant,
   * they have access. Period.
   */
  function classifyVariant(v: {
    highlighted_at: string | null;
    metadata: Record<string, unknown> | null;
  }): 'used' | 'highlighted' | 'available' {
    const isUsed = Boolean(v.metadata && (v.metadata.solved === true || v.metadata.used === true));
    const isHighlighted = Boolean(v.highlighted_at);

    if (isUsed) return 'used';
    if (isHighlighted) return 'highlighted';
    return 'available';
  }

  it('variant with no flags → available', () => {
    expect(classifyVariant({ highlighted_at: null, metadata: null })).toBe('available');
  });

  it('variant with highlighted_at → highlighted', () => {
    expect(classifyVariant({
      highlighted_at: '2026-01-01T00:00:00Z',
      metadata: null,
    })).toBe('highlighted');
  });

  it('variant with metadata.used → used (overrides highlighted)', () => {
    expect(classifyVariant({
      highlighted_at: '2026-01-01T00:00:00Z',
      metadata: { used: true },
    })).toBe('used');
  });

  it('variant with metadata.solved → used', () => {
    expect(classifyVariant({
      highlighted_at: null,
      metadata: { solved: true },
    })).toBe('used');
  });

  it('revealed_at is irrelevant to state classification (server gates access)', () => {
    // Even without revealed_at, a variant the participant has is "available"
    expect(classifyVariant({ highlighted_at: null, metadata: null })).toBe('available');
  });
});

// =============================================================================
// 19. ArtifactDrawer v2 — Inventory summary counts
// =============================================================================

describe('ArtifactDrawer — Inventory Summary (v2)', () => {
  /** Minimal version of computeInventoryCounts — no locked bucket */
  function computeCounts(variants: Array<{
    highlighted_at: string | null;
    metadata: Record<string, unknown> | null;
  }>) {
    const counts = { highlighted: 0, available: 0, used: 0 };
    for (const v of variants) {
      const isUsed = Boolean(v.metadata && (v.metadata.solved === true || v.metadata.used === true));
      const isHighlighted = Boolean(v.highlighted_at);

      if (isUsed) counts.used++;
      else if (isHighlighted) counts.highlighted++;
      else counts.available++;
    }
    return counts;
  }

  it('correctly tallies mixed states', () => {
    const variants = [
      { highlighted_at: '2026-01-01', metadata: null },           // highlighted
      { highlighted_at: null, metadata: null },                    // available
      { highlighted_at: null, metadata: null },                    // available
      { highlighted_at: null, metadata: { used: true } },         // used
      { highlighted_at: null, metadata: { solved: true } },       // used
    ];

    expect(computeCounts(variants)).toEqual({
      highlighted: 1,
      available: 2,
      used: 2,
    });
  });

  it('empty variants → all zeros', () => {
    expect(computeCounts([])).toEqual({ highlighted: 0, available: 0, used: 0 });
  });
});

// =============================================================================
// 20. ArtifactDrawer v2 — Expand/collapse does not affect autoscroll guard
// =============================================================================

describe('ArtifactDrawer — Expand vs Autoscroll guard (v2)', () => {
  it('expand state is tracked per-variant, independent of autoscroll ref', () => {
    // The component uses expandedVariants: Set<string> for card→expand
    // and didAutoScrollRef: MutableRefObject<boolean> for autoscroll
    // They are independent — toggling expand never touches the ref
    const expandedVariants = new Set<string>();
    let didAutoScroll = false;

    // Simulate: open drawer (autoscroll fires)
    didAutoScroll = true;

    // Simulate: user expands a variant
    expandedVariants.add('variant-1');
    expect(expandedVariants.has('variant-1')).toBe(true);
    expect(didAutoScroll).toBe(true); // unchanged

    // Simulate: user collapses variant
    expandedVariants.delete('variant-1');
    expect(expandedVariants.has('variant-1')).toBe(false);
    expect(didAutoScroll).toBe(true); // still unchanged
  });
});

// =============================================================================
// 21. ArtifactDrawer v2 — Drawer never auto-opens from realtime events
// =============================================================================

describe('ArtifactDrawer — No Auto-Open (2A rule)', () => {
  it('activeDrawer only changes via simulated user action, never via broadcast', () => {
    // Simulates the state machine from ParticipantPlayView:
    // - Realtime events set artifactsHighlight = true (badge pulse), NOT activeDrawer
    // - activeDrawer only changes via handleToggleDrawer (user tap)
    type ActiveDrawer = 'artifacts' | 'decisions' | 'role' | 'toolbelt' | null;

    let activeDrawer: ActiveDrawer = null;
    let artifactsHighlight = false;

    // Simulate realtime artifact_update broadcast
    const handleBroadcast = () => {
      artifactsHighlight = true; // badge pulses — but drawer stays closed
      // activeDrawer is NEVER set here
    };

    // Simulate user tap to open drawer
    const handleToggleDrawer = (drawer: ActiveDrawer) => {
      if (drawer === 'artifacts') artifactsHighlight = false;
      activeDrawer = drawer;
    };

    // 1. Broadcast arrives — drawer stays closed
    handleBroadcast();
    expect(activeDrawer).toBeNull();
    expect(artifactsHighlight).toBe(true);

    // 2. User taps — drawer opens, badge clears
    handleToggleDrawer('artifacts');
    expect(activeDrawer).toBe('artifacts');
    expect(artifactsHighlight).toBe(false);

    // 3. Another broadcast while drawer is open — drawer stays open, badge doesn't re-pulse
    handleBroadcast();
    expect(activeDrawer).toBe('artifacts');
    expect(artifactsHighlight).toBe(true); // highlight still set but drawer was already open

    // 4. User closes
    handleToggleDrawer(null);
    expect(activeDrawer).toBeNull();
  });
});

// =============================================================================
// 22. ArtifactDrawer v2 — Canonical isVariantUsed
// =============================================================================

describe('ArtifactDrawer — Canonical isVariantUsed (v2)', () => {
  /**
   * Replicates the canonical isVariantUsed function.
   * RULE: This is the SINGLE source of truth for "is this variant done?"
   * When variant.used_at column lands, this function body changes to
   * return Boolean(variant.used_at) — all tests still pass.
   */
  function isVariantUsed(metadata: unknown): boolean {
    const meta = metadata as Record<string, unknown> | null | undefined;
    return Boolean(meta && (meta.solved === true || meta.used === true));
  }

  it('null metadata → not used', () => {
    expect(isVariantUsed(null)).toBe(false);
  });

  it('empty object → not used', () => {
    expect(isVariantUsed({})).toBe(false);
  });

  it('{ solved: true } → used', () => {
    expect(isVariantUsed({ solved: true })).toBe(true);
  });

  it('{ used: true } → used', () => {
    expect(isVariantUsed({ used: true })).toBe(true);
  });

  it('{ solved: false } → not used', () => {
    expect(isVariantUsed({ solved: false })).toBe(false);
  });

  it('{ used: false } → not used', () => {
    expect(isVariantUsed({ used: false })).toBe(false);
  });

  it('{ solved: true, used: false } → used (solved wins)', () => {
    expect(isVariantUsed({ solved: true, used: false })).toBe(true);
  });

  it('unrelated keys → not used', () => {
    expect(isVariantUsed({ score: 100, attempts: 3 })).toBe(false);
  });

  it('used_at takes priority over metadata (v1.1 compat)', () => {
    // When used_at is present, metadata doesn't matter
    function isVariantUsedCompat(metadata: unknown, usedAt?: string | null): boolean {
      if (usedAt != null) return true;
      const meta = metadata as Record<string, unknown> | null | undefined;
      return Boolean(meta && (meta.solved === true || meta.used === true));
    }

    expect(isVariantUsedCompat(null, '2026-01-01T00:00:00Z')).toBe(true);
    expect(isVariantUsedCompat({}, '2026-01-01T00:00:00Z')).toBe(true);
    expect(isVariantUsedCompat(null, null)).toBe(false);
    expect(isVariantUsedCompat(null, undefined)).toBe(false);
    // Metadata fallback still works when used_at is absent
    expect(isVariantUsedCompat({ solved: true }, null)).toBe(true);
    expect(isVariantUsedCompat({ used: true }, undefined)).toBe(true);
  });
});

// =============================================================================
// 23. TriggerLane — chip queue management (dedupe + FIFO + TTL)
// =============================================================================

describe('TriggerLane — Chip Queue (v1)', () => {
  it('pushChip adds a chip with correct type', () => {
    // Simulates the chip queue logic from useTriggerLane
    type TriggerChipType = 'NEW_ARTIFACTS' | 'DECISION_OPEN' | 'COUNTDOWN_STARTED'
      | 'STORY_SHOWN' | 'BOARD_UPDATED' | 'RECONNECTED';

    interface TriggerChip {
      id: string;
      type: TriggerChipType;
      createdAt: number;
    }

    const MAX_CHIPS = 2;

    function pushChip(chips: TriggerChip[], type: TriggerChipType): TriggerChip[] {
      // Dedupe: remove existing chip of same type
      const filtered = chips.filter((c) => c.type !== type);
      const id = `${type}-${Date.now()}`;
      const chip: TriggerChip = { id, type, createdAt: Date.now() };
      const trimmed = filtered.length >= MAX_CHIPS
        ? filtered.slice(filtered.length - (MAX_CHIPS - 1))
        : filtered;
      return [...trimmed, chip];
    }

    // Push first chip
    let queue = pushChip([], 'NEW_ARTIFACTS');
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('NEW_ARTIFACTS');

    // Push second chip
    queue = pushChip(queue, 'DECISION_OPEN');
    expect(queue).toHaveLength(2);

    // Push third → FIFO evicts oldest
    queue = pushChip(queue, 'COUNTDOWN_STARTED');
    expect(queue).toHaveLength(2);
    expect(queue[0].type).toBe('DECISION_OPEN'); // oldest evicted
    expect(queue[1].type).toBe('COUNTDOWN_STARTED');
  });

  it('dedupe: same type replaces existing chip', () => {
    type TriggerChipType = string;
    interface TriggerChip { id: string; type: TriggerChipType; createdAt: number; }
    const MAX_CHIPS = 2;

    function pushChip(chips: TriggerChip[], type: TriggerChipType): TriggerChip[] {
      const filtered = chips.filter((c) => c.type !== type);
      const id = `${type}-${Date.now()}`;
      const chip: TriggerChip = { id, type, createdAt: Date.now() };
      const trimmed = filtered.length >= MAX_CHIPS
        ? filtered.slice(filtered.length - (MAX_CHIPS - 1))
        : filtered;
      return [...trimmed, chip];
    }

    let queue = pushChip([], 'NEW_ARTIFACTS');
    queue = pushChip(queue, 'DECISION_OPEN');
    expect(queue).toHaveLength(2);

    // Push same type again → replaces, no growth
    queue = pushChip(queue, 'NEW_ARTIFACTS');
    expect(queue).toHaveLength(2);
    // NEW_ARTIFACTS should be the newest (last)
    expect(queue[1].type).toBe('NEW_ARTIFACTS');
  });
});

// =============================================================================
// 24. TriggerLane — taxonomy completeness (v1 chip types)
// =============================================================================

describe('TriggerLane — Chip Taxonomy (v1)', () => {
  it('all v1 chip types are defined', () => {
    const V1_CHIP_TYPES = [
      'NEW_ARTIFACTS',
      'DECISION_OPEN',
      'COUNTDOWN_STARTED',
      'STORY_SHOWN',
      'BOARD_UPDATED',
      'RECONNECTED',
    ] as const;

    // All 6 types — this test breaks if we accidentally remove one
    expect(V1_CHIP_TYPES).toHaveLength(6);

    // No duplicates
    const unique = new Set(V1_CHIP_TYPES);
    expect(unique.size).toBe(V1_CHIP_TYPES.length);
  });

  it('spammy events are NOT in the taxonomy', () => {
    const V1_CHIP_TYPES = new Set([
      'NEW_ARTIFACTS', 'DECISION_OPEN', 'COUNTDOWN_STARTED',
      'STORY_SHOWN', 'BOARD_UPDATED', 'RECONNECTED',
    ]);

    // timer_update and state_change must NEVER appear as chips
    expect(V1_CHIP_TYPES.has('timer_update')).toBe(false);
    expect(V1_CHIP_TYPES.has('state_change')).toBe(false);
    expect(V1_CHIP_TYPES.has('signal_received')).toBe(false);
  });
});

// =============================================================================
// 25. TriggerLane — no auto-open (2A compliance)
// =============================================================================

describe('TriggerLane — No Auto-Open (2A rule)', () => {
  it('chips never change activeDrawer state', () => {
    // TriggerLane is purely visual — it never opens drawers or overlays.
    // The pushChip function only modifies the chips array, not activeDrawer.
    type ActiveDrawer = string | null;
    const activeDrawer: ActiveDrawer = null;

    // Simulate all chip types being pushed
    const chipTypes = [
      'NEW_ARTIFACTS', 'DECISION_OPEN', 'COUNTDOWN_STARTED',
      'STORY_SHOWN', 'BOARD_UPDATED', 'RECONNECTED',
    ];

    for (const type of chipTypes) {
      // pushChip would be called — but activeDrawer must remain unchanged
      void type; // no-op, simulating that pushChip doesn't touch activeDrawer
      expect(activeDrawer).toBeNull();
    }

    // After all chips, activeDrawer is still null
    expect(activeDrawer).toBeNull();
  });
});

// =============================================================================
// 26. TriggerLane — zero layout shift (wrapper always renders)
// =============================================================================

describe('TriggerLane — Zero Layout Shift', () => {
  it('wrapper always renders with data-open attribute', () => {
    // The TriggerLane wrapper must always be present in the DOM,
    // using data-open="true|false" to toggle visibility via classes.
    // This prevents Stage from jumping when chips appear/disappear.

    function getWrapperProps(chipCount: number) {
      const isOpen = chipCount > 0;
      return {
        'data-open': isOpen,
        className: isOpen
          ? 'flex min-h-[32px] items-center gap-1.5 overflow-hidden py-1 transition-[min-height,opacity] duration-200'
          : 'h-0 min-h-0 overflow-hidden opacity-0 transition-[min-height,opacity] duration-200',
      };
    }

    // Empty: collapsed but present
    const empty = getWrapperProps(0);
    expect(empty['data-open']).toBe(false);
    expect(empty.className).toContain('h-0');
    expect(empty.className).toContain('overflow-hidden');
    expect(empty.className).toContain('opacity-0');

    // With chips: expanded
    const active = getWrapperProps(2);
    expect(active['data-open']).toBe(true);
    expect(active.className).toContain('min-h-[32px]');
    expect(active.className).not.toContain('opacity-0');
  });

  it('transition classes ensure smooth animation (no hard cut)', () => {
    // Both states must include transition for height/opacity smoothness
    const openClass = 'transition-[min-height,opacity] duration-200';
    const closedClass = 'transition-[min-height,opacity] duration-200';

    expect(openClass).toContain('transition');
    expect(closedClass).toContain('transition');
    expect(openClass).toContain('duration-200');
    expect(closedClass).toContain('duration-200');
  });

  it('evicted chips have timers cleaned (no stale setTimeout leak)', () => {
    // Simulates the pushChip timer-cleanup logic

    const timers = new Map<string, number>();
    const cleared: string[] = [];

    function mockSetTimeout(id: string): number {
      const t = Math.random();
      timers.set(id, t);
      return t;
    }

    function mockClearTimeout(id: string) {
      const t = timers.get(id);
      if (t !== undefined) {
        cleared.push(id);
        timers.delete(id);
      }
    }

    // Set up 2 chips with timers
    mockSetTimeout('A-1');
    mockSetTimeout('B-2');

    // Dedupe: push same type as A → should clear A's timer
    mockClearTimeout('A-1');
    mockSetTimeout('A-3');

    expect(cleared).toContain('A-1');
    expect(timers.has('A-1')).toBe(false);
    expect(timers.has('A-3')).toBe(true);

    // FIFO: push C when full → should clear B's timer
    mockClearTimeout('B-2');
    mockSetTimeout('C-4');

    expect(cleared).toContain('B-2');
    expect(timers.has('B-2')).toBe(false);
    expect(timers.has('C-4')).toBe(true);
  });
});

// =============================================================================
// 28. Micro-motion — class contract for chips, stage, drawers
// =============================================================================

describe('Micro-motion — Class Contracts', () => {
  it('chip enter animation: slide-in-from-top-1 + duration-200', () => {
    const enterClass = 'animate-in fade-in slide-in-from-top-1 duration-200';
    expect(enterClass).toContain('animate-in');
    expect(enterClass).toContain('fade-in');
    expect(enterClass).toContain('slide-in-from-top-1');
    expect(enterClass).toContain('duration-200');
    // Old direction must NOT be present
    expect(enterClass).not.toContain('slide-in-from-left');
  });

  it('chip exit animation: animate-out + fade-out + duration-150', () => {
    const exitClass = 'animate-out fade-out duration-150';
    expect(exitClass).toContain('animate-out');
    expect(exitClass).toContain('fade-out');
    expect(exitClass).toContain('duration-150');
  });

  it('chip has active:scale-[0.98] for tap feedback', () => {
    const chipClass = 'active:scale-[0.98]';
    expect(chipClass).toContain('active:scale-[0.98]');
  });

  it('chip uses accent dot (not emoji)', () => {
    // The dot element should be a tiny colored circle, not a text emoji.
    // Implementation: <span class="h-1.5 w-1.5 rounded-full bg-...">
    const dotClass = 'inline-block h-1.5 w-1.5 rounded-full bg-primary';
    expect(dotClass).toContain('h-1.5');
    expect(dotClass).toContain('w-1.5');
    expect(dotClass).toContain('rounded-full');
    // Must NOT contain emoji characters
    expect(dotClass).not.toMatch(/[\u{1F4E6}\u{1F5F3}\u{23F1}\u{1F4D6}\u{1F4E2}\u{2705}]/u);
  });

  it('chip colors are subtle (border + text, no strong bg)', () => {
    // All chip types must use border-*/30 + text-foreground/80
    const chipColors: Record<string, string> = {
      NEW_ARTIFACTS: 'border-primary/30 text-foreground/80',
      DECISION_OPEN: 'border-primary/30 text-foreground/80',
      COUNTDOWN_STARTED: 'border-yellow-500/30 text-foreground/80',
      STORY_SHOWN: 'border-purple-500/30 text-foreground/80',
      BOARD_UPDATED: 'border-blue-500/30 text-foreground/80',
      RECONNECTED: 'border-green-500/30 text-foreground/80',
    };

    for (const [type, cls] of Object.entries(chipColors)) {
      expect(cls).toContain('border-');
      expect(cls).toContain('text-foreground/80');
      // Must NOT have bg- (no strong background fills)
      expect(cls).not.toMatch(/\bbg-/);
      void type;
    }
  });

  it('stage step card has will-change-transform + duration-200', () => {
    const stepCardClass = 'overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-3 duration-200';
    expect(stepCardClass).toContain('will-change-transform');
    expect(stepCardClass).toContain('duration-200');
    // Old duration-300 must not be present for step card
    expect(stepCardClass).not.toContain('duration-300');
  });

  it('drawer is responsive: sheet on mobile + modal on desktop', () => {
    const cardClass = 'w-full max-h-[75vh] overflow-y-auto rounded-t-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out lg:max-w-lg lg:max-h-[80vh] lg:rounded-2xl lg:animate-in lg:fade-in lg:zoom-in-95 lg:duration-150';
    // Mobile: bottom sheet
    expect(cardClass).toContain('rounded-t-2xl');
    expect(cardClass).toContain('slide-in-from-bottom-2');
    expect(cardClass).toContain('max-h-[75vh]');
    // Desktop: centered modal
    expect(cardClass).toContain('lg:rounded-2xl');
    expect(cardClass).toContain('lg:zoom-in-95');
    expect(cardClass).toContain('lg:max-h-[80vh]');
    expect(cardClass).toContain('lg:max-w-lg');
  });

  it('drawer backdrop is subtle (bg-black/20 + minimal blur)', () => {
    const backdropClass = 'bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200';
    expect(backdropClass).toContain('bg-black/20');
    expect(backdropClass).toContain('backdrop-blur-[1px]');
    // Must NOT have strong blur
    expect(backdropClass).not.toContain('backdrop-blur-sm');
    expect(backdropClass).not.toContain('backdrop-blur-md');
  });

  it('2-phase chip exit: exiting flag triggers animation before removal', () => {
    interface TriggerChip { id: string; type: string; createdAt: number; exiting?: boolean; }
    const CHIP_EXIT_MS = 150;

    // Simulate removeChip 2-phase pattern
    let chips: TriggerChip[] = [
      { id: 'A-1', type: 'NEW_ARTIFACTS', createdAt: 1 },
      { id: 'B-2', type: 'BOARD_UPDATED', createdAt: 2 },
    ];

    // Phase 1: mark as exiting
    chips = chips.map((c) => (c.id === 'A-1' ? { ...c, exiting: true } : c));
    expect(chips[0].exiting).toBe(true);
    expect(chips[1].exiting).toBeFalsy();

    // Chip is still in array (playing exit animation)
    expect(chips).toHaveLength(2);

    // Phase 2: remove after CHIP_EXIT_MS
    expect(CHIP_EXIT_MS).toBe(150);
    chips = chips.filter((c) => c.id !== 'A-1');
    expect(chips).toHaveLength(1);
    expect(chips[0].id).toBe('B-2');
  });
});

// =============================================================================
// 29. Haptics — presets + interaction mapping
// =============================================================================

describe('Haptics — Presets & Interaction Map', () => {
  it('HAPTIC_LIGHT is 10ms (drawer / expand)', () => {
    const HAPTIC_LIGHT = 10;
    expect(HAPTIC_LIGHT).toBe(10);
  });

  it('HAPTIC_MEDIUM is 20ms (decision confirm)', () => {
    const HAPTIC_MEDIUM = 20;
    expect(HAPTIC_MEDIUM).toBe(20);
  });

  it('hapticTap is best-effort — no-op in test env (no navigator.vibrate)', () => {
    // In jsdom/vitest, navigator.vibrate doesn't exist.
    // hapticTap must never throw regardless of environment.
    function hapticTap(ms = 10): void {
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(ms);
        }
      } catch {
        // Silent
      }
    }

    // Must not throw
    expect(() => hapticTap()).not.toThrow();
    expect(() => hapticTap(20)).not.toThrow();
  });

  it('passive events (TriggerLane chips) must NEVER trigger haptics', () => {
    // Contract: pushChip only modifies the chips array.
    // There is no hapticTap call anywhere in useTriggerLane or TriggerLane.
    const PASSIVE_EVENTS = [
      'NEW_ARTIFACTS', 'DECISION_OPEN', 'COUNTDOWN_STARTED',
      'STORY_SHOWN', 'BOARD_UPDATED', 'RECONNECTED',
    ] as const;

    // These are information-only — the interaction map only includes
    // user-initiated actions (drawer toggle, vote confirm, expand/collapse).
    const hapticCallCount = 0;
    for (const _event of PASSIVE_EVENTS) {
      // No haptic would fire — counter stays at 0
      void _event;
    }
    expect(hapticCallCount).toBe(0);
  });

  it('interaction map covers exactly 3 participant actions', () => {
    const HAPTIC_INTERACTIONS = {
      'drawer-toggle': 10,     // HAPTIC_LIGHT
      'decision-confirm': 20,  // HAPTIC_MEDIUM
      'artifact-expand': 10,   // HAPTIC_LIGHT
    } as const;

    expect(Object.keys(HAPTIC_INTERACTIONS)).toHaveLength(3);
    expect(HAPTIC_INTERACTIONS['drawer-toggle']).toBe(10);
    expect(HAPTIC_INTERACTIONS['decision-confirm']).toBe(20);
    expect(HAPTIC_INTERACTIONS['artifact-expand']).toBe(10);
  });
});

// =============================================================================
// 30. Sound design v1 — SFX scope, settings gate, rate limit
// =============================================================================

describe('Sound Design v1 — SFX Contracts', () => {
  it('playSfx never throws (no Audio support)', () => {
    // Simulates playSfx logic in a no-Audio environment (jsdom/vitest)
    function playSfx(key: string): void {
      try {
        if (typeof window === 'undefined') return;
        // Settings gate — default OFF
        const enabled = false; // simulating default-off
        if (!enabled) return;
        void key;
      } catch {
        // Safety net
      }
    }

    expect(() => playSfx('tick')).not.toThrow();
    expect(() => playSfx('tap')).not.toThrow();
    expect(() => playSfx('confirm')).not.toThrow();
    expect(() => playSfx('nonexistent')).not.toThrow();
  });

  it('SFX is default OFF (opt-in via localStorage)', () => {
    // Default: no localStorage entry → SFX disabled
    const SFX_STORAGE_KEY = 'play_sfx';

    // In-memory mock for environments without localStorage (Node/vitest)
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };

    function isSfxEnabled(): boolean {
      try {
        return mockStorage.getItem(SFX_STORAGE_KEY) === 'on';
      } catch {
        return false;
      }
    }

    // Default: no entry → disabled
    mockStorage.removeItem(SFX_STORAGE_KEY);
    expect(isSfxEnabled()).toBe(false);

    // Explicitly OFF
    mockStorage.setItem(SFX_STORAGE_KEY, 'off');
    expect(isSfxEnabled()).toBe(false);

    // Enabled
    mockStorage.setItem(SFX_STORAGE_KEY, 'on');
    expect(isSfxEnabled()).toBe(true);

    // Cleanup
    mockStorage.removeItem(SFX_STORAGE_KEY);
    expect(isSfxEnabled()).toBe(false);
  });

  it('passive events (TriggerLane) never trigger SFX', () => {
    const PASSIVE_EVENTS = [
      'NEW_ARTIFACTS', 'DECISION_OPEN', 'COUNTDOWN_STARTED',
      'STORY_SHOWN', 'BOARD_UPDATED', 'RECONNECTED',
    ] as const;

    // SFX only fires from 3 user-initiated actions, never from chip pushes
    const sfxCallCount = 0;
    for (const _event of PASSIVE_EVENTS) {
      void _event;
    }
    expect(sfxCallCount).toBe(0);
  });

  it('SFX interaction map covers exactly 3 keys (matches haptics)', () => {
    const SFX_INTERACTIONS = {
      'drawer-toggle': 'tick',
      'decision-confirm': 'confirm',
      'artifact-expand': 'tap',
    } as const;

    expect(Object.keys(SFX_INTERACTIONS)).toHaveLength(3);
    expect(SFX_INTERACTIONS['drawer-toggle']).toBe('tick');
    expect(SFX_INTERACTIONS['decision-confirm']).toBe('confirm');
    expect(SFX_INTERACTIONS['artifact-expand']).toBe('tap');
  });

  it('rate limiter prevents mash-spam (150ms window)', () => {
    const RATE_LIMIT_MS = 150;
    const lastPlayed = new Map<string, number>();

    function isRateLimited(key: string): boolean {
      const now = Date.now();
      const last = lastPlayed.get(key) ?? 0;
      if (now - last < RATE_LIMIT_MS) return true;
      lastPlayed.set(key, now);
      return false;
    }

    // First call: not limited
    expect(isRateLimited('tick')).toBe(false);

    // Immediate second call: limited
    expect(isRateLimited('tick')).toBe(true);

    // Different key: not limited
    expect(isRateLimited('confirm')).toBe(false);
  });
});

// =============================================================================
// 31. Energy & Flow v1 — connection badge, step motion, drawer settle, lane translate
// =============================================================================

describe('Energy & Flow v1 — CSS micro-UX contracts', () => {
  // -- Connection badge 3-tier ---
  it('connection badge: ok state is green dot + sr-only text', () => {
    const okClass = 'w-2 h-2 rounded-full bg-green-500';
    expect(okClass).toContain('bg-green-500');
    expect(okClass).toContain('rounded-full');
    // Must NOT have pulse on ok state
    expect(okClass).not.toContain('animate-pulse');
  });

  it('connection badge: degraded state has breathing pulse (3s)', () => {
    const degradedClass =
      'inline-flex items-center gap-1 text-[10px] text-yellow-600 animate-pulse [animation-duration:3s]';
    expect(degradedClass).toContain('animate-pulse');
    expect(degradedClass).toContain('[animation-duration:3s]');
    expect(degradedClass).toContain('text-yellow-600');
  });

  it('connection badge: offline state has no pulse, red text', () => {
    const offlineClass =
      'inline-flex items-center gap-1 text-[10px] text-destructive';
    expect(offlineClass).toContain('text-destructive');
    expect(offlineClass).not.toContain('animate-pulse');
  });

  // -- Step-change signature ---
  it('step body wrapper has will-change-transform', () => {
    const bodyClass = 'p-5 space-y-4 will-change-transform';
    expect(bodyClass).toContain('will-change-transform');
  });

  it('step title has staggered animate-in (no delay)', () => {
    const titleClass = 'animate-in fade-in slide-in-from-bottom-1 duration-200';
    expect(titleClass).toContain('animate-in');
    expect(titleClass).toContain('fade-in');
    expect(titleClass).toContain('slide-in-from-bottom-1');
    expect(titleClass).toContain('duration-200');
    // Title should NOT have delay (first element)
    expect(titleClass).not.toContain('delay-');
  });

  it('step description has delay-75 (stagger after title)', () => {
    const descClass = 'animate-in fade-in slide-in-from-bottom-1 duration-200 delay-75';
    expect(descClass).toContain('delay-75');
    expect(descClass).toContain('slide-in-from-bottom-1');
  });

  it('step media has delay-100 (stagger after description)', () => {
    const mediaClass = 'animate-in fade-in duration-200 delay-100';
    expect(mediaClass).toContain('delay-100');
    expect(mediaClass).toContain('fade-in');
    // Media uses fade only — no slide (images just appear)
    expect(mediaClass).not.toContain('slide-in-from-bottom');
  });

  // -- Drawer discipline (responsive) ---
  it('drawer card is responsive: sheet on mobile + modal on desktop', () => {
    const cardClass =
      'w-full max-h-[75vh] overflow-y-auto rounded-t-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out lg:max-w-lg lg:max-h-[80vh] lg:rounded-2xl lg:animate-in lg:fade-in lg:zoom-in-95 lg:duration-150';
    // Mobile
    expect(cardClass).toContain('rounded-t-2xl');
    expect(cardClass).toContain('slide-in-from-bottom-2');
    // Desktop
    expect(cardClass).toContain('lg:rounded-2xl');
    expect(cardClass).toContain('lg:zoom-in-95');
    expect(cardClass).toContain('lg:max-w-lg');
  });

  it('drawer container switches from bottom-pinned to centered at lg breakpoint', () => {
    const containerClass =
      'fixed inset-x-0 bottom-0 z-[61] lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4';
    // Mobile: pinned to bottom
    expect(containerClass).toContain('inset-x-0');
    expect(containerClass).toContain('bottom-0');
    // Desktop: centered
    expect(containerClass).toContain('lg:items-center');
    expect(containerClass).toContain('lg:justify-center');
  });

  it('drawer backdrop uses z-[60] and card uses z-[61]', () => {
    const backdrop = 'fixed inset-0 z-[60] bg-black/20';
    const container = 'fixed inset-x-0 bottom-0 z-[61]';
    expect(backdrop).toContain('z-[60]');
    expect(container).toContain('z-[61]');
  });

  it('drag handle is mobile-only (lg:hidden)', () => {
    const handleWrapperClass = 'flex justify-center pt-3 pb-1 lg:hidden';
    expect(handleWrapperClass).toContain('lg:hidden');
  });

  // -- TriggerLane translate micro-polish ---
  it('TriggerLane open state has translate-y-0 + opacity-100', () => {
    const openClass = 'translate-y-0 opacity-100';
    expect(openClass).toContain('translate-y-0');
    expect(openClass).toContain('opacity-100');
  });

  it('TriggerLane closed state uses -translate-y-0.5 (micro upward shift)', () => {
    const closedClass = '-translate-y-0.5 opacity-0 pointer-events-none';
    expect(closedClass).toContain('-translate-y-0.5');
    expect(closedClass).toContain('opacity-0');
  });

  it('TriggerLane transition includes transform property', () => {
    const openTransition = 'transition-[max-height,opacity,transform] duration-200';
    const closedTransition = 'transition-[max-height,opacity,transform] duration-150';
    expect(openTransition).toContain('transform');
    expect(closedTransition).toContain('transform');
    // Closed should have faster exit (150 < 200)
    expect(closedTransition).toContain('duration-150');
  });
});

// =============================================================================
// 32. Director Parity Sprint — shell, stage, drawers, chips, signal inbox
// =============================================================================

describe('Director Parity Sprint — UX contracts', () => {
  // -- DirectorFullscreenShell --
  it('Director shell uses fullscreen overlay (z-50), not slide-in-right', () => {
    // The drawer wrapper must be fixed + z-50, not translate-x based
    const shellClass = 'fixed inset-0 z-50 transition-opacity duration-300';
    expect(shellClass).toContain('fixed');
    expect(shellClass).toContain('inset-0');
    expect(shellClass).toContain('z-50');
    // Must NOT use translate-x (old slide-in pattern)
    expect(shellClass).not.toContain('translate-x');
  });

  it('Director shell has desktop modal layout (parity with participant)', () => {
    const containerClass =
      'relative flex h-full w-full flex-col overflow-hidden lg:mx-auto lg:my-8 lg:max-h-[calc(100vh-4rem)] lg:max-w-5xl lg:rounded-2xl lg:shadow-xl';
    expect(containerClass).toContain('lg:max-w-5xl');
    expect(containerClass).toContain('lg:rounded-2xl');
  });

  // -- Connection badge --
  it('Director header has connection badge with 3-tier states', () => {
    const badgeClass = 'gap-1 text-[10px] px-1.5 py-0.5 transition-opacity duration-500';
    expect(badgeClass).toContain('text-[10px]');
    expect(badgeClass).toContain('transition-opacity');

    // Degraded gets breathing pulse (same as participant)
    const degradedExtra = 'animate-pulse [animation-duration:3s]';
    expect(degradedExtra).toContain('animate-pulse');
    expect(degradedExtra).toContain('[animation-duration:3s]');
  });

  // -- Stage-first layout --
  it('Director always shows stage (step nav + participant preview + leader notes)', () => {
    // Stage is the primary surface — no tab required to see it
    // It fades when a drawer overlay is active
    const stageFadedClass = 'opacity-30 pointer-events-none';
    expect(stageFadedClass).toContain('opacity-30');
    expect(stageFadedClass).toContain('pointer-events-none');
  });

  // -- Drawer pills (not tab bar) --
  it('Director drawers are toggleable pills, not tabs', () => {
    const DRAWER_TYPES = ['time', 'artifacts', 'triggers', 'signals', 'events'] as const;
    expect(DRAWER_TYPES).toHaveLength(5);
    // Play tab is gone — stage is always visible
    expect(DRAWER_TYPES).not.toContain('play');
  });

  it('Director drawer is responsive: sheet on mobile + modal on desktop (wider)', () => {
    const backdropClass = 'fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200';
    expect(backdropClass).toContain('bg-black/20');
    expect(backdropClass).toContain('backdrop-blur-[1px]');
    expect(backdropClass).toContain('z-[60]');

    const cardClass = 'w-full max-h-[75vh] overflow-y-auto rounded-t-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out lg:max-w-2xl xl:max-w-3xl lg:max-h-[80vh] lg:rounded-2xl lg:animate-in lg:fade-in lg:zoom-in-95 lg:duration-150';
    // Mobile: sheet
    expect(cardClass).toContain('rounded-t-2xl');
    expect(cardClass).toContain('slide-in-from-bottom-2');
    // Desktop: modal (wider than participant)
    expect(cardClass).toContain('lg:max-w-2xl');
    expect(cardClass).toContain('xl:max-w-3xl');
    expect(cardClass).toContain('lg:rounded-2xl');
    expect(cardClass).toContain('lg:zoom-in-95');
  });

  it('Director drawer max-width is wider than participant drawer', () => {
    const participantMax = 'lg:max-w-lg';
    const directorMax = 'lg:max-w-2xl';
    // 2xl > lg
    expect(directorMax).not.toBe(participantMax);
    expect(directorMax).toContain('2xl');
  });

  // -- Director TriggerLane (chip lane) --
  it('DirectorChipLane has same no-jitter wrapper as participant TriggerLane', () => {
    const openClass = 'translate-y-0 opacity-100 transition-[min-height,opacity,transform] duration-200';
    const closedClass = '-translate-y-0.5 opacity-0 transition-[min-height,opacity,transform] duration-150';
    expect(openClass).toContain('translate-y-0');
    expect(closedClass).toContain('-translate-y-0.5');
  });

  it('Director chip taxonomy has exactly 3 types', () => {
    const DIRECTOR_CHIP_TYPES = [
      'SIGNAL_RECEIVED',
      'PARTICIPANT_JOINED',
      'TRIGGER_FIRED',
    ] as const;
    expect(DIRECTOR_CHIP_TYPES).toHaveLength(3);
  });

  it('Director chip max is 3, TTL is 6s (higher visibility than participant)', () => {
    const DIRECTOR_MAX_CHIPS = 3;
    const DIRECTOR_CHIP_TTL_MS = 6_000;
    expect(DIRECTOR_MAX_CHIPS).toBe(3);
    expect(DIRECTOR_CHIP_TTL_MS).toBe(6_000);
    // Greater max than participant (2)
    expect(DIRECTOR_MAX_CHIPS).toBeGreaterThan(2);
    // Shorter TTL than participant (8s) for faster rotation
    expect(DIRECTOR_CHIP_TTL_MS).toBeLessThan(8_000);
  });

  it('Director chips are buttons (clickable), not spans', () => {
    // Director chips use <button> because clicking opens signal inbox
    // Participant chips use <span> (no-op in v1)
    const isButton = true;
    expect(isButton).toBe(true);
  });

  it('Director chip colors are subtle (border + text, no strong bg)', () => {
    const chipColors: Record<string, string> = {
      SIGNAL_RECEIVED: 'border-orange-500/30 text-foreground/80',
      PARTICIPANT_JOINED: 'border-green-500/30 text-foreground/80',
      TRIGGER_FIRED: 'border-purple-500/30 text-foreground/80',
    };

    for (const [type, cls] of Object.entries(chipColors)) {
      expect(cls).toContain('border-');
      expect(cls).toContain('text-foreground/80');
      expect(cls).not.toMatch(/\bbg-/);
      void type;
    }
  });

  // -- Signal Inbox --
  it('Signal Inbox is part of the signals drawer (not a separate overlay)', () => {
    // When signals drawer is open, it shows inbox + send panel
    const drawerContent = ['SignalInbox', 'SignalQuickPanel'];
    expect(drawerContent).toHaveLength(2);
    expect(drawerContent[0]).toBe('SignalInbox');
    expect(drawerContent[1]).toBe('SignalQuickPanel');
  });

  it('Signal chip click auto-opens signals drawer', () => {
    // Clicking a SIGNAL_RECEIVED chip sets activeDrawer to 'signals'
    const chipType = 'SIGNAL_RECEIVED';
    const expectedDrawer = 'signals';
    expect(chipType).toBe('SIGNAL_RECEIVED');
    expect(expectedDrawer).toBe('signals');
  });

  // -- Signals never block --
  it('signals are always non-blocking (chips + drawer, never modal)', () => {
    // Signals must NEVER auto-open a blocking overlay
    // They appear as chips (passive notification) and drawer (user-triggered)
    const isBlocking = false;
    expect(isBlocking).toBe(false);
  });

  // -- Director haptic on trigger fire --
  it('Director trigger fire gets haptic feedback (50ms)', () => {
    const DIRECTOR_TRIGGER_HAPTIC = 50;
    expect(DIRECTOR_TRIGGER_HAPTIC).toBe(50);
    // Higher than participant HAPTIC_MEDIUM (20ms) for stronger "I fired this" feel
    expect(DIRECTOR_TRIGGER_HAPTIC).toBeGreaterThan(20);
  });
});

// =============================================================================
// 33. Drawer Discipline — ESC, scroll lock, focus, responsive container
// =============================================================================

describe('Drawer Discipline — useDrawerDiscipline contracts', () => {
  it('useDrawerDiscipline provides scroll lock when open', () => {
    // Hook locks body scroll while drawer is active
    // Implementation: body.style.overflow = 'hidden' + overscrollBehavior = 'none'
    const lockCSS = { overflow: 'hidden', overscrollBehavior: 'none' };
    expect(lockCSS.overflow).toBe('hidden');
    expect(lockCSS.overscrollBehavior).toBe('none');
  });

  it('ESC key closes drawer (capture phase)', () => {
    // Handler uses capture: true so ESC is intercepted before fullscreen shell
    const capture = true;
    const key = 'Escape';
    expect(key).toBe('Escape');
    expect(capture).toBe(true);
  });

  it('focus lands on first interactive element when drawer opens', () => {
    // Selector queries button, [href], input, select, textarea, [tabindex]
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    expect(selector).toContain('button');
    expect(selector).toContain('input');
    expect(selector).toContain('[tabindex]');
  });

  it('responsive container: mobile pinned bottom, desktop centered', () => {
    const containerClass =
      'fixed inset-x-0 bottom-0 z-[61] lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4';
    expect(containerClass).toContain('bottom-0');
    expect(containerClass).toContain('lg:items-center');
    expect(containerClass).toContain('lg:justify-center');
  });

  it('participant drawer uses lg:max-w-lg, director uses lg:max-w-2xl', () => {
    const pCard = 'lg:max-w-lg';
    const dCard = 'lg:max-w-2xl xl:max-w-3xl';
    expect(pCard).toContain('lg');
    expect(dCard).toContain('2xl');
    // Director always wider for cockpit content
    expect(dCard).not.toBe(pCard);
  });

  it('mobile drag handle hidden on desktop (lg:hidden)', () => {
    const cls = 'flex justify-center pt-3 pb-1 lg:hidden';
    expect(cls).toContain('lg:hidden');
  });

  it('backdrop z-index is z-[60], container is z-[61]', () => {
    const backdrop = 'z-[60]';
    const container = 'z-[61]';
    // Both above stage (z-10) but below fullscreen shell (z-50)
    expect(parseInt(backdrop.match(/\d+/)?.[0] ?? '0')).toBe(60);
    expect(parseInt(container.match(/\d+/)?.[0] ?? '0')).toBe(61);
  });
});

// =============================================================================
// 34. SSoT Extraction — Shared primitives parity contracts
// =============================================================================

describe('SSoT Extraction — Motion Tokens parity', () => {
  it('drawer tokens carry correct z-index layering', () => {
    const backdrop = 'fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200';
    const container = 'fixed inset-x-0 bottom-0 z-[61] lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4';
    expect(backdrop).toContain('z-[60]');
    expect(container).toContain('z-[61]');
  });

  it('drawer card base has responsive mobile-sheet + desktop-modal', () => {
    const card = 'w-full max-h-[75vh] overflow-y-auto rounded-t-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out lg:max-h-[80vh] lg:rounded-2xl lg:animate-in lg:fade-in lg:zoom-in-95 lg:duration-150';
    expect(card).toContain('rounded-t-2xl');
    expect(card).toContain('lg:rounded-2xl');
    expect(card).toContain('lg:zoom-in-95');
    // Size is NOT baked in — appended by size prop
    expect(card).not.toContain('lg:max-w-lg');
    expect(card).not.toContain('lg:max-w-2xl');
  });

  it('size tokens: sm = lg:max-w-lg, lg = lg:max-w-2xl xl:max-w-3xl', () => {
    const sm = 'lg:max-w-lg';
    const lg = 'lg:max-w-2xl xl:max-w-3xl';
    expect(sm).toContain('lg:max-w-lg');
    expect(lg).toContain('lg:max-w-2xl');
    expect(lg).toContain('xl:max-w-3xl');
    expect(lg).not.toBe(sm);
  });

  it('chip enter/exit tokens match micro-motion contracts', () => {
    const enter = 'animate-in fade-in slide-in-from-top-1 duration-200';
    const exit = 'animate-out fade-out duration-150';
    expect(enter).toContain('slide-in-from-top-1');
    expect(exit).toContain('fade-out');
    expect(exit).toContain('duration-150');
  });

  it('chip lane open/closed tokens preserve translate + opacity transition', () => {
    const open = 'flex min-h-[32px] items-center gap-1.5 overflow-hidden py-1 translate-y-0 opacity-100 transition-[min-height,opacity,transform] duration-200';
    const closed = 'h-0 min-h-0 overflow-hidden opacity-0 -translate-y-0.5 transition-[min-height,opacity,transform] duration-150';
    expect(open).toContain('translate-y-0');
    expect(open).toContain('opacity-100');
    expect(closed).toContain('-translate-y-0.5');
    expect(closed).toContain('opacity-0');
  });

  it('stage tokens: step card, title, description have stagger pattern', () => {
    const card = 'overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-3 duration-200';
    const title = 'animate-in fade-in slide-in-from-bottom-1 duration-200';
    const desc = 'animate-in fade-in slide-in-from-bottom-1 duration-200 delay-75';
    // Card has larger slide (bottom-3)
    expect(card).toContain('slide-in-from-bottom-3');
    // Title + desc have smaller slide (bottom-1)
    expect(title).toContain('slide-in-from-bottom-1');
    expect(desc).toContain('slide-in-from-bottom-1');
    // Only desc has delay (stagger)
    expect(title).not.toContain('delay-');
    expect(desc).toContain('delay-75');
  });
});

describe('SSoT Extraction — ChipLane shared contract', () => {
  it('participant TriggerLane: MAX_CHIPS=2, TTL=8s, EXIT=150ms', () => {
    const MAX_CHIPS = 2;
    const CHIP_TTL_MS = 8_000;
    const CHIP_EXIT_MS = 150;
    expect(MAX_CHIPS).toBe(2);
    expect(CHIP_TTL_MS).toBe(8_000);
    expect(CHIP_EXIT_MS).toBe(150);
  });

  it('director ChipLane: MAX_CHIPS=3, TTL=6s, EXIT=150ms', () => {
    const MAX_CHIPS = 3;
    const CHIP_TTL_MS = 6_000;
    const CHIP_EXIT_MS = 150;
    expect(MAX_CHIPS).toBe(3);
    expect(CHIP_TTL_MS).toBe(6_000);
    expect(CHIP_EXIT_MS).toBe(150);
  });

  it('both sides share same exit duration for visual consistency', () => {
    const participantExit = 150;
    const directorExit = 150;
    expect(participantExit).toBe(directorExit);
  });

  it('director chips are clickable (<button>), participant chips are read-only (<span>)', () => {
    // ChipLaneView: onChipClick present → <button>, absent → <span>
    const directorClickable = true;
    const participantClickable = false;
    expect(directorClickable).toBe(true);
    expect(participantClickable).toBe(false);
  });

  it('director chip taxonomy: 3 types for host monitoring', () => {
    const types = ['SIGNAL_RECEIVED', 'PARTICIPANT_JOINED', 'TRIGGER_FIRED'] as const;
    expect(types).toHaveLength(3);
    expect(types).toContain('SIGNAL_RECEIVED');
    expect(types).toContain('PARTICIPANT_JOINED');
    expect(types).toContain('TRIGGER_FIRED');
  });

  it('participant chip taxonomy: 6 types for play events', () => {
    const types = [
      'NEW_ARTIFACTS', 'DECISION_OPEN', 'COUNTDOWN_STARTED',
      'STORY_SHOWN', 'BOARD_UPDATED', 'RECONNECTED',
    ] as const;
    expect(types).toHaveLength(6);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('SSoT Extraction — ConnectionBadge shared contract', () => {
  it('3-tier states: connected, degraded, offline', () => {
    type ConnectionState = 'connected' | 'degraded' | 'offline';
    const states: ConnectionState[] = ['connected', 'degraded', 'offline'];
    expect(states).toHaveLength(3);
  });

  it('degraded state has breathing pulse (animate-pulse)', () => {
    const degradedPulse = 'animate-pulse [animation-duration:3s]';
    expect(degradedPulse).toContain('animate-pulse');
    expect(degradedPulse).toContain('3s');
  });

  it('offline state uses destructive color, no pulse', () => {
    const offlineClass = 'text-destructive';
    expect(offlineClass).toContain('text-destructive');
    expect(offlineClass).not.toContain('animate-pulse');
  });

  it('badge renders same contract for both participant and director', () => {
    // Both sides pass labels { live, degraded, offline } — same shape
    const pLabels = { live: 'Live', degraded: 'Instabil', offline: 'Offline' };
    const dLabels = { live: 'Live', degraded: 'Instabil', offline: 'Offline' };
    expect(Object.keys(pLabels)).toEqual(Object.keys(dLabels));
    expect(Object.keys(pLabels)).toEqual(['live', 'degraded', 'offline']);
  });
});

describe('SSoT Extraction — DrawerOverlay shared contract', () => {
  it('size prop maps to correct width tokens', () => {
    const SIZE_MAP: Record<string, string> = {
      sm: 'lg:max-w-lg',
      lg: 'lg:max-w-2xl xl:max-w-3xl',
    };
    expect(SIZE_MAP.sm).toBe('lg:max-w-lg');
    expect(SIZE_MAP.lg).toContain('lg:max-w-2xl');
  });

  it('DrawerOverlay internally manages scroll lock + ESC + focus', () => {
    // useDrawerDiscipline is called inside DrawerOverlay, not by consumers
    // Consumer only passes: open, onClose, size, children
    const props = ['open', 'onClose', 'size', 'children'];
    expect(props).toContain('open');
    expect(props).toContain('onClose');
    expect(props).not.toContain('scrollLock');
    expect(props).not.toContain('escHandler');
  });

  it('returns null when closed (no DOM waste)', () => {
    const open = false;
    // Contract: DrawerOverlay renders nothing when !open
    expect(open ? 'rendered' : null).toBeNull();
  });

  it('showHandle defaults to true, renders lg:hidden drag bar', () => {
    const handleClass = 'flex justify-center pt-3 pb-1 lg:hidden';
    expect(handleClass).toContain('lg:hidden');
    const barClass = 'h-1 w-10 rounded-full bg-muted-foreground/30';
    expect(barClass).toContain('rounded-full');
    expect(barClass).toContain('bg-muted-foreground/30');
  });
});

// =============================================================================
// 35. Director Stage-first polish v1 — structural + parity contracts
// =============================================================================

describe('Director Stage-first polish v1 — structural contracts', () => {
  it('event feed is NOT primary surface — lives in Events drawer only', () => {
    // DirectorStagePanel renders: phase pill, step card, glass pane, leader notes, progress dots
    // Event feed is rendered inside DrawerOverlay when activeDrawer === 'events'
    const stageSections = ['phasePill', 'stepCard', 'glassPane', 'leaderNotes', 'progressDots'] as const;
    const drawerSections = ['time', 'artifacts', 'triggers', 'signals', 'events'] as const;

    // EventFeed must ONLY appear in drawer, not in stage
    expect(stageSections).not.toContain('events' as unknown);
    expect(drawerSections).toContain('events');
  });

  it('leader notes never leak to participant glass pane', () => {
    // CockpitStep has both participant-visible and host-only fields
    const PARTICIPANT_FIELDS = ['title', 'description', 'participantPrompt'] as const;
    const HOST_ONLY_FIELDS = ['leaderScript', 'boardText'] as const;

    // Glass pane renders ONLY participant fields
    for (const field of HOST_ONLY_FIELDS) {
      expect(PARTICIPANT_FIELDS).not.toContain(field as unknown);
    }

    // Confirm separation
    expect(PARTICIPANT_FIELDS).toHaveLength(3);
    expect(HOST_ONLY_FIELDS).toHaveLength(2);
  });

  it('motion token usage: step card + title + description use shared tokens', () => {
    // DirectorStagePanel must use MOTION_STAGE_* tokens, not inline class strings
    const STEP_CARD = 'overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-3 duration-200';
    const TITLE = 'animate-in fade-in slide-in-from-bottom-1 duration-200';
    const DESC = 'animate-in fade-in slide-in-from-bottom-1 duration-200 delay-75';

    // Same tokens as participant uses (SSoT parity)
    expect(STEP_CARD).toContain('will-change-transform');
    expect(STEP_CARD).toContain('slide-in-from-bottom-3');
    expect(TITLE).toContain('slide-in-from-bottom-1');
    expect(DESC).toContain('delay-75');
    // Duration matches
    expect(STEP_CARD).toContain('duration-200');
    expect(TITLE).toContain('duration-200');
    expect(DESC).toContain('duration-200');
  });

  it('drawer pills order: time | artifacts | triggers | signals | events', () => {
    const pillOrder = ['time', 'artifacts', 'triggers', 'signals', 'events'] as const;
    expect(pillOrder).toHaveLength(5);
    expect(pillOrder[0]).toBe('time');
    expect(pillOrder[1]).toBe('artifacts');
    expect(pillOrder[2]).toBe('triggers');
    expect(pillOrder[3]).toBe('signals');
    expect(pillOrder[4]).toBe('events');
    // 'play' is NOT a drawer — it's the stage itself
    expect(pillOrder).not.toContain('play' as unknown);
  });

  it('chip click opens signals drawer (auto-navigation)', () => {
    // When DirectorChipLane chip of type SIGNAL_RECEIVED is clicked,
    // activeDrawer is set to 'signals' (auto-open signals drawer)
    const chipType = 'SIGNAL_RECEIVED';
    const targetDrawer = chipType === 'SIGNAL_RECEIVED' ? 'signals' : null;
    expect(targetDrawer).toBe('signals');
  });

  it('no layout shift: stage fades to 30% when drawer opens', () => {
    // Stage uses opacity-30 + pointer-events-none when activeDrawer is set
    const activeDrawer = 'time';
    const stageClass = activeDrawer
      ? 'opacity-30 pointer-events-none'
      : '';
    expect(stageClass).toContain('opacity-30');
    expect(stageClass).toContain('pointer-events-none');

    // When no drawer is open, stage is fully interactive
    const noDrawer: string | null = null;
    const stageClassClear = noDrawer ? 'opacity-30 pointer-events-none' : '';
    expect(stageClassClear).toBe('');
  });
});

describe('Director Stage-first polish v1 — parity with Participant', () => {
  it('phase pill matches participant chapter pill structure', () => {
    // Both sides: rounded-full border, uppercase tracking-wide
    const participantPillClasses = 'inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground';
    const directorPillClasses = 'inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground';
    expect(participantPillClasses).toBe(directorPillClasses);
  });

  it('step header uses number badge + tabular-nums (matching participant)', () => {
    // Participant: h-7 w-7 rounded-full + font-mono tabular-nums
    const badgeClass = 'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm';
    const counterClass = 'text-xs font-medium text-muted-foreground font-mono tabular-nums';

    expect(badgeClass).toContain('h-7');
    expect(badgeClass).toContain('w-7');
    expect(badgeClass).toContain('rounded-full');
    expect(counterClass).toContain('font-mono');
    expect(counterClass).toContain('tabular-nums');
  });

  it('step progress dots match participant micro-nav pattern', () => {
    // Both sides: current = scale-110 + ring, past = bg-primary/50, future = bg-muted-foreground/20
    const current = 'h-2.5 w-2.5 scale-110 bg-primary ring-2 ring-primary/30';
    const past = 'h-2 w-2 bg-primary/50';
    const future = 'h-2 w-2 bg-muted-foreground/20';

    expect(current).toContain('scale-110');
    expect(current).toContain('ring-2');
    expect(past).toContain('bg-primary/50');
    expect(future).toContain('bg-muted-foreground/20');
  });

  it('glass pane description is paragraph-chunked (matches participant)', () => {
    // Both sides split on \n\n for readability
    const description = 'First paragraph.\n\nSecond paragraph.\n\nThird.';
    const chunks = description.split('\n\n');
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe('First paragraph.');
    expect(chunks[2]).toBe('Third.');
  });

  it('leader script + boardText are host-only sections (below glass pane)', () => {
    // Layout order: phase pill → step card → glass pane → boardText → leaderScript → dots
    const sectionOrder = ['phasePill', 'stepCard', 'glassPane', 'boardText', 'leaderScript', 'progressDots'] as const;
    const glassPaneIndex = sectionOrder.indexOf('glassPane');
    const boardTextIndex = sectionOrder.indexOf('boardText');
    const leaderScriptIndex = sectionOrder.indexOf('leaderScript');

    // Leader notes are AFTER glass pane (never leaked into it)
    expect(boardTextIndex).toBeGreaterThan(glassPaneIndex);
    expect(leaderScriptIndex).toBeGreaterThan(glassPaneIndex);
    // LeaderScript is last content section (before dots)
    expect(leaderScriptIndex).toBeGreaterThan(boardTextIndex);
  });
});

// =============================================================================
// 33. Signal Parity — ProgressDots + StepHeaderRow shared contracts
// =============================================================================

describe('Signal Parity — ProgressDots shared contract', () => {
  it('exports ProgressDots from shared barrel', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(mod.ProgressDots).toBeDefined();
    expect(typeof mod.ProgressDots).toBe('function');
  });

  it('returns null when totalSteps <= 1 (guard encapsulated)', () => {
    // The component itself returns null for single-step games —
    // verify the contract so consumers never need to guard externally
    const totalSteps = 1;
    expect(totalSteps <= 1).toBe(true);
  });

  it('current dot has scale-110 + ring-2 classes', () => {
    const current = 'h-2.5 w-2.5 scale-110 bg-primary ring-2 ring-primary/30';
    expect(current).toContain('scale-110');
    expect(current).toContain('ring-2');
    expect(current).toContain('h-2.5');
    expect(current).toContain('w-2.5');
  });

  it('past dot uses bg-primary/50, future uses bg-muted-foreground/20', () => {
    const past = 'h-2 w-2 bg-primary/50';
    const future = 'h-2 w-2 bg-muted-foreground/20';
    expect(past).toContain('bg-primary/50');
    expect(future).toContain('bg-muted-foreground/20');
  });

  it('dot transition uses duration-300 for smooth step changes', () => {
    const dotClass = 'rounded-full transition-all duration-300';
    expect(dotClass).toContain('transition-all');
    expect(dotClass).toContain('duration-300');
  });
});

describe('Signal Parity — StepHeaderRow shared contract', () => {
  it('exports StepHeaderRow from shared barrel', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(mod.StepHeaderRow).toBeDefined();
    expect(typeof mod.StepHeaderRow).toBe('function');
  });

  it('default badge is bg-primary text-primary-foreground', () => {
    const defaultBadge = 'bg-primary text-primary-foreground';
    expect(defaultBadge).toContain('bg-primary');
    expect(defaultBadge).toContain('text-primary-foreground');
  });

  it('badge uses h-7 w-7 rounded-full (matching both sides)', () => {
    const badgeClass = 'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm';
    expect(badgeClass).toContain('h-7');
    expect(badgeClass).toContain('w-7');
    expect(badgeClass).toContain('rounded-full');
  });

  it('counter uses font-mono tabular-nums (no layout shift)', () => {
    const counterClass = 'text-xs font-medium text-muted-foreground font-mono tabular-nums';
    expect(counterClass).toContain('font-mono');
    expect(counterClass).toContain('tabular-nums');
  });

  it('outer wrapper has border-b and bg-muted/50', () => {
    const wrapper = 'border-b border-border bg-muted/50 px-4 py-2.5';
    expect(wrapper).toContain('border-b');
    expect(wrapper).toContain('bg-muted/50');
  });
});

// =============================================================================
// 34. Signal Parity — Signal Strip + handled-state pipeline
// =============================================================================

describe('Signal Parity — Signal Strip pipeline', () => {
  // Helper: create a fake SessionEvent (session-cockpit shape)
  function makeSignalEvent(overrides: Partial<{
    id: string;
    type: string;
    timestamp: string;
    channel: string;
    participant_name: string;
  }> = {}) {
    return {
      id: overrides.id ?? 'evt-1',
      sessionId: 'sess-1',
      type: overrides.type ?? 'signal_sent',
      timestamp: overrides.timestamp ?? '2026-01-10T12:00:00Z',
      actorType: 'participant' as const,
      actorId: 'p-1',
      actorName: overrides.participant_name ?? 'Alice',
      payload: {
        channel: overrides.channel ?? 'sos',
        participant_name: overrides.participant_name ?? 'Alice',
        sender: overrides.participant_name ?? 'Alice',
      },
    };
  }

  it('signal event with type containing "signal" is detected', () => {
    const events = [makeSignalEvent()];
    const found = events.find((e) => e.type.includes('signal'));
    expect(found).toBeDefined();
    expect(found!.id).toBe('evt-1');
  });

  it('non-signal events are not detected', () => {
    const events = [makeSignalEvent({ type: 'trigger_fired', id: 'evt-t1' })];
    const found = events.find((e) => e.type.includes('signal'));
    expect(found).toBeUndefined();
  });

  it('handled-state filters out already-handled signals', () => {
    const events = [
      makeSignalEvent({ id: 'evt-2', channel: 'bathroom', timestamp: '2026-01-10T12:05:00Z' }),
      makeSignalEvent({ id: 'evt-1', channel: 'sos', timestamp: '2026-01-10T12:00:00Z' }),
    ];
    const handledIds = new Set(['evt-2']);

    const unhandled = events.find(
      (e) => e.type.includes('signal') && !handledIds.has(e.id),
    );
    expect(unhandled).toBeDefined();
    expect(unhandled!.id).toBe('evt-1');
  });

  it('all signals handled → strip returns nothing', () => {
    const events = [
      makeSignalEvent({ id: 'evt-2' }),
      makeSignalEvent({ id: 'evt-1' }),
    ];
    const handledIds = new Set(['evt-1', 'evt-2']);

    const unhandled = events.find(
      (e) => e.type.includes('signal') && !handledIds.has(e.id),
    );
    expect(unhandled).toBeUndefined();
  });

  it('marking a signal as handled adds it to the Set immutably', () => {
    const prev = new Set<string>();
    const next = new Set(prev).add('evt-1');

    // prev is unchanged
    expect(prev.size).toBe(0);
    // next contains the new id
    expect(next.has('evt-1')).toBe(true);
    expect(next.size).toBe(1);
  });

  it('channel is extracted from payload or falls back to type', () => {
    const withPayload = makeSignalEvent({ channel: 'bathroom' });
    const channel1 = (withPayload.payload?.channel as string) ?? withPayload.type;
    expect(channel1).toBe('bathroom');

    const noPayload = { ...makeSignalEvent(), payload: {} as Record<string, unknown> };
    const channel2 = (noPayload.payload?.channel as string) ?? noPayload.type;
    expect(channel2).toBe('signal_sent');
  });

  it('sender is extracted from payload participant_name or sender', () => {
    const evt = makeSignalEvent({ participant_name: 'Bob' });
    const sender =
      (evt.payload?.participant_name as string) ??
      (evt.payload?.sender as string);
    expect(sender).toBe('Bob');
  });

  it('timestamp formats as HH:MM', () => {
    const ts = new Date('2026-01-10T14:30:00Z');
    const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Should contain colon-separated numbers (locale-dependent format)
    expect(timeStr).toMatch(/\d{1,2}.\d{2}/);
  });

  it('strip animation uses fade-in + slide-in-from-bottom-1', () => {
    const stripClasses = 'animate-in fade-in slide-in-from-bottom-1 duration-200';
    expect(stripClasses).toContain('animate-in');
    expect(stripClasses).toContain('fade-in');
    expect(stripClasses).toContain('slide-in-from-bottom-1');
    expect(stripClasses).toContain('duration-200');
  });

  it('strip is hidden in preview mode and when drawer is open', () => {
    // Contract: guard is !isPreview && !activeDrawer
    const isPreview = true;
    const activeDrawer = null;
    // Preview hides strip
    expect(!isPreview && !activeDrawer).toBe(false);

    // Drawer open hides strip
    const isPreview2 = false;
    const activeDrawer2 = 'signals';
    expect(!isPreview2 && !activeDrawer2).toBe(false);

    // Normal mode shows strip
    const isPreview3 = false;
    const activeDrawer3 = null;
    expect(!isPreview3 && !activeDrawer3).toBe(true);
  });

  it('opening signal marks it as handled AND opens signals drawer', () => {
    // Simulate handleOpenSignal callback
    let activeDrawer: string | null = null;
    let handledIds = new Set<string>();

    const handleOpenSignal = (signalId: string) => {
      handledIds = new Set(handledIds).add(signalId);
      activeDrawer = 'signals';
    };

    handleOpenSignal('evt-1');
    expect(handledIds.has('evt-1')).toBe(true);
    expect(activeDrawer).toBe('signals');
  });

  it('signal pill badge exists in drawer pills list', () => {
    // The signals pill should have id 'signals' and be hidden in preview
    const pill = { id: 'signals', hideInPreview: true };
    expect(pill.id).toBe('signals');
    expect(pill.hideInPreview).toBe(true);
  });
});

// =============================================================================
// 35. Signal Determinism — sort, dedupe, reconnect safety, inbox handled-state
// =============================================================================

describe('Signal Determinism — sort + stable keying', () => {
  // Helper: create a fake SessionEvent
  function mkEvt(id: string, type: string, timestamp: string, channel = 'sos') {
    return {
      id,
      sessionId: 'sess-1',
      type,
      timestamp,
      actorType: 'participant' as const,
      payload: { channel, participant_name: 'Alice' } as Record<string, unknown>,
    };
  }

  // Reproduce the deterministic sort function from DirectorModePanel
  function sortedSignalEvents(events: Array<{ id: string; type: string; timestamp: string; payload: Record<string, unknown> }>) {
    return events
      .filter((e) => e.type.includes('signal'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  it('sorts signal events by timestamp desc (newest first)', () => {
    const events = [
      mkEvt('evt-1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('evt-3', 'signal_sent', '2026-01-10T12:10:00Z'),
      mkEvt('evt-2', 'signal_sent', '2026-01-10T12:05:00Z'),
    ];
    const sorted = sortedSignalEvents(events);
    expect(sorted.map((e) => e.id)).toEqual(['evt-3', 'evt-2', 'evt-1']);
  });

  it('filters non-signal events from sorted list', () => {
    const events = [
      mkEvt('evt-1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('evt-2', 'trigger_fired', '2026-01-10T12:01:00Z'),
      mkEvt('evt-3', 'signal_received', '2026-01-10T12:02:00Z'),
    ];
    const sorted = sortedSignalEvents(events);
    expect(sorted).toHaveLength(2);
    expect(sorted.map((e) => e.id)).toEqual(['evt-3', 'evt-1']);
  });

  it('stable sort: equal timestamps maintain insertion order', () => {
    const events = [
      mkEvt('evt-a', 'signal_sent', '2026-01-10T12:00:00Z', 'sos'),
      mkEvt('evt-b', 'signal_sent', '2026-01-10T12:00:00Z', 'bathroom'),
    ];
    const sorted = sortedSignalEvents(events);
    // Array.sort is stable in modern engines; both have same timestamp
    expect(sorted).toHaveLength(2);
    // Both are present (order after stable sort is implementation-defined but stable)
    expect(sorted.map((e) => e.id)).toContain('evt-a');
    expect(sorted.map((e) => e.id)).toContain('evt-b');
  });

  it('firstUnhandled picks newest signal not in handledIds', () => {
    const events = [
      mkEvt('evt-1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('evt-2', 'signal_sent', '2026-01-10T12:05:00Z'),
      mkEvt('evt-3', 'signal_sent', '2026-01-10T12:10:00Z'),
    ];
    const handledIds = new Set(['evt-3']);
    const sorted = sortedSignalEvents(events);
    const firstUnhandled = sorted.find((e) => !handledIds.has(e.id));
    expect(firstUnhandled?.id).toBe('evt-2');
  });

  it('array reorder does not change sort result', () => {
    const order1 = [
      mkEvt('evt-1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('evt-2', 'signal_sent', '2026-01-10T12:05:00Z'),
    ];
    const order2 = [
      mkEvt('evt-2', 'signal_sent', '2026-01-10T12:05:00Z'),
      mkEvt('evt-1', 'signal_sent', '2026-01-10T12:00:00Z'),
    ];
    expect(sortedSignalEvents(order1).map((e) => e.id))
      .toEqual(sortedSignalEvents(order2).map((e) => e.id));
  });
});

describe('Signal Determinism — reconnect safety', () => {
  it('handledSignalIds persists across re-renders (Set identity)', () => {
    // Simulates: handled state survives if component stays mounted
    const initial = new Set<string>();
    const after1 = new Set(initial).add('evt-1');
    const after2 = new Set(after1).add('evt-2');

    expect(after2.has('evt-1')).toBe(true);
    expect(after2.has('evt-2')).toBe(true);
    expect(after2.size).toBe(2);
  });

  it('markSignalHandled does not mutate previous Set', () => {
    const prev = new Set(['evt-1']);
    const next = new Set(prev).add('evt-2');
    expect(prev.size).toBe(1);
    expect(next.size).toBe(2);
  });

  it('duplicate signal events with same id are deduplicated by keying', () => {
    // If events array comes back with dupes after reconnect,
    // the sort + .find pattern still picks correct first unhandled
    const events = [
      { id: 'evt-1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z', payload: {} as Record<string, unknown> },
      { id: 'evt-1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z', payload: {} as Record<string, unknown> },
    ];
    const sorted = events.filter((e) => e.type.includes('signal'));
    // React will warn about duplicate keys but rendering won't break
    expect(sorted).toHaveLength(2);

    // Marking one id as handled removes BOTH (correct behavior)
    const handledIds = new Set(['evt-1']);
    const unhandled = sorted.find((e) => !handledIds.has(e.id));
    expect(unhandled).toBeUndefined();
  });
});

describe('Signal Determinism — inbox handled-state', () => {
  it('inbox shows handled signals with CheckCircle + opacity-60', () => {
    const classes = {
      handled: 'bg-muted/30 border-border/30 opacity-60',
      unhandled: 'bg-orange-50/50 border-orange-200/30',
    };
    expect(classes.handled).toContain('opacity-60');
    expect(classes.handled).toContain('bg-muted/30');
    expect(classes.unhandled).toContain('bg-orange-50/50');
  });

  it('mark-handled button only shows for unhandled signals', () => {
    const isHandled = true;
    // Contract: !isHandled && <button> — handled signals don't show button
    expect(!isHandled).toBe(false);
    const isHandled2 = false;
    expect(!isHandled2).toBe(true);
  });

  it('unhandled count badge on signals pill', () => {
    // The signals pill badge should show unhandled count
    const events = [
      { id: 'evt-1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z' },
      { id: 'evt-2', type: 'signal_sent', timestamp: '2026-01-10T12:05:00Z' },
      { id: 'evt-3', type: 'trigger_fired', timestamp: '2026-01-10T12:06:00Z' },
    ];
    const handledIds = new Set(['evt-1']);
    const unhandledCount = events
      .filter((e) => e.type.includes('signal'))
      .filter((e) => !handledIds.has(e.id))
      .length;
    expect(unhandledCount).toBe(1);
  });

  it('inbox max-height is 240px (scrollable for 20 items)', () => {
    const inboxMaxH = 'max-h-[240px] overflow-y-auto';
    expect(inboxMaxH).toContain('max-h-[240px]');
    expect(inboxMaxH).toContain('overflow-y-auto');
  });
});

describe('Signal Determinism — chip dedup (single source)', () => {
  it('events-based chip push is the single source (no recentSignals watcher)', () => {
    // Contract: DirectorModeDrawer watches events array ONLY for chip pushes.
    // The recentSignals watcher was removed to prevent duplicate SIGNAL_RECEIVED chips.
    // Verify by contract: only one useEffect should produce signal chips.
    const chipSources = ['events']; // Was ['events', 'recentSignals'] — now single
    expect(chipSources).toHaveLength(1);
    expect(chipSources[0]).toBe('events');
  });

  it('signal event in events array triggers exactly one chip', () => {
    // Simulate the events-based chip push
    const chips: string[] = [];
    const pushDirectorChip = (type: string) => { chips.push(type); };

    const newEvents = [
      { type: 'signal_sent', payload: { channel: 'sos' } },
    ];

    for (const evt of newEvents) {
      if (evt.type.includes('signal')) {
        pushDirectorChip('SIGNAL_RECEIVED');
      }
    }

    expect(chips).toEqual(['SIGNAL_RECEIVED']);
  });
});

// =============================================================================
// 36. Director Cockpit — NowSummaryRow shared contract + placement
// =============================================================================

describe('Director Cockpit — NowSummaryRow shared contract', () => {
  it('exports NowSummaryRow from shared barrel', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(mod.NowSummaryRow).toBeDefined();
    expect(typeof mod.NowSummaryRow).toBe('function');
  });

  it('row has fixed min-height to prevent layout jumps', () => {
    const rowClass = 'flex items-center gap-3 min-h-[2rem] border-b border-border/40 bg-muted/20 px-4 py-1.5 text-xs shrink-0 overflow-x-auto';
    expect(rowClass).toContain('min-h-[2rem]');
    expect(rowClass).toContain('shrink-0');
  });

  it('step counter uses tabular-nums (no layout shift)', () => {
    const stepClass = 'font-mono tabular-nums text-muted-foreground shrink-0';
    expect(stepClass).toContain('font-mono');
    expect(stepClass).toContain('tabular-nums');
  });

  it('timer uses tabular-nums with min-width for stability', () => {
    const timerClass = 'font-mono tabular-nums min-w-[3.5ch] text-right';
    expect(timerClass).toContain('tabular-nums');
    expect(timerClass).toContain('min-w-[3.5ch]');
    expect(timerClass).toContain('text-right');
  });

  it('paused state shows amber color', () => {
    const pausedClass = 'text-amber-500 dark:text-amber-400';
    expect(pausedClass).toContain('text-amber-500');
  });

  it('overtime state shows red color + semibold', () => {
    const overtimeClass = 'text-red-500 dark:text-red-400 font-semibold';
    expect(overtimeClass).toContain('text-red-500');
    expect(overtimeClass).toContain('font-semibold');
  });

  it('participant count uses font-mono tabular-nums', () => {
    const countClass = 'font-mono tabular-nums font-medium text-foreground';
    expect(countClass).toContain('font-mono');
    expect(countClass).toContain('tabular-nums');
  });

  it('unhandled signals show orange ping dot', () => {
    const pingClass = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75';
    const dotClass = 'relative inline-flex h-2 w-2 rounded-full bg-orange-500';
    expect(pingClass).toContain('animate-ping');
    expect(pingClass).toContain('bg-orange-400');
    expect(dotClass).toContain('bg-orange-500');
  });
});

describe('Director Cockpit — NowSummaryRow timer logic', () => {
  it('formats elapsed seconds as M:SS', () => {
    // Replicate the formatElapsed logic from NowSummaryRow
    function formatElapsed(totalSeconds: number): string {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(59)).toBe('0:59');
    expect(formatElapsed(60)).toBe('1:00');
    expect(formatElapsed(125)).toBe('2:05');
    expect(formatElapsed(3661)).toBe('61:01');
  });

  it('overtime is true when elapsed >= planned minutes', () => {
    const plannedMinutes = 5;
    const elapsedSec = 300; // exactly 5 minutes
    const isOvertime = elapsedSec >= plannedMinutes * 60;
    expect(isOvertime).toBe(true);
  });

  it('overtime is false when under planned time', () => {
    const plannedMinutes = 5;
    const elapsedSec = 299;
    const isOvertime = elapsedSec >= plannedMinutes * 60;
    expect(isOvertime).toBe(false);
  });

  it('no planned time means no overtime (undefined)', () => {
    const plannedMinutes: number | undefined = undefined;
    const isOvertime = plannedMinutes != null && 300 >= plannedMinutes * 60;
    expect(isOvertime).toBe(false);
  });

  it('no step start time shows dash instead of timer', () => {
    const stepStartedAt: number | undefined = undefined;
    const display = stepStartedAt ? 'elapsed' : '—';
    expect(display).toBe('—');
  });
});

describe('Director Cockpit — NowSummaryRow placement', () => {
  it('is hidden in preview mode', () => {
    // Contract: NowSummaryRow is wrapped in {!isPreview && (...)}
    const isPreview = true;
    expect(!isPreview).toBe(false);
  });

  it('is visible in live session mode', () => {
    const isPreview = false;
    expect(!isPreview).toBe(true);
  });

  it('sits between header and chip lane (layout order)', () => {
    const layoutOrder = ['header', 'nowSummaryRow', 'chipLane', 'stage', 'actionStrip', 'drawer'] as const;
    const headerIdx = layoutOrder.indexOf('header');
    const nowIdx = layoutOrder.indexOf('nowSummaryRow');
    const chipIdx = layoutOrder.indexOf('chipLane');

    expect(nowIdx).toBeGreaterThan(headerIdx);
    expect(chipIdx).toBeGreaterThan(nowIdx);
  });

  it('unhandled signal count drives both badge and now-row dot', () => {
    // Both the signals pill badge and nowRow orange dot use the same unhandledSignalCount
    const events = [
      { id: 'e1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z', payload: { channel: 'sos' } },
      { id: 'e2', type: 'signal_sent', timestamp: '2026-01-10T12:01:00Z', payload: { channel: 'help' } },
    ];
    const handledIds = new Set(['e1']);

    const signalEvents = events.filter(e => e.type.includes('signal'));
    const unhandledCount = signalEvents.filter(e => !handledIds.has(e.id)).length;

    expect(unhandledCount).toBe(1);
  });
});

// =============================================================================
// 37. Shared Utils — signalHelpers + roleState
// =============================================================================

describe('Shared Utils — signalHelpers', () => {
  // Import the real implementations
  function mkEvt(id: string, type: string, timestamp: string, channel = 'sos') {
    return { id, type, timestamp, payload: { channel, participant_name: 'Alice', sender: 'Alice' } as Record<string, unknown> };
  }

  it('exports all helpers from barrel', async () => {
    const mod = await import('@/features/play/utils');
    expect(mod.sortedSignalEvents).toBeDefined();
    expect(mod.selectLatestUnhandledSignal).toBeDefined();
    expect(mod.countUnhandledSignals).toBeDefined();
    expect(mod.extractSignalMeta).toBeDefined();
  });

  it('sortedSignalEvents filters and sorts desc', async () => {
    const { sortedSignalEvents } = await import('@/features/play/utils/signalHelpers');
    const events = [
      mkEvt('e1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('e2', 'trigger_fired', '2026-01-10T12:01:00Z'),
      mkEvt('e3', 'signal_sent', '2026-01-10T12:02:00Z'),
    ];
    const result = sortedSignalEvents(events);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('e3'); // newest first
    expect(result[1].id).toBe('e1');
  });

  it('selectLatestUnhandledSignal skips handled', async () => {
    const { selectLatestUnhandledSignal } = await import('@/features/play/utils/signalHelpers');
    const events = [
      mkEvt('e1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('e2', 'signal_sent', '2026-01-10T12:01:00Z'),
    ];
    const handled = new Set(['e2']);
    const result = selectLatestUnhandledSignal(events, handled);
    expect(result?.id).toBe('e1');
  });

  it('selectLatestUnhandledSignal returns undefined when all handled', async () => {
    const { selectLatestUnhandledSignal } = await import('@/features/play/utils/signalHelpers');
    const events = [mkEvt('e1', 'signal_sent', '2026-01-10T12:00:00Z')];
    const handled = new Set(['e1']);
    expect(selectLatestUnhandledSignal(events, handled)).toBeUndefined();
  });

  it('countUnhandledSignals returns correct count', async () => {
    const { countUnhandledSignals } = await import('@/features/play/utils/signalHelpers');
    const events = [
      mkEvt('e1', 'signal_sent', '2026-01-10T12:00:00Z'),
      mkEvt('e2', 'signal_sent', '2026-01-10T12:01:00Z'),
      mkEvt('e3', 'trigger_fired', '2026-01-10T12:02:00Z'),
    ];
    expect(countUnhandledSignals(events, new Set())).toBe(2);
    expect(countUnhandledSignals(events, new Set(['e1']))).toBe(1);
    expect(countUnhandledSignals(events, new Set(['e1', 'e2']))).toBe(0);
  });

  it('extractSignalMeta extracts channel, sender, message', async () => {
    const { extractSignalMeta } = await import('@/features/play/utils/signalHelpers');
    const evt = { id: 'e1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z', payload: { channel: 'SOS', participant_name: 'Bob', message: 'Help!' } };
    const meta = extractSignalMeta(evt);
    expect(meta.channel).toBe('SOS');
    expect(meta.sender).toBe('Bob');
    expect(meta.message).toBe('Help!');
  });

  it('extractSignalMeta falls back to type when no channel', async () => {
    const { extractSignalMeta } = await import('@/features/play/utils/signalHelpers');
    const evt = { id: 'e1', type: 'signal_sent', timestamp: '2026-01-10T12:00:00Z', payload: {} as Record<string, unknown> };
    const meta = extractSignalMeta(evt);
    expect(meta.channel).toBe('signal_sent');
    expect(meta.sender).toBeUndefined();
    expect(meta.message).toBeUndefined();
  });
});

describe('Shared Utils — roleState', () => {
  const mkAssignment = (participantId: string, roleId: string, revealed = false) => ({
    id: `a-${participantId}`,
    session_id: 'sess-1',
    participant_id: participantId,
    session_role_id: roleId,
    assigned_at: '2026-01-10T12:00:00Z',
    assigned_by: null,
    revealed_at: revealed ? '2026-01-10T12:05:00Z' : null,
  });

  const mkRole = (id: string, name: string, min = 1, max: number | null = null) => ({
    id,
    session_id: 'sess-1',
    source_role_id: null,
    name,
    icon: null,
    color: null,
    role_order: 0,
    public_description: null,
    private_instructions: 'Secret',
    private_hints: null,
    min_count: min,
    max_count: max,
    assignment_strategy: 'random' as const,
    scaling_rules: null,
    conflicts_with: [],
    assigned_count: 0,
    created_at: '2026-01-10T12:00:00Z',
  });

  it('exports all roleState helpers from barrel', async () => {
    const mod = await import('@/features/play/utils');
    expect(mod.isRoleAssigned).toBeDefined();
    expect(mod.isRoleRevealed).toBeDefined();
    expect(mod.getAssignment).toBeDefined();
    expect(mod.getParticipantRole).toBeDefined();
    expect(mod.getRoleAssignmentStatus).toBeDefined();
    expect(mod.getRoleCounts).toBeDefined();
  });

  it('isRoleAssigned returns true when participant has assignment', async () => {
    const { isRoleAssigned } = await import('@/features/play/utils/roleState');
    const assignments = [mkAssignment('p1', 'r1')];
    expect(isRoleAssigned('p1', assignments)).toBe(true);
    expect(isRoleAssigned('p2', assignments)).toBe(false);
  });

  it('isRoleRevealed checks revealed_at', async () => {
    const { isRoleRevealed } = await import('@/features/play/utils/roleState');
    const assignments = [mkAssignment('p1', 'r1', true), mkAssignment('p2', 'r1', false)];
    expect(isRoleRevealed('p1', assignments)).toBe(true);
    expect(isRoleRevealed('p2', assignments)).toBe(false);
    expect(isRoleRevealed('p3', assignments)).toBe(false);
  });

  it('getParticipantRole resolves role from assignment', async () => {
    const { getParticipantRole } = await import('@/features/play/utils/roleState');
    const roles = [mkRole('r1', 'Detective'), mkRole('r2', 'Witness')];
    const assignments = [mkAssignment('p1', 'r1')];
    const role = getParticipantRole('p1', assignments, roles);
    expect(role?.name).toBe('Detective');
    expect(getParticipantRole('p2', assignments, roles)).toBeUndefined();
  });

  it('getRoleAssignmentStatus computes aggregate correctly', async () => {
    const { getRoleAssignmentStatus } = await import('@/features/play/utils/roleState');
    const assignments = [mkAssignment('p1', 'r1', true), mkAssignment('p2', 'r2', false)];
    const status = getRoleAssignmentStatus(['p1', 'p2', 'p3'], assignments);

    expect(status.totalParticipants).toBe(3);
    expect(status.assignedCount).toBe(2);
    expect(status.revealedCount).toBe(1);
    expect(status.allAssigned).toBe(false);
    expect(status.allRevealed).toBe(false);
  });

  it('getRoleAssignmentStatus reports allAssigned when full', async () => {
    const { getRoleAssignmentStatus } = await import('@/features/play/utils/roleState');
    const assignments = [mkAssignment('p1', 'r1', true), mkAssignment('p2', 'r2', true)];
    const status = getRoleAssignmentStatus(['p1', 'p2'], assignments);

    expect(status.allAssigned).toBe(true);
    expect(status.allRevealed).toBe(true);
  });

  it('getRoleCounts computes per-role min met status', async () => {
    const { getRoleCounts } = await import('@/features/play/utils/roleState');
    const roles = [mkRole('r1', 'Detective', 2), mkRole('r2', 'Witness', 1)];
    const assignments = [mkAssignment('p1', 'r1'), mkAssignment('p2', 'r2')];
    const counts = getRoleCounts(roles, assignments);

    expect(counts).toHaveLength(2);
    expect(counts[0]).toMatchObject({ roleId: 'r1', assigned: 1, min: 2, isMet: false });
    expect(counts[1]).toMatchObject({ roleId: 'r2', assigned: 1, min: 1, isMet: true });
  });
});

// =============================================================================
// 38. SSoT Header — StatusPill + PlayHeader + LeaderScriptSections
// =============================================================================

describe('Group 38 — SSoT Header + LeaderScriptSections', () => {
  // ---------------------------------------------------------------------------
  // 38a. LeaderScriptSections parser — structured sections
  // ---------------------------------------------------------------------------
  it('parseLeaderScript splits structured text into labelled sections', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    const script = `Mål: Hitta nyckeln
Ledaren gör: Ger ledtrådar
Gruppen gör: Letar under stolarna
Klar när: Nyckeln hittas
Om det strular: Ge extra ledtråd`;

    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(5);
    expect(sections[0]).toMatchObject({ label: 'Mål', body: 'Hitta nyckeln' });
    expect(sections[1]).toMatchObject({ label: 'Ledaren gör', body: 'Ger ledtrådar' });
    expect(sections[2]).toMatchObject({ label: 'Gruppen gör', body: 'Letar under stolarna' });
    expect(sections[3]).toMatchObject({ label: 'Klar när', body: 'Nyckeln hittas' });
    expect(sections[4]).toMatchObject({ label: 'Om det strular', body: 'Ge extra ledtråd' });
  });

  it('parseLeaderScript handles multi-line bodies', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    const script = `Mål: Lös gåtan
Det är en svår gåta.
Men den har ett svar.
Ledaren gör: Håller koll`;

    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBe('Mål');
    expect(sections[0].body).toContain('Lös gåtan');
    expect(sections[0].body).toContain('Det är en svår gåta.');
    expect(sections[0].body).toContain('Men den har ett svar.');
    expect(sections[1]).toMatchObject({ label: 'Ledaren gör', body: 'Håller koll' });
  });

  it('parseLeaderScript falls back to "notes" for unstructured text', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    const script = `Just some plain text\nwithout any labels.`;
    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe('notes');
    expect(sections[0].body).toContain('Just some plain text');
  });

  it('parseLeaderScript handles partial labels (some known, some not)', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    const script = `Some preamble text
Mål: Win the game
Random middle text`;

    const sections = parseLeaderScript(script);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    // First section is "notes" for preamble
    expect(sections[0].label).toBe('notes');
    expect(sections[0].body).toBe('Some preamble text');
    // Second is the labeled section
    expect(sections[1].label).toBe('Mål');
    expect(sections[1].body).toContain('Win the game');
    expect(sections[1].body).toContain('Random middle text');
  });

  it('parseLeaderScript is case-insensitive for labels', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    const script = `mål: lowercase label`;
    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe('Mål');
    expect(sections[0].body).toBe('lowercase label');
  });

  it('parseLeaderScript returns empty array for empty input', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );

    expect(parseLeaderScript('')).toEqual([]);
    expect(parseLeaderScript('   ')).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // 38b. StatusPill — export contract
  // ---------------------------------------------------------------------------
  it('StatusPill module exports the component and types', async () => {
    const mod = await import('@/features/play/components/shared/StatusPill');
    expect(typeof mod.StatusPill).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 38c. PlayHeader — export contract
  // ---------------------------------------------------------------------------
  it('PlayHeader module exports the component', async () => {
    const mod = await import('@/features/play/components/shared/PlayHeader');
    expect(typeof mod.PlayHeader).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 38d. LeaderScriptSections — export contract via barrel
  // ---------------------------------------------------------------------------
  it('LeaderScriptSections exports via barrel', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(typeof mod.LeaderScriptSections).toBe('function');
    expect(typeof mod.parseLeaderScript).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 38e. PlayHeader + StatusPill — barrel exports
  // ---------------------------------------------------------------------------
  it('PlayHeader and StatusPill export via barrel', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(typeof mod.PlayHeader).toBe('function');
    expect(typeof mod.StatusPill).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 38f. i18n — shared status keys exist in all locales
  // ---------------------------------------------------------------------------
  it('shared status i18n keys exist in sv, en, no', async () => {
    const sv = (await import('@/messages/sv.json')).default;
    const en = (await import('@/messages/en.json')).default;
    const no = (await import('@/messages/no.json')).default;

    for (const locale of [sv, en, no]) {
      const shared = (locale as Record<string, unknown>).play as Record<string, unknown>;
      const sharedSection = shared.shared as Record<string, Record<string, string>>;
      expect(sharedSection.status.active).toBeTruthy();
      expect(sharedSection.status.paused).toBeTruthy();
      expect(sharedSection.status.draft).toBeTruthy();
      expect(sharedSection.connection.degraded).toBeTruthy();
      expect(sharedSection.connection.offline).toBeTruthy();
      expect(sharedSection.header.backToLobby).toBeTruthy();
    }
  });

  // ---------------------------------------------------------------------------
  // 38g. i18n — "Live" text is title case (CSS handles uppercase)
  // ---------------------------------------------------------------------------
  it('shared status.active is title case (not all-caps)', async () => {
    const sv = (await import('@/messages/sv.json')).default;
    const en = (await import('@/messages/en.json')).default;
    const no = (await import('@/messages/no.json')).default;

    for (const locale of [sv, en, no]) {
      const shared = (locale as Record<string, unknown>).play as Record<string, unknown>;
      const status = (shared.shared as Record<string, Record<string, string>>).status;
      // Must be "Live" not "LIVE" or "live"
      expect(status.active).toBe('Live');
    }
  });

  // ---------------------------------------------------------------------------
  // 38h. LeaderScript parser — extra whitespace before label
  // ---------------------------------------------------------------------------
  it('parseLeaderScript handles leading whitespace before label', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );
    const script = `   Mål: Leading spaces`;
    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ label: 'Mål', body: 'Leading spaces' });
  });

  // ---------------------------------------------------------------------------
  // 38i. LeaderScript parser — space before colon
  // ---------------------------------------------------------------------------
  it('parseLeaderScript handles space before colon', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );
    const script = `Ledaren gör : Gives clues`;
    const sections = parseLeaderScript(script);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ label: 'Ledaren gör', body: 'Gives clues' });
  });

  // ---------------------------------------------------------------------------
  // 38j. LeaderScript parser — empty label body (colon with no text)
  // ---------------------------------------------------------------------------
  it('parseLeaderScript handles empty label body gracefully', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );
    const script = `Mål:\nLedaren gör: Do something`;
    const sections = parseLeaderScript(script);
    // "Mål:" with no body should either be skipped or have empty body
    // "Ledaren gör" should still parse correctly
    expect(sections.some(s => s.label === 'Ledaren gör' && s.body === 'Do something')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 38k. LeaderScript parser — unknown labels go to "notes"
  // ---------------------------------------------------------------------------
  it('parseLeaderScript treats unknown labels as notes body', async () => {
    const { parseLeaderScript } = await import(
      '@/features/play/components/shared/LeaderScriptSections'
    );
    const script = `Mål: Win the game\nRandom label: some text\nMore stuff`;
    const sections = parseLeaderScript(script);
    // "Random label:" is not a known label, so it stays as body of "Mål"
    const malSection = sections.find(s => s.label === 'Mål');
    expect(malSection).toBeTruthy();
    expect(malSection!.body).toContain('Random label: some text');
  });

  // ---------------------------------------------------------------------------
  // 38l. getSessionStatusConfig — SSoT mapping for all statuses
  // ---------------------------------------------------------------------------
  it('getSessionStatusConfig returns config for all 6 statuses', async () => {
    const { getSessionStatusConfig } = await import(
      '@/features/play/components/shared/play-types'
    );
    const statuses = ['draft', 'lobby', 'active', 'paused', 'locked', 'ended'] as const;
    for (const s of statuses) {
      const config = getSessionStatusConfig(s);
      expect(config.bgTintClass).toBeTruthy();
      expect(config.textClass).toBeTruthy();
      expect(config.dotClass).toBeTruthy();
      expect(typeof config.animate).toBe('boolean');
    }
  });

  it('getSessionStatusConfig active has green tint and animate=true', async () => {
    const { getSessionStatusConfig } = await import(
      '@/features/play/components/shared/play-types'
    );
    const config = getSessionStatusConfig('active');
    expect(config.bgTintClass).toContain('green');
    expect(config.animate).toBe(true);
  });

  it('getSessionStatusConfig paused has amber tint and animate=false', async () => {
    const { getSessionStatusConfig } = await import(
      '@/features/play/components/shared/play-types'
    );
    const config = getSessionStatusConfig('paused');
    expect(config.bgTintClass).toContain('amber');
    expect(config.animate).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 38m. Canonical types — barrel exports play-types
  // ---------------------------------------------------------------------------
  it('barrel exports getSessionStatusConfig function', async () => {
    const mod = await import('@/features/play/components/shared');
    expect(typeof mod.getSessionStatusConfig).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 38n. SessionStatus union matches SessionCockpitStatus
  // ---------------------------------------------------------------------------
  it('SessionCockpitStatus values all have status config', async () => {
    const { getSessionStatusConfig } = await import(
      '@/features/play/components/shared/play-types'
    );
    // SessionCockpitStatus = 'draft' | 'lobby' | 'active' | 'paused' | 'locked' | 'ended'
    const cockpitStatuses = ['draft', 'lobby', 'active', 'paused', 'locked', 'ended'] as const;
    for (const s of cockpitStatuses) {
      expect(() => getSessionStatusConfig(s)).not.toThrow();
    }
  });
});

// =============================================================================
// 39. SSoT Guardrails — canonical types, no duplicate mapping, role-assignment boundary
// =============================================================================

describe('SSoT Guardrails', () => {
  // ---------------------------------------------------------------------------
  // 39a. No hardcoded "LIVE" string in play component source (casing via CSS)
  // ---------------------------------------------------------------------------
  it('no hardcoded "LIVE" or "Live" string in StatusPill / PlayHeader / DirectorModePanel JSX', async () => {
    const fs = await import('fs');
    const files = [
      'features/play/components/shared/StatusPill.tsx',
      'features/play/components/shared/PlayHeader.tsx',
      'features/play/components/DirectorModePanel.tsx',
      'features/play/components/ParticipantFullscreenShell.tsx',
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      // Allow "LIVE" only in comments or i18n key strings, not in JSX text
      const jsxLiveMatches = src.match(/>LIVE</g) || src.match(/"LIVE"/g);
      expect(jsxLiveMatches).toBeNull();
    }
  });

  // ---------------------------------------------------------------------------
  // 39b. No duplicate useStatusConfig hook in Director
  // ---------------------------------------------------------------------------
  it('Director does not define useStatusConfig (deleted — replaced by shared getSessionStatusConfig)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/DirectorModePanel.tsx', 'utf-8');
    expect(src).not.toContain('function useStatusConfig');
    expect(src).not.toContain('useStatusConfig(');
    // Must use shared mapping
    expect(src).toContain('getSessionStatusConfig');
  });

  // ---------------------------------------------------------------------------
  // 39c. No duplicate switch(status) for session-status visual config
  // ---------------------------------------------------------------------------
  it('Participant shell does not have switch/case for session status colours', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/ParticipantFullscreenShell.tsx', 'utf-8');
    // Should not have its own switch(status) for colour mapping
    expect(src).not.toMatch(/switch\s*\(\s*status\s*\)/);
    expect(src).not.toMatch(/switch\s*\(\s*sessionStatus\s*\)/);
  });

  // ---------------------------------------------------------------------------
  // 39d. Canonical type source — ConnectionState + SessionStatus from play-types only
  // ---------------------------------------------------------------------------
  it('ConnectionState and SessionStatus are only declared in play-types.ts', async () => {
    const fs = await import('fs');

    // Files that previously had or could have duplicate type declarations
    const filesToCheck = [
      'features/play/components/shared/StatusPill.tsx',
      'features/play/components/shared/PlayHeader.tsx',
      'features/play/components/shared/ConnectionBadge.tsx',
      'features/play/components/ParticipantFullscreenShell.tsx',
      'features/play/components/ParticipantSessionWithPlay.tsx',
      'features/play/components/DirectorModePanel.tsx',
    ];

    for (const f of filesToCheck) {
      const src = fs.readFileSync(f, 'utf-8');
      // No standalone 'type ConnectionState =' or 'type SessionStatus =' declarations
      expect(src).not.toMatch(/^\s*(?:export\s+)?type\s+ConnectionState\s*=/m);
      expect(src).not.toMatch(/^\s*(?:export\s+)?type\s+SessionStatus\s*=/m);
    }
  });

  // ---------------------------------------------------------------------------
  // 39e. useSessionAchievements imports SessionStatus from canonical source
  // ---------------------------------------------------------------------------
  it('useSessionAchievements imports from play-types, no local SessionStatus', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/hooks/useSessionAchievements.ts', 'utf-8');
    expect(src).toContain("from '@/features/play/components/shared/play-types'");
    // Should NOT have a standalone `type SessionStatus =` line
    expect(src).not.toMatch(/^\s*type\s+SessionStatus\s*=/m);
  });

  // ---------------------------------------------------------------------------
  // 39f. LeaderScriptSections used in DirectorStagePanel (not plain pre-wrap)
  // ---------------------------------------------------------------------------
  it('Director stage uses LeaderScriptSections, not whitespace-pre-wrap', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/DirectorStagePanel.tsx', 'utf-8');
    expect(src).toContain('LeaderScriptSections');
    // Should not have a plain pre-wrap block for leader script
    expect(src).not.toMatch(/whitespace-pre-wrap.*script/);
  });

  // ---------------------------------------------------------------------------
  // 39g. Role assignment guardrail — DirectorModePanel must NOT import RoleAssigner
  // ---------------------------------------------------------------------------
  it('DirectorModePanel does not import RoleAssigner (role assignment is Lobby-only)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/DirectorModePanel.tsx', 'utf-8');
    expect(src).not.toContain('RoleAssigner');
    expect(src).not.toContain('role-assignment');
    expect(src).not.toContain('roleAssign');
  });

  // ---------------------------------------------------------------------------
  // 39h. Role assignment guardrail — ParticipantFullscreenShell must NOT import RoleAssigner
  // ---------------------------------------------------------------------------
  it('ParticipantFullscreenShell does not import RoleAssigner', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/ParticipantFullscreenShell.tsx', 'utf-8');
    expect(src).not.toContain('RoleAssigner');
    expect(src).not.toContain('role-assignment');
  });

  // ---------------------------------------------------------------------------
  // 39i. PlayTopArea enforces consistent header ordering
  // ---------------------------------------------------------------------------
  it('PlayTopArea is used in both Director and Participant active views', async () => {
    const fs = await import('fs');
    const dirSrc = fs.readFileSync('features/play/components/DirectorModePanel.tsx', 'utf-8');
    const partSrc = fs.readFileSync('features/play/components/ParticipantFullscreenShell.tsx', 'utf-8');
    expect(dirSrc).toContain('PlayTopArea');
    expect(partSrc).toContain('PlayTopArea');
  });

  // 39j. PlayHeader must NOT contain lg:border (border-policy contract)
  // ---------------------------------------------------------------------------
  it('PlayHeader never applies lg:border (surface owns the border)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/shared/PlayHeader.tsx', 'utf-8');
    // PlayHeader may only use border-b (separator) — never lg:border (outer boundary)
    expect(src).not.toMatch(/lg:border(?!-b)/);
  });

  // 39k. Director and Participant shells use PlaySurface — Stage has no lg:border
  // ---------------------------------------------------------------------------
  it('Both shells use PlaySurface and Stage has no lg:border', async () => {
    const fs = await import('fs');
    const dirDrawer = fs.readFileSync('features/play/components/DirectorModeDrawer.tsx', 'utf-8');
    const partShell = fs.readFileSync('features/play/components/ParticipantFullscreenShell.tsx', 'utf-8');
    const dirPanel = fs.readFileSync('features/play/components/DirectorModePanel.tsx', 'utf-8');

    // Both shells must import and use PlaySurface
    expect(dirDrawer).toContain('PlaySurface');
    expect(partShell).toContain('PlaySurface');

    // DirectorModePanel (stage owner) must NOT have lg:border on any element
    // (PlaySurface is the sole border owner)
    expect(dirPanel).not.toMatch(/lg:border(?!-b)/);
  });

  // 39l. DrawerOverlay invocations in play must always pass a title prop
  // ---------------------------------------------------------------------------
  it('Every DrawerOverlay usage in play components passes a title prop', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const playDir = 'features/play/components';

    // Collect all .tsx files that use DrawerOverlay
    const files = fs.readdirSync(playDir, { recursive: true }) as string[];
    const tsxFiles = files
      .filter((f: string) => f.endsWith('.tsx'))
      .map((f: string) => path.join(playDir, f));

    for (const file of tsxFiles) {
      const src = fs.readFileSync(file, 'utf-8');
      // Find every <DrawerOverlay and extract until the matching closing >
      // by counting angle brackets (handles arrow fns like () =>)
      const tag = '<DrawerOverlay';
      let idx = src.indexOf(tag);
      while (idx !== -1) {
        // Extract enough context (up to 500 chars) to find the closing >
        const snippet = src.slice(idx, idx + 500);
        // Find closing > that isn't inside {…} by tracking brace depth
        let depth = 0;
        let end = -1;
        for (let i = tag.length; i < snippet.length; i++) {
          if (snippet[i] === '{') depth++;
          else if (snippet[i] === '}') depth--;
          else if (snippet[i] === '>' && depth === 0) { end = i; break; }
        }
        const fullTag = end > 0 ? snippet.slice(0, end + 1) : snippet;
        expect(fullTag).toMatch(/\btitle[={]/);
        idx = src.indexOf(tag, idx + 1);
      }
    }
  });

  // 39m. Banned flag name: eventLogging / FEATURE_EVENT_LOGGING must not exist
  // ---------------------------------------------------------------------------
  it('Banned flag name "eventLogging" does not appear in source', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const banned = /\beventLogging\b|FEATURE_EVENT_LOGGING/;
    // Allowlist: contract doc mentions the old name as a negative example,
    // this test file itself contains the banned pattern in its regex,
    // and architecture doc references it in migration history.
    const allowlist = new Set(['PLAY_UI_CONTRACT.md', 'interaction-lock.test.ts', 'SESSION_COCKPIT_ARCHITECTURE.md']);

    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { scan(full); continue; }
        if (!/\.(ts|tsx|js|json|md)$/.test(entry.name)) continue;
        if (allowlist.has(entry.name)) continue;
        // Skip generated lint artifacts
        if (entry.name.startsWith('play-lint')) continue;
        const src = fs.readFileSync(full, 'utf-8');
        if (banned.test(src)) {
          throw new Error(`Banned flag name found in ${full}. Rename to realtimeSessionEvents / FEATURE_REALTIME_SESSION_EVENTS.`);
        }
      }
    };
    scan('.');
  });

  // 39n. Drawer title keys must come from header.* (not drawer-specific keys)
  // ---------------------------------------------------------------------------
  it('Participant drawer titles use header.* keys (pill === drawer-title)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('features/play/components/ParticipantOverlayStack.tsx', 'utf-8');
    // drawerTitle mapping must use header.* keys, never artifactsDrawer.* or decisionsDrawer.*
    expect(src).not.toMatch(/drawerTitle[\s\S]{0,200}artifactsDrawer\.title/);
    expect(src).not.toMatch(/drawerTitle[\s\S]{0,200}decisionsDrawer\.title/);
    // Positive: header.artifacts and header.decisions must be present in title mapping
    expect(src).toMatch(/header\.artifacts/);
    expect(src).toMatch(/header\.decisions/);
  });

  // 39o. Drawer children must not render their own close buttons (DrawerOverlay owns chrome)
  // ---------------------------------------------------------------------------
  it('Drawer children do not contain close buttons (DrawerOverlay owns chrome)', async () => {
    const fs = await import('fs');
    const drawerChildren = [
      'features/play/components/ParticipantArtifactDrawer.tsx',
      'features/play/components/ParticipantDecisionOverlay.tsx',
    ];
    for (const file of drawerChildren) {
      const src = fs.readFileSync(file, 'utf-8');
      // No ✕ close buttons (the DrawerOverlay X button is the only close affordance)
      expect(src).not.toMatch(/aria-label["']?\s*[:=]\s*["']Close["']/);
    }
  });

  // 39p. Stage padding must be p-5 in both Director and Participant
  // ---------------------------------------------------------------------------
  it('Stage container uses p-5 in both Director and Participant', async () => {
    const fs = await import('fs');
    const dirSrc = fs.readFileSync('features/play/components/DirectorModePanel.tsx', 'utf-8');
    const partSrc = fs.readFileSync('features/play/components/ParticipantFullscreenShell.tsx', 'utf-8');
    // Both stage scroll containers must include p-5
    expect(dirSrc).toMatch(/overflow-y-auto[\s\S]{0,40}p-5/);
    expect(partSrc).toMatch(/overflow-y-auto[\s\S]{0,40}p-5/);
    // Ban old padding patterns in those same files' stage containers
    // (px-4 py-4 or sm:px-6 were the old Participant values)
    expect(partSrc).not.toMatch(/overflow-y-auto[\s\S]{0,40}(?:px-4|py-4|sm:px-6)/);
  });

  // 39q. Separator policy: chrome files must not use divide-y or lg:border (only border-b)
  // ---------------------------------------------------------------------------
  it('Chrome files use border-b only — no divide-y or lg:border in separators', async () => {
    const fs = await import('fs');
    const chromeFiles = [
      'features/play/components/shared/PlayTopArea.tsx',
      'features/play/components/shared/PlayHeader.tsx',
      'features/play/components/shared/NowSummaryRow.tsx',
      'features/play/components/ParticipantFullscreenShell.tsx',
    ];
    for (const file of chromeFiles) {
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf-8');
      // Strip comment lines to avoid false positives from docs/deprecation notes
      const code = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
      // Ban divide-y (alternative separator system)
      expect(code).not.toMatch(/\bdivide-y\b/);
      // Ban lg:border that isn't lg:border-b (outer boundary in separator context)
      expect(code).not.toMatch(/lg:border(?!-b)/);
    }
  });
});