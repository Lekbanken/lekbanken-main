/**
 * ParticipantPlayView Component
 * 
 * Main view for participants during a play session.
 * Shows current step, timer, role info, and board messages.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClockIcon,
  PauseCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import { useLiveTimer } from '@/features/play/hooks/useLiveSession';
import { formatTime, getTrafficLightColor } from '@/lib/utils/timer-utils';
import { RoleCard, type RoleCardData } from './RoleCard';
import type { TimerState, SessionRuntimeState } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';
import { sendSessionChatMessage } from '@/features/play/api/chat-api';
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
  type SanitizedKeypadMetadata,
} from '@/features/play/api';

// =============================================================================
// Types
// =============================================================================

export interface StepData {
  id: string;
  title: string;
  description: string;
  durationMinutes?: number;
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
}

export interface PhaseData {
  name: string;
  description?: string;
  duration?: number | null;
}

export interface ParticipantPlayViewProps {
  /** Session ID */
  sessionId: string;
  /** Session code (needed for token-auth participant endpoints) */
  sessionCode?: string;
  /** Game title */
  gameTitle: string;
  /** Steps data */
  steps: StepData[];
  /** Phases data */
  phases?: PhaseData[];
  /** Participant's assigned role (if any) */
  role?: RoleCardData;
  /** Initial state from server */
  initialState?: Partial<SessionRuntimeState>;
  /** Participant name */
  participantName?: string;
  /** Participant id (used for turn indicator) */
  participantId?: string;
  /** Initial next-starter state from server */
  isNextStarter?: boolean;
  /** Participant token (used for chat API) */
  participantToken?: string;
  /** Whether to show role card */
  showRole?: boolean;
  /** When this participant revealed their secret role instructions */
  secretRoleRevealedAt?: string | null;
  /** Board theme (from game board config) */
  boardTheme?: BoardTheme;
}

function getThemeAccentClasses(theme?: BoardTheme) {
  switch (theme) {
    case 'mystery':
      return { label: 'text-slate-200', badge: 'bg-slate-800 text-slate-50' };
    case 'party':
      return { label: 'text-pink-600', badge: 'bg-pink-600 text-white' };
    case 'sport':
      return { label: 'text-green-600', badge: 'bg-green-600 text-white' };
    case 'nature':
      return { label: 'text-emerald-700', badge: 'bg-emerald-700 text-white' };
    case 'neutral':
    default:
      return { label: 'text-primary', badge: 'bg-primary text-primary-foreground' };
  }
}

// =============================================================================
// Sub-components
// =============================================================================

interface TimerDisplayProps {
  timerState: TimerState | null;
}

function TimerDisplay({ timerState }: TimerDisplayProps) {
  const display = useLiveTimer({ timerState });
  
  if (!timerState) {
    return null;
  }
  
  const trafficColor = getTrafficLightColor(display);
  
  const colorClasses = {
    green: 'text-green-500 bg-green-50 border-green-200',
    yellow: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    red: 'text-red-500 bg-red-50 border-red-200',
  };
  
  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorClasses[trafficColor]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {display.isPaused ? 'Timer pausad' : display.isFinished ? 'Tiden är slut!' : 'Tid kvar'}
          </span>
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums">
          {formatTime(display.remaining)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColorClasses[trafficColor]}`}
          style={{ width: `${(1 - display.progress) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  status: SessionRuntimeState['status'];
  connected: boolean;
}

function StatusIndicator({ status, connected }: StatusIndicatorProps) {
  const statusConfig = {
    active: { icon: SignalIcon, text: 'Aktiv', color: 'text-green-500' },
    paused: { icon: PauseCircleIcon, text: 'Pausad', color: 'text-yellow-500' },
    ended: { icon: CheckCircleIcon, text: 'Avslutad', color: 'text-gray-500' },
    cancelled: { icon: ExclamationTriangleIcon, text: 'Avbruten', color: 'text-red-500' },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-3">
      <Badge variant={connected ? 'default' : 'destructive'} className="gap-1">
        {connected ? (
          <SignalIcon className="h-3 w-3" />
        ) : (
          <SignalSlashIcon className="h-3 w-3" />
        )}
        {connected ? 'Live' : 'Offline'}
      </Badge>
      
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </div>
  );
}

interface BoardMessageProps {
  message?: string;
}

function BoardMessage({ message }: BoardMessageProps) {
  if (!message) return null;
  
  return (
    <Card className="border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ParticipantPlayView({
  sessionId,
  sessionCode,
  gameTitle,
  steps,
  phases = [],
  role,
  initialState,
  participantName,
  participantId,
  isNextStarter: initialIsNextStarter,
  participantToken,
  showRole = true,
  secretRoleRevealedAt,
  boardTheme,
}: ParticipantPlayViewProps) {
  // --------------------------------------------------------------------------
  // Primitives (participant): Artifacts + Decisions
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
  const [bodyLocked, setBodyLocked] = useState(false);

  // Keypad UI state
  const [keypadCodes, setKeypadCodes] = useState<Record<string, string>>({});
  const [keypadSubmitting, setKeypadSubmitting] = useState<Record<string, boolean>>({});
  const [keypadMessages, setKeypadMessages] = useState<Record<string, { type: 'success' | 'error'; text: string } | null>>({});

  const loadArtifacts = useCallback(async () => {
    if (!participantToken) return;
    try {
      const data = await getParticipantArtifacts(sessionId, { participantToken });
      setArtifacts(data.artifacts);
      setArtifactVariants(data.variants);
      setArtifactsError(null);
    } catch (err) {
      setArtifactsError(err instanceof Error ? err.message : 'Kunde inte ladda artefakter');
    }
  }, [sessionId, participantToken]);

  const loadDecisions = useCallback(async () => {
    if (!participantToken) return;
    try {
      const list = await getParticipantDecisions(sessionId, { participantToken });
      setDecisions(list);
      setDecisionsError(null);

      // Fetch results for revealed decisions (best-effort)
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
          })
        );
        setResultsByDecisionId((prev) => {
          const next = { ...prev };
          for (const [id, res] of entries) next[id] = res;
          return next;
        });
      }
    } catch (err) {
      setDecisionsError(err instanceof Error ? err.message : 'Kunde inte ladda beslut');
    }
  }, [sessionId, participantToken]);

  /**
   * Submit keypad code for server-side validation.
   * correctCode is NEVER exposed to the participant.
   */
  const handleKeypadSubmit = useCallback(async (artifactId: string, enteredCode: string) => {
    if (!participantToken || !enteredCode.trim()) return;

    setKeypadSubmitting((prev) => ({ ...prev, [artifactId]: true }));
    setKeypadMessages((prev) => ({ ...prev, [artifactId]: null }));

    try {
      const result = await submitKeypadCode(sessionId, artifactId, enteredCode, { participantToken });
      
      const messageType = result.status === 'success' || result.status === 'already_unlocked' ? 'success' : 'error';
      setKeypadMessages((prev) => ({ ...prev, [artifactId]: { type: messageType, text: result.message } }));

      // Clear code on success or lockout
      if (result.status === 'success' || result.status === 'locked') {
        setKeypadCodes((prev) => ({ ...prev, [artifactId]: '' }));
      }

      // Reload artifacts to get updated state and revealed variants
      await loadArtifacts();

    } catch (err) {
      setKeypadMessages((prev) => ({ 
        ...prev, 
        [artifactId]: { type: 'error', text: err instanceof Error ? err.message : 'Serverfel' }
      }));
    } finally {
      setKeypadSubmitting((prev) => ({ ...prev, [artifactId]: false }));
    }
  }, [sessionId, participantToken, loadArtifacts]);

  // Subscribe to live session updates
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
      const unlockedAt = (payload as Partial<SessionRuntimeState>).secret_instructions_unlocked_at;
      const unlockedBy = (payload as Partial<SessionRuntimeState>).secret_instructions_unlocked_by;
      if (unlockedAt !== undefined) setSecretUnlockedAt(unlockedAt ?? null);
      if (unlockedBy !== undefined) setSecretUnlockedBy(unlockedBy ?? null);
    },
    onArtifactUpdate: () => {
      void loadArtifacts();
    },
    onDecisionUpdate: () => {
      void loadDecisions();
    },
  });

  // --------------------------------------------------------------------------
  // Secret Instructions (participant gate)
  // --------------------------------------------------------------------------

  const [secretUnlockedAt, setSecretUnlockedAt] = useState<string | null>(
    (initialState?.secret_instructions_unlocked_at as string | null | undefined) ?? null
  );
  const [secretUnlockedBy, setSecretUnlockedBy] = useState<string | null>(
    (initialState?.secret_instructions_unlocked_by as string | null | undefined) ?? null
  );
  const [secretRevealedAt, setSecretRevealedAt] = useState<string | null>(secretRoleRevealedAt ?? null);
  const [secretRevealLoading, setSecretRevealLoading] = useState(false);
  const [secretRevealError, setSecretRevealError] = useState<string | null>(null);

  const [hintRequestSending, setHintRequestSending] = useState(false);
  const [hintRequestError, setHintRequestError] = useState<string | null>(null);

  useEffect(() => {
    setSecretUnlockedAt(
      (initialState?.secret_instructions_unlocked_at as string | null | undefined) ?? null
    );
    setSecretUnlockedBy(
      (initialState?.secret_instructions_unlocked_by as string | null | undefined) ?? null
    );
  }, [
    initialState?.secret_instructions_unlocked_at,
    initialState?.secret_instructions_unlocked_by,
  ]);

  useEffect(() => {
    setSecretRevealedAt(secretRoleRevealedAt ?? null);
  }, [secretRoleRevealedAt]);

  const handleRevealSecretInstructions = useCallback(async () => {
    if (!participantToken || !sessionCode) return;
    setSecretRevealLoading(true);
    try {
      const res = await fetch(`/api/play/me/role/reveal?session_code=${sessionCode}`, {
        method: 'POST',
        headers: {
          'x-participant-token': participantToken,
        },
      });

      const data = (await res.json().catch(() => ({}))) as { secretRevealedAt?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Kunde inte visa instruktionerna');
      }

      setSecretRevealedAt(data.secretRevealedAt ?? new Date().toISOString());
      setSecretRevealError(null);
    } catch (err) {
      setSecretRevealError(err instanceof Error ? err.message : 'Kunde inte visa instruktionerna');
    } finally {
      setSecretRevealLoading(false);
    }
  }, [participantToken, sessionCode]);

  const handleRequestHintFromHost = useCallback(async () => {
    if (!participantToken) return;
    if (!role) return;

    setHintRequestSending(true);
    setHintRequestError(null);
    try {
      const stepTitle = steps[currentStepIndex]?.title;
      const msg = stepTitle
        ? `Jag behöver en ledtråd. Steg: ${stepTitle}.`
        : 'Jag behöver en ledtråd.';

      await sendSessionChatMessage(
        sessionId,
        {
          message: msg,
          visibility: 'host',
          anonymous: false,
        },
        { participantToken }
      );
    } catch (err) {
      setHintRequestError(err instanceof Error ? err.message : 'Kunde inte be om ledtråd');
    } finally {
      setHintRequestSending(false);
    }
  }, [participantToken, role, sessionId, steps, currentStepIndex]);
  
  // Current step data - handle "not started" state (index -1)
  const stepNotStarted = currentStepIndex < 0;
  const currentStep = stepNotStarted ? null : (steps[currentStepIndex] || null);
  const totalSteps = steps.length;

  // Current phase data
  const phaseNotStarted = currentPhaseIndex < 0;
  const currentPhase = phaseNotStarted ? null : (phases[currentPhaseIndex] || null);
  const totalPhases = phases.length;

  // State for showing artifacts/decisions drawers
  const [showArtifactsDrawer, setShowArtifactsDrawer] = useState(false);
  const [showDecisionsDrawer, setShowDecisionsDrawer] = useState(false);
  
  // Session is paused
  const isPaused = status === 'paused';
  const isEnded = status === 'ended' || status === 'cancelled';

  const themeAccent = getThemeAccentClasses(boardTheme);

  const isNextStarter = Boolean(
    participantId && nextStarterParticipantId
      ? nextStarterParticipantId === participantId
      : initialIsNextStarter
  );

  useEffect(() => {
    if (!participantToken) return;
    if (isEnded) return;
    void loadArtifacts();
    void loadDecisions();
  }, [participantToken, isEnded, loadArtifacts, loadDecisions]);

  // Lock body scroll when a blocking decision modal is active
  useEffect(() => {
    const openDecision = decisions.find((d) => d.status === 'open');
    const hasVoted = openDecision ? Boolean(submittedVoteByDecisionId[openDecision.id]) : false;
    const shouldLock = Boolean(openDecision) && !hasVoted && !isEnded;

    if (shouldLock && !bodyLocked) {
      setBodyLocked(true);
      const prev = document.body.style.overflow;
      document.body.dataset.prevOverflow = prev;
      document.body.style.overflow = 'hidden';
    }

    if ((!shouldLock || isEnded) && bodyLocked) {
      const prev = document.body.dataset.prevOverflow ?? '';
      document.body.style.overflow = prev;
      delete document.body.dataset.prevOverflow;
      setBodyLocked(false);
    }

    return () => {
      if (bodyLocked) {
        const prev = document.body.dataset.prevOverflow ?? '';
        document.body.style.overflow = prev;
        delete document.body.dataset.prevOverflow;
        setBodyLocked(false);
      }
    };
  }, [decisions, submittedVoteByDecisionId, isEnded, bodyLocked]);

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

  const handleVote = async (decisionId: string) => {
    if (!participantToken) return;
    const optionKey = selectedOptionByDecisionId[decisionId];
    if (!optionKey) {
      setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: 'Välj ett alternativ först.' }));
      return;
    }

    setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
    setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: null }));
    try {
      await castParticipantVote(sessionId, decisionId, { optionKey }, { participantToken });
      setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: 'Röst mottagen!' }));
      setSubmittedVoteByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
      // Refresh decisions (e.g. host might close/reveal)
      void loadDecisions();
    } catch (err) {
      setVoteMessageByDecisionId((prev) => ({
        ...prev,
        [decisionId]: err instanceof Error ? err.message : 'Kunde inte rösta',
      }));
    } finally {
      setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: false }));
    }
  };


  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${themeAccent.label}`}>Spela</p>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{gameTitle}</h1>
          </div>
          <StatusIndicator status={status} connected={connected} />
        </div>
        
        {/* Player info row with artifact/decision buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {participantName && (
            <p className="text-sm text-muted-foreground">
              Du spelar som <span className="font-medium text-foreground">{participantName}</span>
            </p>
          )}
          
          {/* Small buttons for artifacts and decisions */}
          {!isEnded && participantToken && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowArtifactsDrawer(!showArtifactsDrawer)}
                className="gap-1 h-7 text-xs"
              >
                📦 Artefakter
                {artifacts.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-primary">
                    {artifacts.length}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowDecisionsDrawer(!showDecisionsDrawer)}
                className="gap-1 h-7 text-xs"
              >
                🗳️ Beslut
                {decisions.filter(d => d.status === 'open').length > 0 && (
                  <span className="rounded-full bg-destructive/10 px-1.5 text-destructive">
                    {decisions.filter(d => d.status === 'open').length}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </header>
      
      {/* Board Message */}
      <BoardMessage message={boardState?.message} />

      {/* Turn Indicator */}
      {isNextStarter && !isEnded && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">Du börjar nästa!</p>
        </Card>
      )}

      {/* Current Phase Info - show instead of artifacts/decisions on main view */}
      {currentPhase && !isEnded && (
        <Card className="p-4 border-2 border-secondary/20 bg-secondary/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Fas {currentPhaseIndex + 1} av {totalPhases}</p>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{currentPhase.name}</h3>
          {currentPhase.description && (
            <p className="mt-2 text-sm text-muted-foreground">{currentPhase.description}</p>
          )}
        </Card>
      )}

      {/* Artifacts Drawer (collapsible) */}
      {showArtifactsDrawer && !isEnded && participantToken && (
        <Card className="p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Mina artefakter</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => void loadArtifacts()}>
                ↻
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowArtifactsDrawer(false)}>
                ✕
              </Button>
            </div>
          </div>

          {artifactsError && <p className="text-sm text-destructive">{artifactsError}</p>}

          {artifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga artefakter just nu.</p>
          ) : (
            <div className="space-y-3">
              {artifacts
                .slice()
                .sort((a, b) => (a.artifact_order ?? 0) - (b.artifact_order ?? 0))
                .map((a) => {
                  const vars = variantsByArtifactId.get(a.id) ?? [];
                  
                  // Keypad artifact - special rendering
                  if (a.artifact_type === 'keypad') {
                    const meta = (a.metadata ?? {}) as Partial<SanitizedKeypadMetadata>;
                    const keypadState = meta.keypadState ?? { isUnlocked: false, isLockedOut: false, attemptCount: 0 };
                    const codeLength = meta.codeLength ?? 4;
                    const maxAttempts = meta.maxAttempts;
                    const successMessage = meta.successMessage || 'Koden är korrekt!';
                    const lockedMessage = meta.lockedMessage || 'Keypaden är låst.';

                    const isUnlocked = keypadState.isUnlocked;
                    const isLockedOut = keypadState.isLockedOut;
                    const attemptsRemaining = maxAttempts != null ? Math.max(0, maxAttempts - keypadState.attemptCount) : null;

                    const enteredCode = keypadCodes[a.id] || '';
                    const isSubmitting = Boolean(keypadSubmitting[a.id]);
                    const message = keypadMessages[a.id];

                    return (
                      <div key={a.id} className="rounded-md border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{isLockedOut ? '🔒' : isUnlocked ? '🔓' : '🔐'}</span>
                            <p className="text-sm font-medium text-foreground">{a.title ?? 'Keypad'}</p>
                          </div>
                          <Badge variant={isUnlocked ? 'default' : isLockedOut ? 'destructive' : 'secondary'}>
                            {isUnlocked ? 'Upplåst' : isLockedOut ? 'Låst' : 'Lås'}
                          </Badge>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}

                        {isUnlocked ? (
                          <div className="rounded bg-green-500/10 border border-green-500/30 p-2 text-center">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">✓ {successMessage}</p>
                            {vars.length > 0 && (
                              <div className="mt-2 space-y-1 text-left">
                                {vars.map((v) => (
                                  <div key={v.id} className="rounded bg-muted/30 p-2">
                                    <p className="text-sm font-medium">{v.title || 'Upplåst'}</p>
                                    {v.body && <p className="text-xs text-muted-foreground">{v.body}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : isLockedOut ? (
                          <div className="rounded bg-destructive/10 border border-destructive/30 p-2 text-center">
                            <p className="text-xs font-medium text-destructive">🔒 {lockedMessage}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={codeLength}
                                placeholder={'•'.repeat(codeLength)}
                                value={enteredCode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, codeLength);
                                  setKeypadCodes((prev) => ({ ...prev, [a.id]: val }));
                                  // Clear error on input
                                  if (message?.type === 'error') {
                                    setKeypadMessages((prev) => ({ ...prev, [a.id]: null }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && enteredCode.length === codeLength && !isSubmitting) {
                                    void handleKeypadSubmit(a.id, enteredCode);
                                  }
                                }}
                                disabled={isSubmitting}
                                className={`text-center text-lg tracking-[0.3em] font-mono h-9 ${
                                  message?.type === 'error' ? 'animate-shake border-destructive' : ''
                                }`}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleKeypadSubmit(a.id, enteredCode)}
                                disabled={enteredCode.length !== codeLength || isSubmitting}
                              >
                                {isSubmitting ? '...' : '→'}
                              </Button>
                            </div>
                            {attemptsRemaining !== null && (
                              <p className="text-xs text-muted-foreground text-center">{attemptsRemaining} försök kvar</p>
                            )}
                            {message && (
                              <p className={`text-xs text-center ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                {message.text}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Standard artifact - skip if no variants
                  if (vars.length === 0) return null;

                  return (
                    <div key={a.id} className="rounded-md border border-border p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">{a.title ?? 'Artefakt'}</p>
                      <div className="space-y-2">
                        {vars.map((v) => {
                          const visibility = v.visibility ?? 'public';
                          const isPublicRevealed = visibility === 'public' && Boolean(v.revealed_at);
                          const isHighlighted = Boolean(v.highlighted_at);

                          return (
                            <div key={v.id} className="rounded-md bg-muted/30 p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{v.title ?? 'Kort'}</p>
                                {isPublicRevealed ? (
                                  <Badge variant="secondary">Offentlig</Badge>
                                ) : visibility === 'role_private' ? (
                                  <Badge variant="secondary">Roll</Badge>
                                ) : (
                                  <Badge variant="secondary">Privat</Badge>
                                )}
                                {isHighlighted && <Badge variant="default">Markerad</Badge>}
                              </div>
                              {v.body && <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {/* Decisions Drawer (collapsible) */}
      {showDecisionsDrawer && !isEnded && participantToken && (
        <Card className="p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Beslut</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => void loadDecisions()}>
                ↻
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowDecisionsDrawer(false)}>
                ✕
              </Button>
            </div>
          </div>

          {decisionsError && <p className="text-sm text-destructive">{decisionsError}</p>}

          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga beslut just nu.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => {
                const selected = selectedOptionByDecisionId[d.id] ?? '';
                const sending = Boolean(voteSendingByDecisionId[d.id]);
                const msg = voteMessageByDecisionId[d.id];
                const options = d.options ?? [];
                const isOpen = d.status === 'open';
                const isRevealed = d.status === 'revealed';
                const results = resultsByDecisionId[d.id]?.results ?? null;

                return (
                  <div key={d.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.title}</p>
                        {d.prompt && <p className="text-sm text-muted-foreground">{d.prompt}</p>}
                      </div>
                      <Badge variant={isOpen ? 'default' : 'secondary'}>{d.status}</Badge>
                    </div>

                    {isOpen && options.length > 0 && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          {options.map((o) => (
                            <label key={o.key} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`decision-${d.id}`}
                                value={o.key}
                                checked={selected === o.key}
                                onChange={() =>
                                  setSelectedOptionByDecisionId((prev) => ({ ...prev, [d.id]: o.key }))
                                }
                                disabled={sending}
                              />
                              <span className="text-foreground">{o.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleVote(d.id)}
                            disabled={sending}
                          >
                            Rösta
                          </Button>
                          {msg && (
                            <p className={`text-sm ${msg.includes('!') ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {msg}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isRevealed && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Resultat:</p>
                        {results ? (
                          <div className="space-y-1">
                            {results.map((r) => (
                              <div key={r.key ?? r.label} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">{r.label ?? r.key}</span>
                                <span className="text-muted-foreground">{r.count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Resultaten är visade.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
      
      {/* Pause Overlay */}
      {isPaused && (
        <Card className="border-2 border-yellow-200 bg-yellow-50 p-6 text-center dark:bg-yellow-900/20">
          <PauseCircleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-3 text-lg font-semibold text-yellow-700 dark:text-yellow-400">
            Sessionen är pausad
          </h2>
          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-500">
            Vänta på att ledaren startar igen
          </p>
        </Card>
      )}

      {/* Waiting for host to start - when step index is -1 */}
      {stepNotStarted && !isEnded && !isPaused && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <ClockIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Väntar på lekledaren...
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lekledaren har inte startat spelet ännu. Häng kvar så börjar vi snart!
          </p>
        </Card>
      )}
      
      {/* Ended State */}
      {isEnded && (
        <Card className="border-2 border-gray-200 bg-gray-50 p-6 text-center dark:bg-gray-800/50">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Sessionen är avslutad
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tack för att du deltog!
          </p>
        </Card>
      )}
      
      {/* Timer */}
      {!isEnded && (
        <TimerDisplay timerState={timerState} />
      )}
      
      {/* Current Step */}
      {currentStep && !isEnded && (
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${themeAccent.badge}`}>
                  {currentStepIndex + 1}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Steg {currentStepIndex + 1} av {totalSteps}
                </span>
              </div>
              {currentStep.tag && (
                <Badge variant="default">{currentStep.tag}</Badge>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{currentStep.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{currentStep.description}</p>
            
            {/* Materials */}
            {currentStep.materials && currentStep.materials.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Material
                </p>
                <ul className="space-y-1 text-sm">
                  {currentStep.materials.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Safety note */}
            {currentStep.safety && (
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      Säkerhet
                    </p>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {currentStep.safety}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Note */}
            {currentStep.note && (
              <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                💡 {currentStep.note}
              </p>
            )}
          </div>
        </Card>
      )}
      
      {/* Step Progress Dots */}
      {!isEnded && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === currentStepIndex
                    ? 'bg-primary scale-125'
                    : i < currentStepIndex
                      ? 'bg-primary/40'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Role Card */}
      {showRole && role && !isEnded && (
        <div className="pt-4">
          {(() => {
            const secretsUnlocked = Boolean(secretUnlockedAt);
            const secretsRevealed = Boolean(secretRevealedAt);

            return (
              <div className="space-y-3">
                {!secretsUnlocked && (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Hemliga instruktioner är låsta tills lekledaren låser upp dem.
                    </p>
                  </Card>
                )}

                {secretsUnlocked && !secretsRevealed && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Hemliga instruktioner</p>
                        <p className="text-sm text-muted-foreground">
                          Klicka för att visa dina hemliga instruktioner.
                        </p>
                        {secretUnlockedBy && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Upplåst {secretUnlockedAt ? new Date(secretUnlockedAt).toLocaleTimeString() : ''}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => void handleRevealSecretInstructions()}
                        disabled={secretRevealLoading || !participantToken || !sessionCode}
                      >
                        {secretRevealLoading ? 'Visar…' : 'Visa'}
                      </Button>
                    </div>
                    {secretRevealError && (
                      <div className="mt-2 text-sm text-destructive">{secretRevealError}</div>
                    )}
                  </Card>
                )}

                <RoleCard
                  role={role}
                  variant="full"
                  showPrivate={secretsUnlocked && secretsRevealed}
                  onRequestHint={secretsUnlocked && secretsRevealed && role.private_hints ? () => void handleRequestHintFromHost() : undefined}
                  interactive={!hintRequestSending}
                />
                {hintRequestError && (
                  <div className="text-sm text-destructive">{hintRequestError}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Decision Modal - shows automatically for open decisions (blocking) */}
      {(() => {
        const openDecision = decisions.find((d) => d.status === 'open');
        if (!openDecision || !participantToken || isEnded) return null;

        const selected = selectedOptionByDecisionId[openDecision.id] ?? '';
        const sending = Boolean(voteSendingByDecisionId[openDecision.id]);
        const msg = voteMessageByDecisionId[openDecision.id];
        const options = openDecision.options ?? [];
        const hasVoted = Boolean(submittedVoteByDecisionId[openDecision.id]);

        if (hasVoted) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">🗳️</div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Beslut</p>
                  <p className="text-lg font-semibold text-foreground">{openDecision.title}</p>
                </div>
              </div>

              {openDecision.prompt && (
                <p className="mt-2 text-sm text-muted-foreground">{openDecision.prompt}</p>
              )}

              <div className="mt-4 space-y-3">
                {options.length === 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                    Inga alternativ tillgängliga för detta beslut än.
                  </div>
                )}

                {options.map((o) => (
                  <label
                    key={o.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selected === o.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`modal-decision-${openDecision.id}`}
                      value={o.key}
                      checked={selected === o.key}
                      onChange={() =>
                        setSelectedOptionByDecisionId((prev) => ({ ...prev, [openDecision.id]: o.key }))
                      }
                      disabled={sending}
                      className="sr-only"
                    />
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selected === o.key ? 'border-primary' : 'border-muted-foreground/30'
                    }`}>
                      {selected === o.key && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-foreground font-medium">{o.label}</span>
                  </label>
                ))}
              </div>

              {msg && !msg.includes('!') && (
                <p className="mt-3 text-sm text-destructive">{msg}</p>
              )}

              <div className="mt-5">
                <Button
                  onClick={() => void handleVote(openDecision.id)}
                  disabled={sending || !selected || options.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {sending ? 'Röstar...' : 'Skicka röst'}
                </Button>
                {options.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Lekledaren behöver lägga till alternativ innan du kan rösta.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
