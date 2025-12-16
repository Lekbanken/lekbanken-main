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

import { useState, useCallback } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  SignalIcon,
  SignalSlashIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayBroadcast } from '@/features/play/hooks/usePlayBroadcast';
import { TimerControl } from './TimerControl';
import { StepPhaseNavigation, type StepInfo, type PhaseInfo } from './StepPhaseNavigation';
import { createTimerState, pauseTimer, resumeTimer } from '@/lib/utils/timer-utils';
import type { TimerState, SessionRuntimeState } from '@/types/play-runtime';

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
  /** Called when session state is updated via API */
  onStateUpdate?: (updates: Partial<SessionRuntimeState>) => Promise<void>;
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
  onStateUpdate,
  onEndSession,
  participantCount = 0,
}: FacilitatorDashboardProps) {
  // Local state (mirrors server state)
  const [currentStepIndex, setCurrentStepIndex] = useState(initialState?.current_step_index ?? 0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(initialState?.current_phase_index ?? 0);
  const [timerState, setTimerState] = useState<TimerState | null>(initialState?.timer_state ?? null);
  const [boardMessage, setBoardMessage] = useState(initialState?.board_state?.message ?? '');
  const [status, setStatus] = useState<SessionRuntimeState['status']>(initialState?.status ?? 'active');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Broadcast hook
  const { 
    connected, 
    broadcastStateChange, 
    broadcastTimerUpdate, 
    broadcastBoardUpdate 
  } = usePlayBroadcast({ sessionId });
  
  // ==========================================================================
  // State Update Helpers
  // ==========================================================================
  
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
  
  // ==========================================================================
  // Step/Phase Handlers
  // ==========================================================================
  
  const handleStepChange = useCallback(async (index: number) => {
    setCurrentStepIndex(index);
    await updateAndBroadcast(
      { current_step_index: index },
      () => broadcastStateChange({ current_step_index: index })
    );
  }, [updateAndBroadcast, broadcastStateChange]);
  
  const handlePhaseChange = useCallback(async (index: number) => {
    setCurrentPhaseIndex(index);
    await updateAndBroadcast(
      { current_phase_index: index },
      () => broadcastStateChange({ current_phase_index: index })
    );
  }, [updateAndBroadcast, broadcastStateChange]);
  
  // ==========================================================================
  // Timer Handlers
  // ==========================================================================
  
  const handleTimerStart = useCallback(async (durationSeconds: number) => {
    const newTimerState = createTimerState(durationSeconds);
    setTimerState(newTimerState);
    await updateAndBroadcast(
      { timer_state: newTimerState },
      () => broadcastTimerUpdate('start', newTimerState)
    );
  }, [updateAndBroadcast, broadcastTimerUpdate]);
  
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
    if (!confirm('Är du säker på att du vill avsluta sessionen?')) return;
    setStatus('ended');
    await updateAndBroadcast(
      { status: 'ended' },
      () => broadcastStateChange({ status: 'ended' })
    );
    onEndSession?.();
  }, [updateAndBroadcast, broadcastStateChange, onEndSession]);

  // Get current step duration for timer default
  const currentStep = steps[currentStepIndex];
  const defaultTimerDuration = currentStep?.durationMinutes 
    ? currentStep.durationMinutes * 60 
    : 300;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Facilitator
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
            {connected ? 'Ansluten' : 'Ej ansluten'}
          </Badge>
          
          {/* Participant count */}
          <Badge variant="secondary" className="gap-1.5">
            <UserGroupIcon className="h-3 w-3" />
            {participantCount} deltagare
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
              {status === 'active' ? 'Aktiv' :
               status === 'paused' ? 'Pausad' :
               status === 'ended' ? 'Avslutad' : status}
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
                Pausa
              </Button>
            ) : status === 'paused' ? (
              <Button
                size="sm"
                onClick={handleResumeSession}
                disabled={isSaving}
                className="gap-1.5"
              >
                <PlayIcon className="h-4 w-4" />
                Återuppta
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
                Avsluta
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
          />
        </div>
        
        {/* Right: Timer + Board Message */}
        <div className="space-y-6">
          {/* Timer Control */}
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Timer
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
              Meddelande till tavlan
            </h3>
            <div className="space-y-3">
              <Input
                value={boardMessage}
                onChange={(e) => setBoardMessage(e.target.value)}
                placeholder="Skriv ett meddelande som visas på tavlan..."
                disabled={isSaving || status === 'ended'}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBoardMessageSubmit}
                  disabled={isSaving || status === 'ended' || !boardMessage.trim()}
                >
                  Visa på tavlan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearBoardMessage}
                  disabled={isSaving || status === 'ended'}
                >
                  Rensa
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          Sparar...
        </div>
      )}
    </div>
  );
}
