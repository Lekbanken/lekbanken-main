/**
 * ParticipantPlayView Component (v2 — refactored)
 *
 * Orchestrator: owns state + realtime hooks, delegates rendering to:
 * - ParticipantStepStage (step + timer + board message)
 * - ParticipantOverlayStack (overlay priority + drawer toggles)
 * - ParticipantArtifactDrawer (artifact list)
 * - ParticipantDecisionDrawer / ParticipantDecisionModal (decisions)
 * - ParticipantRoleSection (role card + secret reveal)
 *
 * ~400 lines (down from 1441).
 */

'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import { isFeatureEnabled } from '@/lib/config/env';
import { ParticipantSignalMicroUI } from '@/features/play/components/ParticipantSignalMicroUI';
import { ParticipantTimeBankDisplay } from '@/features/play/components/ParticipantTimeBankDisplay';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import {
  getParticipantArtifacts,
  getParticipantDecisions,
  castParticipantVote,
  getParticipantDecisionResults,
  submitKeypadCode,
  type ParticipantSessionArtifact,
  type ParticipantSessionArtifactVariant,
  type ParticipantDecision,
  type DecisionResultsResponse,
} from '@/features/play/api';
import type { SessionRuntimeState, SignalReceivedBroadcast } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';
import type { RoleCardData } from './RoleCard';
import type { TypewriterSpeed } from '@/components/play';

// New extracted components
import { ParticipantStepStage, type StepData, type PhaseData } from './ParticipantStepStage';
import {
  ParticipantOverlayStack,
  type ActiveDrawer,
  type OverlayState,
} from './ParticipantOverlayStack';
import { ParticipantArtifactDrawer } from './ParticipantArtifactDrawer';
import {
  ParticipantDecisionDrawer,
  ParticipantDecisionModal,
  type DecisionState,
  type DecisionActions,
} from './ParticipantDecisionOverlay';
import { ParticipantRoleSection } from './ParticipantRoleSection';
import { ParticipantDebugOverlay } from './ParticipantDebugOverlay';
import { TriggerLane, useTriggerLane } from './TriggerLane';
import { NowSummaryRow } from '@/features/play/components/shared';
import { ParticipantTopSlotContext } from './ParticipantFullscreenShell';
import { hapticTap, HAPTIC_LIGHT } from '../haptics';
import { playSfx, SFX_TICK } from '../sound';

// =============================================================================
// Re-export types for backwards compatibility
// =============================================================================

export type { StepData, PhaseData };

// =============================================================================
// Props
// =============================================================================

export interface ParticipantPlayViewProps {
  sessionId: string;
  sessionCode?: string;
  gameTitle: string;
  steps: StepData[];
  phases?: PhaseData[];
  role?: RoleCardData;
  initialState?: Partial<SessionRuntimeState>;
  participantName?: string;
  participantId?: string;
  isNextStarter?: boolean;
  participantToken?: string;
  tools?: Array<{ tool_key: string; enabled?: boolean; scope?: string }>;
  showRole?: boolean;
  secretRoleRevealedAt?: string | null;
  boardTheme?: BoardTheme;
}

// =============================================================================
// Main Component
// =============================================================================

export function ParticipantPlayView({
  sessionId,
  sessionCode,
  gameTitle: _gameTitle,
  steps,
  phases = [],
  role,
  initialState,
  participantName: _participantName,
  participantId,
  isNextStarter: initialIsNextStarter,
  participantToken,
  tools: _tools,
  showRole = true,
  secretRoleRevealedAt,
  boardTheme,
}: ParticipantPlayViewProps) {
  const t = useTranslations('play.participantView');
  const searchParams = useSearchParams();

  // --------------------------------------------------------------------------
  // Artifact + Decision state
  // --------------------------------------------------------------------------
  const [artifacts, setArtifacts] = useState<ParticipantSessionArtifact[]>([]);
  const [artifactVariants, setArtifactVariants] = useState<ParticipantSessionArtifactVariant[]>([]);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  const [decisions, setDecisions] = useState<ParticipantDecision[]>([]);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);
  const [selectedOptionByDecisionId, setSelectedOptionByDecisionId] = useState<Record<string, string>>({});
  const [voteSendingByDecisionId, setVoteSendingByDecisionId] = useState<Record<string, boolean>>({});
  const [voteMessageByDecisionId, setVoteMessageByDecisionId] = useState<Record<string, string | null>>({});
  const [resultsByDecisionId, setResultsByDecisionId] = useState<Record<string, DecisionResultsResponse | null>>({});
  const [submittedVoteByDecisionId, setSubmittedVoteByDecisionId] = useState<Record<string, boolean>>({});

  // Keypad state
  const [keypadCodes, setKeypadCodes] = useState<Record<string, string>>({});
  const [keypadSubmitting, setKeypadSubmitting] = useState<Record<string, boolean>>({});
  const [keypadMessages, setKeypadMessages] = useState<Record<string, { type: 'success' | 'error'; text: string } | null>>({});

  // Overlay state
  const [overlayState, setOverlayState] = useState<OverlayState>({
    countdown: { open: false, duration: 5, variant: 'default' },
    story: {
      open: false,
      text: '',
      speed: 'dramatic' as TypewriterSpeed,
      theme: 'dramatic',
      showProgress: true,
      allowSkip: true,
      allowParticipantSkip: false,
      allowClose: true,
    },
    signalToast: null,
  });

  // Active drawer
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);

  // Artifact highlight — pulses badge when new artifacts arrive via realtime
  const [artifactsHighlight, setArtifactsHighlight] = useState(false);

  // TriggerLane — system cue chips (under header)
  const { chips: triggerChips, pushChip } = useTriggerLane();
  const triggerLabels = useMemo(() => ({
    NEW_ARTIFACTS: t('triggerLane.newArtifacts'),
    DECISION_OPEN: t('triggerLane.decisionOpen'),
    COUNTDOWN_STARTED: t('triggerLane.countdownStarted'),
    STORY_SHOWN: t('triggerLane.storyShown'),
    BOARD_UPDATED: t('triggerLane.boardUpdated'),
    RECONNECTED: t('triggerLane.reconnected'),
  }), [t]);

  // Event de-dupe refs — prevent flicker on duplicate realtime events
  const lastCountdownIdRef = useRef<string | null>(null);
  const lastStoryIdRef = useRef<string | null>(null);
  const prevBoardMsgRef = useRef<string | undefined>(undefined);
  const prevConnectedRef = useRef<boolean>(true);

  // Secret state
  const [secretUnlockedAt, setSecretUnlockedAt] = useState<string | null>(
    (initialState?.secret_instructions_unlocked_at as string | null | undefined) ?? null,
  );
  const [secretUnlockedBy, setSecretUnlockedBy] = useState<string | null>(
    (initialState?.secret_instructions_unlocked_by as string | null | undefined) ?? null,
  );
  const [secretRevealedAt, setSecretRevealedAt] = useState<string | null>(secretRoleRevealedAt ?? null);

  // Signal toast timer
  const signalToastTimerRef = useRef<number | null>(null);

  // DEV debug: track last realtime event type
  const lastRealtimeEventRef = useRef<string | null>(null);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Data loaders
  // --------------------------------------------------------------------------
  const loadArtifacts = useCallback(async () => {
    if (!participantToken) return;
    try {
      const data = await getParticipantArtifacts(sessionId, { participantToken });
      setArtifacts(data.artifacts);
      setArtifactVariants(data.variants);
      setArtifactsError(null);
    } catch (err) {
      setArtifactsError(err instanceof Error ? err.message : t('errors.couldNotLoadArtifacts'));
    }
  }, [sessionId, participantToken, t]);

  const loadDecisions = useCallback(async () => {
    if (!participantToken) return;
    try {
      const list = await getParticipantDecisions(sessionId, { participantToken });
      setDecisions(list);
      setDecisionsError(null);

      const revealed = list.filter((d) => d.status === 'revealed');
      if (revealed.length > 0) {
        const entries = await Promise.all(
          revealed.map(async (d) => {
            try {
              const res = await getParticipantDecisionResults(sessionId, d.id, { participantToken });
              return [d.id, res] as const;
            } catch {
              return [d.id, null] as const;
            }
          }),
        );
        setResultsByDecisionId((prev) => {
          const next = { ...prev };
          for (const [id, res] of entries) next[id] = res;
          return next;
        });
      }
    } catch (err) {
      setDecisionsError(err instanceof Error ? err.message : t('errors.couldNotLoadDecisions'));
    }
  }, [sessionId, participantToken, t]);

  // --------------------------------------------------------------------------
  // Signal toast handler
  // --------------------------------------------------------------------------
  const formatSignalText = useCallback((payload: unknown): string => {
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const msg = (payload as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    try { return JSON.stringify(payload); } catch { return ''; }
  }, []);

  const handleSignalToast = useCallback(
    (payload: SignalReceivedBroadcast['payload']) => {
      const message = formatSignalText(payload.payload);
      const fallback = message || `Signal: ${payload.channel}`;
      setOverlayState((prev) => ({
        ...prev,
        signalToast: {
          id: payload.id,
          channel: payload.channel,
          message: fallback,
          createdAt: payload.created_at,
        },
      }));

      if (signalToastTimerRef.current) window.clearTimeout(signalToastTimerRef.current);
      signalToastTimerRef.current = window.setTimeout(() => {
        setOverlayState((prev) => ({ ...prev, signalToast: null }));
      }, 4000);
    },
    [formatSignalText],
  );

  useEffect(() => {
    return () => {
      if (signalToastTimerRef.current) window.clearTimeout(signalToastTimerRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Realtime subscription
  // --------------------------------------------------------------------------
  const {
    currentStepIndex,
    currentPhaseIndex,
    status,
    timerState,
    boardState,
    nextStarterParticipantId,
    connected,
  } = useLiveSession({
    sessionId,
    initialState,
    onStateChange: (payload) => {
      lastRealtimeEventRef.current = 'state_change';
      setLastRealtimeEvent('state_change');
      const p = payload as Partial<SessionRuntimeState>;
      if (p.secret_instructions_unlocked_at !== undefined)
        setSecretUnlockedAt((p.secret_instructions_unlocked_at as string | null) ?? null);
      if (p.secret_instructions_unlocked_by !== undefined)
        setSecretUnlockedBy((p.secret_instructions_unlocked_by as string | null) ?? null);
    },
    onArtifactUpdate: () => {
      lastRealtimeEventRef.current = 'artifact_update';
      setLastRealtimeEvent('artifact_update');
      void loadArtifacts();
      // Highlight badge (pulse) — only transition false→true to avoid re-trigger spam
      setArtifactsHighlight((prev) => prev ? prev : true);
      pushChip('NEW_ARTIFACTS');
    },
    onDecisionUpdate: () => {
      lastRealtimeEventRef.current = 'decision_update';
      setLastRealtimeEvent('decision_update');
      void loadDecisions();
      pushChip('DECISION_OPEN');
    },
    onCountdown: (payload) => {
      lastRealtimeEventRef.current = 'countdown';
      setLastRealtimeEvent('countdown');
      if (payload.action === 'show') {
        // De-dupe: skip if we already have this overlay open with same duration+message
        const id = `${payload.duration}-${payload.message ?? ''}`;
        if (lastCountdownIdRef.current === id) return;
        lastCountdownIdRef.current = id;
        setOverlayState((prev) => ({
          ...prev,
          countdown: {
            open: true,
            duration: payload.duration,
            message: payload.message,
            variant: payload.variant ?? 'default',
          },
        }));
        pushChip('COUNTDOWN_STARTED');
      } else {
        lastCountdownIdRef.current = null;
        setOverlayState((prev) => ({
          ...prev,
          countdown: { ...prev.countdown, open: false },
        }));
      }
    },
    onStoryOverlay: (payload) => {
      lastRealtimeEventRef.current = 'story_overlay';
      setLastRealtimeEvent('story_overlay');
      if (payload.action === 'show') {
        // De-dupe: skip if same story is already open
        const id = `${payload.text ?? ''}-${payload.title ?? ''}`;
        if (lastStoryIdRef.current === id) return;
        lastStoryIdRef.current = id;
        setOverlayState((prev) => ({
          ...prev,
          story: {
            open: true,
            text: payload.text ?? '',
            title: payload.title,
            speed: (payload.speed ?? 'dramatic') as TypewriterSpeed,
            theme: payload.theme ?? 'dramatic',
            showProgress: payload.showProgress ?? true,
            allowSkip: payload.allowSkip ?? true,
            allowParticipantSkip: payload.allowParticipantSkip ?? false,
            allowClose: payload.allowClose ?? true,
          },
        }));
        pushChip('STORY_SHOWN');
      } else {
        lastStoryIdRef.current = null;
        setOverlayState((prev) => ({
          ...prev,
          story: { ...prev.story, open: false },
        }));
      }
    },
    onSignalReceived: (payload) => {
      lastRealtimeEventRef.current = 'signal_received';
      setLastRealtimeEvent('signal_received');
      handleSignalToast(payload);
    },
  });

  // --------------------------------------------------------------------------
  // Step-start time tracker — records epoch when step changes
  // Mirrors Director's stepStartTimes so NowSummaryRow can count up.
  // --------------------------------------------------------------------------
  const stepStartTimeRef = useRef<{ idx: number; epoch: number }>({ idx: currentStepIndex, epoch: Date.now() });
  useEffect(() => {
    if (currentStepIndex !== stepStartTimeRef.current.idx) {
      stepStartTimeRef.current = { idx: currentStepIndex, epoch: Date.now() };
    }
  }, [currentStepIndex]);
  const stepStartedAtEpoch = stepStartTimeRef.current.idx === currentStepIndex
    ? stepStartTimeRef.current.epoch
    : undefined;

  // --------------------------------------------------------------------------
  // Sync external props
  // --------------------------------------------------------------------------
  useEffect(() => {
    setSecretUnlockedAt((initialState?.secret_instructions_unlocked_at as string | null | undefined) ?? null);
    setSecretUnlockedBy((initialState?.secret_instructions_unlocked_by as string | null | undefined) ?? null);
  }, [initialState?.secret_instructions_unlocked_at, initialState?.secret_instructions_unlocked_by]);

  useEffect(() => { setSecretRevealedAt(secretRoleRevealedAt ?? null); }, [secretRoleRevealedAt]);

  // --------------------------------------------------------------------------
  // TriggerLane: board message change detection
  // --------------------------------------------------------------------------
  useEffect(() => {
    const msg = boardState?.message;
    if (msg && msg !== prevBoardMsgRef.current) {
      // Skip the initial render (don't chip on page load)
      if (prevBoardMsgRef.current !== undefined) {
        pushChip('BOARD_UPDATED');
      }
    }
    prevBoardMsgRef.current = msg;
  }, [boardState?.message, pushChip]);

  // --------------------------------------------------------------------------
  // TriggerLane: reconnection detection (disconnected → connected)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (connected && !prevConnectedRef.current) {
      pushChip('RECONNECTED');
    }
    prevConnectedRef.current = connected;
  }, [connected, pushChip]);


  // --------------------------------------------------------------------------
  // Derived values
  // --------------------------------------------------------------------------
  const isEnded = status === 'ended' || status === 'cancelled';
  const currentStep = currentStepIndex < 0 ? null : steps[currentStepIndex] || null;
  const currentPhase = currentPhaseIndex < 0 ? null : phases[currentPhaseIndex] || null;

  const isNextStarter = Boolean(
    participantId && nextStarterParticipantId
      ? nextStarterParticipantId === participantId
      : initialIsNextStarter,
  );

  // Load artifacts + decisions on mount (and when deps change)
  useEffect(() => {
    if (!participantToken || isEnded) return;
    void loadArtifacts();
    void loadDecisions();
  }, [participantToken, isEnded, loadArtifacts, loadDecisions]);

  // Body scroll lock for blocking decision
  useEffect(() => {
    const openDecision = decisions.find((d) => d.status === 'open');
    const hasVoted = openDecision ? Boolean(submittedVoteByDecisionId[openDecision.id]) : false;
    const shouldLock = Boolean(openDecision) && !hasVoted && !isEnded;

    if (shouldLock) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [decisions, submittedVoteByDecisionId, isEnded]);

  // --------------------------------------------------------------------------
  // Variant map (memoised)
  // --------------------------------------------------------------------------
  const variantsByArtifactId = useMemo(() => {
    const map = new Map<string, ParticipantSessionArtifactVariant[]>();
    for (const v of artifactVariants) {
      const aId = v.session_artifact_id;
      if (!aId) continue;
      const list = map.get(aId) ?? [];
      list.push(v);
      map.set(aId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0));
    }
    return map;
  }, [artifactVariants]);

  // --------------------------------------------------------------------------
  // Keypad handlers
  // --------------------------------------------------------------------------
  const handleKeypadSubmit = useCallback(
    async (artifactId: string, enteredCode: string) => {
      if (!participantToken || !enteredCode.trim()) return;
      setKeypadSubmitting((prev) => ({ ...prev, [artifactId]: true }));
      setKeypadMessages((prev) => ({ ...prev, [artifactId]: null }));
      try {
        const result = await submitKeypadCode(sessionId, artifactId, enteredCode, { participantToken });
        const messageType = result.status === 'success' || result.status === 'already_unlocked' ? 'success' : 'error';
        setKeypadMessages((prev) => ({ ...prev, [artifactId]: { type: messageType, text: result.message } }));
        if (result.status === 'success' || result.status === 'locked') {
          setKeypadCodes((prev) => ({ ...prev, [artifactId]: '' }));
        }
        await loadArtifacts();
      } catch (err) {
        setKeypadMessages((prev) => ({
          ...prev,
          [artifactId]: { type: 'error', text: err instanceof Error ? err.message : t('errors.serverError') },
        }));
      } finally {
        setKeypadSubmitting((prev) => ({ ...prev, [artifactId]: false }));
      }
    },
    [sessionId, participantToken, loadArtifacts, t],
  );

  // --------------------------------------------------------------------------
  // Vote handler
  // --------------------------------------------------------------------------
  const handleVote = useCallback(
    async (decisionId: string) => {
      if (!participantToken) return;
      const optionKey = selectedOptionByDecisionId[decisionId];
      if (!optionKey) {
        setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: t('errors.selectOptionFirst') }));
        return;
      }
      setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
      setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: null }));
      try {
        await castParticipantVote(sessionId, decisionId, { optionKey }, { participantToken });
        setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: t('voting.voteReceived') }));
        setSubmittedVoteByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
        void loadDecisions();
      } catch (err) {
        // 409 = already voted (idempotent) — treat as success
        const is409 = err instanceof Error && (err.message.includes('409') || err.message.toLowerCase().includes('already'));
        if (is409) {
          setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: t('voting.voteReceived') }));
          setSubmittedVoteByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
          void loadDecisions();
        } else {
          setVoteMessageByDecisionId((prev) => ({
            ...prev,
            [decisionId]: err instanceof Error ? err.message : t('errors.couldNotVote'),
          }));
        }
      } finally {
        setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: false }));
      }
    },
    [sessionId, participantToken, selectedOptionByDecisionId, loadDecisions, t],
  );

  // --------------------------------------------------------------------------
  // Decision state + actions (passed to child components)
  // --------------------------------------------------------------------------
  const decisionState: DecisionState = {
    decisions,
    decisionsError,
    selectedOptionByDecisionId,
    voteSendingByDecisionId,
    voteMessageByDecisionId,
    resultsByDecisionId,
    submittedVoteByDecisionId,
  };

  const decisionActions: DecisionActions = useMemo(
    () => ({
      onSelectOption: (decisionId, optionKey) =>
        setSelectedOptionByDecisionId((prev) => ({ ...prev, [decisionId]: optionKey })),
      onVote: (decisionId) => void handleVote(decisionId),
      onRefresh: () => void loadDecisions(),
    }),
    [handleVote, loadDecisions],
  );

  // --------------------------------------------------------------------------
  // Computed: does a blocking decision exist?
  // --------------------------------------------------------------------------
  const openDecision = decisions.find((d) => d.status === 'open');
  const hasBlockingDecision = Boolean(
    openDecision && !submittedVoteByDecisionId[openDecision.id] && !isEnded,
  );

  // --------------------------------------------------------------------------
  // Drawer toggle handler — clears artifact highlight when opening artifacts
  // --------------------------------------------------------------------------
  const handleToggleDrawer = useCallback(
    (drawer: ActiveDrawer) => {
      if (drawer === 'artifacts') setArtifactsHighlight(false);
      setActiveDrawer(drawer);
      hapticTap(HAPTIC_LIGHT);
      playSfx(SFX_TICK);
    },
    [],
  );

  // --------------------------------------------------------------------------
  // DEV debug overlay — compute active blocking overlay for display
  // --------------------------------------------------------------------------
  const showDebug = process.env.NODE_ENV !== 'production' && searchParams.get('debug') === '1';
  const activeBlockingOverlayForDebug = useMemo(() => {
    if (hasBlockingDecision) return 'decision' as const;
    if (overlayState.story.open) return 'story' as const;
    if (overlayState.countdown.open) return 'countdown' as const;
    return null;
  }, [hasBlockingDecision, overlayState.story.open, overlayState.countdown.open]);

  // --------------------------------------------------------------------------
  // Portal target for NowSummaryRow (renders inside PlayTopArea in Shell)
  // --------------------------------------------------------------------------
  const topSlotEl = useContext(ParticipantTopSlotContext);

  const nowSummaryNode = !isEnded && currentStep ? (
    <NowSummaryRow
      stepNumber={currentStepIndex + 1}
      totalSteps={steps.length}
      stepTitle={currentStep.title}
      plannedMinutes={currentStep.durationMinutes}
      stepStartedAt={stepStartedAtEpoch}
      timerPaused={!!timerState?.paused_at}
      labels={{
        step: t('nowRow.step'),
        paused: t('nowRow.paused'),
      }}
      trailing={
        isFeatureEnabled('timeBank') ? (
          <div className="shrink-0 border-l border-border/40 pl-3">
            <ParticipantTimeBankDisplay sessionId={sessionId} />
          </div>
        ) : undefined
      }
    />
  ) : null;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <>
      {/* NOW SUMMARY ROW — portalled into PlayTopArea (same position as Director).
          Renders inside the shell's header zone via ParticipantTopSlotContext. */}
      {nowSummaryNode && topSlotEl && createPortal(nowSummaryNode, topSlotEl)}

      <div className="mx-auto max-w-2xl space-y-4 pb-24">
        {/* TRIGGER LANE — system cue chips (under header, above Stage)
            Always rendered for zero layout shift; collapses to h-0 when empty. */}
        {!isEnded && <TriggerLane chips={triggerChips} labels={triggerLabels} />}

        {/* STAGE — step + timer + board message (always visible, never shifts) */}
        <ParticipantStepStage
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        currentPhase={currentPhase}
        currentPhaseIndex={currentPhaseIndex}
        totalPhases={phases.length}
        timerState={timerState}
        status={status}
        boardMessage={boardState?.message}
        isNextStarter={isNextStarter}
        isEnded={isEnded}
        boardTheme={boardTheme}
        artifactsHighlight={artifactsHighlight && activeDrawer !== 'artifacts'}
        onOpenArtifacts={() => handleToggleDrawer('artifacts')}
        hasBlockingOverlay={hasBlockingDecision}
      />

      {/* OVERLAY STACK — drawers + blocking overlays + signals */}
      <ParticipantOverlayStack
        overlayState={overlayState}
        hasBlockingDecision={hasBlockingDecision}
        onCloseCountdown={() => {
          lastCountdownIdRef.current = null;
          setOverlayState((prev) => ({ ...prev, countdown: { ...prev.countdown, open: false } }));
        }}
        onCloseStory={() => {
          lastStoryIdRef.current = null;
          setOverlayState((prev) => ({ ...prev, story: { ...prev.story, open: false } }));
        }}
        activeDrawer={activeDrawer}
        onToggleDrawer={handleToggleDrawer}
        artifactCount={artifacts.length}
        openDecisionCount={decisions.filter((d) => d.status === 'open').length}
        artifactsHighlight={artifactsHighlight}
        hasToken={Boolean(participantToken)}
        isEnded={isEnded}
        sessionId={sessionId}
        participantToken={participantToken}
        hasRole={Boolean(showRole && role)}
        // Render props for drawer/overlay content
        renderArtifactDrawer={() =>
          participantToken ? (
            <ParticipantArtifactDrawer
              sessionId={sessionId}
              participantToken={participantToken}
              artifacts={artifacts}
              variantsByArtifactId={variantsByArtifactId}
              artifactsError={artifactsError}
              isOpen={activeDrawer === 'artifacts'}
              onRefresh={() => void loadArtifacts()}
              onClose={() => setActiveDrawer(null)}
              keypadCodes={keypadCodes}
              keypadSubmitting={keypadSubmitting}
              keypadMessages={keypadMessages}
              onKeypadCodeChange={(id, val) =>
                setKeypadCodes((prev) => ({ ...prev, [id]: val }))
              }
              onKeypadSubmit={(id, code) => void handleKeypadSubmit(id, code)}
              onKeypadClearMessage={(id) =>
                setKeypadMessages((prev) => ({ ...prev, [id]: null }))
              }
              onArtifactStateChange={() => void loadArtifacts()}
            />
          ) : null
        }
        renderDecisionDrawer={() => (
          <ParticipantDecisionDrawer
            state={decisionState}
            actions={decisionActions}
            onClose={() => setActiveDrawer(null)}
          />
        )}
        renderRoleSection={() =>
          role && participantToken && sessionCode ? (
            <ParticipantRoleSection
              role={role}
              sessionId={sessionId}
              sessionCode={sessionCode}
              participantToken={participantToken}
              secretUnlockedAt={secretUnlockedAt}
              secretUnlockedBy={secretUnlockedBy}
              secretRevealedAt={secretRevealedAt}
              currentStepTitle={currentStep?.title}
              onSecretRevealed={(at) => setSecretRevealedAt(at)}
            />
          ) : null
        }
        renderDecisionModal={() =>
          participantToken ? (
            <ParticipantDecisionModal
              state={decisionState}
              actions={decisionActions}
              isEnded={isEnded}
            />
          ) : null
        }
        renderSignalMicroUI={() =>
          participantToken ? (
            <ParticipantSignalMicroUI
              sessionId={sessionId}
              participantToken={participantToken}
            />
          ) : null
        }
        renderToolbelt={() =>
          participantToken ? (
            <Toolbelt
              sessionId={sessionId}
              role="participant"
              participantToken={participantToken}
              buttonClassName="gap-1 h-8 text-xs"
            />
          ) : null
        }
      />

      {/* DEV debug overlay — shows state introspection chips */}
      {showDebug && (
        <ParticipantDebugOverlay
          activeDrawer={activeDrawer}
          blockingOverlay={activeBlockingOverlayForDebug}
          artifactsHighlight={artifactsHighlight}
          connected={connected}
          lastRealtimeEvent={lastRealtimeEvent}
          overlayState={overlayState}
        />
      )}
      </div>
    </>
  );
}
