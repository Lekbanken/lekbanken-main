'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useKeypad } from './hooks/useKeypad';
import { KeypadDisplay } from './KeypadDisplay';
import { LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { NUMERIC_BUTTONS } from '@/types/keypad';

export interface KeypadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  /** The correct code to unlock */
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
}

/**
 * Keypad - Escape room style PIN code input
 * 
 * Mobile-first with large touch targets (64x64px minimum)
 * Supports haptic feedback and shake animation on wrong code
 */
export const Keypad = forwardRef<HTMLDivElement, KeypadProps>(
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
      title = 'Ange koden',
      size = 'md',
      autoSubmit = true,
      className,
      ...props
    },
    ref
  ) => {
    const t = useTranslations('play.keypad');
    const codeLength = codeLengthProp ?? correctCode.length;

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
      correctCode,
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
      
      // Check if this will complete the code
      if (autoSubmit && currentInput.length + 1 === codeLength) {
        // Submit on next tick after state update
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

    const buttonSizes = {
      sm: 'h-12 w-12 text-lg',
      md: 'h-16 w-16 text-xl',
      lg: 'h-20 w-20 text-2xl',
    };

    const gridGaps = {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
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
          <p className="text-lg font-medium text-foreground">{t('unlocked')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('correctCode')}
          </p>
        </div>
      );
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

        {/* Code Display */}
        <KeypadDisplay
          codeLength={codeLength}
          filledCount={currentInput.length}
          isShaking={isShaking}
          isSuccess={isUnlocked}
          size={size}
          className="mb-4"
        />

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

        {/* Keypad Grid */}
        <div
          className={cn(
            'grid grid-cols-3',
            gridGaps[size]
          )}
          role="group"
          aria-label={t('keypadLabel')}
        >
          {NUMERIC_BUTTONS.map((button) => {
            const isAction = button === '⌫' || button === '✓';
            const isDisabled = isLocked || (button !== '⌫' && currentInput.length >= codeLength);
            
            return (
              <button
                key={button}
                type="button"
                onClick={() => handleButtonClick(button)}
                disabled={isDisabled}
                className={cn(
                  'flex items-center justify-center rounded-xl font-semibold',
                  'transition-all duration-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'active:scale-95',
                  buttonSizes[size],
                  isAction
                    ? button === '✓'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-card border border-border text-foreground hover:bg-muted',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-label={
                  button === '⌫' ? t('delete') :
                  button === '✓' ? t('confirm') :
                  button
                }
              >
                {button}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

Keypad.displayName = 'Keypad';
