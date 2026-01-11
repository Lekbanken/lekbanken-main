'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid';
import {
  checkRiddleAnswer,
  type RiddleConfig,
  type RiddleState,
} from '@/types/puzzle-modules';

// =============================================================================
// Riddle Input Component
// =============================================================================

export interface RiddleInputProps {
  /** Riddle configuration */
  config: RiddleConfig;
  /** Current state (for controlled mode) */
  state?: RiddleState;
  /** Called when answer is submitted */
  onSubmit?: (answer: string, isCorrect: boolean) => void;
  /** Called when correct answer is given */
  onCorrect?: (answer: string) => void;
  /** Called when wrong answer is given */
  onWrong?: (answer: string, attemptsUsed: number) => void;
  /** Called when max attempts reached */
  onLockout?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

/**
 * RiddleInput - Text input for riddle/puzzle answers with fuzzy matching
 */
export function RiddleInput({
  config,
  state: externalState,
  onSubmit,
  onCorrect,
  onWrong,
  onLockout,
  disabled = false,
  size = 'md',
  className,
}: RiddleInputProps) {
  const t = useTranslations('play.riddleInput');
  // Internal state (used if not controlled)
  const [internalState, setInternalState] = useState<RiddleState>({
    isCorrect: false,
    attemptsUsed: 0,
    attempts: [],
    showHint: false,
  });

  const [inputValue, setInputValue] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Use external state if provided, otherwise use internal
  const state = externalState ?? internalState;
  const isLocked = config.maxAttempts !== undefined && state.attemptsUsed >= config.maxAttempts;
  const shouldShowHint = config.showHintAfterAttempts !== undefined && 
    state.attemptsUsed >= config.showHintAfterAttempts && 
    config.hintText;

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    
    if (disabled || state.isCorrect || isLocked || !inputValue.trim()) {
      return;
    }

    const normalizeMode = config.normalizeMode ?? 'fuzzy';
    const result = checkRiddleAnswer(inputValue, config.acceptedAnswers, normalizeMode);
    const newAttemptsUsed = state.attemptsUsed + 1;

    // Update internal state if not controlled
    if (!externalState) {
      setInternalState(prev => ({
        ...prev,
        isCorrect: result.isCorrect,
        attemptsUsed: newAttemptsUsed,
        attempts: [
          ...prev.attempts,
          {
            answer: inputValue,
            timestamp: new Date().toISOString(),
            correct: result.isCorrect,
          },
        ],
        showHint: config.showHintAfterAttempts !== undefined && 
          newAttemptsUsed >= config.showHintAfterAttempts,
        correctAnswer: result.isCorrect ? result.matchedAnswer : undefined,
      }));
    }

    // Callbacks
    onSubmit?.(inputValue, result.isCorrect);

    if (result.isCorrect) {
      onCorrect?.(inputValue);
    } else {
      // Shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      onWrong?.(inputValue, newAttemptsUsed);
      
      // Check for lockout
      if (config.maxAttempts !== undefined && newAttemptsUsed >= config.maxAttempts) {
        onLockout?.();
      }
    }

    // Clear input on wrong answer
    if (!result.isCorrect) {
      setInputValue('');
    }
  }, [inputValue, config, state, disabled, isLocked, externalState, onSubmit, onCorrect, onWrong, onLockout]);

  const sizeStyles = {
    sm: { input: 'h-9 text-sm', button: 'h-9 px-3 text-sm' },
    md: { input: 'h-11 text-base', button: 'h-11 px-4 text-base' },
    lg: { input: 'h-14 text-lg', button: 'h-14 px-6 text-lg' },
  };

  const styles = sizeStyles[size];

  // Locked out state
  if (isLocked && !state.isCorrect) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-6', className)}>
        <LockClosedIcon className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground text-center">
          {t('noMoreAttempts')}
        </p>
      </div>
    );
  }

  // Success state
  if (state.isCorrect) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-6', className)}>
        <CheckCircleIcon className="h-12 w-12 text-green-500" />
        <p className="text-lg font-medium text-green-500">Rätt svar!</p>
        {state.correctAnswer && (
          <p className="text-sm text-muted-foreground">
            {state.correctAnswer}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Prompt text if provided */}
      {config.promptText && (
        <p className="text-foreground text-center font-medium">
          {config.promptText}
        </p>
      )}

      {/* Input field */}
      <div
        className={cn(
          'transition-transform',
          isShaking && 'animate-shake'
        )}
      >
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={config.placeholderText ?? 'Skriv ditt svar...'}
            disabled={disabled}
            className={cn(styles.input, 'flex-1')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <Button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className={styles.button}
          >
            Svara
          </Button>
        </div>
      </div>

      {/* Attempts counter */}
      {config.maxAttempts !== undefined && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>
            Försök: {state.attemptsUsed}/{config.maxAttempts}
          </span>
          {state.attemptsUsed > 0 && !state.isCorrect && (
            <XCircleIcon className="h-4 w-4 text-destructive" />
          )}
        </div>
      )}

      {/* Hint display */}
      {shouldShowHint && config.hintText && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <LightBulbIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {config.hintText}
          </p>
        </div>
      )}
    </form>
  );
}

// =============================================================================
// Hook for Riddle State Management
// =============================================================================

export interface UseRiddleOptions {
  config: RiddleConfig;
  onCorrect?: (answer: string) => void;
  onLockout?: () => void;
}

export interface UseRiddleReturn {
  state: RiddleState;
  submit: (answer: string) => boolean;
  reset: () => void;
}

export function useRiddle({
  config,
  onCorrect,
  onLockout,
}: UseRiddleOptions): UseRiddleReturn {
  const [state, setState] = useState<RiddleState>({
    isCorrect: false,
    attemptsUsed: 0,
    attempts: [],
    showHint: false,
  });

  const submit = useCallback((answer: string): boolean => {
    if (state.isCorrect) return true;
    if (config.maxAttempts !== undefined && state.attemptsUsed >= config.maxAttempts) {
      return false;
    }

    const result = checkRiddleAnswer(
      answer,
      config.acceptedAnswers,
      config.normalizeMode ?? 'fuzzy'
    );

    const newAttemptsUsed = state.attemptsUsed + 1;

    setState(prev => ({
      ...prev,
      isCorrect: result.isCorrect,
      attemptsUsed: newAttemptsUsed,
      attempts: [
        ...prev.attempts,
        {
          answer,
          timestamp: new Date().toISOString(),
          correct: result.isCorrect,
        },
      ],
      showHint: config.showHintAfterAttempts !== undefined && 
        newAttemptsUsed >= config.showHintAfterAttempts,
      correctAnswer: result.isCorrect ? result.matchedAnswer : undefined,
    }));

    if (result.isCorrect) {
      onCorrect?.(answer);
    } else if (config.maxAttempts !== undefined && newAttemptsUsed >= config.maxAttempts) {
      onLockout?.();
    }

    return result.isCorrect;
  }, [state, config, onCorrect, onLockout]);

  const reset = useCallback(() => {
    setState({
      isCorrect: false,
      attemptsUsed: 0,
      attempts: [],
      showHint: false,
    });
  }, []);

  return { state, submit, reset };
}
