'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useKeypad } from './hooks/useKeypad';
import { LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ALPHA_BUTTONS } from '@/types/keypad';

export interface AlphaKeypadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  /** The correct code/word to unlock (case insensitive) */
  correctCode: string;
  /** Code length (for display, defaults to correctCode.length) */
  codeLength?: number;
  /** Maximum attempts (undefined = unlimited) */
  maxAttempts?: number;
  /** Show remaining attempts */
  showAttempts?: boolean;
  /** Cooldown after wrong attempt in ms */
  cooldownMs?: number;
  /** Callback on successful unlock */
  onSuccess?: () => void;
  /** Callback on wrong code */
  onWrongCode?: (attemptsRemaining?: number) => void;
  /** Callback when max attempts reached */
  onLockout?: () => void;
  /** Enable haptic feedback */
  hapticEnabled?: boolean;
  /** Title above keypad */
  title?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Auto-submit when code length reached */
  autoSubmit?: boolean;
  /** Show the current input as letters (not dots) */
  showLetters?: boolean;
}

/**
 * AlphaKeypad - Alphabetic keyboard for word puzzles
 * 
 * Mobile-first with 5-column A-Z grid layout
 * Great for escape room word puzzles and riddles
 */
export const AlphaKeypad = forwardRef<HTMLDivElement, AlphaKeypadProps>(
  (
    {
      correctCode,
      codeLength: codeLengthProp,
      maxAttempts,
      showAttempts = true,
      cooldownMs = 2000,
      onSuccess,
      onWrongCode,
      onLockout,
      hapticEnabled = true,
      title = 'Ange ordet',
      size = 'md',
      autoSubmit = true,
      showLetters = true,
      className,
      ...props
    },
    ref
  ) => {
    // Normalize correctCode to uppercase
    const t = useTranslations('play.alphaKeypad');
    const normalizedCode = correctCode.toUpperCase();
    const codeLength = codeLengthProp ?? normalizedCode.length;

    const {
      currentInput,
      attemptsRemaining,
      isLocked,
      isUnlocked,
      isShaking,
      isInCooldown,
      cooldownRemaining,
      addDigit,
      removeDigit,
      submit,
    } = useKeypad({
      correctCode: normalizedCode,
      codeLength,
      maxAttempts,
      cooldownMs,
      onSuccess,
      onWrongCode,
      onLockout,
      hapticEnabled,
    });

    // Auto-submit when code length reached
    const handleAddDigit = (digit: string) => {
      addDigit(digit);
      
      if (autoSubmit && currentInput.length + 1 === codeLength) {
        setTimeout(() => submit(), 0);
      }
    };

    const handleButtonClick = (button: string) => {
      if (isLocked) return;

      switch (button) {
        case '⌫':
          removeDigit();
          break;
        case '✓':
          submit();
          break;
        default:
          handleAddDigit(button);
      }
    };

    // Size configurations
    const buttonSizes = {
      sm: 'h-10 w-10 text-sm',
      md: 'h-12 w-12 text-base',
      lg: 'h-14 w-14 text-lg',
    };

    const gridGaps = {
      sm: 'gap-1',
      md: 'gap-1.5',
      lg: 'gap-2',
    };

    const displaySizes = {
      sm: 'text-lg h-10',
      md: 'text-xl h-12',
      lg: 'text-2xl h-14',
    };

    // Locked out state
    if (maxAttempts !== undefined && attemptsRemaining === 0 && !isUnlocked) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center p-8 rounded-xl bg-muted/50 border border-border',
            className
          )}
          {...props}
        >
          <LockClosedIcon className="h-16 w-16 text-destructive mb-4" />
          <p className="text-lg font-medium text-foreground">{t('lockedOut')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('maxAttemptsReached')}
          </p>
        </div>
      );
    }

    // Success state
    if (isUnlocked) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center p-8 rounded-xl bg-success/10 border border-success',
            className
          )}
          {...props}
        >
          <CheckCircleIcon className="h-16 w-16 text-success mb-4" />
          <p className="text-lg font-medium text-foreground">{t('correct')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('wordCorrect')}
          </p>
        </div>
      );
    }

    // Split buttons into rows: 5 per row for A-Z, then action buttons
    const letterButtons = ALPHA_BUTTONS.filter(b => b !== '⌫' && b !== '✓');
    const letterRows: string[][] = [];
    for (let i = 0; i < letterButtons.length; i += 5) {
      letterRows.push(letterButtons.slice(i, i + 5) as string[]);
    }

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center', className)}
        {...props}
      >
        {/* Title */}
        {title && (
          <div className="flex items-center gap-2 mb-4">
            <LockClosedIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">{title}</h3>
          </div>
        )}

        {/* Input Display - shows letters or underscores */}
        <div
          className={cn(
            'flex items-center justify-center gap-1 px-4 rounded-lg bg-muted/50 border border-border mb-4 min-w-[200px]',
            displaySizes[size],
            isShaking && 'animate-shake',
          )}
          aria-live="polite"
          aria-label={currentInput ? t('inputLabel', { input: currentInput }) : t('inputEmpty')}
        >
          {showLetters ? (
            // Show typed letters with placeholders
            <>
              {Array.from({ length: codeLength }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'font-mono font-bold min-w-[1.5ch] text-center',
                    index < currentInput.length 
                      ? 'text-foreground' 
                      : 'text-muted-foreground/50'
                  )}
                >
                  {currentInput[index] || '_'}
                </span>
              ))}
            </>
          ) : (
            // Show dots like numeric keypad
            <div className="flex items-center gap-2">
              {Array.from({ length: codeLength }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-3 w-3 rounded-full transition-colors',
                    index < currentInput.length
                      ? 'bg-primary'
                      : 'bg-border'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Attempts remaining */}
        {showAttempts && attemptsRemaining !== undefined && (
          <p className="text-sm text-muted-foreground mb-4">
            {t('attemptsRemaining', { count: attemptsRemaining })}
          </p>
        )}

        {/* Cooldown message */}
        {isInCooldown && (
          <p className="text-sm text-warning mb-4">
            {t('waitCooldown', { seconds: cooldownRemaining })}
          </p>
        )}

        {/* Letter Grid - 5 columns */}
        <div
          className={cn('flex flex-col items-center', gridGaps[size])}
          role="group"
          aria-label={t('letterButtons')}
        >
          {letterRows.map((row, rowIndex) => (
            <div key={rowIndex} className={cn('flex', gridGaps[size])}>
              {row.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleButtonClick(letter)}
                  disabled={isLocked || currentInput.length >= codeLength}
                  className={cn(
                    'flex items-center justify-center rounded-lg font-semibold',
                    'transition-all duration-100',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                    'active:scale-95',
                    buttonSizes[size],
                    'bg-card border border-border text-foreground hover:bg-muted',
                    (isLocked || currentInput.length >= codeLength) && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={letter}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}

          {/* Action Row - Backspace and Submit */}
          <div className={cn('flex', gridGaps[size], 'mt-2')}>
            <button
              type="button"
              onClick={() => handleButtonClick('⌫')}
              disabled={isLocked || currentInput.length === 0}
              className={cn(
                'flex items-center justify-center rounded-lg font-semibold',
                'transition-all duration-100',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                'active:scale-95',
                buttonSizes[size],
                'px-4 min-w-[80px]',
                'bg-muted text-foreground hover:bg-muted/80',
                (isLocked || currentInput.length === 0) && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={t('delete')}
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('✓')}
              disabled={isLocked || currentInput.length === 0}
              className={cn(
                'flex items-center justify-center rounded-lg font-semibold',
                'transition-all duration-100',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                'active:scale-95',
                buttonSizes[size],
                'px-4 min-w-[80px]',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                (isLocked || currentInput.length === 0) && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={t('confirm')}
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    );
  }
);

AlphaKeypad.displayName = 'AlphaKeypad';
