/**
 * KeypadGrid — Escape-room-style 3×4 numeric keypad
 *
 * Fully controlled component (value/onChange/onSubmit) — no client-side validation.
 * Server validates codes via existing API route.
 *
 * Features:
 * - 3×4 grid: 1-9, ⌫, 0, ✓
 * - Dot display with masking (● per digit)
 * - sr-only fallback <input> for a11y
 * - Haptic feedback per press (via callback)
 * - Status-driven UI: idle/submitting/error/locked/success
 * - Shake animation on error status transition
 * - Digits disabled when maxLength reached or non-idle status
 *
 * Does NOT import platform-specific haptic/sound — uses onHaptic callback.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { NUMERIC_BUTTONS } from '@/types/keypad';

// =============================================================================
// Types
// =============================================================================

export type KeypadGridStatus = 'idle' | 'submitting' | 'error' | 'locked' | 'success';

export type KeypadGridKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'backspace' | 'submit' | 'clear';

export interface KeypadGridProps {
  /** Controlled value (digits only). */
  value: string;

  /** Called on every digit/backspace/clear. Must only emit digits. */
  onChange: (next: string) => void;

  /** Called when user presses ✓ or Enter on fallback input. */
  onSubmit: () => void | Promise<void>;

  /** Max digits allowed. If omitted, defaults to 12. */
  maxLength?: number;

  /** Show dot masking (● per digit). Default true. */
  mask?: boolean;

  /** UX state. Default 'idle'. */
  status?: KeypadGridStatus;

  /** Error message shown under display when status === 'error'. */
  errorMessage?: string | null;

  /** Fully disable all interaction. */
  disabled?: boolean;

  /** Auto-submit when value.length === maxLength. Default false. */
  autoSubmitOnComplete?: boolean;

  // --- Labels (i18n) ---
  /** aria-label for the keypad group. */
  ariaLabel?: string;
  /** Screen reader label for ✓ button. */
  submitLabel?: string;
  /** Screen reader label for ⌫ button. */
  backspaceLabel?: string;
  /** Text shown while submitting. */
  submittingLabel?: string;
  /** Text shown for success. */
  successLabel?: string;

  // --- Haptic/sound hooks ---
  /** Haptic feedback per key type. */
  onHaptic?: (kind: 'tap' | 'error' | 'success') => void;
  /** Called on every key press (for sfx layer). */
  onKeyPress?: (key: KeypadGridKey) => void;
}

// Sanity cap when maxLength is not provided
const DEFAULT_MAX_LENGTH = 12;

// =============================================================================
// Component
// =============================================================================

export function KeypadGrid({
  value,
  onChange,
  onSubmit,
  maxLength = DEFAULT_MAX_LENGTH,
  mask = true,
  status = 'idle',
  errorMessage,
  disabled = false,
  autoSubmitOnComplete = false,
  ariaLabel,
  submitLabel,
  backspaceLabel,
  submittingLabel,
  successLabel,
  onHaptic,
  onKeyPress,
}: KeypadGridProps) {
  // --- Shake animation: increment key on each error transition ---
  // The CSS animation replays on key change (forces re-mount via React key).
  const [shakeKey, setShakeKey] = useState(0);
  const prevStatusRef = useRef<KeypadGridStatus>(status);

  // Track error transitions for haptic + shake, and success for haptic.
  // We split setState into the timeout callback to avoid the
  // "setState synchronously in effect" lint rule.
  const onHapticRef = useRef(onHaptic);
  useEffect(() => {
    onHapticRef.current = onHaptic;
  }, [onHaptic]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'error' && prev !== 'error') {
      onHapticRef.current?.('error');
      // Increment shakeKey inside a microtask so it's not synchronous in effect
      queueMicrotask(() => setShakeKey((k) => k + 1));
    }

    if (status === 'success' && prev !== 'success') {
      onHapticRef.current?.('success');
    }
  }, [status]);

  // --- Interaction disabled when non-idle ---
  const isInteractionDisabled = disabled || status === 'submitting' || status === 'locked' || status === 'success';
  const isAtMaxLength = value.length >= maxLength;

  // --- Auto-submit ref (to avoid stale closure) ---
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // --- Handlers ---
  const handleDigit = useCallback(
    (digit: string) => {
      if (isInteractionDisabled) return;
      if (value.length >= maxLength) return;

      onHaptic?.('tap');
      onKeyPress?.(digit as KeypadGridKey);
      const next = value + digit;
      onChange(next);

      if (autoSubmitOnComplete && next.length === maxLength) {
        // Submit on next tick after parent processes onChange
        setTimeout(() => onSubmitRef.current(), 0);
      }
    },
    [isInteractionDisabled, value, maxLength, onChange, onHaptic, onKeyPress, autoSubmitOnComplete],
  );

  const handleBackspace = useCallback(() => {
    if (isInteractionDisabled) return;
    if (value.length === 0) return;

    onHaptic?.('tap');
    onKeyPress?.('backspace');
    onChange(value.slice(0, -1));
  }, [isInteractionDisabled, value, onChange, onHaptic, onKeyPress]);

  const handleSubmit = useCallback(() => {
    if (isInteractionDisabled) return;
    if (value.length === 0) return;

    onHaptic?.('tap');
    onKeyPress?.('submit');
    onSubmit();
  }, [isInteractionDisabled, value.length, onSubmit, onHaptic, onKeyPress]);

  const handleButtonClick = useCallback(
    (button: string) => {
      switch (button) {
        case '⌫':
          handleBackspace();
          break;
        case '✓':
          handleSubmit();
          break;
        default:
          handleDigit(button);
      }
    },
    [handleDigit, handleBackspace, handleSubmit],
  );

  // --- Fallback input handler (sr-only) ---
  const handleFallbackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isInteractionDisabled) return;
      const filtered = e.target.value.replace(/\D/g, '').slice(0, maxLength);
      onChange(filtered);
    },
    [isInteractionDisabled, maxLength, onChange],
  );

  const handleFallbackKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // --- Display dots ---
  const dots = Array.from({ length: maxLength }, (_, i) => {
    const isFilled = i < value.length;
    return (
      <div
        key={i}
        className={cn(
          'h-3.5 w-3.5 rounded-full transition-all duration-150',
          isFilled
            ? status === 'success'
              ? 'bg-green-500 scale-110'
              : 'bg-primary'
            : 'bg-border',
          status === 'success' && isFilled && 'animate-pulse',
        )}
        aria-hidden="true"
      />
    );
  });

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? 'Keypad'}
      className="flex flex-col items-center gap-3"
    >
      {/* ── Display: dot row + status ── */}
      <div
        key={shakeKey}
        className={cn(
          'flex items-center justify-center gap-2.5 rounded-lg border border-border bg-muted px-5 py-3',
          status === 'error' && 'animate-shake',
          status === 'success' && 'border-green-500/40 bg-green-500/10',
          status === 'error' && 'border-destructive/40',
        )}
        role="status"
        aria-live="polite"
      >
        {mask ? (
          dots
        ) : (
          <span className="font-mono text-xl tracking-[0.3em] text-foreground">
            {value || '\u00A0'}
          </span>
        )}
      </div>

      {/* ── Status text ── */}
      {status === 'submitting' && (
        <p className="text-xs font-medium text-muted-foreground animate-pulse">
          {submittingLabel ?? 'Verifying...'}
        </p>
      )}
      {status === 'success' && (
        <p className="text-xs font-medium text-green-600 dark:text-green-400">
          ✓ {successLabel ?? 'Correct!'}
        </p>
      )}
      {status === 'error' && errorMessage && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      {/* ── sr-only fallback input ── */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        className="sr-only"
        value={value}
        maxLength={maxLength}
        onChange={handleFallbackChange}
        onKeyDown={handleFallbackKeyDown}
        disabled={isInteractionDisabled}
        aria-label={ariaLabel ?? 'Keypad input'}
        tabIndex={-1}
      />

      {/* ── 3×4 Grid ── */}
      <div className="grid grid-cols-3 gap-2.5">
        {NUMERIC_BUTTONS.map((button) => {
          const isAction = button === '⌫' || button === '✓';
          const isDigitDisabled = !isAction && isAtMaxLength;
          const isBackspace = button === '⌫';
          const isSubmitBtn = button === '✓';
          const isBtnDisabled =
            isInteractionDisabled ||
            (isDigitDisabled && !isAction) ||
            (isBackspace && value.length === 0) ||
            (isSubmitBtn && value.length === 0);

          return (
            <button
              key={button}
              type="button"
              onClick={() => handleButtonClick(button)}
              disabled={isBtnDisabled}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl text-xl font-semibold',
                'transition-all duration-100',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'active:scale-95',
                isSubmitBtn
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : isBackspace
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-card border border-border text-foreground hover:bg-muted',
                isBtnDisabled && 'opacity-40 cursor-not-allowed',
              )}
              aria-label={
                isBackspace
                  ? (backspaceLabel ?? 'Delete')
                  : isSubmitBtn
                    ? (submitLabel ?? 'Submit')
                    : button
              }
              aria-disabled={isBtnDisabled}
            >
              {button}
            </button>
          );
        })}
      </div>
    </div>
  );
}
