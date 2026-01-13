/**
 * MFA Code Input Component
 * 6-digit TOTP input with auto-submit
 */

'use client';

import React, { useRef, useState, useEffect, useCallback, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface MFACodeInputProps {
  /** Number of digits */
  length?: number;
  /** Callback when code is complete */
  onComplete?: (code: string) => void;
  /** Callback on change */
  onChange?: (code: string) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Auto focus first input */
  autoFocus?: boolean;
  /** Custom class name */
  className?: string;
}

export function MFACodeInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  className,
}: MFACodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Handle value changes
  const handleChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);
    
    const code = newValues.join('');
    onChange?.(code);
    
    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Check if complete
    if (code.length === length && !code.includes('')) {
      onComplete?.(code);
    }
  }, [values, length, onChange, onComplete]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        onChange?.(newValues.join(''));
      } else {
        // Clear current input
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
        onChange?.(newValues.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [values, length, onChange]);

  // Handle paste
  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      const newValues = Array(length).fill('');
      pastedData.split('').forEach((char, i) => {
        if (i < length) newValues[i] = char;
      });
      setValues(newValues);
      
      const code = newValues.join('');
      onChange?.(code);
      
      // Focus last filled or next empty input
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      
      // Check if complete
      if (code.length === length) {
        onComplete?.(code);
      }
    }
  }, [length, onChange, onComplete]);

  // Reset values
  const reset = useCallback(() => {
    setValues(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  }, [length]);

  // Handle error state - use a separate ref to track previous error
  const prevErrorRef = React.useRef(error);
  React.useEffect(() => {
    // Only reset on error transition (null/undefined -> error string)
    if (error && error !== prevErrorRef.current) {
      // Use setTimeout to avoid setState during render
      const timer = setTimeout(() => {
        setValues(Array(length).fill(''));
        inputRefs.current[0]?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
    prevErrorRef.current = error;
  }, [error, length]);

  // Export reset for external use
  void reset;

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={values[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Siffra ${index + 1} av ${length}`}
          className={cn(
            'w-12 h-14 text-center text-2xl font-mono rounded-lg border transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            disabled
              ? 'bg-muted border-border cursor-not-allowed opacity-50'
              : error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/50'
                : 'bg-background border-border focus:border-primary focus:ring-primary',
          )}
        />
      ))}
    </div>
  );
}
