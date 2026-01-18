/**
 * FacilitatorDashboard Component
 * 
 * Main dashboard for facilitators running a game session.
 * Provides controls for:
 * - Step navigation (content)
 * - Phase navigation (runtime/tempo)
 * - Timer controls
 * - Board message
 * - Connection status
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  SignalIcon,
  SignalSlashIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayBroadcast } from '@/features/play/hooks/usePlayBroadcast';
import { useTriggerEngine, withSignalAndTimeBank } from '@/features/play/hooks';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import { TimerControl } from './TimerControl';
import { StepPhaseNavigation, type StepInfo, type PhaseInfo } from './StepPhaseNavigation';
import { TriggerPanel } from '@/features/play/components/TriggerPanel';
import { createTimerState, pauseTimer, resumeTimer } from '@/lib/utils/timer-utils';
import type { TimerState, SessionRuntimeState, SignalReceivedBroadcast } from '@/types/play-runtime';
import type { SessionTrigger } from '@/types/games';
import type { TriggerActionContext, TriggerEvent } from '@/features/play/hooks';
import {
  getSessionChatMessages,
  sendSessionChatMessage,
  type ChatMessage,
} from '@/features/play/api/chat-api';
import { sendSessionSignal } from '@/features/play/api/signals-api';

// =============================================================================
// Types
// =============================================================================

export interface FacilitatorDashboardProps {
  /** Session ID */
  sessionId: string;
  /** Game title */
  gameTitle: string;
  /** Steps data */
  steps: StepInfo[];
  /** Phases data (optional) */
  phases?: PhaseInfo[];
  /** Initial runtime state from server */
  initialState?: Partial<SessionRuntimeState>;
  /** Session triggers for automation */
  triggers?: SessionTrigger[];
  /** Called when session state is updated via API */
  onStateUpdate?: (updates: Partial<SessionRuntimeState>) => Promise<void>;
  /** Called when a trigger is manually fired */
  onTriggerAction?: (triggerId: string, action: 'fire' | 'disable' | 'arm') => Promise<void>;
  /** Called when session ends */
  onEndSession?: () => void;
  /** Number of active participants */
  participantCount?: number;
}

// =============================================================================
// Component
// =============================================================================

export function FacilitatorDashboard({
  sessionId,
  gameTitle,
  steps,
  phases = [],
  initialState,
  triggers = [],
  onStateUpdate,
  onTriggerAction,
  onEndSession,
  participantCount = 0,
}: FacilitatorDashboardProps) {
  const t = useTranslations('play.facilitatorDashboard');

  // Local state (mirrors server state)
  // Use -1 as default to indicate "not started yet"
  const [currentStepIndex, setCurrentStepIndex] = useState(initialState?.current_step_index ?? -1);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(initialState?.current_phase_index ?? -1);
  const [timerState, setTimerState] = useState<TimerState | null>(initialState?.timer_state ?? null);
  const [boardMessage, setBoardMessage] = useState(initialState?.board_state?.message ?? '');
  const [status, setStatus] = useState<SessionRuntimeState['status']>(initialState?.status ?? 'active');

  // Chat (host)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Signals (host)
  const [signalChannel, setSignalChannel] = useState('');
  const [signalMessage, setSignalMessage] = useState('');
  const [signalSending, setSignalSending] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [recentSignals, setRecentSignals] = useState<SignalReceivedBroadcast['payload'][]>([]);

  const latestChatTimestamp = useMemo(() => {
    if (chatMessages.length === 0) return undefined;
    return chatMessages[chatMessages.length - 1]?.createdAt;
  }, [chatMessages]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const processEventRef = useRef<((event: TriggerEvent) => Promise<void>) | null>(null);
  
  // Broadcast hook
  const { 
    connected, 
    broadcastStateChange, 
    broadcastTimerUpdate, 
    broadcastBoardUpdate,
    broadcastCountdown 
  } = usePlayBroadcast({ sessionId });

  // Receive realtime play events (signals/time-bank/etc)
  const { connected: liveConnected } = useLiveSession({
    sessionId,
    enabled: true,
    onSignalReceived: (payload) => {
      setRecentSignals((prev) => {
        const next = [payload, ...prev.filter((p) => p.id !== payload.id)];
        return next.slice(0, 20);
      });
      if (!signalChannel) {
        setSignalChannel(payload.channel);
      }
      const triggerEvent: TriggerEvent = {
        type: 'signal_received',
        channel: payload.channel,
        payload: payload.payload,
        sender_user_id: payload.sender_user_id ?? undefined,
        sender_participant_id: payload.sender_participant_id ?? undefined,
      };
      void processEventRef.current?.(triggerEvent);
    },
  });

  const quickChannels = useMemo(() => {
    const channels: string[] = [];
    for (const s of recentSignals) {
      if (!channels.includes(s.channel)) channels.push(s.channel);
      if (channels.length >= 4) break;
    }
    return channels;
  }, [recentSignals]);

  const formatSignalText = useCallback((payload: unknown): string => {
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const msg = (payload as { message?: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return '';
    }
  }, []);

  const handleSendSignal = useCallback(async () => {
    const channel = signalChannel.trim();
    const message = signalMessage.trim();
    if (!channel || !message) return;

    setSignalSending(true);
    setSignalError(null);
    try {
      await sendSessionSignal(sessionId, { channel, message });
      setSignalMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('signals.sendError');
      setSignalError(msg);
    } finally {
      setSignalSending(false);
    }
  }, [sessionId, signalChannel, signalMessage, t]);

  // ========================================================================
  // State Update Helpers
  // ========================================================================

  const updateAndBroadcast = useCallback(async (
    updates: Partial<SessionRuntimeState>,
    broadcast: () => Promise<boolean>
  ) => {
    setIsSaving(true);
    try {
      // Update server via callback
      if (onStateUpdate) {
        await onStateUpdate(updates);
      }
      // Broadcast to clients
      await broadcast();
    } catch (error) {
      console.error('[FacilitatorDashboard] Failed to update:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onStateUpdate]);

  // ========================================================================
  // Core Handlers (no trigger events)
  // ========================================================================

  const handleStepChangeCore = useCallback(async (index: number) => {
    setCurrentStepIndex(index);
    await updateAndBroadcast(
      { current_step_index: index },
      () => broadcastStateChange({ current_step_index: index })
    );
  }, [updateAndBroadcast, broadcastStateChange]);

  const handlePhaseChangeCore = useCallback(async (index: number) => {
    setCurrentPhaseIndex(index);
    await updateAndBroadcast(
      { current_phase_index: index },
      () => broadcastStateChange({ current_phase_index: index })
    );
  }, [updateAndBroadcast, broadcastStateChange]);

  const handleTimerStartCore = useCallback(async (durationSeconds: number) => {
    const newTimerState = createTimerState(durationSeconds);
    setTimerState(newTimerState);
    await updateAndBroadcast(
      { timer_state: newTimerState },
      () => broadcastTimerUpdate('start', newTimerState)
    );
  }, [updateAndBroadcast, broadcastTimerUpdate]);

  // ========================================================================
  // Trigger Engine (executes actions locally + patches status)
  // ========================================================================

  const actionContext: TriggerActionContext = useMemo(() => {
    const base: TriggerActionContext = {
      sessionId,
      broadcastCountdown: async (action, duration, message) => {
        if (action === 'show') return broadcastCountdown('show', duration, message);
        // Best-effort "hide" mapping for current broadcast protocol
        return broadcastCountdown('complete', 0, message);
      },
      broadcastStateChange: async (updates) => {
        const payload: { current_step_index?: number; current_phase_index?: number; status?: string } = {};
        const stepIndex = updates.current_step_index;
        const phaseIndex = updates.current_phase_index;
        const nextStatus = updates.status;
        if (typeof stepIndex === 'number') payload.current_step_index = stepIndex;
        if (typeof phaseIndex === 'number') payload.current_phase_index = phaseIndex;
        if (typeof nextStatus === 'string') payload.status = nextStatus;
        return broadcastStateChange(payload);
      },
      advanceStep: async () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < 0 || nextIndex >= steps.length) return;
        await handleStepChangeCore(nextIndex);
      },
      advancePhase: async () => {
        const nextIndex = currentPhaseIndex + 1;
        if (nextIndex < 0 || nextIndex >= phases.length) return;
        await handlePhaseChangeCore(nextIndex);
      },
      startTimer: async (duration) => {
        await handleTimerStartCore(duration);
      },
      sendBoardMessage: async (message) => {
        const trimmed = message.trim();
        await updateAndBroadcast(
          { board_state: { message: trimmed || undefined } },
          () => broadcastBoardUpdate(trimmed || undefined)
        );
      },
    };

    return withSignalAndTimeBank(base);
  }, [
    sessionId,
    broadcastCountdown,
    broadcastStateChange,
    broadcastBoardUpdate,
    currentStepIndex,
    currentPhaseIndex,
    steps.length,
    phases.length,
    handleStepChangeCore,
    handlePhaseChangeCore,
    handleTimerStartCore,
    updateAndBroadcast,
  ]);

  const { processEvent, fireTrigger: fireTriggerActions } = useTriggerEngine({
    sessionId,
    triggers,
    actionContext,
    onTriggerStatusUpdate: async (triggerId, status) => {
      const action = status === 'disabled' ? 'disable' : status === 'fired' ? 'fire' : 'arm';
      await onTriggerAction?.(triggerId, action);
    },
    enabled: true,
  });

  useEffect(() => {
    processEventRef.current = processEvent;
  }, [processEvent]);

  const handleManualTriggerFire = useCallback(
    async (triggerId: string) => {
      await fireTriggerActions(triggerId);
    },
    [fireTriggerActions]
  );

  // ========================================================================
  // UI Handlers (emit trigger events)
  // ========================================================================

  const handleStepChange = useCallback(async (index: number) => {
    await handleStepChangeCore(index);
    const stepId = steps[index]?.id;
    if (stepId) {
      await processEvent({ type: 'step_started', stepId });
    }
  }, [handleStepChangeCore, steps, processEvent]);

  const handlePhaseChange = useCallback(async (index: number) => {
    await handlePhaseChangeCore(index);
    const phaseId = phases[index]?.id;
    if (phaseId) {
      await processEvent({ type: 'phase_started', phaseId });
    }
  }, [handlePhaseChangeCore, phases, processEvent]);

  // Keep name used by UI
  const handleTimerStart = handleTimerStartCore;
  
  const handleTimerPause = useCallback(async () => {
    if (!timerState) return;
    const pausedState = pauseTimer(timerState);
    setTimerState(pausedState);
    await updateAndBroadcast(
      { timer_state: pausedState },
      () => broadcastTimerUpdate('pause', pausedState)
    );
  }, [timerState, updateAndBroadcast, broadcastTimerUpdate]);
  
  const handleTimerResume = useCallback(async () => {
    if (!timerState) return;
    const resumedState = resumeTimer(timerState);
    setTimerState(resumedState);
    await updateAndBroadcast(
      { timer_state: resumedState },
      () => broadcastTimerUpdate('resume', resumedState)
    );
  }, [timerState, updateAndBroadcast, broadcastTimerUpdate]);
  
  const handleTimerReset = useCallback(async () => {
    setTimerState(null);
    await updateAndBroadcast(
      { timer_state: null },
      () => broadcastTimerUpdate('reset', null)
    );
  }, [updateAndBroadcast, broadcastTimerUpdate]);
  
  // ==========================================================================
  // Board Message Handler
  // ==========================================================================
  
  const handleBoardMessageSubmit = useCallback(async () => {
    const message = boardMessage.trim() || undefined;
    await updateAndBroadcast(
      { board_state: { message } },
      () => broadcastBoardUpdate(message)
    );
  }, [boardMessage, updateAndBroadcast, broadcastBoardUpdate]);
  
  const handleClearBoardMessage = useCallback(async () => {
    setBoardMessage('');
    await updateAndBroadcast(
      { board_state: { message: undefined } },
      () => broadcastBoardUpdate(undefined)
    );
  }, [updateAndBroadcast, broadcastBoardUpdate]);
  
  // ==========================================================================
  // Session Control
  // ==========================================================================
  
  const handlePauseSession = useCallback(async () => {
    setStatus('paused');
    await updateAndBroadcast(
      { status: 'paused' },
      () => broadcastStateChange({ status: 'paused' })
    );
  }, [updateAndBroadcast, broadcastStateChange]);
  
  const handleResumeSession = useCallback(async () => {
    setStatus('active');
    await updateAndBroadcast(
      { status: 'active' },
      () => broadcastStateChange({ status: 'active' })
    );
  }, [updateAndBroadcast, broadcastStateChange]);
  
  const handleEndSession = useCallback(async () => {
    if (!confirm(t('confirmEndSession'))) return;
    setStatus('ended');
    await updateAndBroadcast(
      { status: 'ended' },
      () => broadcastStateChange({ status: 'ended' })
    );
    onEndSession?.();
  }, [updateAndBroadcast, broadcastStateChange, onEndSession, t]);

  // Get current step duration for timer default
  const currentStep = steps[currentStepIndex];
  const defaultTimerDuration = currentStep?.durationMinutes 
    ? currentStep.durationMinutes * 60 
    : 300;

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const messages = await getSessionChatMessages(sessionId);
        if (!cancelled) {
          setChatMessages(messages);
          setChatError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(err instanceof Error ? err.message : t('chat.loadError'));
        }
      }
    };

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [sessionId, t]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const messages = await getSessionChatMessages(sessionId, { since: latestChatTimestamp });
        if (messages.length > 0) {
          setChatMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const next = [...prev];
            for (const m of messages) {
              if (!seen.has(m.id)) next.push(m);
            }
            return next.slice(-400);
          });
        }
      } catch {
        // best-effort polling
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [sessionId, latestChatTimestamp]);

  const handleSendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg) return;

    setChatSending(true);
    setChatError(null);
    try {
      await sendSessionChatMessage(sessionId, { message: msg, visibility: 'public' });
      setChatInput('');

      const messages = await getSessionChatMessages(sessionId, { since: latestChatTimestamp });
      if (messages.length > 0) {
        setChatMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const next = [...prev];
          for (const m of messages) {
            if (!seen.has(m.id)) next.push(m);
          }
          return next.slice(-400);
        });
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : t('chat.sendError'));
    } finally {
      setChatSending(false);
    }
  }, [chatInput, latestChatTimestamp, sessionId, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t('header.facilitator')}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{gameTitle}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <Badge variant={connected ? 'default' : 'destructive'} className="gap-1.5">
            {connected ? (
              <SignalIcon className="h-3 w-3" />
            ) : (
              <SignalSlashIcon className="h-3 w-3" />
            )}
            {connected ? t('connection.connected') : t('connection.disconnected')}
          </Badge>
          
          {/* Participant count */}
          <Badge variant="secondary" className="gap-1.5">
            <UserGroupIcon className="h-3 w-3" />
            {t('participants.count', { count: participantCount })}
          </Badge>
          
          {/* Settings toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Session Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${
              status === 'active' ? 'bg-green-500 animate-pulse' :
              status === 'paused' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`} />
            <span className="text-sm font-medium">
              {status === 'active' ? t('status.active') :
               status === 'paused' ? t('status.paused') :
               status === 'ended' ? t('status.ended') : status}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseSession}
                disabled={isSaving}
                className="gap-1.5"
              >
                <PauseIcon className="h-4 w-4" />
                {t('session.pause')}
              </Button>
            ) : status === 'paused' ? (
              <Button
                size="sm"
                onClick={handleResumeSession}
                disabled={isSaving}
                className="gap-1.5"
              >
                <PlayIcon className="h-4 w-4" />
                {t('session.resume')}
              </Button>
            ) : null}
            
            {status !== 'ended' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndSession}
                disabled={isSaving}
                className="gap-1.5"
              >
                <StopIcon className="h-4 w-4" />
                {t('session.end')}
              </Button>
            )}

            {/* Countdown Overlay Button */}
            {status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void broadcastCountdown('show', 5, t('session.countdownMessage'))}
                disabled={isSaving}
                className="gap-1.5"
                title={t('session.countdownTooltip')}
              >
                <ClockIcon className="h-4 w-4" />
                {t('session.countdownSeconds', { seconds: 5 })}
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {/* Main Controls Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Navigation */}
        <div>
          <StepPhaseNavigation
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            steps={steps}
            currentPhaseIndex={currentPhaseIndex}
            totalPhases={phases.length}
            phases={phases}
            onStepChange={handleStepChange}
            onPhaseChange={handlePhaseChange}
            disabled={isSaving || status === 'ended'}
            showPhases={phases.length > 0}
            unified
          />
        </div>
        
        {/* Right: Timer + Board Message */}
        <div className="space-y-6">
          {/* Timer Control */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('timer.title')}
            </h3>
            <TimerControl
              timerState={timerState}
              onStart={handleTimerStart}
              onPause={handleTimerPause}
              onResume={handleTimerResume}
              onReset={handleTimerReset}
              defaultDuration={defaultTimerDuration}
              disabled={isSaving || status === 'ended'}
              size="md"
            />
          </Card>
          
          {/* Board Message */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <ChatBubbleBottomCenterTextIcon className="mr-2 inline h-4 w-4" />
              {t('board.title')}
            </h3>
            <div className="space-y-3">
              <Input
                value={boardMessage}
                onChange={(e) => setBoardMessage(e.target.value)}
                placeholder={t('board.placeholder')}
                disabled={isSaving || status === 'ended'}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBoardMessageSubmit}
                  disabled={isSaving || status === 'ended' || !boardMessage.trim()}
                >
                  {t('board.showOnBoard')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearBoardMessage}
                  disabled={isSaving || status === 'ended'}
                >
                  {t('board.clear')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Signals */}
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <SignalIcon className="mr-2 inline h-4 w-4" />
                {t('signals.title')}
              </h3>
              <Badge variant={liveConnected ? 'success' : 'secondary'} size="sm">
                {liveConnected ? t('signals.live') : t('signals.offline')}
              </Badge>
            </div>

            <div className="space-y-3">
              {signalError && <p className="text-sm text-destructive">{signalError}</p>}

              <div className="flex gap-2">
                <Input
                  value={signalChannel}
                  onChange={(e) => setSignalChannel(e.target.value)}
                  placeholder={t('signals.channelPlaceholder')}
                  disabled={signalSending || status === 'ended'}
                />
                <Input
                  value={signalMessage}
                  onChange={(e) => setSignalMessage(e.target.value)}
                  placeholder={t('signals.messagePlaceholder')}
                  disabled={signalSending || status === 'ended'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendSignal();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSendSignal()}
                  disabled={
                    signalSending ||
                    status === 'ended' ||
                    !signalChannel.trim() ||
                    !signalMessage.trim()
                  }
                >
                  {t('signals.send')}
                </Button>
              </div>

              {quickChannels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickChannels.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSignalChannel(c)}
                      disabled={signalSending || status === 'ended'}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-auto rounded-md border border-border p-3 space-y-2">
                {recentSignals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('signals.noSignals')}</p>
                ) : (
                  recentSignals.map((s) => (
                    <div key={s.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" size="sm">{s.channel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {formatSignalText(s.payload) && (
                        <p className="text-muted-foreground">{formatSignalText(s.payload)}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Chat */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <ChatBubbleBottomCenterTextIcon className="mr-2 inline h-4 w-4" />
              {t('chat.title')}
            </h3>

            <div className="space-y-3">
              <div className="max-h-72 overflow-auto rounded-md border border-border p-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('chat.noMessages')}</p>
                ) : (
                  chatMessages.map((m) => (
                    <div key={m.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{m.senderLabel}</span>
                        {m.visibility === 'host' && <Badge variant="secondary">{t('chat.private')}</Badge>}
                      </div>
                      <p className="text-muted-foreground">{m.message}</p>
                    </div>
                  ))
                )}
              </div>

              {chatError && <p className="text-sm text-destructive">{chatError}</p>}

              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  disabled={chatSending || status === 'ended'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendChat();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSendChat()}
                  disabled={chatSending || status === 'ended'}
                >
                  {t('chat.send')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Trigger Panel (if triggers exist) */}
      {triggers.length > 0 && (
        <TriggerPanel
          triggers={triggers}
          onFireTrigger={handleManualTriggerFire}
          disabled={isSaving || status === 'ended'}
        />
      )}
      
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          {t('saving')}
        </div>
      )}
    </div>
  );
}
