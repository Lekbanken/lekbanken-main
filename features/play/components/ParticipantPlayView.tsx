/**
 * ParticipantPlayView Component
 * 
 * Main view for participants during a play session.
 * Shows current step, timer, role info, and board messages.
 */

'use client';

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
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import { useLiveTimer } from '@/features/play/hooks/useLiveSession';
import { formatTime, getTrafficLightColor } from '@/lib/utils/timer-utils';
import { RoleCard, type RoleCardData } from './RoleCard';
import type { TimerState, SessionRuntimeState } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';

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

export interface ParticipantPlayViewProps {
  /** Session ID */
  sessionId: string;
  /** Game title */
  gameTitle: string;
  /** Steps data */
  steps: StepData[];
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
  /** Whether to show role card */
  showRole?: boolean;
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
  gameTitle,
  steps,
  role,
  initialState,
  participantName,
  participantId,
  isNextStarter: initialIsNextStarter,
  showRole = true,
  boardTheme,
}: ParticipantPlayViewProps) {
  // Subscribe to live session updates
  const {
    currentStepIndex,
    currentPhaseIndex: _currentPhaseIndex,
    status,
    timerState,
    boardState,
    nextStarterParticipantId,
    connected,
  } = useLiveSession({
    sessionId,
    initialState,
  });
  
  // Current step data
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  
  // Session is paused
  const isPaused = status === 'paused';
  const isEnded = status === 'ended' || status === 'cancelled';

  const themeAccent = getThemeAccentClasses(boardTheme);

  const isNextStarter = Boolean(
    participantId && nextStarterParticipantId
      ? nextStarterParticipantId === participantId
      : initialIsNextStarter
  );

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
        
        {participantName && (
          <p className="text-sm text-muted-foreground">
            Du spelar som <span className="font-medium text-foreground">{participantName}</span>
          </p>
        )}
      </header>
      
      {/* Board Message */}
      <BoardMessage message={boardState?.message} />

      {/* Turn Indicator */}
      {isNextStarter && !isEnded && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">Du börjar nästa!</p>
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
          <RoleCard role={role} variant="full" showPrivate={true} />
        </div>
      )}
    </div>
  );
}
