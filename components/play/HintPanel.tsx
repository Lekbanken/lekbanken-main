'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  LightBulbIcon,
  ClockIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';
import type { HintConfig, HintState, HintItem } from '@/types/puzzle-modules';

// =============================================================================
// Hint Panel Component (for Participants)
// =============================================================================

export interface HintPanelProps {
  /** Configuration */
  config: HintConfig;
  /** Current state */
  state: HintState;
  /** Called when hint is requested */
  onRequestHint?: (hintId: string) => void;
  /** Time elapsed since step start (for availability) */
  elapsedSeconds?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * HintPanel - Participant-facing hint request UI
 */
export function HintPanel({
  config,
  state,
  onRequestHint,
  elapsedSeconds = 0,
  disabled = false,
  className,
}: HintPanelProps) {
  // Track local countdown - resets when state.cooldownRemaining changes
  const [localCountdown, setLocalCountdown] = useState(0);
  const [lastExternalCooldown, setLastExternalCooldown] = useState(state.cooldownRemaining);

  // Sync when external cooldown changes
  if (state.cooldownRemaining !== lastExternalCooldown) {
    setLastExternalCooldown(state.cooldownRemaining);
    setLocalCountdown(state.cooldownRemaining);
  }

  // Countdown timer
  useEffect(() => {
    if (localCountdown <= 0) return;

    const interval = setInterval(() => {
      setLocalCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [localCountdown]);

  const cooldownRemaining = localCountdown;

  const getNextAvailableHint = (): HintItem | null => {
    for (const hint of config.hints) {
      // Already revealed
      if (state.revealedHintIds.includes(hint.id)) continue;
      
      // Check availability delay
      if (hint.availableAfterSeconds && elapsedSeconds < hint.availableAfterSeconds) {
        continue;
      }
      
      return hint;
    }
    return null;
  };

  const nextHint = getNextAvailableHint();
  const canRequestHint = nextHint && cooldownRemaining === 0 && !disabled;
  const hintsUsed = state.revealedHintIds.length;
  const maxHintsReached = config.maxHints !== undefined && hintsUsed >= config.maxHints;

  const handleRequestHint = () => {
    if (!canRequestHint || !nextHint) return;
    onRequestHint?.(nextHint.id);
  };

  // All hints used or max reached
  if (maxHintsReached || (hintsUsed === config.hints.length)) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <LockClosedIcon className="h-5 w-5" />
          <span className="text-sm">Inga fler ledtrådar tillgängliga</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-amber-500" />
          <span className="font-medium">Ledtrådar</span>
        </div>
        {config.showHintCount !== false && (
          <span className="text-sm text-muted-foreground">
            {hintsUsed}/{config.maxHints ?? config.hints.length} använda
          </span>
        )}
      </div>

      {/* Revealed hints */}
      {state.revealedHintIds.length > 0 && (
        <div className="space-y-2">
          {state.revealedHintIds.map((hintId, index) => {
            const hint = config.hints.find(h => h.id === hintId);
            if (!hint) return null;
            
            return (
              <div
                key={hintId}
                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    #{index + 1}
                  </span>
                  <p className="text-sm">{hint.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request button */}
      {nextHint && !maxHintsReached && (
        <div className="space-y-2">
          {/* Cost warning */}
          {nextHint.cost === 'time' && nextHint.timePenalty && (
            <p className="text-xs text-muted-foreground text-center">
              Kostar {nextHint.timePenalty} sekunder
            </p>
          )}
          {nextHint.cost === 'points' && nextHint.pointsPenalty && (
            <p className="text-xs text-muted-foreground text-center">
              Kostar {nextHint.pointsPenalty} poäng
            </p>
          )}

          <Button
            onClick={handleRequestHint}
            disabled={!canRequestHint}
            variant="outline"
            className="w-full gap-2"
          >
            {cooldownRemaining > 0 ? (
              <>
                <ClockIcon className="h-4 w-4" />
                Vänta {cooldownRemaining}s
              </>
            ) : (
              <>
                <LightBulbIcon className="h-4 w-4" />
                Be om ledtråd
              </>
            )}
          </Button>
        </div>
      )}

      {/* Penalties summary */}
      {(state.totalPenaltyTime > 0 || state.totalPenaltyPoints > 0) && (
        <div className="text-xs text-muted-foreground text-center space-x-3">
          {state.totalPenaltyTime > 0 && (
            <span>-{state.totalPenaltyTime}s tid</span>
          )}
          {state.totalPenaltyPoints > 0 && (
            <span>-{state.totalPenaltyPoints} poäng</span>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Hint Control Component (for Director/Lobby)
// =============================================================================

export interface HintControlProps {
  /** Configuration */
  config: HintConfig;
  /** Current state */
  state: HintState;
  /** Called when hint is sent manually */
  onSendHint?: (hintId: string) => void;
  /** Called when custom hint is sent */
  onSendCustomHint?: (content: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * HintControl - Director-facing hint management UI
 */
export function HintControl({
  config,
  state,
  onSendHint,
  onSendCustomHint,
  className,
}: HintControlProps) {
  const [customHint, setCustomHint] = useState('');

  const handleSendCustom = () => {
    if (!customHint.trim()) return;
    onSendCustomHint?.(customHint.trim());
    setCustomHint('');
  };

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-amber-500" />
          Ledtrådar
        </h3>
        <span className="text-sm text-muted-foreground">
          {state.revealedHintIds.length}/{config.hints.length}
        </span>
      </div>

      {/* Hint list */}
      <div className="space-y-2">
        {config.hints.map((hint, index) => {
          const isRevealed = state.revealedHintIds.includes(hint.id);
          
          return (
            <div
              key={hint.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isRevealed 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-border bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                {isRevealed ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="h-5 w-5 flex items-center justify-center text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                )}
                <span className="text-sm truncate max-w-[200px]">
                  {hint.content}
                </span>
              </div>
              
              {!isRevealed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSendHint?.(hint.id)}
                >
                  Skicka
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom hint */}
      {onSendCustomHint && (
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-sm font-medium">Egen ledtråd</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Skriv egen ledtråd..."
              className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-background"
            />
            <Button
              size="sm"
              onClick={handleSendCustom}
              disabled={!customHint.trim()}
            >
              Skicka
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      {(state.totalPenaltyTime > 0 || state.totalPenaltyPoints > 0) && (
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          <span className="font-medium">Totala avdrag: </span>
          {state.totalPenaltyTime > 0 && (
            <span>{state.totalPenaltyTime}s tid</span>
          )}
          {state.totalPenaltyTime > 0 && state.totalPenaltyPoints > 0 && ', '}
          {state.totalPenaltyPoints > 0 && (
            <span>{state.totalPenaltyPoints} poäng</span>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Hook for Hint State Management
// =============================================================================

export interface UseHintSystemOptions {
  config: HintConfig;
  onHintRevealed?: (hint: HintItem) => void;
  onPenaltyApplied?: (type: 'time' | 'points', amount: number) => void;
}

export interface UseHintSystemReturn {
  state: HintState;
  revealHint: (hintId: string) => boolean;
  reset: () => void;
}

export function useHintSystem({
  config,
  onHintRevealed,
  onPenaltyApplied,
}: UseHintSystemOptions): UseHintSystemReturn {
  const [state, setState] = useState<HintState>({
    revealedHintIds: [],
    cooldownRemaining: 0,
    hintsAvailable: config.hints.length,
    totalPenaltyTime: 0,
    totalPenaltyPoints: 0,
  });

  const revealHint = useCallback((hintId: string): boolean => {
    const hint = config.hints.find(h => h.id === hintId);
    if (!hint) return false;
    if (state.revealedHintIds.includes(hintId)) return false;

    let timePenalty = 0;
    let pointsPenalty = 0;

    if (hint.cost === 'time' && hint.timePenalty) {
      timePenalty = hint.timePenalty;
      onPenaltyApplied?.('time', timePenalty);
    }
    if (hint.cost === 'points' && hint.pointsPenalty) {
      pointsPenalty = hint.pointsPenalty;
      onPenaltyApplied?.('points', pointsPenalty);
    }

    setState(prev => ({
      ...prev,
      revealedHintIds: [...prev.revealedHintIds, hintId],
      lastHintTime: new Date().toISOString(),
      cooldownRemaining: config.cooldownSeconds ?? 0,
      hintsAvailable: prev.hintsAvailable - 1,
      totalPenaltyTime: prev.totalPenaltyTime + timePenalty,
      totalPenaltyPoints: prev.totalPenaltyPoints + pointsPenalty,
    }));

    onHintRevealed?.(hint);
    return true;
  }, [config, state.revealedHintIds, onHintRevealed, onPenaltyApplied]);

  const reset = useCallback(() => {
    setState({
      revealedHintIds: [],
      cooldownRemaining: 0,
      hintsAvailable: config.hints.length,
      totalPenaltyTime: 0,
      totalPenaltyPoints: 0,
    });
  }, [config.hints.length]);

  return { state, revealHint, reset };
}
